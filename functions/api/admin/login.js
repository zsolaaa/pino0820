import { jsonResponse, errorResponse } from "../../_lib/json.js";
import { createSessionCookie, constantTimeEqual } from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
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
