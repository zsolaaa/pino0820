import { jsonResponse, errorResponse } from "../../../_lib/json.js";
import { requireAdmin } from "../../../_lib/auth.js";

function budapestDateStr(date) {
  // 'sv-SE' locale formats as YYYY-MM-DD, which is what we want to bucket by.
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Budapest" }).format(date);
}

export async function onRequestGet({ request, env }) {
  const session = await requireAdmin(request, env);
  if (!session) return errorResponse("Unauthorized", 401);

  // created_at is stored as UTC with no offset marker, and SQLite has no
  // Europe/Budapest timezone data — so pull a generous recent window and
  // bucket rows by Budapest-local calendar day in JS instead of in SQL.
  const { results } = await env.DB.prepare(
    "SELECT status, total, created_at FROM orders WHERE created_at >= datetime('now', '-2 days')"
  ).all();

  const today = budapestDateStr(new Date());
  let orderCount = 0;
  let cancelledCount = 0;
  let revenue = 0;

  for (const row of results) {
    const createdAt = new Date(row.created_at.replace(" ", "T") + "Z");
    if (budapestDateStr(createdAt) !== today) continue;
    orderCount++;
    if (row.status === "cancelled") {
      cancelledCount++;
    } else {
      revenue += row.total;
    }
  }

  return jsonResponse({ date: today, order_count: orderCount, cancelled_count: cancelledCount, revenue });
}
