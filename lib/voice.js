// Suara pemandu. Pakai suara bawaan HP, tapi dipilih yang paling natural buat bahasa Indonesia,
// teksnya dirapihin biar enak dibacakan, dan antrean dibersihin biar nggak numpuk/terbata-bata.

const KEY = "ts-voice";
let voices = [];
let ready = null;

function load() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return Promise.resolve([]);
  if (ready) return ready;
  ready = new Promise((resolve) => {
    const grab = () => { voices = window.speechSynthesis.getVoices() || []; return voices.length > 0; };
    if (grab()) return resolve(voices);
    // di Chrome daftar suara baru muncul belakangan
    window.speechSynthesis.addEventListener?.("voiceschanged", () => { grab(); resolve(voices); }, { once: true });
    setTimeout(() => { grab(); resolve(voices); }, 1500);
  });
  return ready;
}
if (typeof window !== "undefined") load();

const isId = (v) => /^id([-_]|$)/i.test(v.lang || "") || /indonesia|bahasa/i.test(v.name || "");

// urutan suara terbaik yang biasa ada di HP & laptop
const PREFER = [/google.*(bahasa|indonesia)/i, /natural/i, /damayanti/i, /gadis|ardi/i, /microsoft.*indonesia/i, /samsung/i];

export function idVoices() {
  return voices.filter(isId).sort((a, b) => score(b) - score(a));
}
function score(v) {
  const i = PREFER.findIndex((r) => r.test(v.name));
  return (i === -1 ? 0 : 100 - i * 10) + (v.localService ? 1 : 0);
}

export function getPrefs() {
  try { return { name: "", rate: 1, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return { name: "", rate: 1 }; }
}
export function setPrefs(p) { try { localStorage.setItem(KEY, JSON.stringify({ ...getPrefs(), ...p })); } catch {} }

function pick() {
  const { name } = getPrefs();
  const list = idVoices();
  return list.find((v) => v.name === name) || list[0] || null;
}

// Rapihin teks biar dibaca lancar
export function tidy(text) {
  return String(text)
    .replace(/\bJl\.?\s/gi, "Jalan ")
    .replace(/\bGg\.?\s/gi, "Gang ")
    .replace(/\bKM\s*(\d+)\s*([AB])\b/gi, "kilometer $1 $2")
    .replace(/\bKM\s*(\d+)/gi, "kilometer $1")
    .replace(/\s*[–—-]\s*/g, " ")
    .replace(/\s*\/\s*/g, " atau ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function speak(text, { muted = false, urgent = false } = {}) {
  if (muted || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  await load();
  const s = window.speechSynthesis;
  // instruksi belokan yang baru lebih penting dari yang lama: jangan biarin antre panjang
  if (urgent || s.pending) s.cancel();
  const u = new SpeechSynthesisUtterance(tidy(text));
  const v = pick();
  if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "id-ID";
  u.rate = getPrefs().rate || 1;
  u.pitch = 1;
  u.volume = 1;
  s.speak(u);
}

export function stop() { try { window.speechSynthesis?.cancel(); } catch {} }
export { load as loadVoices };
