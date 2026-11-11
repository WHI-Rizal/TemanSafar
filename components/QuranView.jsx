import { useEffect, useMemo, useRef, useState } from "react";
import { SURAH, JUZ, PAGES, surahOnPage, juzOnPage, loadQmh } from "../lib/quran";
import { DOA } from "../lib/doa";

// Al-Qur'an & doa safar (dibuka dari tile di beranda): Mushaf Madinah 1441H, doa naik kendaraan, dzikir pagi petang. Halaman terakhir disimpan otomatis.
// Cuma dibuka dari tab sendiri, nggak pernah muncul pas navigasi jalan (biar fokus nyetir).
const KEY = "ts-quran";
const read = () => { try { return { page: 1, marks: [], ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return { page: 1, marks: [] }; } };
const save = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} };

// ukuran huruf disesuaikan lebar layar biar satu halaman mushaf pas selebar HP
function fontSize() {
  const w = Math.min(window.innerWidth, 640) - 32;
  return Math.max(14, Math.min(30, Math.floor((w - 12) / 15.44)));
}

// elemen mushaf dari quran-madina-html
function Mushaf({ page }) {
  const box = useRef(null);
  useEffect(() => {
    const el = document.createElement("quran-madina-html");
    el.setAttribute("page", String(page));
    el.setAttribute("actions", "none");
    box.current.replaceChildren(el);
  }, [page]);
  return <div className="mushaf" ref={box} dir="rtl" />;
}

// pagi: dari Subuh sampai sebelum Ashar, petang: Ashar sampai malam (perkiraan jam WIB)
const nowPart = () => { const h = new Date(Date.now() + 7 * 3600e3).getUTCHours(); return h >= 3 && h < 15 ? "pagi" : "petang"; };

function DoaCard({ d }) {
  return (
    <article className="doa">
      <header><b>{d.title}</b>{d.notes && <span className="doa-n">{d.notes}</span>}</header>
      <p className="doa-ar" lang="ar" dir="rtl">{d.arabic}</p>
      {d.latin && <p className="doa-lt">{d.latin}</p>}
      {d.translation && <p className="doa-tr">{d.translation}</p>}
      {d.source && <small className="doa-src">{d.source}</small>}
    </article>
  );
}

export default function QuranView({ onBack }) {
  const [st, setSt] = useState({ page: 1, marks: [] });
  const [mode, setMode] = useState("home"); // home | page | doa
  const [doa, setDoa] = useState("kendaraan"); // kendaraan | pagi | petang
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState(false);
  const [list, setList] = useState("surah");
  const [q, setQ] = useState("");
  const touch = useRef(null);

  useEffect(() => { setSt(read()); }, []);
  useEffect(() => {
    if (window.customElements?.get("quran-madina-html")) { setReady(true); return; }
    // atur ukuran huruf sebelum script dimuat (dibaca sekali pas load)
    loadQmhSized(fontSize()).then(() => setReady(true), () => setErr(true));
  }, []);
  const retry = () => { setErr(false); loadQmhSized(fontSize()).then(() => setReady(true), () => setErr(true)); };

  const go = (page) => {
    const p = Math.max(1, Math.min(PAGES, page));
    const n = { ...st, page: p }; setSt(n); save(n); setMode("page");
    window.scrollTo({ top: 0 });
  };
  const toggleMark = () => {
    const has = st.marks.includes(st.page);
    const n = { ...st, marks: has ? st.marks.filter((x) => x !== st.page) : [...st.marks, st.page].sort((a, b) => a - b) };
    setSt(n); save(n);
  };
  const openDoa = (k) => { setDoa(k); setMode("doa"); window.scrollTo({ top: 0 }); };

  // geser: mushaf dibaca dari kanan ke kiri, jadi geser ke kanan = halaman berikutnya
  const onStart = (e) => { touch.current = [e.touches[0].clientX, e.touches[0].clientY]; };
  const onEnd = (e) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current[0], dy = e.changedTouches[0].clientY - touch.current[1];
    touch.current = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(st.page + (dx > 0 ? 1 : -1));
  };
  useEffect(() => {
    if (mode !== "page") return;
    const k = (e) => { if (e.key === "ArrowLeft") go(st.page + 1); if (e.key === "ArrowRight") go(st.page - 1); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const s = surahOnPage(st.page), juz = juzOnPage(st.page);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!t) return SURAH;
    return SURAH.filter((x) => String(x[0]) === t || x[1].toLowerCase().replace(/[^a-z0-9]/g, "").includes(t));
  }, [q]);


  if (mode === "doa") {
    const dz = doa !== "kendaraan";
    return (
      <div className="quran reader">
        <div className="qbar"><div className="wrap qbar-in">
          <button type="button" className="qback" onClick={() => setMode("home")}>‹ Kembali</button>
          <div className="qtitle"><b>{dz ? "Dzikir pagi petang" : "Doa naik kendaraan"}</b><small>{dz ? (doa === "pagi" ? "Dibaca setelah Subuh" : "Dibaca setelah Ashar") : "Dibaca saat berangkat safar"}</small></div>
          <span />
        </div></div>
        <div className="wrap doalist">
          {dz && (
            <div className="modes" role="group" aria-label="Waktu dzikir">
              <button type="button" aria-pressed={doa === "pagi"} onClick={() => setDoa("pagi")}>Pagi</button>
              <button type="button" aria-pressed={doa === "petang"} onClick={() => setDoa("petang")}>Petang</button>
            </div>
          )}
          {DOA[doa].map((d) => <DoaCard key={d.title} d={d} />)}
          <p className="note credit">Teks, terjemahan, dan sumber hadits dari kumpulan doa Fitrahive (lisensi MIT).</p>
        </div>
      </div>
    );
  }

  if (mode === "page") {
    return (
      <div className="quran reader">
        <div className="qbar">
          <div className="wrap qbar-in">
            <button type="button" className="qback" onClick={() => setMode("home")} aria-label="Kembali ke daftar">‹ Daftar</button>
            <div className="qtitle"><b>{s[1]}</b><small>Juz {juz} · Hal {st.page}</small></div>
            <button type="button" className={`qmark ${st.marks.includes(st.page) ? "on" : ""}`} onClick={toggleMark} aria-pressed={st.marks.includes(st.page)} aria-label="Tandai halaman ini">
              <svg viewBox="0 0 24 24" width="20" height="20" fill={st.marks.includes(st.page) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M6 3h12v18l-6-4-6 4z" /></svg></button>
          </div>
        </div>
        <div className="wrap qpage" onTouchStart={onStart} onTouchEnd={onEnd}>
          {err ? (
            <div className="qerr"><p className="note">Mushaf belum bisa dimuat. Pertama kali buka butuh internet, setelah itu halaman yang pernah dibuka bisa dibaca tanpa sinyal. Doa dan dzikir tetap bisa dibaca kapan aja.</p>
              <button type="button" className="ghost" onClick={retry}>Coba lagi</button></div>
          ) : !ready ? <p className="note">Memuat mushaf…</p> : <Mushaf page={st.page} />}
        </div>
        <div className="wrap qnav">
            <button type="button" className="ghost" onClick={() => go(st.page + 1)} disabled={st.page >= PAGES}>‹ Berikutnya</button>
            <span>{st.page} / {PAGES}</span>
            <button type="button" className="ghost" onClick={() => go(st.page - 1)} disabled={st.page <= 1}>Sebelumnya ›</button>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap quran">
      <div className="qhead"><button type="button" className="qback" onClick={onBack}>‹ Beranda</button><h2>Al-Qur'an & doa safar</h2></div>
      <button type="button" className="qcont" onClick={() => go(st.page)}>
        <span className="qcont-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M12 6c-2-1.5-5-2-8-1.5V19c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V4.5C17 4 14 4.5 12 6z" /><path d="M12 6v14.5" /></svg></span>
        <span><small>{st.page > 1 ? "Lanjut baca" : "Mulai baca"}</small><b>{s[1]}</b><span>Juz {juz} · Halaman {st.page}</span></span>
        <span className="chev" aria-hidden="true">›</span>
      </button>

      <h3 className="home-h">Bacaan di perjalanan</h3>
      <div className="qpicks">
        <button type="button" onClick={() => openDoa("kendaraan")}><b>Doa naik kendaraan</b><small>Doa menaiki kendaraan & doa safar</small></button>
        <button type="button" onClick={() => openDoa(nowPart())}><b>Dzikir pagi petang</b><small>Sekarang waktunya dzikir {nowPart()}</small></button>
      </div>

      {st.marks.length > 0 && <>
        <h3 className="home-h">Halaman ditandai</h3>
        <div className="qmarks">{st.marks.map((p) => <button key={p} type="button" onClick={() => go(p)}>{surahOnPage(p)[1]} · {p}</button>)}</div>
      </>}

      <div className="modes qseg" role="group" aria-label="Daftar">
        <button type="button" aria-pressed={list === "surah"} onClick={() => setList("surah")}>Surah</button>
        <button type="button" aria-pressed={list === "juz"} onClick={() => setList("juz")}>Juz</button>
      </div>

      {list === "surah" ? (
        <>
          <input className="qsearch" type="search" placeholder="Cari surah, misal Yasin atau 36" value={q} onChange={(e) => setQ(e.target.value)} />
          <ul className="qlist">
            {filtered.map((x) => (
              <li key={x[0]}><button type="button" onClick={() => go(x[4])}>
                <span className="qnum">{x[0]}</span>
                <span className="qname"><b>{x[1]}</b><small>{x[5]} · {x[3]} ayat · hal {x[4]}</small></span>
                <span className="qar" lang="ar">{x[2]}</span>
              </button></li>
            ))}
            {!filtered.length && <li className="note">Surah nggak ketemu.</li>}
          </ul>
        </>
      ) : (
        <ul className="qlist">
          {JUZ.map((p, i) => (
            <li key={i}><button type="button" onClick={() => go(p)}>
              <span className="qnum">{i + 1}</span>
              <span className="qname"><b>Juz {i + 1}</b><small>Mulai {surahOnPage(p)[1]} · hal {p}</small></span>
            </button></li>
          ))}
        </ul>
      )}
      <p className="note credit">Mushaf Madinah cetakan 1441H, riwayat Hafs. Teks dari Tanzil, tampilan halaman dari quran-madina-html.</p>
    </div>
  );
}

// muat script dengan ukuran huruf sesuai layar
function loadQmhSized(fs) {
  if (typeof window !== "undefined") window.__qmhFont = fs;
  return loadQmh();
}
