import { getProductsByIds } from "./db.js";

const DELIVERY_FEE = 200;
const MAX_QUANTITY = 50;

export class OrderValidationError extends Error {}

function budapestDateStamp() {
  // Europe/Budapest date, formatted YYYYMMDD, for the human order number prefix.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Budapest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get("year")}${get("month")}${get("day")}`;
}

export async function generateOrderNumber(env) {
  const stamp = budapestDateStamp();
  const prefix = `PZ-${stamp}-`;
  const { results } = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM orders WHERE order_number LIKE ?"
  )
    .bind(`${prefix}%`)
    .all();
  const seq = (results[0]?.count ?? 0) + 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
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
    const product = productMap.get(item.product_id);
    if (!product || !product.is_available) {
      throw new OrderValidationError(`A(z) ${item.product_id} azonosítójú termék nem elérhető.`);
    }

    const modifiers = [];
    let modifierTotal = 0;
    for (const modId of item.modifier_product_ids || []) {
      const modProduct = productMap.get(modId);
      if (!modProduct || !modProduct.is_available || !modProduct.is_modifier_eligible) {
        throw new OrderValidationError(`A(z) ${modId} azonosítójú extra feltét nem választható.`);
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
