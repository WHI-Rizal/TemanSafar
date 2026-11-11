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

// Cuma dua bahasa: Indonesia atau English. Suara Jawa / Sunda (jv-ID, su-ID) sengaja nggak dipakai.
const LOCAL = /jawa|java|sunda|basa/i;
const isId = (v) => (/^id([-_]|$)/i.test(v.lang || "") || (!v.lang && /indonesia/i.test(v.name || ""))) && !LOCAL.test(v.name || "");
const isEn = (v) => /^en([-_]|$)/i.test(v.lang || "");

// urutan suara terbaik yang biasa ada di HP & laptop
const PREFER = {
  id: [/google.*(bahasa|indonesia)/i, /natural/i, /damayanti/i, /gadis|ardi/i, /microsoft.*indonesia/i, /samsung/i],
  en: [/google us english/i, /natural/i, /samantha/i, /google uk english female/i, /microsoft (aria|jenny|zira)/i, /en[-_]us/i, /google/i],
};

export function voicesFor(lang) {
  return voices.filter(lang === "en" ? isEn : isId).sort((a, b) => score(b, lang) - score(a, lang));
}
export const idVoices = () => voicesFor("id");
function score(v, lang) {
  const i = PREFER[lang].findIndex((r) => r.test(v.name) || r.test(v.lang));
  return (i === -1 ? 0 : 100 - i * 10) + (lang === "en" && /^en[-_]us/i.test(v.lang) ? 5 : 0) + (v.localService ? 1 : 0);
}

export function getPrefs() {
  try { return { lang: "id", rate: 1, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return { lang: "id", rate: 1 }; }
}
export const voiceLang = () => (getPrefs().lang === "en" ? "en" : "id");
export function setPrefs(p) { try { localStorage.setItem(KEY, JSON.stringify({ ...getPrefs(), ...p })); } catch {} }

function pick() {
  return voicesFor(voiceLang())[0] || null;
}

// Rapihin teks biar dibaca lancar
export function tidy(text, lang = "id") {
  const t = String(text);
  if (lang === "en") return t.replace(/\bJl\.?\s/gi, "Jalan ").replace(/\bKM\s*(\d+)/gi, "kilometer $1").replace(/\s*[–—]\s*/g, ", ").replace(/\s{2,}/g, " ").trim();
  return t
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
  const lang = voiceLang();
  const u = new SpeechSynthesisUtterance(tidy(text, lang));
  const v = pick();
  if (v) { u.voice = v; u.lang = v.lang; } else u.lang = lang === "en" ? "en-US" : "id-ID";
  u.rate = getPrefs().rate || 1;
  u.pitch = 1;
  u.volume = 1;
  s.speak(u);
}

export function stop() { try { window.speechSynthesis?.cancel(); } catch {} }
export { load as loadVoices };
