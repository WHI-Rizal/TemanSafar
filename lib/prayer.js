// Jadwal shalat metode Kemenag RI: Subuh 20°, Isya 18°, Ashar madzhab Syafi'i, ihtiyat 2 menit.
// Semua jam ditampilkan dalam WIB (Jawa & Sumatera).

const TZ = 7;
const rad = (d) => (d * Math.PI) / 180, deg = (r) => (r * 180) / Math.PI;
const fixA = (a) => a - 360 * Math.floor(a / 360);
const fixH = (h) => h - 24 * Math.floor(h / 24);

function julian(y, m, d) {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}
function sunPos(jd) {
  const D = jd - 2451545, g = fixA(357.529 + 0.98560028 * D), q = fixA(280.459 + 0.98564736 * D);
  const L = fixA(q + 1.915 * Math.sin(rad(g)) + 0.02 * Math.sin(rad(2 * g))), e = 23.439 - 0.00000036 * D;
  const RA = fixH(deg(Math.atan2(Math.cos(rad(e)) * Math.sin(rad(L)), Math.cos(rad(L)))) / 15);
  return { decl: deg(Math.asin(Math.sin(rad(e)) * Math.sin(rad(L)))), eqt: q / 15 - RA };
}

const cache = new Map();
export function prayerTimes(y, m, d, lat, lon) {
  const key = `${y}-${m}-${d}:${lat.toFixed(2)},${lon.toFixed(2)}`;
  if (cache.has(key)) return cache.get(key);
  const jd = julian(y, m, d) - lon / (15 * 24);
  const mid = (t) => fixH(12 - sunPos(jd + t).eqt);
  const ang = (a, t, ccw) => {
    const s = sunPos(jd + t), n = mid(t);
    const T = deg(Math.acos((-Math.sin(rad(a)) - Math.sin(rad(s.decl)) * Math.sin(rad(lat))) / (Math.cos(rad(s.decl)) * Math.cos(rad(lat))))) / 15;
    return n + (ccw ? -T : T);
  };
  const asrAngle = (t) => { const s = sunPos(jd + t); return -deg(Math.atan(1 / (1 + Math.tan(rad(Math.abs(lat - s.decl)))))); };
  // dua kali iterasi biar posisi matahari pas di jamnya
  const it = (f, t0) => f(f(t0) / 24);
  const fajr = it((t) => ang(20, t, true), 5 / 24);
  const sunrise = it((t) => ang(0.833, t, true), 6 / 24);
  const dhuhr = it((t) => mid(t), 12 / 24);
  const asr = it((t) => ang(asrAngle(t), t), 13 / 24);
  const maghrib = it((t) => ang(0.833, t), 18 / 24);
  const isha = it((t) => ang(18, t), 18 / 24);
  const base = Date.UTC(y, m - 1, d) - TZ * 3600e3;
  const ms = (h, extra) => base + Math.round(((h + TZ - lon / 15) * 60 + extra) * 60e3);
  const r = { Subuh: ms(fajr, 2), Terbit: ms(sunrise, -2), Dzuhur: ms(dhuhr, 2), Ashar: ms(asr, 2), Maghrib: ms(maghrib, 2), Isya: ms(isha, 2) };
  if (cache.size > 2000) cache.clear();
  cache.set(key, r);
  return r;
}

export const WIB = (ms) => {
  const d = new Date(ms + TZ * 3600e3);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes() };
};
export const jam = (ms) => { const w = WIB(ms); return String(w.h).padStart(2, "0") + "." + String(w.mi).padStart(2, "0"); };
export const ORDER_P = ["Subuh", "Terbit", "Dzuhur", "Ashar", "Maghrib", "Isya"];
export const SHALAT = ["Subuh", "Dzuhur", "Ashar", "Maghrib", "Isya"];

export function timesAt(ms, lat, lon) { const w = WIB(ms); return prayerTimes(w.y, w.m, w.d, lat, lon); }
export function prayerNow(ms, lat, lon) {
  const t = timesAt(ms, lat, lon);
  let cur = "Isya";
  for (const p of ORDER_P) if (t[p] <= ms) cur = p;
  return cur;
}
export function nextPrayer(ms, lat, lon) {
  for (let k = 0; k < 2; k++) {
    const t = timesAt(ms + k * 864e5, lat, lon);
    for (const p of SHALAT) if (t[p] > ms) return { nama: p, ms: t[p] };
  }
  return null;
}
// Batas akhir waktu shalat yang sedang berjalan (untuk "masih keburu atau nggak")
export function currentEnds(ms, lat, lon) {
  const cur = prayerNow(ms, lat, lon), t = timesAt(ms, lat, lon);
  const endKey = { Subuh: "Terbit", Dzuhur: "Ashar", Ashar: "Maghrib", Maghrib: "Isya" }[cur];
  if (!endKey) return null;
  return { nama: cur, ends: t[endKey] };
}
export const P_LABEL = { Subuh: "Waktu Subuh", Terbit: "Lewat Subuh, belum Dzuhur", Dzuhur: "Waktu Dzuhur", Ashar: "Waktu Ashar", Maghrib: "Waktu Maghrib", Isya: "Waktu Isya" };
