import { getProductsByIds } from "./db.js";
import { budapestDateStr } from "./budapestTime.js";

const DELIVERY_FEE = 200;
const MAX_QUANTITY = 50;

export class OrderValidationError extends Error {}

// COUNT(*) + 1 looked fine but isn't: it reads existing rows and writes the
// new one in two separate D1 round trips (with a Turnstile network call in
// between), so two orders placed close together can read the same count and
// generate the same number — the second INSERT then fails its UNIQUE
// constraint. A single INSERT ... ON CONFLICT ... RETURNING is one atomic
// statement, so concurrent callers can never be handed the same seq — the
// same pattern rateLimit.js already relies on for its counters.
export async function generateOrderNumber(env) {
  const stamp = budapestDateStr().replaceAll("-", "");
  const row = await env.DB.prepare(
    `INSERT INTO order_number_counters (business_date, seq) VALUES (?, 1)
     ON CONFLICT(business_date) DO UPDATE SET seq = seq + 1
     RETURNING seq`
  )
    .bind(stamp)
    .first();
  return `PZ-${stamp}-${String(row.seq).padStart(4, "0")}`;
}

// Validates and re-prices an order against the DB. Never trusts client-submitted
// prices. Throws OrderValidationError with a user-facing message on any problem.
export async function computeOrderTotals(env, { items, fulfillment_type }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new OrderValidationError("A kosár nem lehet üres.");
  }
  if (fulfillment_type !== "delivery" && fulfillment_type !== "pickup") {
    throw new OrderValidationError("Érvénytelen átvételi mód.");
  }

  const allProductIds = new Set();
  for (const item of items) {
    if (!Number.isInteger(item.product_id)) {
      throw new OrderValidationError("Érvénytelen termékazonosító.");
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QUANTITY) {
      throw new OrderValidationError("Érvénytelen mennyiség.");
    }
    allProductIds.add(item.product_id);
    for (const modId of item.modifier_product_ids || []) {
      if (!Number.isInteger(modId)) {
        throw new OrderValidationError("Érvénytelen extra feltét.");
      }
      allProductIds.add(modId);
    }
  }

  const productMap = await getProductsByIds(env, Array.from(allProductIds));

  const orderItems = [];
  let subtotal = 0;

  for (const item of items) {
    // Prefer the product's own name in every message below: it exists
    // whenever the row does, so the customer knows exactly which line to
    // remove instead of hunting for an internal database id in their cart.
    const product = productMap.get(item.product_id);
    if (!product) {
      throw new OrderValidationError(
        "Az egyik kosárban lévő tétel már nem található a menüben. Frissítsd az oldalt, és állítsd össze újra a rendelésed."
      );
    }
    if (!product.is_available) {
      throw new OrderValidationError(`„${product.name}” jelenleg elfogyott — vedd ki a kosaradból a rendelés folytatásához.`);
    }

    const modifiers = [];
    let modifierTotal = 0;
    for (const modId of item.modifier_product_ids || []) {
      const modProduct = productMap.get(modId);
      if (!modProduct) {
        throw new OrderValidationError(
          "Az egyik választott extra feltét már nem található a menüben. Frissítsd az oldalt, és állítsd össze újra a rendelésed."
        );
      }
      if (!modProduct.is_available) {
        throw new OrderValidationError(`A(z) „${modProduct.name}” extra feltét jelenleg elfogyott — vedd ki a kosaradból a rendelés folytatásához.`);
      }
      if (!modProduct.is_modifier_eligible) {
        throw new OrderValidationError(`A(z) „${modProduct.name}” nem választható extra feltétként.`);
      }
      modifiers.push({ product_id: modProduct.id, name: modProduct.name, price: modProduct.price });
      modifierTotal += modProduct.price;
    }

    const unitPrice = product.price;
    const lineTotal = (unitPrice + modifierTotal) * item.quantity;
    subtotal += lineTotal;

    orderItems.push({
      product_id: product.id,
      product_name: product.name,
      unit_price: unitPrice,
      quantity: item.quantity,
      line_total: lineTotal,
      modifiers,
    });
  }

  const deliveryFee = fulfillment_type === "delivery" ? DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;

  return { orderItems, subtotal, deliveryFee, total };
}
