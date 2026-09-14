import { jsonResponse, errorResponse } from "../../_lib/json.js";
import { requireAdmin } from "../../_lib/auth.js";
import {
  startOfBudapestDay,
  startOfBudapestWeek,
  startOfBudapestMonth,
  toSqlUtc,
} from "../../_lib/budapestTime.js";

const PERIOD_STARTS = {
  today: startOfBudapestDay,
  week: startOfBudapestWeek,
  month: startOfBudapestMonth,
};

const TOP_PRODUCT_LIMIT = 10;

export async function onRequestGet({ request, env }) {
  const session = await requireAdmin(request, env);
  if (!session) return errorResponse("Unauthorized", 401);

  const period = new URL(request.url).searchParams.get("period") || "today";
  const periodStart = PERIOD_STARTS[period];
  if (!periodStart) return errorResponse("Érvénytelen időszak.", 400);

  const since = toSqlUtc(periodStart());

  // Cancelled orders are excluded from every headline number (they didn't
  // happen), and reported separately so the count is still visible.
  const totals = await env.DB.prepare(
    `SELECT
       COALESCE(SUM(status != 'cancelled'), 0)                                    AS order_count,
       COALESCE(SUM(status = 'cancelled'), 0)                                     AS cancelled_count,
       COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END), 0)    AS revenue,
       COALESCE(SUM(status != 'cancelled' AND fulfillment_type = 'delivery'), 0)  AS delivery_count,
       COALESCE(SUM(status != 'cancelled' AND fulfillment_type = 'pickup'), 0)    AS pickup_count
     FROM orders
     WHERE created_at >= ?`
  )
    .bind(since)
    .first();

  // product_name is the snapshot stored on the order line, so renaming a
  // product later doesn't retroactively rewrite past statistics. Extra
  // toppings live in order_item_modifiers and deliberately don't count here.
  const { results: topProducts } = await env.DB.prepare(
    `SELECT oi.product_name AS name, SUM(oi.quantity) AS quantity
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.created_at >= ? AND o.status != 'cancelled'
     GROUP BY oi.product_name
     ORDER BY quantity DESC, name
     LIMIT ${TOP_PRODUCT_LIMIT}`
  )
    .bind(since)
    .all();

  return jsonResponse({
    period,
    order_count: totals.order_count,
    cancelled_count: totals.cancelled_count,
    revenue: totals.revenue,
    average_order_value: totals.order_count ? Math.round(totals.revenue / totals.order_count) : 0,
    delivery_count: totals.delivery_count,
    pickup_count: totals.pickup_count,
    top_products: topProducts,
  });
}
