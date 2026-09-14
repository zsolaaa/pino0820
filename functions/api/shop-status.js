import { jsonResponse } from "../_lib/json.js";
import { getShopStatus } from "../_lib/shopStatus.js";

export async function onRequestGet({ env }) {
  try {
    const status = await getShopStatus(env);
    return jsonResponse(status);
  } catch {
    // Fail open: a transient status-check error should never block ordering
    // on its own — the order-creation endpoint still enforces the real pause.
    return jsonResponse({ is_paused: false, reason: null, paused_until: null });
  }
}
