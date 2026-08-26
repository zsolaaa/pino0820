import { jsonResponse, errorResponse } from "../../_lib/json.js";
import { createSessionCookie, constantTimeEqual } from "../../_lib/auth.js";
import { checkRateLimit, getClientIp } from "../../_lib/rateLimit.js";

export async function onRequestPost({ request, env }) {
  const ip = getClientIp(request);

  // Deliberately tight: legitimate staff log in once, rarely fail. This is
  // the main brute-force defense for the single shared admin password.
  const withinLimit = await checkRateLimit(env, { scope: "admin-login", ip, limit: 5, windowSeconds: 60 });
  if (!withinLimit) {
    return errorResponse("Túl sok bejelentkezési próbálkozás. Próbáld újra néhány perc múlva.", 429);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Érvénytelen kérés.", 400);
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!password || !constantTimeEqual(password, env.ADMIN_PASSWORD)) {
    return errorResponse("Hibás jelszó.", 401);
  }

  const cookie = await createSessionCookie(env.SESSION_SECRET);
  return jsonResponse({ ok: true }, 200, { "Set-Cookie": cookie });
}
