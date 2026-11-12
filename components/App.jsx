import { useCallback, useEffect, useRef, useState } from "react";
import NavView from "./NavView";
import PlanView from "./PlanView";
import QuranView from "./QuranView";
import ReportSheet from "./ReportSheet";
import { firebaseReady, subscribeReports } from "../lib/firebase";
import { getTheme, setTheme } from "../lib/theme";

const FILTERS = [["bersih", "Toilet bersih (4+)"], ["mukena", "Ada mukena"], ["bus", "Muat bus"], ["rebahan", "Bisa rebahan"], ["difabel", "Akses difabel"]];

export default function App() {
  const [tab, setTab] = useState("nav");
  const [filters, setFilters] = useState(new Set());
  const [reports, setReports] = useState([]);
  const [reportFor, setReportFor] = useState(null);
  const [liveFix, setLiveFix] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    try { const t = localStorage.getItem("jm-tab"); if (t === "nav" || t === "rencana") setTab(t); } catch {}
    try { const c = JSON.parse(localStorage.getItem("jm-reports") || "[]"); if (Array.isArray(c)) setReports(c); } catch {}
    const off = subscribeReports((rs) => { setReports(rs); try { localStorage.setItem("jm-reports", JSON.stringify(rs)); } catch {} });
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") navigator.serviceWorker.register("/sw.js").catch(() => {});
    return off;
  }, []);

  const pick = (t) => { setTab(t); try { if (t !== "quran") localStorage.setItem("jm-tab", t); } catch {} window.scrollTo({ top: 0 }); };
  const toggle = (k) => { const n = new Set(filters); n.has(k) ? n.delete(k) : n.add(k); setFilters(n); };
  const say = (t) => { setToast(t); setTimeout(() => setToast(""), 2800); };
  const onReport = useCallback((s) => setReportFor(s), []);

  const filterBar = (
    <div className="filters" role="group" aria-label="Saring fasilitas">
      {FILTERS.map(([k, l]) => <button key={k} className="chipbtn" type="button" aria-pressed={filters.has(k)} onClick={() => toggle(k)}>{l}</button>)}
    </div>
  );
  const common = { reports, filters, filterBar, onReport, canReport: firebaseReady };
  return (
    <>
      <header className="top">
        <div className="wrap">
          <div className="brand">
            <div><h1>Teman Safar</h1><span className="by-whi"><WhiMark />by Wisata Halal Indonesia</span></div>
            <ThemeButton />
          </div>
          <div className="tabs" role="tablist">
            <button role="tab" type="button" aria-selected={tab === "nav"} onClick={() => pick("nav")}>Navigasi</button>
            <button role="tab" type="button" aria-selected={tab === "rencana"} onClick={() => pick("rencana")}>Rencana</button>
          </div>
        </div>
      </header>
      <main>
        {tab === "nav" && <NavView reports={reports} onReport={onReport} canReport={firebaseReady} setLiveFix={setLiveFix} onPlan={() => pick("rencana")} onQuran={() => pick("quran")} />}
        {tab === "rencana" && <PlanView {...common} />}
        {tab === "quran" && <QuranView onBack={() => pick("nav")} />}
        {tab === "rencana" && (
          <div className="wrap">
            <p className="note" style={{ paddingBottom: 32 }}>
              Data rest area dari rekap mudik Trans Jawa dan Trans Sumatera. Posisinya masih perkiraan, buat perjalanan beneran pakai tab Navigasi.
            </p>
          </div>
        )}
      </main>
      {reportFor && <ReportSheet stop={reportFor} liveFix={liveFix} onClose={() => setReportFor(null)} onSent={() => { setReportFor(null); say("Laporan terkirim. Jazakallah khair!"); }} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}

const TH_IC = {
  auto: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" /></svg>,
  light: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>,
  dark: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>,
};
const TH_OPT = [["auto", "Otomatis"], ["light", "Terang"], ["dark", "Gelap"]];

// Tombol tema di kanan atas: Otomatis (ikut HP), Terang, Gelap.
function ThemeButton() {
  const [t, setT] = useState("auto");
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useEffect(() => { setT(getTheme()); }, []);
  useEffect(() => {
    if (!open) return;
    const away = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  const choose = (v) => { setTheme(v); setT(v); setOpen(false); };
  const label = TH_OPT.find((o) => o[0] === t)[1];
  return (
    <div className="th-wrap" ref={box}>
      <button type="button" className="th-btn" aria-haspopup="menu" aria-expanded={open} aria-label={`Tampilan: ${label}`} onClick={() => setOpen(!open)}>{TH_IC[t]}</button>
      {open && (
        <div className="th-menu" role="menu" aria-label="Tampilan">
          {TH_OPT.map(([v, l]) => (
            <button key={v} type="button" role="menuitemradio" aria-checked={t === v} onClick={() => choose(v)}>{TH_IC[v]}{l}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// Logo kecil WHI di header. Taruh file logonya di public/brand/whi-logo.png,
// selama filenya belum ada tampil lingkaran "WHI" sementara.
function WhiMark() {
  const [ok, setOk] = useState(true);
  return ok
    ? <img className="whi-logo" src="/brand/whi-logo.png" alt="" width="18" height="18" onError={() => setOk(false)} />
    : <i>WHI</i>;
}
