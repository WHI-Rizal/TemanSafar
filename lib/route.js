// Geometri jalur tol (perkiraan) + perencana rute.
// Tiap "garis" adalah satu jaringan tol yang nyambung. Posisi di garis pakai angka KM.
// Koordinat kota dipakai sebagai titik-titik polyline, jadi posisi rest area & snap GPS
// masih PERKIRAAN sampai koordinat asli terkumpul dari laporan musafir.

export const RUAS = [
  ["merak", "Tangerang – Merak", "jawa"], ["tangerang", "Jakarta – Tangerang", "jawa"], ["japek", "Jakarta – Cikampek", "jawa"],
  ["cipali", "Cikampek – Palimanan (Cipali)", "jawa"], ["palikanci", "Palimanan – Kanci", "jawa"], ["kanpek", "Kanci – Pejagan", "jawa"],
  ["pejagan", "Pejagan – Pemalang", "jawa"], ["pemalang", "Pemalang – Batang", "jawa"], ["batang", "Batang – Semarang", "jawa"],
  ["semsol", "Semarang – Solo", "jawa"], ["songa", "Solo – Ngawi", "jawa"], ["ngawi", "Ngawi – Kertosono", "jawa"],
  ["kertosono", "Kertosono – Mojokerto", "jawa"], ["sumo", "Mojokerto – Surabaya", "jawa"], ["surgem", "Surabaya – Gempol", "jawa"],
  ["gempas", "Gempol – Pasuruan", "jawa"], ["paspro", "Pasuruan – Probolinggo", "jawa"],
  ["jagorawi", "Jagorawi", "jagorawi"], ["purbaleunyi", "Cipularang – Purbaleunyi", "bandung"], ["pandaan", "Pandaan – Malang", "malang"],
  ["bakter", "Bakauheni – Terbanggi Besar", "sumsel"], ["terpeka", "Terbanggi Besar – Kayu Agung", "sumsel"],
  ["indmen", "Indralaya – Muara Enim", "indmen"], ["pekdum", "Pekanbaru – Dumai", "riau"],
  ["medtebing", "Medan – Kualanamu – Tebing Tinggi", "sumut"], ["indkis", "Indrapura – Kisaran", "sumut"],
  ["binlang", "Binjai – Langsa", "aceh"],
];
export const RUAS_NAME = Object.fromEntries(RUAS.map((r) => [r[0], r[1]]));
export const LINE_OF = Object.fromEntries(RUAS.map((r) => [r[0], r[2]]));

export const LINES = {
  jawa: { nama: "Tol Trans Jawa", T: "Ke Timur", B: "Ke Barat" },
  jagorawi: { nama: "Tol Jagorawi", T: "Ke Bogor", B: "Ke Jakarta" },
  bandung: { nama: "Tol Cipularang – Purbaleunyi", T: "Ke Bandung", B: "Ke Jakarta" },
  malang: { nama: "Tol Pandaan – Malang", T: "Ke Malang", B: "Ke Surabaya" },
  sumsel: { nama: "Tol Trans Sumatera (Lampung – Sumsel)", T: "Ke Palembang", B: "Ke Bakauheni" },
  indmen: { nama: "Tol Indralaya – Muara Enim", T: "Ke Muara Enim", B: "Ke Palembang" },
  riau: { nama: "Tol Pekanbaru – Dumai", T: "Ke Dumai", B: "Ke Pekanbaru" },
  sumut: { nama: "Tol Medan – Kisaran", T: "Ke Kisaran", B: "Ke Medan" },
  aceh: { nama: "Tol Binjai – Langsa", T: "Ke Langsa", B: "Ke Binjai" },
};

// [nama, garis, posisi KM perkiraan, wilayah, lat, lon]
export const CITIES = [
  ["Merak", "jawa", -98, "Banten", -5.93, 106.0], ["Cilegon", "jawa", -90, "Banten", -6.0, 106.05], ["Serang", "jawa", -70, "Banten", -6.12, 106.15],
  ["Tangerang", "jawa", -20, "Banten", -6.18, 106.63], ["Jakarta", "jawa", 0, "Jabodetabek", -6.2, 106.85], ["Bekasi", "jawa", 12, "Jabodetabek", -6.24, 107.0],
  ["Cikarang", "jawa", 30, "Jawa Barat", -6.31, 107.15], ["Karawang", "jawa", 47, "Jawa Barat", -6.32, 107.3], ["Cikampek", "jawa", 70, "Jawa Barat", -6.4, 107.46],
  ["Subang", "jawa", 110, "Jawa Barat", -6.57, 107.76], ["Majalengka (Kertajati)", "jawa", 160, "Jawa Barat", -6.65, 108.17], ["Cirebon", "jawa", 215, "Jawa Barat", -6.73, 108.55],
  ["Brebes", "jawa", 245, "Jawa Tengah", -6.87, 109.04], ["Tegal", "jawa", 265, "Jawa Tengah", -6.87, 109.14], ["Pemalang", "jawa", 305, "Jawa Tengah", -6.89, 109.38],
  ["Pekalongan", "jawa", 335, "Jawa Tengah", -6.89, 109.67], ["Batang", "jawa", 350, "Jawa Tengah", -6.91, 109.73], ["Kendal", "jawa", 375, "Jawa Tengah", -6.92, 110.2],
  ["Semarang", "jawa", 410, "Jawa Tengah", -6.99, 110.42], ["Salatiga", "jawa", 450, "Jawa Tengah", -7.33, 110.5], ["Boyolali", "jawa", 470, "Jawa Tengah", -7.53, 110.6],
  ["Solo", "jawa", 490, "Jawa Tengah", -7.57, 110.82], ["Sragen", "jawa", 525, "Jawa Tengah", -7.43, 111.02], ["Ngawi", "jawa", 580, "Jawa Timur", -7.4, 111.45],
  ["Madiun", "jawa", 605, "Jawa Timur", -7.63, 111.52], ["Nganjuk", "jawa", 645, "Jawa Timur", -7.6, 111.9], ["Kertosono", "jawa", 670, "Jawa Timur", -7.59, 112.1],
  ["Jombang", "jawa", 690, "Jawa Timur", -7.55, 112.23], ["Mojokerto", "jawa", 710, "Jawa Timur", -7.47, 112.43], ["Surabaya", "jawa", 735, "Jawa Timur", -7.33, 112.73],
  ["Sidoarjo", "jawa", 750, "Jawa Timur", -7.45, 112.72], ["Gempol", "jawa", 780, "Jawa Timur", -7.56, 112.69], ["Pasuruan", "jawa", 800, "Jawa Timur", -7.64, 112.91],
  ["Probolinggo", "jawa", 845, "Jawa Timur", -7.75, 113.22],
  ["Cibubur", "jagorawi", 12, "Jabodetabek", -6.37, 106.89], ["Sentul", "jagorawi", 35, "Jabodetabek", -6.56, 106.85], ["Bogor", "jagorawi", 45, "Jabodetabek", -6.6, 106.8],
  ["Ciawi (Puncak)", "jagorawi", 50, "Jabodetabek", -6.65, 106.85],
  ["Purwakarta", "bandung", 80, "Jawa Barat", -6.55, 107.44], ["Padalarang", "bandung", 120, "Jawa Barat", -6.84, 107.47], ["Bandung", "bandung", 135, "Jawa Barat", -6.92, 107.61],
  ["Cileunyi", "bandung", 157, "Jawa Barat", -6.94, 107.75],
  ["Pandaan", "malang", 52, "Jawa Timur", -7.65, 112.69], ["Lawang", "malang", 80, "Jawa Timur", -7.83, 112.7], ["Malang", "malang", 90, "Jawa Timur", -7.98, 112.63],
  ["Bakauheni", "sumsel", 0, "Sumatera", -5.87, 105.75], ["Kalianda", "sumsel", 25, "Sumatera", -5.73, 105.59], ["Bandar Lampung", "sumsel", 80, "Sumatera", -5.4, 105.27],
  ["Terbanggi Besar", "sumsel", 140, "Sumatera", -4.88, 105.22], ["Menggala", "sumsel", 180, "Sumatera", -4.48, 105.27], ["Kayu Agung", "sumsel", 320, "Sumatera", -3.39, 104.83],
  ["Palembang", "sumsel", 365, "Sumatera", -2.98, 104.75],
  ["Indralaya", "indmen", 0, "Sumatera", -3.22, 104.65], ["Prabumulih", "indmen", 64, "Sumatera", -3.43, 104.24], ["Muara Enim", "indmen", 120, "Sumatera", -3.65, 103.77],
  ["Pekanbaru", "riau", 0, "Sumatera", 0.51, 101.45], ["Dumai", "riau", 131, "Sumatera", 1.67, 101.45],
  ["Medan", "sumut", 10, "Sumatera", 3.59, 98.67], ["Kualanamu", "sumut", 30, "Sumatera", 3.64, 98.88], ["Tebing Tinggi", "sumut", 90, "Sumatera", 3.33, 99.16],
  ["Indrapura", "sumut", 105, "Sumatera", 3.29, 99.5], ["Kisaran", "sumut", 160, "Sumatera", 2.98, 99.62],
  ["Binjai", "aceh", 0, "Sumatera", 3.6, 98.49], ["Stabat", "aceh", 20, "Sumatera", 3.73, 98.45], ["Pangkalan Brandan", "aceh", 55, "Sumatera", 4.02, 98.28],
];
export const COORD = Object.fromEntries(CITIES.map((c) => [c[0], [c[4], c[5]]]));

// Sambungan antar garis: [garisA, posA, garisB, posB, catatan]
export const JUNC = [
  ["jawa", 0, "jagorawi", 0, null], ["jawa", 66, "bandung", 66, null], ["jawa", 780, "malang", 45, null],
  ["jawa", -98, "sumsel", 0, "ferry"], ["sumsel", 365, "indmen", 0, null], ["sumut", 10, "aceh", 0, null],
];

const LINE_PTS = {};
for (const c of CITIES) (LINE_PTS[c[1]] = LINE_PTS[c[1]] || []).push([c[2], c[4], c[5]]);
LINE_PTS.jagorawi.push([0, ...COORD.Jakarta]);
LINE_PTS.bandung.push([66, ...COORD.Cikampek]);
LINE_PTS.malang.push([45, ...COORD.Gempol]);
for (const k in LINE_PTS) LINE_PTS[k].sort((a, b) => a[0] - b[0]);
export { LINE_PTS };

export function coordAt(line, pos) {
  const P = LINE_PTS[line];
  if (!P) return COORD.Jakarta;
  if (pos <= P[0][0]) return [P[0][1], P[0][2]];
  for (let i = 1; i < P.length; i++)
    if (pos <= P[i][0]) {
      const a = P[i - 1], b = P[i], f = (pos - a[0]) / (b[0] - a[0] || 1);
      return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    }
  const z = P[P.length - 1];
  return [z[1], z[2]];
}

export function nearCity(line, pos) {
  let best = null, d = 1e9;
  for (const c of CITIES) if (c[1] === line && Math.abs(c[2] - pos) < d) { d = Math.abs(c[2] - pos); best = c[0]; }
  return best;
}

export function distKm(lat1, lon1, lat2, lon2) {
  const R = 6371, r = Math.PI / 180, dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Tempelkan posisi GPS ke garis tol terdekat. Hasil: {line, pos, distKm}
export function snapToLines(lat, lon) {
  let best = null;
  const kx = 111.32 * Math.cos((lat * Math.PI) / 180), ky = 110.57;
  for (const line in LINE_PTS) {
    const P = LINE_PTS[line];
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i];
      const ax = (a[2] - lon) * kx, ay = (a[1] - lat) * ky, bx = (b[2] - lon) * kx, by = (b[1] - lat) * ky;
      const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
      const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L2));
      const px = ax + t * dx, py = ay + t * dy, d = Math.sqrt(px * px + py * py);
      if (!best || d < best.distKm) best = { line, pos: a[0] + t * (b[0] - a[0]), distKm: d };
    }
  }
  return best;
}

const CITY = Object.fromEntries(CITIES.map((c) => [c[0].toLowerCase(), { nama: c[0], line: c[1], pos: c[2] }]));
export function findCity(v) {
  v = String(v || "").trim().toLowerCase();
  if (!v) return null;
  if (CITY[v]) return CITY[v];
  const hits = CITIES.filter((c) => c[0].toLowerCase().startsWith(v) || c[0].toLowerCase().includes(v));
  return hits.length === 1 ? CITY[hits[0][0].toLowerCase()] : null;
}

export function planRoute(a, b) {
  const prev = { [a.line]: null }, q = [a.line];
  while (q.length) {
    const L = q.shift();
    if (L === b.line) break;
    for (const j of JUNC) {
      let n = null, e = null;
      if (j[0] === L) { n = j[2]; e = { from: j[0], fp: j[1], to: j[2], tp: j[3], note: j[4] }; }
      else if (j[2] === L) { n = j[0]; e = { from: j[2], fp: j[3], to: j[0], tp: j[1], note: j[4] }; }
      if (n && !(n in prev)) { prev[n] = e; q.push(n); }
    }
  }
  if (!(b.line in prev)) return null;
  const hops = [];
  for (let L = b.line; prev[L]; L = prev[L].from) hops.unshift(prev[L]);
  const legs = [];
  let line = a.line, pos = a.pos;
  for (const h of hops) {
    legs.push({ line, from: pos, to: h.fp });
    if (h.note === "ferry") legs.push({ ferry: true });
    line = h.to; pos = h.tp;
  }
  legs.push({ line, from: pos, to: b.pos });
  return legs.filter((l) => l.ferry || l.from !== l.to);
}
