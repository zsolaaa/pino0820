import { jsonResponse } from "../../_lib/json.js";
import { clearSessionCookie } from "../../_lib/auth.js";

export async function onRequestPost() {
  return jsonResponse({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
}
