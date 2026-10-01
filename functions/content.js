import { verifySession } from "./_lib.js";

// Server-side home for the course content (COURSE + QUIZZES) so an
// admin's edits are visible from every device and survive a cleared
// browser, instead of living only in one admin's localStorage. Every
// write keeps the prior version as a timestamped backup first, so a
// bad edit or a bad Import can always be recovered.

const CONTENT_KEY = "content";
const BACKUP_PREFIX = "content-backup-";
const MAX_BACKUPS = 30;

export async function onRequestGet({ request, env }) {
  const role = await verifySession(request, env.COOKIE_SECRET);
  if (!role) return new Response("Unauthorized", { status: 401 });

  const raw = await env.CONTENT_KV.get(CONTENT_KEY);
  const content = raw ? JSON.parse(raw) : null;
  return new Response(JSON.stringify({ content }), { headers: { "Content-Type": "application/json" } });
}

export async function onRequestPost({ request, env }) {
  const role = await verifySession(request, env.COOKIE_SECRET);
  if (role !== "admin") return new Response("Forbidden", { status: 403 });

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Bad JSON." }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  if (!body || !Array.isArray(body.course) || typeof body.quizzes !== "object") {
    return new Response(JSON.stringify({ ok: false, error: "Payload must include course (array) and quizzes (object)." }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const existing = await env.CONTENT_KV.get(CONTENT_KEY);
  if (existing) {
    await env.CONTENT_KV.put(`${BACKUP_PREFIX}${new Date().toISOString()}`, existing);
    await pruneOldBackups(env);
  }

  const payload = JSON.stringify({ course: body.course, quizzes: body.quizzes, savedAt: new Date().toISOString() });
  await env.CONTENT_KV.put(CONTENT_KEY, payload);
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
}

async function pruneOldBackups(env) {
  const list = await env.CONTENT_KV.list({ prefix: BACKUP_PREFIX });
  const keys = list.keys.map(k => k.name).sort();
  const excess = keys.length - MAX_BACKUPS;
  if (excess <= 0) return;
  await Promise.all(keys.slice(0, excess).map(name => env.CONTENT_KV.delete(name)));
}
