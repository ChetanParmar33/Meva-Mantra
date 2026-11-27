// Rules-based delivery estimate (free; replace with a courier serviceability API later).
const STATES: [number, number, string][] = [[11, 11, 'Delhi'], [12, 13, 'Haryana'], [14, 16, 'Punjab'], [17, 17, 'Himachal Pradesh'], [18, 19, 'Jammu & Kashmir'], [20, 28, 'Uttar Pradesh'], [30, 34, 'Rajasthan'], [36, 39, 'Gujarat'], [40, 44, 'Maharashtra'], [45, 48, 'Madhya Pradesh'], [49, 49, 'Chhattisgarh'], [50, 50, 'Telangana'], [51, 53, 'Andhra Pradesh'], [56, 59, 'Karnataka'], [60, 64, 'Tamil Nadu'], [67, 69, 'Kerala'], [70, 74, 'West Bengal'], [75, 77, 'Odisha'], [78, 78, 'Assam'], [80, 85, 'Bihar / Jharkhand']];
const CITIES: Record<string, string> = { 110: 'New Delhi', 400: 'Mumbai', 411: 'Pune', 380: 'Ahmedabad', 395: 'Surat', 390: 'Vadodara', 360: 'Rajkot', 560: 'Bengaluru', 600: 'Chennai', 500: 'Hyderabad', 700: 'Kolkata', 302: 'Jaipur', 122: 'Gurugram', 201: 'Noida', 226: 'Lucknow', 452: 'Indore' };

export function pincodeInfo(pin: string) {
  const two = Number(pin.slice(0, 2));
  const st = STATES.find(([a, b]) => two >= a && two <= b);
  const [etaMinDays, etaMaxDays] = two >= 36 && two <= 39 ? [2, 4] : /^(11|12|20|40|41|50|56|60|70)/.test(pin) ? [4, 6] : [5, 7];
  return { pincode: pin, serviceable: !!st, state: st?.[2] ?? null, city: CITIES[pin.slice(0, 3)] ?? null, etaMinDays, etaMaxDays, cod: !!st };
}
