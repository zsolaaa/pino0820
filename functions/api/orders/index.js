import { jsonResponse, errorResponse } from "../../_lib/json.js";
import { computeOrderTotals, generateOrderNumber, OrderValidationError } from "../../_lib/orders.js";
import { checkRateLimit, getClientIp } from "../../_lib/rateLimit.js";
import { verifyTurnstile } from "../../_lib/turnstile.js";

const FULFILLMENT_TYPES = ["delivery", "pickup"];
const PAYMENT_METHODS = ["cod_cash", "cod_card"];

function validateCustomer(body) {
  if (typeof body.customer_name !== "string" || !body.customer_name.trim()) {
    throw new OrderValidationError("Add meg a neved.");
  }
  if (typeof body.customer_phone !== "string" || !body.customer_phone.trim()) {
    throw new OrderValidationError("Add meg a telefonszámod.");
  }
  if (body.fulfillment_type === "delivery") {
    if (typeof body.delivery_address !== "string" || !body.delivery_address.trim()) {
      throw new OrderValidationError("Add meg a szállítási címet.");
    }
  }
  if (!PAYMENT_METHODS.includes(body.payment_method)) {
    throw new OrderValidationError("Érvénytelen fizetési mód.");
  }
}

export async function onRequestPost({ request, env }) {
  const ip = getClientIp(request);

  const withinLimit = await checkRateLimit(env, { scope: "order", ip, limit: 8, windowSeconds: 60 });
  if (!withinLimit) {
    return errorResponse("Túl sok rendelés érkezett rövid idő alatt. Próbáld újra néhány perc múlva, vagy hívj minket telefonon.", 429);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Érvénytelen kérés.", 400);
  }

  try {
    const turnstileOk = await verifyTurnstile(env, body.turnstile_token, ip);
    if (!turnstileOk) {
      throw new OrderValidationError("A biztonsági ellenőrzés sikertelen. Frissítsd az oldalt, és próbáld újra.");
    }

    if (!FULFILLMENT_TYPES.includes(body.fulfillment_type)) {
      throw new OrderValidationError("Érvénytelen átvételi mód.");
    }
    validateCustomer(body);

    const { orderItems, subtotal, deliveryFee, total } = await computeOrderTotals(env, body);
    const orderNumber = await generateOrderNumber(env);

    const insertOrder = env.DB.prepare(
      `INSERT INTO orders
        (order_number, status, fulfillment_type, customer_name, customer_phone, customer_email,
         delivery_address, notes, subtotal, delivery_fee, total, payment_method, payment_status)
       VALUES (?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid')`
    ).bind(
      orderNumber,
      body.fulfillment_type,
      body.customer_name.trim(),
      body.customer_phone.trim(),
      body.customer_email ? String(body.customer_email).trim() : null,
      body.fulfillment_type === "delivery" ? body.delivery_address.trim() : null,
      body.notes ? String(body.notes).trim() : null,
      subtotal,
      deliveryFee,
      total,
      body.payment_method
    );

    // D1 batch() runs as a single transaction; we can't reference the order's
    // generated id inside the same batch, so the order is inserted first,
    // then items are inserted in a batch bound with that id.
    const orderResult = await insertOrder.run();
    const orderId = orderResult.meta.last_row_id;

    const boundItemStatements = orderItems.map((item) =>
      env.DB.prepare(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(orderId, item.product_id, item.product_name, item.unit_price, item.quantity, item.line_total)
    );
    const itemResults = await env.DB.batch(boundItemStatements);

    const modifierStatements = [];
    orderItems.forEach((item, idx) => {
      const orderItemId = itemResults[idx].meta.last_row_id;
      for (const mod of item.modifiers) {
        modifierStatements.push(
          env.DB.prepare(
            `INSERT INTO order_item_modifiers (order_item_id, product_id, name, price) VALUES (?, ?, ?, ?)`
          ).bind(orderItemId, mod.product_id, mod.name, mod.price)
        );
      }
    });
    if (modifierStatements.length) {
      await env.DB.batch(modifierStatements);
    }

    return jsonResponse(
      {
        order: {
          id: orderId,
          order_number: orderNumber,
          status: "new",
          subtotal,
          delivery_fee: deliveryFee,
          total,
          fulfillment_type: body.fulfillment_type,
        },
      },
      201
    );
  } catch (err) {
    if (err instanceof OrderValidationError) {
      return errorResponse(err.message, 400);
    }
    return errorResponse("Nem sikerült létrehozni a rendelést.", 500);
  }
}
