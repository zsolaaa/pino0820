const COOKIE_NAME = "pinocchio_admin";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h

async function hmacSign(payloadB64, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export async function createSessionCookie(secret) {
  const payload = JSON.stringify({ role: "admin", exp: Date.now() + SESSION_TTL_MS });
  const payloadB64 = btoa(payload);
  const sig = await hmacSign(payloadB64, secret);
  const value = `${payloadB64}.${sig}`;
  return `${COOKIE_NAME}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

function getCookie(request, name) {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
}

async function verifySessionValue(value, secret) {
  if (!value || !value.includes(".")) return null;
  const [payloadB64, sig] = value.split(".");
  const expectedSig = await hmacSign(payloadB64, secret);
  if (expectedSig !== sig) return null;
  let payload;
  try {
    payload = JSON.parse(atob(payloadB64));
  } catch {
    return null;
  }
  if (!payload.exp || payload.exp < Date.now()) return null;
  return payload;
}

// Verifies the admin session cookie on `request`. Returns the session payload
// ({role, exp}) if valid, or null — callers must return 401 themselves on null.
export async function requireAdmin(request, env) {
  const cookieValue = getCookie(request, COOKIE_NAME);
  return verifySessionValue(cookieValue, env.SESSION_SECRET);
}

// Constant-time compare: Workers doesn't expose Node's crypto.timingSafeEqual.
export function constantTimeEqual(a, b) {
  const bufA = new TextEncoder().encode(a);
  const bufB = new TextEncoder().encode(b);
  if (bufA.length !== bufB.length) {
    // Still walk `bufA` length to avoid a short-circuit timing signal on length.
    let dummy = 0;
    for (let i = 0; i < bufA.length; i++) dummy |= bufA[i];
    return false;
  }
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) diff |= bufA[i] ^ bufB[i];
  return diff === 0;
}
