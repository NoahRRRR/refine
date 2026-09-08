// Shared helpers for the auth Functions. Nothing in this file is ever
// sent to the browser — it only runs on Cloudflare's servers.

const COOKIE_NAME = "refine_auth";
const SESSION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function base64url(bytes) {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(data, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return base64url(new Uint8Array(sig));
}

export async function makeSessionCookie(role, secret) {
  const expiry = Date.now() + SESSION_MS;
  const payload = `${role}.${expiry}`;
  const sig = await hmac(payload, secret);
  const value = encodeURIComponent(`${payload}.${sig}`);
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MS / 1000}`;
}

export function clearedSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function verifySession(request, secret) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  let value;
  try { value = decodeURIComponent(match[1]); } catch { return null; }
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [role, expiry, sig] = parts;
  if (role !== "student" && role !== "admin") return null;
  if (!expiry || Date.now() > Number(expiry)) return null;
  const expectedSig = await hmac(`${role}.${expiry}`, secret);
  if (sig !== expectedSig) return null;
  return role;
}
