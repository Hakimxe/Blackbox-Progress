// Tiny signed-cookie helper. No external deps — uses Web Crypto (available
// in both the Edge runtime middleware and the Node route handlers).

export const SESSION_COOKIE = "pbbx_session";
const SECRET = process.env.SESSION_SECRET || "dev-secret-change-me-please";

function b64urlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(value: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  return b64urlEncode(sig);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// Token format: <payload_b64>.<sig>
// payload = JSON.stringify({ u: username, exp: epoch_ms })
export async function createSessionToken(username: string): Promise<string> {
  const payload = JSON.stringify({
    u: username,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days
  });
  const enc = new TextEncoder().encode(payload);
  const payload_b64 = b64urlEncode(enc);
  const sig = await hmac(payload_b64);
  return `${payload_b64}.${sig}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<{ username: string } | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload_b64, sig] = parts;
  const expected = await hmac(payload_b64);
  if (!safeEqual(sig, expected)) return null;
  try {
    const padded =
      payload_b64.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - (payload_b64.length % 4)) % 4);
    const json = atob(padded);
    const parsed = JSON.parse(json) as { u: string; exp: number };
    if (!parsed || typeof parsed.exp !== "number" || Date.now() > parsed.exp)
      return null;
    return { username: parsed.u };
  } catch {
    return null;
  }
}
