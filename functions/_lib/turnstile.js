// Verifies a Cloudflare Turnstile token server-side. If TURNSTILE_SECRET
// isn't configured (e.g. local dev without the secret set), verification is
// skipped rather than hard-failing every order.
export async function verifyTurnstile(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return true;
  if (!token) return false;

  const body = new FormData();
  body.append("secret", env.TURNSTILE_SECRET);
  body.append("response", token);
  if (ip) body.append("remoteip", ip);

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    const data = await res.json();
    return !!data.success;
  } catch {
    // Turnstile's own service being down shouldn't block every order —
    // fail open rather than closed here.
    return true;
  }
}
