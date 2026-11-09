// Masjid, musala, dan rest area per kotak peta (~5,5 km), diambil dari Photon (data OpenStreetMap).
// Dijalankan di server Vercel dan hasilnya disimpan di CDN seminggu, jadi pengguna lain yang lewat
// kotak yang sama langsung dapat jawaban tanpa nanya ulang ke Photon.
//
// Catatan: Overpass (server OSM yang biasa dipakai) sejak 2026 sering nolak permintaan (HTTP 406)
// karena kelebihan beban, makanya pakai Photon.
export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

const TILE = 0.05;
const PHOTON = "https://photon.komoot.io";
const UA = "JejakMusafir/0.5 (+https://temansafar.vercel.app)";
const WORSHIP_NAME = /masjid|mesjid|mosque|mus(h)?oll?a|musala|mushalla|surau|langgar|meunasah/i;
const NOT_MOSQUE = /gereja|church|pura\b|vihara|klenteng|kelenteng|wihara|kapel|chapel|temple|gki|gkj|hkbp|bethany|katedral/i;

async function photon(path) {
  const r = await fetch(PHOTON + path, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(12000), cache: "no-store" });
  if (!r.ok) throw new Error("photon_" + r.status);
  return (await r.json()).features || [];
}

function kindOf(p) {
  if (p.osm_key === "highway") return "rest";
  return /mus(h)?oll?a|musala|mushalla|surau|langgar/i.test(p.name || "") ? "musala" : "masjid";
}

export async function GET(req) {
  const t = new URL(req.url).searchParams.get("t") || "";
  const m = t.match(/^(-?\d{1,5})_(-?\d{1,5})$/);
  if (!m) return Response.json({ error: "bad_tile" }, { status: 400 });
  const ix = +m[1], iy = +m[2];
  const w = ix * TILE, s = iy * TILE, e = w + TILE, n = s + TILE;
  if (w < 94 || e > 142 || s < -12 || n > 7) return Response.json({ pois: [] }, { headers: { "Cache-Control": "public, s-maxage=2592000" } });

  const bbox = `${w.toFixed(3)},${s.toFixed(3)},${e.toFixed(3)},${n.toFixed(3)}`;
  const q = (word, tag, limit = 50) => `/api/?q=${encodeURIComponent(word)}&bbox=${bbox}&osm_tag=${tag}&limit=${limit}&lang=default`;
  const jobs = [
    photon(q("masjid", "amenity:place_of_worship")),
    photon(q("musholla", "amenity:place_of_worship")),
    photon(q("mushola", "amenity:place_of_worship")),
    photon(q("musala", "amenity:place_of_worship")),
    photon(q("rest area", "highway:services", 20)),
  ];
  const res = await Promise.allSettled(jobs);
  if (res.every((r) => r.status === "rejected")) {
    return Response.json({ error: "photon_unavailable" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }

  const seen = new Map();
  for (const r of res) {
    if (r.status !== "fulfilled") continue;
    for (const f of r.value) {
      const p = f.properties || {}, [lon, lat] = f.geometry?.coordinates || [];
      if (typeof lat !== "number" || lon < w || lon > e || lat < s || lat > n) continue;
      const name = p.name || "";
      if (p.osm_key === "amenity" && (!WORSHIP_NAME.test(name) || NOT_MOSQUE.test(name))) continue;
      const id = `osm-${{ N: "node", W: "way", R: "relation" }[p.osm_type] || p.osm_type}-${p.osm_id}`;
      if (seen.has(id)) continue;
      const kind = kindOf(p);
      seen.set(id, { id, lat: +lat.toFixed(6), lon: +lon.toFixed(6), kind, nama: name || (kind === "rest" ? "Rest area" : kind === "musala" ? "Musala" : "Masjid") });
    }
  }
  const partial = res.some((r) => r.status === "rejected");
  return Response.json({ pois: [...seen.values()], partial }, {
    // hasil lengkap disimpan seminggu, hasil yang sebagian gagal cuma 10 menit biar cepat dicoba lagi
    headers: { "Cache-Control": partial ? "public, s-maxage=600" : "public, s-maxage=604800, stale-while-revalidate=86400" },
  });
}
