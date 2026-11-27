const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4100/api';
export const STORE_URL = process.env.NEXT_PUBLIC_STORE_URL ?? 'http://localhost:3100';

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Calls the Meva Mantra API with the admin session cookie. Pass FormData as body for uploads. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isForm = init.body instanceof FormData;
  const res = await fetch(BASE + path, {
    ...init,
    credentials: 'include',
    headers: isForm ? init.headers : { 'Content-Type': 'application/json', ...init.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new ApiError(res.status, msg || `Request failed (${res.status})`);
  }
  return body as T;
}

export const json = (method: string, data: unknown): RequestInit => ({ method, body: JSON.stringify(data) });
export const rupees = (paise: number | null | undefined) => (paise == null ? '' : '₹' + (paise / 100).toLocaleString('en-IN'));
/** "12.5" (rupees from a form) → 1250 paise; '' → null */
export const toPaise = (rs: string) => (rs.trim() === '' ? null : Math.round(Number(rs) * 100));
export const toRs = (paise: number | null | undefined) => (paise == null ? '' : String(paise / 100));
export const fmtDate = (d: string | null | undefined, time = true) =>
  d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', ...(time ? { hour: '2-digit', minute: '2-digit' } : {}) }) : '';
