// Bikin gambar Story 1080x1920 dari ringkasan perjalanan, terus dibagikan lewat menu share HP.
// Kalau HP nggak bisa share file, gambarnya diunduh aja.
const W = 1080, H = 1920;
const C = { teal: "#0E8174", deep: "#0A655A", dark: "#064a42", sand: "#FBF5EA", chip: "#F4EAD6", orange: "#F0641B", peach: "#FFB37E", ink: "#241A12", muted: "#6A5C4E", line: "#EADCC2" };

async function fonts() {
  try {
    await Promise.all(["400 80px Anton", "400 40px PJS", "500 40px PJS", "700 40px PJS", "800 40px PJS"].map((f) => document.fonts.load(f)));
  } catch {}
}
function img(src) {
  return new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
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

// garis rute ala Strava: titik GPS dipetakan ke kotak, tanpa peta di belakangnya
function drawRoute(x, track, stops, box, o = {}) {
  if (!track || track.length < 2) return;
  // perjalanan jauh bisa ribuan titik: cukup ±1500 titik buat gambar, titik tambalan tetap dijaga
  if (track.length > 1500) { const st = Math.ceil(track.length / 1500); track = track.filter((p, i) => i % st === 0 || i === track.length - 1 || p[2] === 1); }
  const lat0 = track.reduce((a, p) => a + p[1], 0) / track.length, k = Math.cos(lat0 * Math.PI / 180);
  const xs = track.map((p) => p[0] * k), ys = track.map((p) => -p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const sc = Math.min(box.w / Math.max(1e-6, maxX - minX), box.h / Math.max(1e-6, maxY - minY));
  const ox = box.x + (box.w - (maxX - minX) * sc) / 2, oy = box.y + (box.h - (maxY - minY) * sc) / 2;
  const P = (p) => [ox + (p[0] * k - minX) * sc, oy + (-p[1] - minY) * sc];
  // titik dengan p[2] === 1 = tambalan dari rute rencana (GPS sempat nggak kecatat)
  const line = (patched) => {
    x.beginPath(); let pen = false;
    for (let i = 1; i < track.length; i++) {
      const isP = track[i][2] === 1 || track[i - 1][2] === 1;
      if (isP !== patched) { pen = false; continue; }
      const [a0, b0] = P(track[i - 1]), [a, b] = P(track[i]);
      if (!pen) { x.moveTo(a0, b0); pen = true; } x.lineTo(a, b);
    }
  };
  x.save(); x.lineJoin = "round"; x.lineCap = "round"; x.globalAlpha = o.alpha ?? 1;
  const dash = o.patchStyle === "dash";
  for (const pt of dash ? [false] : [false, true]) { line(pt); x.strokeStyle = o.glow || "rgba(255,179,126,.28)"; x.lineWidth = (o.w || 14) * 2.6; x.stroke(); }
  for (const pt of dash ? [false] : [false, true]) { line(pt); x.strokeStyle = o.color || "#fff"; x.lineWidth = o.w || 14; x.stroke(); }
  if (dash) { line(true); x.setLineDash([2, 26]); x.strokeStyle = "rgba(255,255,255,.75)"; x.lineWidth = (o.w || 14) * 0.9; x.stroke(); x.setLineDash([]); }
  if (!o.bare) {
    (stops || []).forEach((s) => { if (s.lon == null) return; const [a, b] = P([s.lon, s.lat]); x.fillStyle = C.orange; x.beginPath(); x.arc(a, b, 22, 0, 7); x.fill(); x.fillStyle = "#fff"; x.beginPath(); x.arc(a, b + 2, 9, Math.PI, 0); x.fill(); x.fillRect(a - 9, b + 2, 18, 7); });
    const [sa, sb] = P(track[0]); x.fillStyle = C.deep; x.strokeStyle = "#fff"; x.lineWidth = 8; x.beginPath(); x.arc(sa, sb, 17, 0, 7); x.fill(); x.stroke();
    const [ea, eb] = P(track[track.length - 1]); x.fillStyle = C.peach; x.beginPath(); x.arc(ea, eb, 24, 0, 7); x.fill(); x.fillStyle = C.deep; x.beginPath(); x.arc(ea, eb, 10, 0, 7); x.fill();
    // nama kota di bawah titik berangkat & sampai
    // label 2 baris: nama tempat (tebal) + daerahnya (kecil). Ditaruh di bawah titik, atau di atas kalau mepet bawah.
    // label 2 baris: nama tempat (tebal) + daerahnya (kecil), ditaruh di samping titik,
    // di sisi yang menjauhi arah garis biar nggak nutupin rute
    const lab = (l, a, b, nb) => { if (!l?.name) return;
      x.font = "700 30px PJS"; const n1 = fit(x, l.name, 320); const w1 = x.measureText(n1).width;
      x.font = "500 25px PJS"; const n2 = l.sub ? fit(x, l.sub, 320) : ""; const w2 = n2 ? x.measureText(n2).width : 0;
      const w = Math.max(w1, w2), hh = n2 ? 82 : 46;
      const [na] = P(nb); let right = na <= a;
      if (right && a + 40 + w > W - 50) right = false; if (!right && a - 40 - w < 50) right = true;
      const lx = right ? a + 44 : a - 44 - w; const top = Math.max(box.y - 30, Math.min(H - 900, b - hh / 2));
      x.fillStyle = "rgba(6,74,66,.6)"; rr(x, lx - 14, top, w + 28, hh, 14); x.fill();
      x.fillStyle = "#fff"; x.font = "700 30px PJS"; x.fillText(n1, lx, top + 34);
      if (n2) { x.fillStyle = "rgba(255,255,255,.75)"; x.font = "500 25px PJS"; x.fillText(n2, lx, top + 68); } };
    lab(o.labels?.[0], sa, sb, track[Math.min(track.length - 1, 4)]); lab(o.labels?.[1], ea, eb, track[Math.max(0, track.length - 5)]);
  }
  x.restore();
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
  x.fillText(fit(x, trip.from ? `${trip.fromShort || trip.from} → ${trip.toShort || trip.to}` : `Menuju ${trip.to}`, 560), W - P, 186); x.textAlign = "left";

  const n = trip.stops.length;
  // disusun dari bawah: kartu nempel di atas kaki, judul di atas kartu, sisa ruang buat gambar rute
  const rows = Math.max(1, Math.min(4, n)), ch = 270 + rows * 80;
  const cy = 1640 - ch, h2 = cy - 56, h1 = h2 - 104;
  drawRoute(x, trip.track, trip.stops, { x: P + 30, y: 300, w: W - P * 2 - 60, h: h1 - 96 - 60 - 300 }, { patchStyle: trip.patchStyle, labels: [{ name: trip.from || "Berangkat", sub: trip.fromArea }, { name: trip.to, sub: trip.toArea }] });
  x.fillStyle = "#fff"; x.font = "400 100px Anton";
  if (n) { x.fillText("SHALAT ", P, h1); const w0 = x.measureText("SHALAT ").width; x.fillStyle = C.peach; x.fillText("TETAP", P + w0, h1); x.fillStyle = "#fff"; x.fillText("TEPAT WAKTU", P, h2); }
  else { x.fillText("SAFAR", P, h1); x.fillText("LEBIH TENANG", P, h2); }

  // kartu ringkasan
  x.fillStyle = C.sand; rr(x, P, cy, W - P * 2, ch, 44); x.fill();
  const stat = [["JARAK", `${trip.km} km`], ["SINGGAH", n ? `${n} masjid` : "–"], ["DURASI", trip.mins >= 60 ? `${Math.floor(trip.mins / 60)}j ${trip.mins % 60}m` : `${trip.mins}m`]];
  stat.forEach(([k, v], i) => {
    const sx = P + 56 + i * 300;
    x.fillStyle = C.muted; x.font = "800 28px PJS"; x.fillText(k, sx, cy + 84);
    x.fillStyle = C.teal; x.font = "400 72px Anton"; x.fillText(v, sx, cy + 168);
  });
  x.fillStyle = C.line; x.fillRect(P + 56, cy + 206, W - P * 2 - 112, 3);
  const list = n ? trip.stops.slice(0, 4).map((s) => `${s.prayer ? s.prayer + " · " : ""}${s.nama}`) : ["Jadwal shalat ikut sepanjang rute"];
  list.forEach((t, i) => {
    const py = cy + 236 + i * 80;
    x.font = "800 32px PJS";
    const tt = fit(x, t, W - P * 2 - 170), tw = x.measureText(tt).width;
    x.fillStyle = n ? C.orange : C.chip; rr(x, P + 56, py, tw + 56, 62, 31); x.fill();
    x.fillStyle = n ? "#fff" : C.ink; x.fillText(tt, P + 84, py + 42);
  });

  // kaki: hashtag & alamat di kiri, "by Wisata Halal Indonesia" + logo WHI di kanan
  const logo = await img("/brand/whi-logo.png");
  x.font = "800 30px PJS"; const bt = "by Wisata Halal Indonesia";
  const ph = 84, lr = 27, bw = x.measureText(bt).width + 40 + (logo ? lr * 2 + 16 : 0);
  let hs = 66; x.font = `400 ${hs}px Anton`;
  while (x.measureText("#JalanLebihTenang").width > W - P * 2 - bw - 36 && hs > 44) { hs -= 2; x.font = `400 ${hs}px Anton`; }
  x.fillStyle = C.peach; x.fillText("#JalanLebihTenang", P, H - 168);
  x.fillStyle = "rgba(255,255,255,.85)"; x.font = "500 32px PJS"; x.fillText("temansafar.vercel.app", P, H - 112);
  const bx = W - P - bw, by = H - 150 - ph / 2 - 6;
  x.fillStyle = C.orange; rr(x, bx, by, bw, ph, ph / 2); x.fill();
  let tx = bx + 22;
  if (logo) {
    x.fillStyle = "#fff"; x.beginPath(); x.arc(bx + 14 + lr, by + ph / 2, lr, 0, 7); x.fill();
    const s = lr * 1.5; x.drawImage(logo, bx + 14 + lr - s / 2, by + ph / 2 - s / 2, s, s);
    tx = bx + 14 + lr * 2 + 14;
  }
  x.fillStyle = "#fff"; x.font = "800 30px PJS"; x.fillText(bt, tx, by + ph / 2 + 11);

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
