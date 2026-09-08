import { verifySession } from "./_lib.js";

export async function onRequestGet({ request, env }) {
  const role = await verifySession(request, env.COOKIE_SECRET);
  return new Response(JSON.stringify({ role }), {
    headers: { "Content-Type": "application/json" },
  });
}
