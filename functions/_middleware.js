import { verifySession } from "./_lib.js";

// Default-deny: only these exact paths are servable without a valid
// session. Everything else (the actual course app) requires it.
const PUBLIC_PATHS = new Set([
  "/",
  "/index.html",
  "/login.html",
  "/login",
  "/logout",
  "/whoami",
  "/privacy.html",
  "/favicon.ico",
  "/IMG_3899.PNG",
  "/IMG_3988.JPG",
]);

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (PUBLIC_PATHS.has(path)) return next();

  const role = await verifySession(request, env.COOKIE_SECRET);
  if (!role) {
    return Response.redirect(`${url.origin}/login.html`, 302);
  }
  return next();
}
