import { useCallback, useEffect, useState } from "react";
import LiveView from "./LiveView";
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
    try { const t = localStorage.getItem("jm-tab"); if (t === "nav" || t === "live" || t === "rencana") setTab(t); } catch {}
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
          <div className="brand"><h1>Jejak Musafir</h1><span>{tab === "nav" ? "Navigasi" : tab === "live" ? "Live dari GPS" : "Rencana perjalanan"}</span></div>
          <div className="tabs" role="tablist">
            <button role="tab" type="button" aria-selected={tab === "nav"} onClick={() => pick("nav")}>Navigasi</button>
            <button role="tab" type="button" aria-selected={tab === "live"} onClick={() => pick("live")}>Live</button>
            <button role="tab" type="button" aria-selected={tab === "rencana"} onClick={() => pick("rencana")}>Rencana</button>
          </div>
        </div>
      </header>
      <main>
        {tab === "nav" && <NavView reports={reports} onReport={onReport} canReport={firebaseReady} setLiveFix={setLiveFix} />}
        <div style={{ display: tab === "live" ? "block" : "none" }}>
          <LiveView {...common} setLiveFix={setLiveFix} />
        </div>
        {tab === "rencana" && <PlanView {...common} />}
        <div className="wrap">
          <p className="note" style={{ paddingBottom: 32 }}>
            Data rest area dari rekap mudik Trans Jawa dan Trans Sumatera. Posisi di peta masih perkiraan dan bakal makin pas dari laporan musafir.
            {!firebaseReady && " Fitur laporan belum aktif karena database belum disambungkan."}
          </p>
        </div>
      </main>
      {reportFor && <ReportSheet stop={reportFor} liveFix={liveFix} onClose={() => setReportFor(null)} onSent={() => { setReportFor(null); say("Laporan terkirim. Jazakallah khair!"); }} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
