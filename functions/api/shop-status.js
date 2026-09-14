import { jsonResponse } from "../_lib/json.js";
import { getShopStatus } from "../_lib/shopStatus.js";
import { getOrderingHours } from "../_lib/openingHours.js";

export async function onRequestGet({ env }) {
  const hours = getOrderingHours();

  try {
    const status = await getShopStatus(env);
    return jsonResponse({ ...status, ...hours });
  } catch {
    // Fail open on the pause lookup: a transient status-check error should
    // never block ordering on its own — the order-creation endpoint still
    // enforces the real pause. The opening-hours part needs no DB.
    return jsonResponse({ is_paused: false, reason: null, paused_until: null, ...hours });
  }
}
