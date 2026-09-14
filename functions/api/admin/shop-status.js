import { jsonResponse, errorResponse } from "../../_lib/json.js";
import { requireAdmin } from "../../_lib/auth.js";
import { getShopStatus } from "../../_lib/shopStatus.js";

const REASONS = ["overload", "technical", "kitchen_closed", "ingredients", "other"];

export async function onRequestGet({ request, env }) {
  const session = await requireAdmin(request, env);
  if (!session) return errorResponse("Unauthorized", 401);

  const status = await getShopStatus(env);
  return jsonResponse(status);
}

export async function onRequestPatch({ request, env }) {
  const session = await requireAdmin(request, env);
  if (!session) return errorResponse("Unauthorized", 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Érvénytelen kérés.", 400);
  }

  if (typeof body.is_paused !== "boolean") {
    return errorResponse("Érvénytelen kérés.", 400);
  }

  if (!body.is_paused) {
    await env.DB.prepare(
      "UPDATE shop_status SET is_paused = 0, reason = NULL, paused_until = NULL, updated_at = datetime('now') WHERE id = 1"
    ).run();
    return jsonResponse({ is_paused: false, reason: null, paused_until: null });
  }

  if (!REASONS.includes(body.reason)) {
    return errorResponse("Érvénytelen indok.", 400);
  }

  let durationMinutes = null;
  if (body.duration_minutes != null) {
    durationMinutes = parseInt(body.duration_minutes, 10);
    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0 || durationMinutes > 24 * 60) {
      return errorResponse("Érvénytelen időtartam.", 400);
    }
  }

  if (durationMinutes) {
    await env.DB.prepare(
      `UPDATE shop_status
       SET is_paused = 1, reason = ?, paused_until = datetime('now', '+' || ? || ' minutes'), updated_at = datetime('now')
       WHERE id = 1`
    )
      .bind(body.reason, durationMinutes)
      .run();
  } else {
    await env.DB.prepare(
      "UPDATE shop_status SET is_paused = 1, reason = ?, paused_until = NULL, updated_at = datetime('now') WHERE id = 1"
    )
      .bind(body.reason)
      .run();
  }

  const status = await getShopStatus(env);
  return jsonResponse(status);
}
