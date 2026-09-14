import { jsonResponse, errorResponse } from "../../_lib/json.js";
import { requireAdmin } from "../../_lib/auth.js";
import { budapestDateStr, budapestDayRange } from "../../_lib/budapestTime.js";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const HISTORY_LIMIT = 14;

async function readDayTotals(env, businessDate) {
  const { since, until } = budapestDayRange(businessDate);

  // Cancelled orders are counted separately and kept out of every money
  // figure. payment_method is what the customer chose at checkout —
  // everything is paid on handover, so there's no settled/unsettled split.
  return env.DB.prepare(
    `SELECT
       COALESCE(SUM(status != 'cancelled'), 0)                                  AS order_count,
       COALESCE(SUM(status = 'cancelled'), 0)                                   AS cancelled_count,
       COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END), 0)  AS revenue,
       COALESCE(SUM(CASE WHEN status != 'cancelled' AND payment_method = 'cod_card'
                         THEN total ELSE 0 END), 0)                             AS card_revenue,
       COALESCE(SUM(CASE WHEN status != 'cancelled' AND payment_method = 'cod_cash'
                         THEN total ELSE 0 END), 0)                             AS cash_revenue
     FROM orders
     WHERE created_at >= ? AND created_at < ?`
  )
    .bind(since, until)
    .first();
}

export async function onRequestGet({ request, env }) {
  const session = await requireAdmin(request, env);
  if (!session) return errorResponse("Unauthorized", 401);

  const requested = new URL(request.url).searchParams.get("date");
  if (requested && !DATE_PATTERN.test(requested)) {
    return errorResponse("Érvénytelen dátum.", 400);
  }
  const businessDate = requested || budapestDateStr();

  const closing = await env.DB.prepare(
    "SELECT * FROM daily_closings WHERE business_date = ?"
  )
    .bind(businessDate)
    .first();

  // A closed day reports its frozen snapshot; an open one reports live totals.
  const totals = closing || (await readDayTotals(env, businessDate));

  const { results: history } = await env.DB.prepare(
    `SELECT business_date, order_count, revenue, closed_at
     FROM daily_closings ORDER BY business_date DESC LIMIT ${HISTORY_LIMIT}`
  ).all();

  return jsonResponse({
    business_date: businessDate,
    is_closed: !!closing,
    closed_at: closing ? closing.closed_at : null,
    order_count: totals.order_count,
    cancelled_count: totals.cancelled_count,
    revenue: totals.revenue,
    card_revenue: totals.card_revenue,
    cash_revenue: totals.cash_revenue,
    history,
  });
}

export async function onRequestPost({ request, env }) {
  const session = await requireAdmin(request, env);
  if (!session) return errorResponse("Unauthorized", 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Érvénytelen kérés.", 400);
  }

  const businessDate = body.business_date;
  if (typeof businessDate !== "string" || !DATE_PATTERN.test(businessDate)) {
    return errorResponse("Érvénytelen dátum.", 400);
  }
  if (businessDate > budapestDateStr()) {
    return errorResponse("Jövőbeli napot nem lehet lezárni.", 400);
  }

  const alreadyClosed = await env.DB.prepare(
    "SELECT business_date FROM daily_closings WHERE business_date = ?"
  )
    .bind(businessDate)
    .first();
  if (alreadyClosed) {
    return errorResponse("Ez a nap már le van zárva.", 409);
  }

  // The figures are always recomputed here — never taken from the request —
  // so the stored snapshot can't be influenced by what the browser sent.
  const totals = await readDayTotals(env, businessDate);

  // DO NOTHING rather than an upsert: if two admins hit the button at once,
  // the first snapshot stands instead of being silently rewritten.
  await env.DB.prepare(
    `INSERT INTO daily_closings
       (business_date, order_count, cancelled_count, revenue, card_revenue, cash_revenue)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(business_date) DO NOTHING`
  )
    .bind(
      businessDate,
      totals.order_count,
      totals.cancelled_count,
      totals.revenue,
      totals.card_revenue,
      totals.cash_revenue
    )
    .run();

  // Read back rather than echoing `totals`: on a lost race this returns the
  // snapshot that actually got stored.
  const closing = await env.DB.prepare(
    "SELECT * FROM daily_closings WHERE business_date = ?"
  )
    .bind(businessDate)
    .first();

  return jsonResponse({
    business_date: businessDate,
    is_closed: true,
    closed_at: closing.closed_at,
    order_count: closing.order_count,
    cancelled_count: closing.cancelled_count,
    revenue: closing.revenue,
    card_revenue: closing.card_revenue,
    cash_revenue: closing.cash_revenue,
  });
}
