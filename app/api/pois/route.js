// Masjid, musala, dan rest area per kotak peta (~5,5 km), diambil dari Photon (data OpenStreetMap).
// Dijalankan di server Vercel dan hasilnya disimpan di CDN seminggu, jadi pengguna lain yang lewat
// kotak yang sama langsung dapat jawaban tanpa nanya ulang ke Photon.
//
// Catatan: Overpass (server OSM yang biasa dipakai) sejak 2026 sering nolak permintaan (HTTP 406)
// karena kelebihan beban, makanya pakai Photon.
import { tileBox, inIndonesia, fetchTile } from "../../../lib/poiTile";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

const UA = "TemanSafar/0.5 (+https://temansafar.vercel.app)";

export async function GET(req) {
  const b = tileBox(new URL(req.url).searchParams.get("t") || "");
  if (!b) return Response.json({ error: "bad_tile" }, { status: 400 });
  if (!inIndonesia(b)) return Response.json({ pois: [] }, { headers: { "Cache-Control": "public, s-maxage=2592000" } });

  const { pois, failed, total } = await fetchTile(b, { headers: { "User-Agent": UA, Accept: "application/json" }, budget: 22000 });
  if (failed === total) return Response.json({ error: "photon_unavailable" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  const partial = failed > 0;
  return Response.json({ pois, partial }, {
    // hasil lengkap disimpan seminggu, hasil yang sebagian gagal cuma 10 menit biar cepat dicoba lagi
    headers: { "Cache-Control": partial ? "public, s-maxage=600" : "public, s-maxage=604800, stale-while-revalidate=86400" },
  });
}
