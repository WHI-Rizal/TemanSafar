import RAW from "../data/restarea.json";
import { LINE_OF, RUAS_NAME, LINES, coordAt } from "./route";

// Tambahkan turunan: garis, posisi di garis, koordinat (asli kalau ada, kalau nggak perkiraan), nama.
export const STOPS = RAW.map((s) => {
  const line = LINE_OF[s.ruas];
  const pos = line === "jawa" ? s.pos ?? s.km : s.km;
  const approx = !(typeof s.lat === "number" && typeof s.lon === "number");
  const [lat, lon] = approx ? coordAt(line, pos) : [s.lat, s.lon];
  const jalur = s.arah === "TB" ? "" : s.arah === "T" ? " A" : " B";
  return {
    ...s, line, linePos: pos, lat, lon, approx,
    nama: s.nama || `Rest Area KM ${s.km}${jalur}`,
    ruasNama: RUAS_NAME[s.ruas] || s.ruas,
    arahNama: s.arah === "TB" ? "Dua arah" : LINES[line]?.[s.arah] || "",
  };
});
export const STOP_BY_ID = Object.fromEntries(STOPS.map((s) => [s.id, s]));

// Gabungkan data dasar + laporan musafir
export function merged(stop, reports) {
  const rs = (reports || []).filter((r) => r.masjidId === stop.id).sort((a, b) => b.ts - a.ts);
  const f = { ...(stop.fasilitas || {}) };
  let clean = f.kebersihan ?? null, upd = stop.updatedAt || 0;
  if (rs.length) {
    const recent = rs.slice(0, 5);
    clean = Math.round((recent.reduce((a, r) => a + r.kebersihan, 0) / recent.length) * 10) / 10;
    for (const k of ["mukena", "sarung", "bus", "rebahan", "difabel"]) {
      const hit = rs.find((r) => typeof r[k] === "boolean");
      if (hit) f[k] = hit[k];
    }
    upd = Math.max(upd, rs[0].ts);
  }
  const fixes = rs.filter((r) => r.lokasi && r.lokasi.acc < 150);
  return { f, clean, upd, last: rs[0], count: rs.length, fixes: fixes.length };
}

export function ago(ts, now = Date.now()) {
  if (!ts) return { t: "Belum pernah dicek", c: "stale" };
  const d = Math.floor((now - ts) / 864e5);
  if (d < 1) return { t: "Diperbarui hari ini", c: "ok" };
  if (d < 8) return { t: `Diperbarui ${d} hari lalu`, c: "ok" };
  if (d < 31) return { t: `Diperbarui ${d} hari lalu`, c: "old" };
  return { t: `Diperbarui ${Math.floor(d / 30)} bulan lalu`, c: "stale" };
}

export function passFilter(m, filters) {
  if (filters.has("bersih") && !(m.clean >= 4)) return false;
  for (const k of ["mukena", "bus", "rebahan", "difabel"]) if (filters.has(k) && m.f[k] !== true) return false;
  return true;
}

const navQuery = (s) => (s.approx ? `Rest Area KM ${s.km} Tol ${s.ruasNama.replace(/ \(.*\)/, "").replace(" – ", " ")}` : `${s.lat},${s.lon}`);
export const mapsUrl = (s) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(navQuery(s));
export const wazeUrl = (s) => (s.approx ? "https://waze.com/ul?q=" + encodeURIComponent(navQuery(s)) + "&navigate=yes" : `https://waze.com/ul?ll=${s.lat},${s.lon}&navigate=yes`);
export const masjidNearUrl = (lat, lon) => `https://www.google.com/maps/search/masjid/@${lat.toFixed(5)},${lon.toFixed(5)},14z`;
