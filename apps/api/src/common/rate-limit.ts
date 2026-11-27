import type { NextFunction, Request, Response } from 'express';
import { isDev } from './session.js';

// Spam guard for public form-like endpoints: 10 POSTs per IP per 10 minutes per route group.
// ponytail: in-memory and per-process; move to Redis if the API runs on several instances.
const LIMITED = [/^\/api\/enquiries$/, /^\/api\/newsletter$/, /^\/api\/products\/[^/]+\/reviews$/, /^\/api\/auth\/otp\/request$/];
const WINDOW_MS = 10 * 60 * 1000, MAX = isDev() ? 300 : 10; // relaxed locally so automated tests can run
const hits = new Map<string, number[]>();

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  if (req.method !== 'POST') return next();
  const group = LIMITED.findIndex(r => r.test(req.path));
  if (group < 0) return next();
  const key = `${group}:${req.ip}`, now = Date.now();
  const recent = (hits.get(key) ?? []).filter(t => now - t < WINDOW_MS);
  if (recent.length >= MAX) {
    res.status(429).json({ statusCode: 429, message: 'Too many requests. Please try again in a few minutes.' });
    return;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) hits.clear(); // crude memory cap
  next();
}
