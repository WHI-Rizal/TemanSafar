// Perantara ke Overpass (data masjid OpenStreetMap). Dijalankan di server Vercel, jadi
// nggak kena blokir CORS / jaringan HP, dan bisa coba beberapa server cadangan.
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const SERVERS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

function buildQuery(pts) {
  const ll = pts.map((p) => `${(+p[1]).toFixed(5)},${(+p[0]).toFixed(5)}`).join(",");
  return `[out:json][timeout:25];(nwr["amenity"="place_of_worship"]["religion"="muslim"](around:600,${ll});nwr["highway"~"^(services|rest_area)$"](around:300,${ll}););out center tags 400;`;
}

export async function POST(req) {
  let pts;
  try { ({ pts } = await req.json()); } catch { return Response.json({ error: "bad_json" }, { status: 400 }); }
  const ok = Array.isArray(pts) && pts.length > 0 && pts.length <= 200 &&
    pts.every((p) => Array.isArray(p) && p.length === 2 && isFinite(p[0]) && isFinite(p[1]) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90);
  if (!ok) return Response.json({ error: "bad_points" }, { status: 400 });

  const body = "data=" + encodeURIComponent(buildQuery(pts));
  const errors = [];
  for (const url of SERVERS) {
    try {
      const r = await fetch(url, {
        method: "POST", body,
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "JejakMusafir/0.4 (temansafar.vercel.app)" },
        signal: AbortSignal.timeout(18000),
        cache: "no-store",
      });
      if (!r.ok) { errors.push(`${new URL(url).host} ${r.status}`); continue; }
      const j = await r.json();
      return Response.json({ elements: j.elements || [], source: new URL(url).host }, { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
      errors.push(`${new URL(url).host} ${e.name === "TimeoutError" ? "timeout" : e.message}`);
    }
  }
  return Response.json({ error: "overpass_unavailable", detail: errors }, { status: 502 });
}
