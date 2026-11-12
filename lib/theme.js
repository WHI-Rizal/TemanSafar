// Pilihan tema: "auto" (ikut HP), "light", atau "dark". Disimpan di HP masing-masing.
const KEY = "ts-theme";
export function getTheme() {
  try { const t = localStorage.getItem(KEY); return t === "light" || t === "dark" ? t : "auto"; } catch { return "auto"; }
}
export function setTheme(t) {
  const el = document.documentElement;
  if (t === "light" || t === "dark") el.dataset.theme = t; else delete el.dataset.theme;
  try { if (t === "auto") localStorage.removeItem(KEY); else localStorage.setItem(KEY, t); } catch {}
}
// dipasang di <head> supaya tema pilihan langsung kepakai sebelum halaman tampil (nggak kedip putih/hitam)
export const THEME_BOOT = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
