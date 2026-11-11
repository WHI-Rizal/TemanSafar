// Logika bersama (server /api/pois dan browser) buat ambil masjid, musala, rest area, dan SPBU per kotak peta dari Photon.
export const TILE = 0.05;
// naikkan kalau isi per kotak berubah, biar cache lama di HP dan CDN nggak kepakai
export const POI_VER = 2;
export const PHOTON = "https://photon.komoot.io";

const WORSHIP_NAME = /masjid|mesjid|mosque|mus(h)?oll?a|musala|mushalla|surau|langgar|meunasah/i;
const NOT_MOSQUE = /gereja|church|pura\b|vihara|klenteng|kelenteng|wihara|kapel|chapel|temple|gki|gkj|hkbp|bethany|katedral/i;

export function tileBox(key) {
  const m = String(key).match(/^(-?\d{1,5})_(-?\d{1,5})$/);
  if (!m) return null;
  const w = +m[1] * TILE, s = +m[2] * TILE;
  return { w, s, e: w + TILE, n: s + TILE };
}

export function inIndonesia(b) { return b.w >= 94 && b.e <= 142 && b.s >= -12 && b.n <= 7; }

// Lima pencarian per kotak. Photon pakai pencocokan longgar, jadi "mushola" ikut nangkep musholla/musala.
// SPBU dicari dua kali ("spbu" dan "pertamina") karena namanya di peta beda-beda dan hasilnya saling melengkapi.
// Musala di dalam SPBU jarang dicatat di peta, jadi SPBU-nya sendiri yang ditampilkan sebagai tempat singgah cadangan.
export function tileQueries(b) {
  const bbox = `${b.w.toFixed(3)},${b.s.toFixed(3)},${b.e.toFixed(3)},${b.n.toFixed(3)}`;
  const q = (word, tag, limit = 50) => `/api/?q=${encodeURIComponent(word)}&bbox=${bbox}&osm_tag=${tag}&limit=${limit}&lang=default`;
  return [q("masjid", "amenity:place_of_worship"), q("mushola", "amenity:place_of_worship"), q("rest area", "highway:services", 20), q("spbu", "amenity:fuel", 40), q("pertamina", "amenity:fuel", 40)];
}

export function parseFeatures(lists, b) {
  const seen = new Map();
  for (const feats of lists) {
    for (const f of feats || []) {
      const p = f.properties || {}, [lon, lat] = f.geometry?.coordinates || [];
      if (typeof lat !== "number" || lon < b.w || lon > b.e || lat < b.s || lat > b.n) continue;
      const name = p.name || "";
      const fuel = p.osm_key === "amenity" && p.osm_value === "fuel";
      if (p.osm_key === "amenity" && !fuel && (!WORSHIP_NAME.test(name) || NOT_MOSQUE.test(name))) continue;
      const id = `osm-${{ N: "node", W: "way", R: "relation" }[p.osm_type] || p.osm_type}-${p.osm_id}`;
      if (seen.has(id)) continue;
      const kind = fuel ? "spbu" : p.osm_key === "highway" ? "rest" : /mus(h)?oll?a|musala|mushalla|surau|langgar/i.test(name) ? "musala" : "masjid";
      const nama = fuel ? (/spbu/i.test(name) ? name : name ? `SPBU ${name}` : "SPBU")
        : name || (kind === "rest" ? "Rest area" : kind === "musala" ? "Musala" : "Masjid");
      seen.set(id, { id, lat: +lat.toFixed(6), lon: +lon.toFixed(6), kind, nama });
    }
  }
  return [...seen.values()];
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Jalankan pencarian satu per satu (bukan barengan) dengan satu kali coba ulang, biar nggak kena batas Photon.
export async function fetchTile(b, { headers, signal, timeout = 10000, parallel = false } = {}) {
  const lists = [];
  let failed = 0;
  const one = async (path) => {
    let got = null;
    for (let attempt = 0; attempt < 2 && !got; attempt++) {
      try {
        const sig = signal && AbortSignal.any ? AbortSignal.any([signal, AbortSignal.timeout(timeout)]) : signal || AbortSignal.timeout(timeout);
        const r = await fetch(PHOTON + path, { headers, signal: sig, cache: "no-store" });
        if (r.ok) got = (await r.json()).features || [];
        else if (attempt === 0) await sleep(r.status === 429 ? 1500 : 600);
      } catch (e) {
        if (e.name === "AbortError" && signal?.aborted) throw e;
        if (attempt === 0) await sleep(600);
      }
    }
    if (got) lists.push(got); else failed++;
  };
  // server: satu per satu biar nggak kena batas. Browser (tiap pengguna IP-nya beda): boleh barengan.
  if (parallel) await Promise.all(tileQueries(b).map(one));
  else for (const path of tileQueries(b)) await one(path);
  return { pois: parseFeatures(lists, b), failed, total: tileQueries(b).length };
}
