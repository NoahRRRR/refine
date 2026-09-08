import { clearedSessionCookie } from "./_lib.js";

export async function onRequestPost() {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json", "Set-Cookie": clearedSessionCookie() },
  });
}
