import type { Request } from 'express';

/** httpOnly cookie sessions. `aud` keeps admin and customer tokens from being swapped. */
export const ADMIN_COOKIE = 'mm_admin';
export const USER_COOKIE = 'mm_user';

export const cookieOpts = (path: string) => ({
  httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path,
});

export function readCookie(req: Request, name: string): string | undefined {
  for (const part of req.headers.cookie?.split(';') ?? []) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
}

export const isDev = () => process.env.NODE_ENV !== 'production';

/** Uploaded files are stored as "/uploads/x.webp"; clients get an absolute URL. */
export const assetUrl = (u: string) => (/^https?:\/\//.test(u) ? u : (process.env.PUBLIC_URL ?? 'http://localhost:4100') + u);
