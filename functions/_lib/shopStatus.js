// Shared helper for the temporary order-pause admin feature. shop_status is a
// singleton table (id = 1) toggled from the admin panel — separate from the
// permanent ORDERING_ENABLED kill switch in config.js (that one's for the
// pre-launch/legal-review state; this one's for live, short pauses like a
// kitchen closure or ingredient shortage).

export async function getShopStatus(env) {
  const row = await env.DB.prepare(
    "SELECT is_paused, reason, paused_until FROM shop_status WHERE id = 1"
  ).first();

  if (!row || !row.is_paused) {
    return { is_paused: false, reason: null, paused_until: null };
  }

  // A duration-limited pause with no admin follow-up: once paused_until has
  // passed, treat it as no longer paused rather than requiring someone to
  // remember to click "resume".
  if (row.paused_until) {
    const untilMs = new Date(row.paused_until.replace(" ", "T") + "Z").getTime();
    if (untilMs <= Date.now()) {
      return { is_paused: false, reason: null, paused_until: null };
    }
  }

  return { is_paused: true, reason: row.reason, paused_until: row.paused_until };
}
