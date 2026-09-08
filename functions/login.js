import { makeSessionCookie } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Bad request." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const password = typeof body.password === "string" ? body.password.trim() : "";
  let role = null;
  if (password && env.EDITOR_PASSWORD && password === env.EDITOR_PASSWORD) role = "admin";
  else if (password && env.STUDENT_PASSWORD && password === env.STUDENT_PASSWORD) role = "student";

  if (!role) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const cookie = await makeSessionCookie(role, env.COOKIE_SECRET);
  return new Response(JSON.stringify({ ok: true, role }), {
    headers: { "Content-Type": "application/json", "Set-Cookie": cookie },
  });
}
