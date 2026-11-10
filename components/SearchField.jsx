import { useEffect, useRef, useState } from "react";
import { CITIES } from "../lib/route";
import { geocode, fetchPois, fmtDist } from "../lib/nav";
import { hav } from "../lib/geo";

// Kolom tujuan yang gampang: ketik 2 huruf langsung muncul saran, Enter pilih yang teratas,
// pas kosong muncul riwayat, masjid terdekat, dan kota populer. Pilih saran = rute langsung dihitung.
const RECENT_KEY = "ts-recent";
const POPULAR = ["Bandung", "Semarang", "Yogyakarta", "Surabaya", "Malang", "Bogor", "Cirebon", "Solo"];
const POP_COORD = { Yogyakarta: [110.3695, -7.7956] };

export function loadRecent() { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; } }
export function saveRecent(p) {
  try {
    const list = [p, ...loadRecent().filter((x) => !(x.nama === p.nama && Math.abs(x.lat - p.lat) < 1e-4))].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {}
}

const I = {
  search: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>,
  x: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>,
  recent: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  masjid: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M12 4c2.5 2 5 3.5 5 7H7c0-3.5 2.5-5 5-7z" /><path d="M6 11h12v9H6z" /></svg>,
  kota: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M4 21V9l5-3v15M9 21V4l6 3v14M15 21V11l5 2v8M3 21h18" /></svg>,
  pin: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M12 21s-6-5.5-6-11a6 6 0 1 1 12 0c0 5.5-6 11-6 11z" /><circle cx="12" cy="10" r="2.3" /></svg>,
  jalan: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3 5 21M16 3l3 18M12 4v3M12 11v3M12 18v2" /></svg>,
};
const iconFor = (h) => h.kind === "masjid" ? I.masjid : h.kind === "kota" ? I.kota : h.kind === "jalan" ? I.jalan : I.pin;

export default function SearchField({ value, onPick, near, autoFocus }) {
  const [q, setQ] = useState(value?.nama || "");
  const [hits, setHits] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(0);
  const [nearby, setNearby] = useState([]);
  const [recent, setRecent] = useState([]);
  const input = useRef(null);

  useEffect(() => { setQ(value?.nama || ""); }, [value]);
  useEffect(() => { setRecent(loadRecent()); }, [open]);

  // masjid terdekat dari lokasi lu (pakai data kotak yang sama dengan navigasi, jadi ke-cache)
  useEffect(() => {
    if (!near) return;
    let off = false;
    fetchPois([near]).then((ps) => {
      if (off) return;
      const list = ps.filter((p) => p.kind !== "rest").map((p) => ({ nama: p.nama, detail: p.kind === "musala" ? "Musala" : "Masjid", lon: p.lon, lat: p.lat, kind: "masjid", d: hav(near, [p.lon, p.lat]) }))
        .sort((a, b) => a.d - b.d).filter((p, i, arr) => arr.findIndex((x) => x.nama === p.nama && Math.abs(x.d - p.d) < 300) === i).slice(0, 4);
      setNearby(list);
    }).catch(() => {});
    return () => { off = true; };
  }, [near?.[0]?.toFixed(3), near?.[1]?.toFixed(3)]); // eslint-disable-line react-hooks/exhaustive-deps

  // saran pas ngetik: kota bawaan muncul seketika, hasil Photon nyusul
  useEffect(() => {
    const t0 = q.trim();
    if (!open || t0.length < 2 || t0 === value?.nama) { setHits([]); setBusy(false); return; }
    const ac = new AbortController();
    const low = t0.toLowerCase();
    const local = CITIES.filter((c) => c[0].toLowerCase().startsWith(low) || c[0].toLowerCase().includes(" " + low))
      .slice(0, 3).map((c) => ({ nama: c[0], detail: c[3], lon: c[5], lat: c[4], kind: "kota" }));
    setHits(local); setActive(0); setBusy(true);
    const t = setTimeout(async () => {
      try {
        const r = await geocode(t0, near, ac.signal);
        const merged = [...r];
        for (const l of local) if (!merged.some((m) => m.nama.toLowerCase() === l.nama.toLowerCase())) merged.push(l);
        setHits(merged.slice(0, 7)); setActive(0);
      } catch (e) { if (e.name === "AbortError") return; }
      setBusy(false);
    }, 250);
    return () => { clearTimeout(t); ac.abort(); };
  }, [q, open, near, value]);

  const choose = (h) => { if (!h) return; onPick(h); setQ(h.nama); setOpen(false); input.current?.blur(); };
  const showEmpty = open && q.trim().length < 2;
  const popular = POPULAR.map((n) => CITIES.find((c) => c[0] === n) || (POP_COORD[n] && [n, null, null, "Jawa", POP_COORD[n][1], POP_COORD[n][0]])).filter(Boolean);
  const dist = (h) => (near && h.lat != null ? fmtDist(hav(near, [h.lon, h.lat])) : "");

  const onKey = (e) => {
    if (!hits.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(hits.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); choose(hits[active] || hits[0]); }
  };

  const Row = ({ h, i, icon, extra }) => (
    <li>
      <button type="button" className={i === active && !showEmpty ? "on" : ""} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(h)}>
        <span className="sf-ic">{icon || iconFor(h)}</span>
        <span className="sf-txt"><b>{h.nama}</b>{h.detail && <small>{h.detail}</small>}</span>
        {extra && <span className="sf-dist">{extra}</span>}
      </button>
    </li>
  );

  return (
    <div className="sf">
      <label htmlFor="tujuan" className="sf-label">Mau ke mana?</label>
      <div className="sf-box">
        <span className="sf-lead" aria-hidden="true">{I.search}</span>
        <input id="tujuan" ref={input} type="search" value={q} placeholder="Ketik kota, masjid, atau alamat" autoComplete="off" enterKeyHint="go" autoFocus={autoFocus}
          role="combobox" aria-expanded={open} aria-controls="sf-list" aria-autocomplete="list"
          onChange={(e) => { setQ(e.target.value); setOpen(true); if (!e.target.value) onPick(null); }}
          onFocus={() => { setOpen(true); setTimeout(() => { const el = input.current?.closest(".sf"); if (el && window.innerWidth < 700) { const y = el.getBoundingClientRect().top + window.scrollY - 12; window.scrollTo({ top: y, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); } }, 120); }} onBlur={() => setTimeout(() => setOpen(false), 180)} onKeyDown={onKey} />
        {q && <button type="button" className="sf-clear" aria-label="Hapus tujuan" onMouseDown={(e) => e.preventDefault()} onClick={() => { setQ(""); onPick(null); setOpen(true); input.current?.focus(); }}>{I.x}</button>}
      </div>

      {!open && !value && (
        <div className="sf-chips" aria-label="Tujuan cepat">
          {nearby[0] && <button type="button" className="chip-q mosque" onClick={() => choose(nearby[0])}>{I.masjid}Masjid terdekat</button>}
          {loadRecentSafe(recent).slice(0, 2).map((r) => <button key={r.nama + r.lat} type="button" className="chip-q" onClick={() => choose(r)}>{I.recent}{r.nama}</button>)}
          {popular.slice(0, 4).map((c) => <button key={c[0]} type="button" className="chip-q" onClick={() => choose({ nama: c[0], detail: c[3], lon: c[5], lat: c[4], kind: "kota" })}>{c[0]}</button>)}
        </div>
      )}

      {open && (
        <ul className="sf-list" id="sf-list" role="listbox">
          {showEmpty ? (
            <>
              {nearby.length > 0 && <li className="sf-h">Masjid terdekat</li>}
              {nearby.map((h, i) => <Row key={"n" + i} h={h} i={-1} extra={fmtDist(h.d)} />)}
              {recent.length > 0 && <li className="sf-h">Terakhir dicari</li>}
              {recent.map((h, i) => <Row key={"r" + i} h={h} i={-1} icon={I.recent} extra={dist(h)} />)}
              <li className="sf-h">Kota populer</li>
              <li className="sf-pop">
                {popular.map((c) => <button key={c[0]} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => choose({ nama: c[0], detail: c[3], lon: c[5], lat: c[4], kind: "kota" })}>{c[0]}</button>)}
              </li>
            </>
          ) : (
            <>
              {hits.map((h, i) => <Row key={i} h={h} i={i} extra={dist(h)} />)}
              {busy && <li className="pf-busy">Mencari…</li>}
              {!busy && !hits.length && <li className="pf-busy">Nggak ketemu. Coba nama kota atau masjid yang lebih umum.</li>}
            </>
          )}
        </ul>
      )}
    </div>
  );
}
const loadRecentSafe = (r) => (Array.isArray(r) ? r : []);
