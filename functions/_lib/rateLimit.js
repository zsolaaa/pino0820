export function getClientIp(request) {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}

// Fixed-window rate limit backed by D1 (see rate_limits table in schema.sql).
// Returns true if the request is within limit, false if it should be rejected.
export async function checkRateLimit(env, { scope, ip, limit, windowSeconds = 60 }) {
  const windowStart = Math.floor(Date.now() / (windowSeconds * 1000));
  const key = `${scope}:${ip}`;

  const row = await env.DB.prepare(
    `INSERT INTO rate_limits (rl_key, window_start, count) VALUES (?, ?, 1)
     ON CONFLICT(rl_key, window_start) DO UPDATE SET count = count + 1
     RETURNING count`
  )
    .bind(key, windowStart)
    .first();

  // Opportunistically sweep old windows so the table doesn't grow forever —
  // no separate cron needed at this traffic volume.
  if (Math.random() < 0.02) {
    env.DB.prepare("DELETE FROM rate_limits WHERE window_start < ?")
      .bind(windowStart - 5)
      .run()
      .catch(() => {});
  }

  return row.count <= limit;
}
