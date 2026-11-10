// Layanan navigasi: cari tempat, ambil rute jalan asli, teks belokan, masjid di sepanjang rute, waktu shalat di rute.
import { buildLine, hav, project, pointAt, segAt } from "./geo";
import { prayerNow, timesAt, currentEnds, SHALAT } from "./prayer";
import { TILE as PTILE, tileBox, fetchTile } from "./poiTile";

const MAPBOX = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
export const ROUTE_PROVIDER = MAPBOX ? "Mapbox" : "OSRM";
export const MODES = { mobil: "Mobil", motor: "Motor" };

// ---------- cari tempat (Photon, data OpenStreetMap) ----------
export async function geocode(q, near, signal) {
  const u = new URL("https://photon.komoot.io/api/");
  u.searchParams.set("q", q);
  u.searchParams.set("limit", "6");
  u.searchParams.set("lang", "default"); // nama lokal (Indonesia), bukan versi Inggris
  u.searchParams.set("bbox", "94.5,-11.5,141.5,6.5");
  if (near) { u.searchParams.set("lat", near[1].toFixed(4)); u.searchParams.set("lon", near[0].toFixed(4)); }
  // saran cepat jangan nunggu lama: kalau Photon lemot, berhenti di 4 detik
  const sig = signal && AbortSignal.any ? AbortSignal.any([signal, AbortSignal.timeout(4000)]) : signal;
  const r = await fetch(u, { signal: sig });
  if (!r.ok) throw new Error("geocode_" + r.status);
  const j = await r.json();
  return (j.features || []).map((f) => {
    const p = f.properties || {};
    const detail = [p.street, p.district || p.locality, p.city || p.county, p.state].filter(Boolean);
    const kind = p.osm_key === "amenity" && p.osm_value === "place_of_worship" ? "masjid" : p.osm_key === "place" || p.type === "city" ? "kota" : p.osm_key === "highway" ? "jalan" : "lain";
    return { nama: p.name || detail[0] || "Tanpa nama", detail: [...new Set(detail)].join(", "), lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], kind };
  });
}

// Pencarian lengkap (Nominatim, pencarian resmi OpenStreetMap). Lebih teliti buat nama jalan,
// perumahan, dan alamat. Aturan pakainya nggak boleh buat saran tiap ketikan, jadi cuma dipanggil
// pas pengguna tekan Enter / tombol "Cari lebih lengkap".
export async function searchFull(q, near, signal) {
  const u = new URL("https://nominatim.openstreetmap.org/search");
  u.searchParams.set("q", q);
  u.searchParams.set("format", "jsonv2");
  u.searchParams.set("countrycodes", "id");
  u.searchParams.set("addressdetails", "1");
  u.searchParams.set("limit", "8");
  u.searchParams.set("accept-language", "id");
  if (near) { // utamakan yang dekat, tapi tetap boleh hasil di luar kotak
    const [lon, lat] = near;
    u.searchParams.set("viewbox", `${(lon - 1.5).toFixed(3)},${(lat + 1.5).toFixed(3)},${(lon + 1.5).toFixed(3)},${(lat - 1.5).toFixed(3)}`);
  }
  const sig = signal && AbortSignal.any ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : signal;
  const r = await fetch(u, { signal: sig, headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error("search_" + r.status);
  const j = await r.json();
  return j.map((x) => {
    const a = x.address || {};
    const nama = x.name || x.display_name.split(",")[0];
    const area = [a.suburb || a.village || a.neighbourhood || a.quarter, a.city_district || a.district, a.city || a.town || a.county || a.regency, a.state].filter(Boolean);
    const kind = x.category === "amenity" && x.type === "place_of_worship" ? "masjid" : x.category === "highway" ? "jalan" : x.category === "place" || x.category === "boundary" ? "kota" : "lain";
    return { nama, detail: [...new Set(area)].filter((t) => t !== nama).join(", "), lon: +x.lon, lat: +x.lat, kind };
  });
}

// ---------- rute ----------
// opts.mode: "mobil" | "motor". opts.avoidToll: buat mobil yang mau lewat jalan biasa.
// Mobil lewat tol: OSRM (atau Mapbox kalau ada token). Motor & mobil tanpa tol: Valhalla (FOSSGIS),
// karena motor di Indonesia nggak boleh masuk tol dan OSRM publik nggak punya profil motor.
export async function fetchRoute(points, opts = {}, signal) {
  const mode = opts.mode === "motor" ? "motor" : "mobil";
  if (mode === "motor" || opts.avoidToll) {
    try { return await fetchValhalla(points, mode, signal); }
    catch (e) { if (mode === "motor" || e.name === "AbortError") throw e; } // mobil: kalau gagal, pakai rute biasa
  }
  return fetchOsrm(points, signal);
}

async function fetchOsrm(points, signal) {
  const c = points.map((p) => `${p[0].toFixed(6)},${p[1].toFixed(6)}`).join(";");
  const url = MAPBOX
    ? `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${c}?steps=true&geometries=geojson&overview=false&language=id&access_token=${MAPBOX}`
    : `https://router.project-osrm.org/route/v1/driving/${c}?steps=true&geometries=geojson&overview=false`;
  const r = await fetch(url, { signal });
  const j = await r.json().catch(() => ({}));
  if (j.code !== "Ok" || !j.routes?.length) throw new Error(j.message || j.code || "no_route");
  return { ...parseRoute(j.routes[0]), provider: MAPBOX ? "Mapbox" : "OSRM", mode: "mobil", avoidToll: false };
}

const VALHALLA = "https://valhalla1.openstreetmap.de/route";
// tipe manuver Valhalla -> [tipe, arah] gaya OSRM supaya teks belokan & ikon tinggal pakai yang sama
const VMAP = {
  1: ["depart"], 2: ["depart", "right"], 3: ["depart", "left"], 4: ["arrive"], 5: ["arrive", "right"], 6: ["arrive", "left"],
  7: ["new name", "straight"], 8: ["continue", "straight"], 9: ["turn", "slight right"], 10: ["turn", "right"], 11: ["turn", "sharp right"],
  12: ["turn", "uturn"], 13: ["turn", "uturn"], 14: ["turn", "sharp left"], 15: ["turn", "left"], 16: ["turn", "slight left"],
  17: ["on ramp", "straight"], 18: ["on ramp", "right"], 19: ["on ramp", "left"], 20: ["off ramp", "right"], 21: ["off ramp", "left"],
  22: ["fork", "straight"], 23: ["fork", "right"], 24: ["fork", "left"], 25: ["merge", "straight"], 26: ["roundabout"], 27: ["exit roundabout"],
  28: ["notification", "straight"], 29: ["notification", "straight"], 37: ["merge", "right"], 38: ["merge", "left"],
};

function decode6(str) {
  const out = [];
  let i = 0, lat = 0, lon = 0;
  while (i < str.length) {
    for (const k of [0, 1]) {
      let b, shift = 0, res = 0;
      do { b = str.charCodeAt(i++) - 63; res |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      const d = res & 1 ? ~(res >> 1) : res >> 1;
      if (k === 0) lat += d; else lon += d;
    }
    out.push([lon / 1e6, lat / 1e6]);
  }
  return out;
}

async function fetchValhalla(points, mode, signal) {
  const costing = mode === "motor" ? "motorcycle" : "auto";
  const body = {
    locations: points.map((p, i) => ({ lon: p[0], lat: p[1], type: i === 0 || i === points.length - 1 ? "break" : "break" })),
    costing,
    costing_options: mode === "motor" ? { motorcycle: { use_highways: 0, use_tolls: 0, use_trails: 0 } } : { auto: { use_tolls: 0 } },
    units: "kilometers",
  };
  const r = await fetch(`${VALHALLA}?json=${encodeURIComponent(JSON.stringify(body))}`, { signal });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.trip?.legs?.length) throw new Error(j.error || "no_route");
  // ubah ke bentuk OSRM, lalu pakai parser yang sama
  const legs = j.trip.legs.map((leg) => {
    const shape = decode6(leg.shape);
    return {
      steps: leg.maneuvers.map((m) => {
        const [type, modifier] = VMAP[m.type] || ["continue", "straight"];
        const geom = shape.slice(m.begin_shape_index, Math.max(m.begin_shape_index + 1, m.end_shape_index) + 1);
        return {
          maneuver: { type, modifier, exit: m.roundabout_exit_count },
          name: (m.street_names || m.begin_street_names || [])[0] || "",
          distance: (m.length || 0) * 1000, duration: m.time || 0,
          geometry: { coordinates: geom.length > 1 ? geom : [geom[0], geom[0]] },
          intersections: [{ classes: [m.toll ? "toll" : null, m.highway ? "motorway" : null].filter(Boolean) }],
        };
      }),
    };
  });
  return { ...parseRoute({ legs }), provider: "Valhalla", mode, avoidToll: true };
}

export function parseRoute(rt) {
  const coords = [], segDur = [0], steps = [];
  rt.legs.forEach((leg, li) => {
    leg.steps.forEach((st) => {
      const g = st.geometry?.coordinates || [];
      const classes = (st.intersections || []).flatMap((x) => x.classes || []);
      const startIdx = coords.length ? coords.length - 1 : 0;
      steps.push({
        type: st.maneuver.type, modifier: st.maneuver.modifier, exit: st.maneuver.exit,
        name: st.name || "", ref: st.ref || "", destinations: st.destinations || "",
        distance: st.distance, duration: st.duration, leg: li, startIdx,
        toll: classes.includes("toll") || /\btol\b/i.test(st.name || ""), motorway: classes.includes("motorway"),
        waypoint: st.maneuver.type === "arrive" && li < rt.legs.length - 1,
      });
      for (let k = 0; k < g.length; k++) {
        if (coords.length && k === 0) continue;
        if (coords.length) {
          const d = hav(coords[coords.length - 1], g[k]);
          segDur.push(st.distance > 0 ? (st.duration * d) / st.distance : 0);
        }
        coords.push(g[k]);
      }
    });
  });
  if (coords.length < 2) throw new Error("route_empty");
  const line = buildLine(coords);
  const cumDur = [0];
  for (let i = 1; i < coords.length; i++) cumDur.push(cumDur[i - 1] + (segDur[i] || 0));
  steps.forEach((s) => { s.along = line.cum[Math.min(s.startIdx, line.cum.length - 1)]; });
  return { line, cumDur, steps, distance: line.length, duration: cumDur[cumDur.length - 1], legs: rt.legs.length };
}

// detik perjalanan (perkiraan layanan rute) dari awal sampai titik "along"
export function durAt(route, along) {
  const { line, cumDur } = route;
  if (along <= 0) return 0;
  if (along >= line.length) return cumDur[cumDur.length - 1];
  const i = segAt(line, along), f = (along - line.cum[i - 1]) / (line.cum[i] - line.cum[i - 1] || 1);
  return cumDur[i - 1] + f * (cumDur[i] - cumDur[i - 1]);
}

export function stepIndexAt(route, along) {
  const s = route.steps;
  let i = 0;
  for (let k = 0; k < s.length; k++) if (s[k].along <= along + 1) i = k; else break;
  return i;
}

// ---------- teks belokan bahasa Indonesia ----------
export const roadName = (s) => s.name || s.ref || (s.destinations ? "arah " + s.destinations.split(",")[0] : "");

export function instr(s) {
  const m = s.modifier || "", side = m.includes("left") ? "kiri" : m.includes("right") ? "kanan" : null;
  const nm = roadName(s), ke = nm ? ` ke ${nm}` : "";
  const turn = () => {
    if (m === "uturn") return "Putar balik";
    if (m === "straight" || !side) return "Lurus terus";
    if (m.startsWith("slight")) return `Agak ke ${side}`;
    if (m.startsWith("sharp")) return `Belok tajam ke ${side}`;
    return `Belok ${side}`;
  };
  switch (s.type) {
    case "depart": return nm ? `Jalan lewat ${nm}` : "Mulai jalan";
    case "arrive": return s.waypoint ? "Sampai di tempat singgah" : "Sampai di tujuan";
    case "turn": case "continue": return turn() + ke;
    case "end of road": return "Di ujung jalan, " + turn().toLowerCase() + ke;
    case "new name": return nm ? `Lanjut ke ${nm}` : "Lurus terus";
    case "merge": return "Gabung" + ke;
    case "on ramp": return `Masuk${side ? " lewat jalur " + side : ""}${ke}`;
    case "off ramp": return `Ambil jalan keluar${side ? " sebelah " + side : ""}${ke}`;
    case "fork": return `Ambil jalur ${side || "tengah"}${ke}`;
    case "roundabout": case "rotary": return `Masuk bundaran, ambil keluar ke-${s.exit || 1}${ke}`;
    case "exit roundabout": case "exit rotary": return "Keluar bundaran" + ke;
    default: return nm ? `Lanjut ke ${nm}` : "Lurus terus";
  }
}

export function iconKey(s) {
  if (s.type === "arrive") return "arrive";
  if (s.type === "roundabout" || s.type === "rotary") return "roundabout";
  const m = s.modifier || "";
  if (m === "uturn") return "uturn";
  if (m.includes("left")) return m.startsWith("slight") || s.type === "fork" || s.type === "off ramp" || s.type === "on ramp" ? "slight-left" : "left";
  if (m.includes("right")) return m.startsWith("slight") || s.type === "fork" || s.type === "off ramp" || s.type === "on ramp" ? "slight-right" : "right";
  return "straight";
}

export function fmtDist(m) {
  if (m < 1000) return `${m < 100 ? Math.max(10, Math.round(m / 10) * 10) : Math.round(m / 50) * 50} m`;
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0).replace(".", ",")} km`;
}
// Jarak yang enak didengar: "300 meter", "satu setengah kilometer", "12 kilometer"
export function sayDist(m) {
  if (m < 1000) return `${m < 100 ? Math.max(10, Math.round(m / 10) * 10) : Math.round(m / 50) * 50} meter`;
  if (m >= 9750) return `${Math.round(m / 1000)} kilometer`;
  const k = Math.round(m / 500) / 2, whole = Math.floor(k);
  if (k === whole) return `${whole} kilometer`;
  return whole === 0 ? "setengah kilometer" : `${whole} setengah kilometer`;
}
export function fmtDur(sec) {
  const min = Math.max(0, Math.round(sec / 60));
  if (min < 60) return `${min} mnt`;
  return `${Math.floor(min / 60)} j ${String(min % 60).padStart(2, "0")} mnt`;
}

// ---------- masjid, musala, rest area dari OpenStreetMap ----------
// Diambil per kotak peta (~5,5 km) lewat /api/pois di server sendiri. Hasil per kotak disimpan
// di CDN, di memori, dan di HP (localStorage) supaya hemat kuota dan tetap ada pas sinyal hilang.
const TILE = PTILE;
const tileMem = new Map();
const tileKey = (lon, lat) => `${Math.floor(lon / TILE)}_${Math.floor(lat / TILE)}`;

function tilesFor(pts) {
  const set = new Set();
  for (const [lon, lat] of pts) {
    set.add(tileKey(lon, lat));
    // titik dekat pinggir kotak: ikut ambil kotak sebelah (radius ~700 m)
    const d = 0.007;
    for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) set.add(tileKey(lon + dx, lat + dy));
  }
  return [...set];
}

function readStore(k) { try { const v = JSON.parse(localStorage.getItem("jm-t-" + k) || "null"); if (v && Date.now() - v.at < 7 * 864e5) return v.pois; } catch {} return null; }
function writeStore(k, pois) { try { localStorage.setItem("jm-t-" + k, JSON.stringify({ at: Date.now(), pois })); } catch {} }

async function loadTile(k, signal) {
  if (tileMem.has(k)) return tileMem.get(k);
  const stored = readStore(k);
  if (stored) { tileMem.set(k, stored); return stored; }
  // Server sendiri (ada cache CDN, cepat kalau kotak ini pernah diminta orang lain) dikasih start duluan.
  // Kalau 2,5 detik belum jawab atau ditolak, HP langsung nanya ke Photon juga. Mana yang duluan berhasil, itu yang dipakai.
  const viaServer = fetch(`/api/pois?t=${k}`, { signal }).then(async (r) => {
    if (!r.ok) throw new Error("api_" + r.status);
    const j = await r.json();
    return { pois: j.pois || [], partial: !!j.partial };
  });
  const viaDirect = new Promise((res, rej) => {
    const go = () => fetchTile(tileBox(k), { signal, parallel: true }).then((d) => (d.failed < d.total ? res({ pois: d.pois, partial: d.failed > 0 }) : rej(new Error("direct_failed"))), rej);
    const t = setTimeout(go, 2500);
    viaServer.then((x) => { if (!x.partial) clearTimeout(t); else { clearTimeout(t); go(); } }, () => { clearTimeout(t); go(); });
  });
  let pois = null, partial = false;
  try { const x = await Promise.any([viaServer.then((x) => (x.partial ? Promise.reject(x) : x)), viaDirect]); pois = x.pois; partial = x.partial; }
  catch (e) {
    if (signal?.aborted) throw new DOMException("aborted", "AbortError");
    const part = await viaServer.catch(() => null);
    if (part) { pois = part.pois; partial = true; }
  }
  if (!pois) throw new Error("pois_failed");
  tileMem.set(k, pois);
  if (!partial) writeStore(k, pois);
  return pois;
}

export async function fetchPois(pts, signal, onProgress) {
  const keys = tilesFor(pts).slice(0, 80);
  const out = new Map();
  let ok = 0, i = 0;
  const worker = async () => {
    while (i < keys.length) {
      const k = keys[i++];
      try { (await loadTile(k, signal)).forEach((p) => out.set(p.id, p)); ok++; onProgress && onProgress([...out.values()]); }
      catch (e) { if (e.name === "AbortError") throw e; }
    }
  };
  await Promise.all(Array.from({ length: 3 }, worker));
  if (!ok && keys.length) throw new Error("pois_failed");
  return [...out.values()];
}

// Tempelkan POI ke rute dan saring yang beneran bisa disinggahi.
// Di jalan tol: cuma rest area di sisi KIRI (lajur kita, Indonesia lajur kiri) dan masjid di dalam rest area itu.
export function placePois(route, pois) {
  const rests = [];
  const placed = [];
  for (const p of pois) {
    const pr = project(route.line, [p.lon, p.lat]);
    if (!pr) continue;
    const st = route.steps[stepIndexAt(route, pr.along)];
    const x = { ...p, along: pr.along, off: pr.dist, side: pr.side, toll: !!st?.toll };
    if (p.kind === "rest") {
      if (pr.dist > 300) continue;
      if (x.toll && pr.side !== "kiri") continue;
      rests.push(x);
    }
    placed.push(x);
  }
  const out = [];
  for (const x of placed) {
    if (x.kind === "rest") { out.push(x); continue; }
    if (x.toll) {
      const host = rests.find((r) => hav([r.lon, r.lat], [x.lon, x.lat]) < 300);
      if (!host) continue;
      x.inRest = host.nama;
    } else if (x.off > 350) continue;
    out.push(x);
  }
  // buang dobel (rest area & masjidnya berdekatan): utamakan masjid
  out.sort((a, b) => a.along - b.along);
  return out.filter((x, i) => !(x.kind === "rest" && out.some((y) => y !== x && y.kind !== "rest" && Math.abs(y.along - x.along) < 400)));
}

// ---------- waktu shalat di sepanjang rute ----------
// factor = perbandingan waktu nyata vs perkiraan layanan rute (macet > 1)
export function etaAt(route, fromAlong, toAlong, now, factor = 1) {
  return now + (durAt(route, toAlong) - durAt(route, fromAlong)) * factor * 1000;
}

export function prayerOnRoute(route, fromAlong, now, factor = 1) {
  const ev = [];
  const step = Math.max(500, route.distance / 400);
  let prev = null;
  for (let d = fromAlong; d <= route.distance + 1; d += step) {
    const dd = Math.min(d, route.distance), pt = pointAt(route.line, dd).point, at = etaAt(route, fromAlong, dd, now, factor);
    const cur = prayerNow(at, pt[1], pt[0]);
    if (prev !== null && cur !== prev && cur !== "Terbit") ev.push({ nama: cur, along: dd, ms: timesAt(at, pt[1], pt[0])[cur], lon: pt[0], lat: pt[1] });
    prev = cur;
    if (d >= route.distance) break;
  }
  return ev;
}

// Pilih tempat singgah: buat shalat yang lagi berjalan & tiap waktu shalat yang masuk di jalan
export function pickStops(route, pois, along, now, factor, here, done = {}) {
  const ahead = pois.filter((p) => p.along > along + 150).map((p) => ({ ...p, km: (p.along - along) / 1000, at: etaAt(route, along, p.along, now, factor) }));
  const picks = [];
  const cur = currentEnds(now, here[1], here[0]);
  if (cur && SHALAT.includes(cur.nama) && !done[cur.nama]) {
    const p = ahead.find((x) => x.at < cur.ends - 10 * 60e3);
    picks.push({ nama: cur.nama, kind: "cur", ends: cur.ends, poi: p || null });
  }
  const events = prayerOnRoute(route, along, now, factor);
  for (const e of events) {
    const end = { Subuh: "Terbit", Dzuhur: "Ashar", Ashar: "Maghrib", Maghrib: "Isya" }[e.nama];
    const limit = end ? timesAt(e.ms, e.lat, e.lon)[end] - 10 * 60e3 : e.ms + 3 * 3600e3;
    const p = ahead.find((x) => x.along >= e.along - 300 && x.at <= limit && !picks.some((k) => k.poi?.id === x.id));
    picks.push({ nama: e.nama, kind: "next", ms: e.ms, along: e.along, lon: e.lon, lat: e.lat, poi: p || null });
  }
  return { ahead, picks, events };
}
