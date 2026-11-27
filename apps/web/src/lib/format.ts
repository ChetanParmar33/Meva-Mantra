export const rupees = (paise: number) => '₹' + Math.round(paise / 100).toLocaleString('en-IN');
export const pctOff = (price: number, mrp: number | null | undefined) => (mrp && mrp > price ? Math.round((1 - price / mrp) * 100) : 0);
export const fmtDate = (d: string | Date, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) => new Date(d).toLocaleDateString('en-IN', opts);
/** n working days from today (Sundays skipped) — only call in event handlers/effects, never during render. */
export function addWorkingDays(n: number) {
  const d = new Date(); let added = 0;
  while (added < n) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0) added++; }
  return fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short' });
}
