import { STOPS } from "./data";
import { COORD, coordAt, nearCity } from "./route";
import { prayerNow, timesAt, nextPrayer, currentEnds, SHALAT } from "./prayer";

// ===== Mode Rencana: perkiraan dari jam berangkat & kecepatan =====
export const FERRY_MIN = 180;

export function legStops(l) {
  const d = l.to > l.from ? "T" : "B", lo = Math.min(l.from, l.to), hi = Math.max(l.from, l.to);
  return STOPS.filter((s) => s.line === l.line && s.arah.includes(d) && s.linePos >= lo && s.linePos <= hi)
    .sort((x, y) => (d === "T" ? x.linePos - y.linePos : y.linePos - x.linePos));
}

export function buildTimeline(legs, speed) {
  let t = 0;
  const segs = [];
  for (const l of legs) {
    if (l.ferry) { segs.push({ ferry: true, start: t, end: t + FERRY_MIN }); t += FERRY_MIN; continue; }
    const dur = (Math.abs(l.to - l.from) / speed) * 60;
    segs.push({ ...l, start: t, end: t + dur });
    t += dur;
  }
  return { segs, total: t };
}

export function placeAt(tl, min) {
  for (const s of tl.segs)
    if (min <= s.end) {
      if (s.ferry) {
        const f = (min - s.start) / FERRY_MIN, a = COORD.Merak, b = COORD.Bakauheni;
        return { ferry: true, lat: a[0] + (b[0] - a[0]) * f, lon: a[1] + (b[1] - a[1]) * f, label: "di kapal Merak – Bakauheni" };
      }
      const f = (min - s.start) / (s.end - s.start || 1), pos = s.from + (s.to - s.from) * f, c = coordAt(s.line, pos);
      return { line: s.line, pos, lat: c[0], lon: c[1], label: "sekitar " + nearCity(s.line, pos) };
    }
  const z = tl.segs[tl.segs.length - 1];
  if (z.ferry) return { lat: COORD.Bakauheni[0], lon: COORD.Bakauheni[1], label: "Bakauheni" };
  const c = coordAt(z.line, z.to);
  return { line: z.line, pos: z.to, lat: c[0], lon: c[1], label: "sekitar " + nearCity(z.line, z.to) };
}

export function prayerEvents(tl, depart) {
  const ev = [];
  let prev = null;
  for (let m = 0; m <= tl.total + 0.01; m += 3) {
    const mm = Math.min(m, tl.total), p = placeAt(tl, mm), at = depart + mm * 60e3, cur = prayerNow(at, p.lat, p.lon);
    if (prev !== null && cur !== prev && cur !== "Terbit")
      ev.push({ nama: cur, min: m, ms: timesAt(at, p.lat, p.lon)[cur], place: p.label, ferry: !!p.ferry });
    prev = cur;
  }
  return ev;
}

// ===== Mode Live: dari posisi GPS yang sudah ditempel ke garis tol =====
// Rest area di depan, lengkap dengan jarak, jam tiba, dan rekomendasi shalat.
export function upcoming({ line, pos, dir, speed, now, lat, lon, max = 10, done = {} }) {
  const v = Math.max(30, speed || 80);
  const ahead = STOPS.filter((s) => s.line === line && s.arah.includes(dir) && (dir === "T" ? s.linePos > pos + 0.2 : s.linePos < pos - 0.2))
    .map((s) => {
      const km = Math.abs(s.linePos - pos), min = (km / v) * 60, at = now + min * 60e3;
      return { s, km, min, at, pr: prayerNow(at, s.lat, s.lon) };
    })
    .sort((a, b) => a.km - b.km)
    .slice(0, max);

  const cur = currentEnds(now, lat, lon);
  const nx = nextPrayer(now, lat, lon);
  let pickCur = null, pickNext = null;
  if (cur && SHALAT.includes(cur.nama) && !done[cur.nama]) {
    const r = ahead.find((x) => x.at < cur.ends - 10 * 60e3);
    if (r) { r.pick = { nama: cur.nama, kind: "cur" }; pickCur = r; }
  }
  if (nx) {
    const r = ahead.find((x) => x.at >= nx.ms && !x.pick);
    if (r) { r.pick = { nama: nx.nama, kind: "next" }; pickNext = r; }
  }
  return { ahead, cur, nx, pickCur, pickNext };
}
