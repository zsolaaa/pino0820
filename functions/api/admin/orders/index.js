import { jsonResponse, errorResponse } from "../../../_lib/json.js";
import { requireAdmin } from "../../../_lib/auth.js";

const STATUSES = ["new", "preparing", "ready", "completed", "cancelled"];

export async function onRequestGet({ request, env }) {
  const session = await requireAdmin(request, env);
  if (!session) return errorResponse("Unauthorized", 401);

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  if (status && !STATUSES.includes(status)) {
    return errorResponse("Érvénytelen státusz szűrő.", 400);
  }

  const where = status ? "WHERE o.status = ?" : "";
  const stmt = env.DB.prepare(
    `SELECT * FROM orders o ${where} ORDER BY o.created_at DESC`
  );
  const { results: orders } = status ? await stmt.bind(status).all() : await stmt.all();

  if (!orders.length) return jsonResponse({ orders: [] });

  const orderIds = orders.map((o) => o.id);
  const placeholders = orderIds.map(() => "?").join(",");
  const { results: items } = await env.DB.prepare(
    `SELECT * FROM order_items WHERE order_id IN (${placeholders}) ORDER BY id`
  )
    .bind(...orderIds)
    .all();

  const itemIds = items.map((i) => i.id);
  let modifiersByItem = new Map();
  if (itemIds.length) {
    const modPlaceholders = itemIds.map(() => "?").join(",");
    const { results: modifiers } = await env.DB.prepare(
      `SELECT * FROM order_item_modifiers WHERE order_item_id IN (${modPlaceholders})`
    )
      .bind(...itemIds)
      .all();
    modifiersByItem = new Map();
    for (const mod of modifiers) {
      if (!modifiersByItem.has(mod.order_item_id)) modifiersByItem.set(mod.order_item_id, []);
      modifiersByItem.get(mod.order_item_id).push({ name: mod.name, price: mod.price });
    }
  }

  const itemsByOrder = new Map();
  for (const item of items) {
    if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, []);
    itemsByOrder.get(item.order_id).push({
      product_name: item.product_name,
      unit_price: item.unit_price,
      quantity: item.quantity,
      line_total: item.line_total,
      modifiers: modifiersByItem.get(item.id) || [],
    });
  }

  const result = orders.map((o) => ({
    id: o.id,
    order_number: o.order_number,
    status: o.status,
    fulfillment_type: o.fulfillment_type,
    customer_name: o.customer_name,
    customer_phone: o.customer_phone,
    customer_email: o.customer_email,
    delivery_address: o.delivery_address,
    notes: o.notes,
    subtotal: o.subtotal,
    delivery_fee: o.delivery_fee,
    total: o.total,
    payment_method: o.payment_method,
    payment_status: o.payment_status,
    created_at: o.created_at,
    items: itemsByOrder.get(o.id) || [],
  }));

  return jsonResponse({ orders: result });
}
