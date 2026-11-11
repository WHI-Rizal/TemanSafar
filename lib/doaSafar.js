// Doa safar yang diputar otomatis pas mulai navigasi.
// Taruh rekamannya di public/audio/doa-safar.mp3. Selama file itu belum ada, fitur ini diam aja (nggak error).
// Instruksi belokan selalu didahulukan: kalau ada belokan pas doa diputar, doanya dihentikan.
import { getPrefs } from "./voice";

export const DOA_SRC = "/audio/doa-safar.mp3";
let audio = null, done = Promise.resolve();

export const doaOn = () => getPrefs().doa !== false;
export const doaPlaying = () => !!audio && !audio.paused && !audio.ended;

// harus dipanggil langsung dari tombol (klik) biar browser ngizinin suaranya
export function playDoa(onStart) {
  stopDoa();
  if (!doaOn()) return Promise.resolve(false);
  const a = new Audio(DOA_SRC);
  audio = a;
  done = new Promise((ok) => {
    const fin = (played) => () => { if (audio === a) audio = null; ok(played); };
    if (onStart) a.addEventListener("playing", () => onStart(), { once: true });
    a.addEventListener("ended", fin(true), { once: true });
    a.addEventListener("error", fin(false), { once: true });
    a.addEventListener("pause", fin(true), { once: true });
    a.play().catch(fin(false));
  });
  return done;
}
export function stopDoa() { try { audio?.pause(); } catch {} audio = null; }
export const doaDone = () => done;

// cek sekali apakah rekamannya udah dipasang (buat tulisan di pengaturan)
export async function doaReady() {
  try { const r = await fetch(DOA_SRC, { method: "HEAD", cache: "no-store" }); return r.ok && /audio/.test(r.headers.get("content-type") || ""); } catch { return false; }
}
