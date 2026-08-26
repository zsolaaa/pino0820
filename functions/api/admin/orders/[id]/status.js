import { jsonResponse, errorResponse } from "../../../../_lib/json.js";
import { requireAdmin } from "../../../../_lib/auth.js";

const STATUSES = ["new", "preparing", "ready", "completed", "cancelled"];

export async function onRequestPatch({ request, env, params }) {
  const session = await requireAdmin(request, env);
  if (!session) return errorResponse("Unauthorized", 401);

  const orderId = parseInt(params.id, 10);
  if (!Number.isInteger(orderId)) return errorResponse("Érvénytelen rendelésazonosító.", 400);

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Érvénytelen kérés.", 400);
  }

  if (!STATUSES.includes(body.status)) {
    return errorResponse("Érvénytelen státusz.", 400);
  }

  const result = await env.DB.prepare(
    "UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?"
  )
    .bind(body.status, orderId)
    .run();

  if (result.meta.changes === 0) {
    return errorResponse("Rendelés nem található.", 404);
  }

  return jsonResponse({ ok: true, order: { id: orderId, status: body.status } });
}
