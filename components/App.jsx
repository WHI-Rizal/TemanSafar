import { useCallback, useEffect, useState } from "react";
import NavView from "./NavView";
import PlanView from "./PlanView";
import ReportSheet from "./ReportSheet";
import { firebaseReady, subscribeReports } from "../lib/firebase";

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

  const pick = (t) => { setTab(t); try { localStorage.setItem("jm-tab", t); } catch {} window.scrollTo({ top: 0 }); };
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
            <svg className="logo" viewBox="0 0 40 40" width="34" height="34" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#e8b21c" /><path d="M20 8c3.6 2.8 7 4.9 7 9.6H13c0-4.7 3.4-6.8 7-9.6z" fill="#0d6b45" /><path d="M12.5 17.6h15v4.4h-15z" fill="#0d6b45" /><path d="M17.5 33l1.2-9h2.6l1.2 9z" fill="#0d6b45" /><path d="M20 25.5v1.6M20 29v1.6" stroke="#e8b21c" strokeWidth="1.2" /></svg>
            <div><h1>Teman Safar</h1><span>Teman shalat di perjalanan</span></div>
          </div>
          <div className="tabs" role="tablist">
            <button role="tab" type="button" aria-selected={tab === "nav"} onClick={() => pick("nav")}>Navigasi</button>
            <button role="tab" type="button" aria-selected={tab === "rencana"} onClick={() => pick("rencana")}>Rencana</button>
          </div>
        </div>
      </header>
      <main>
        {tab === "nav" && <NavView reports={reports} onReport={onReport} canReport={firebaseReady} setLiveFix={setLiveFix} onPlan={() => pick("rencana")} />}
        {tab === "rencana" && <PlanView {...common} />}
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
