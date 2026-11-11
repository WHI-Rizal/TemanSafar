// Bikin gambar Story 1080x1920 dari ringkasan perjalanan, terus dibagikan lewat menu share HP.
// Kalau HP nggak bisa share file, gambarnya diunduh aja.
const W = 1080, H = 1920;
const C = { teal: "#0E8174", deep: "#0A655A", dark: "#064a42", sand: "#FBF5EA", chip: "#F4EAD6", orange: "#F0641B", peach: "#FFB37E", ink: "#241A12", muted: "#6A5C4E", line: "#EADCC2" };

async function fonts() {
  try {
    await Promise.all(["400 80px Anton", "400 40px PJS", "500 40px PJS", "700 40px PJS", "800 40px PJS"].map((f) => document.fonts.load(f)));
  } catch {}
}
function rr(ctx, a, b, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(a, b, w, h, r) : ctx.rect(a, b, w, h); }
function fit(ctx, text, max) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text; while (t.length > 3 && ctx.measureText(t + "…").width > max) t = t.slice(0, -1);
  return t + "…";
}
function wrap(ctx, text, max) {
  const words = text.split(" "), lines = []; let cur = "";
  for (const w of words) { const t = cur ? cur + " " + w : w; if (ctx.measureText(t).width > max && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  return lines;
}

// trip: { from, to, km, mins, stops: [{ nama, prayer }] }
export async function storyImage(trip) {
  await fonts();
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const x = cv.getContext("2d");
  const g = x.createRadialGradient(W * 0.8, H * 0.08, 0, W * 0.8, H * 0.08, H);
  g.addColorStop(0, C.teal); g.addColorStop(0.55, C.deep); g.addColorStop(1, C.dark);
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = "rgba(255,255,255,.08)";
  for (let i = 30; i < W; i += 60) for (let j = 30; j < H; j += 60) { x.beginPath(); x.arc(i, j, 3.5, 0, 7); x.fill(); }

  const P = 80;
  x.fillStyle = "#fff"; x.textBaseline = "alphabetic";
  x.font = "400 52px Anton"; x.fillText("TEMAN SAFAR", P, 190);
  x.font = "500 38px PJS"; x.textAlign = "right";
  x.fillText(fit(x, trip.from ? `${trip.from} → ${trip.to}` : `Menuju ${trip.to}`, 560), W - P, 186); x.textAlign = "left";

  const n = trip.stops.length;
  const head = n ? ["SHALAT", "TEPAT WAKTU"] : ["SAFAR", "LEBIH TENANG"];
  x.font = "400 150px Anton";
  x.fillText(head[0] + " ", P, 470);
  if (n) { const w0 = x.measureText("SHALAT ").width; x.fillStyle = C.peach; x.fillText("TETAP", P + w0, 470); x.fillStyle = "#fff"; }
  x.fillText(head[1], P, 630);

  x.font = "400 44px PJS"; x.globalAlpha = 0.92;
  const sub = n ? `${trip.km} km di jalan, ${n} kali singgah shalat, nggak ada yang kelewat.` : `${trip.km} km di jalan, ditemani jadwal shalat dan masjid sepanjang rute.`;
  wrap(x, sub, W - P * 2).forEach((l, i) => x.fillText(l, P, 740 + i * 62)); x.globalAlpha = 1;

  // kartu ringkasan
  const cy = 900, rows = Math.max(1, Math.min(4, n)), ch = 300 + rows * 100;
  x.fillStyle = C.sand; rr(x, P, cy, W - P * 2, ch, 48); x.fill();
  const stat = [["JARAK", `${trip.km} km`], ["SINGGAH", n ? `${n} masjid` : "–"], ["DURASI", trip.mins >= 60 ? `${Math.floor(trip.mins / 60)}j ${trip.mins % 60}m` : `${trip.mins}m`]];
  stat.forEach(([k, v], i) => {
    const sx = P + 60 + i * 300;
    x.fillStyle = C.muted; x.font = "800 30px PJS"; x.fillText(k, sx, cy + 95);
    x.fillStyle = C.teal; x.font = "400 76px Anton"; x.fillText(v, sx, cy + 185);
  });
  x.fillStyle = C.line; x.fillRect(P + 60, cy + 230, W - P * 2 - 120, 3);
  const list = n ? trip.stops.slice(0, 4).map((s) => `${s.prayer ? s.prayer + " · " : ""}${s.nama}`) : ["Jadwal shalat ikut sepanjang rute"];
  list.forEach((t, i) => {
    const py = cy + 270 + i * 100;
    x.font = "800 36px PJS";
    const tt = fit(x, t, W - P * 2 - 180), tw = x.measureText(tt).width;
    x.fillStyle = n ? C.orange : C.chip; rr(x, P + 60, py, tw + 60, 72, 36); x.fill();
    x.fillStyle = n ? "#fff" : C.ink; x.fillText(tt, P + 90, py + 49);
  });

  // kaki
  x.font = "800 34px PJS"; const bt = "by Wisata Halal Indonesia", bw = x.measureText(bt).width + 64;
  x.fillStyle = C.orange; rr(x, P, H - 360, bw, 80, 40); x.fill();
  x.fillStyle = "#fff"; x.fillText(bt, P + 32, H - 307);
  x.fillStyle = C.peach; x.font = "400 72px Anton"; x.fillText("#JalanLebihTenang", P, H - 170);
  x.fillStyle = "rgba(255,255,255,.85)"; x.font = "500 34px PJS"; x.fillText("temansafar.vercel.app", P, H - 110);

  return new Promise((ok) => cv.toBlob(ok, "image/png"));
}

export async function shareStory(trip) {
  const blob = await storyImage(trip);
  if (!blob) throw new Error("gagal");
  const file = new File([blob], "teman-safar-story.png", { type: "image/png" });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text: "Safar lebih tenang bareng Teman Safar #JalanLebihTenang https://temansafar.vercel.app" });
      return "shared";
    }
  } catch (e) { if (e?.name === "AbortError") return "cancel"; }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return "downloaded";
}
