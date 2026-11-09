// Operasi garis rute. Semua titik pakai urutan [lon, lat] (format GeoJSON).
const R = 6371000, rad = Math.PI / 180;

export function hav(a, b) {
  const dLat = (b[1] - a[1]) * rad, dLon = (b[0] - a[0]) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function bearing(a, b) {
  const y = Math.sin((b[0] - a[0]) * rad) * Math.cos(b[1] * rad);
  const x = Math.cos(a[1] * rad) * Math.sin(b[1] * rad) - Math.sin(a[1] * rad) * Math.cos(b[1] * rad) * Math.cos((b[0] - a[0]) * rad);
  return (Math.atan2(y, x) / rad + 360) % 360;
}

export function buildLine(coords) {
  const cum = [0];
  for (let i = 1; i < coords.length; i++) cum.push(cum[i - 1] + hav(coords[i - 1], coords[i]));
  return { coords, cum, length: cum[cum.length - 1] || 0 };
}

// Proyeksikan titik ke garis. Hasil: jarak sepanjang rute, jarak tegak lurus, segmen, sisi (kiri/kanan arah jalan).
export function project(line, p, from = 1, to = Infinity) {
  const { coords, cum } = line;
  const kx = 111320 * Math.cos(p[1] * rad), ky = 110570;
  let best = null;
  const lo = Math.max(1, from), hi = Math.min(coords.length - 1, to);
  for (let i = lo; i <= hi; i++) {
    const a = coords[i - 1], b = coords[i];
    const ax = (a[0] - p[0]) * kx, ay = (a[1] - p[1]) * ky, bx = (b[0] - p[0]) * kx, by = (b[1] - p[1]) * ky;
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
    const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L2));
    const px = ax + t * dx, py = ay + t * dy, d = Math.hypot(px, py);
    if (!best || d < best.dist) {
      // vektor arah jalan (dx,dy) dan vektor ke titik (-ax,-ay): cross > 0 artinya titik di kiri
      const cross = dx * -ay - dy * -ax;
      best = { dist: d, seg: i, along: cum[i - 1] + t * (cum[i] - cum[i - 1]), side: cross > 0 ? "kiri" : "kanan", point: [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])] };
    }
  }
  return best;
}

export function segAt(line, along) {
  const { cum } = line;
  let lo = 1, hi = cum.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < along) lo = mid + 1; else hi = mid; }
  return Math.max(1, lo);
}

export function pointAt(line, along) {
  const { coords, cum } = line;
  if (coords.length < 2) return { point: coords[0], bearing: 0, seg: 0 };
  along = Math.max(0, Math.min(line.length, along));
  const i = segAt(line, along), a = coords[i - 1], b = coords[i];
  const f = (along - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
  return { point: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], bearing: bearing(a, b), seg: i };
}

// Arah jalan yang dihaluskan: lihat titik 40 m ke depan
export function headingAt(line, along) {
  const a = pointAt(line, along).point, b = pointAt(line, Math.min(line.length, along + 40)).point;
  return a[0] === b[0] && a[1] === b[1] ? pointAt(line, along).bearing : bearing(a, b);
}

export function sample(line, from, to, step) {
  const out = [];
  for (let d = Math.max(0, from); d <= Math.min(line.length, to); d += step) out.push(pointAt(line, d).point);
  return out;
}

export function slice(line, from, to) {
  const a = pointAt(line, from), b = pointAt(line, to);
  const out = [a.point];
  for (let i = a.seg; i < b.seg; i++) out.push(line.coords[i]);
  out.push(b.point);
  return out;
}
