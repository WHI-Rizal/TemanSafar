import { ago, mapsUrl, wazeUrl } from "../lib/data";

const I = {
  mukena: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M12 3c-3 0-5 2.5-5 6v12h10V9c0-3.5-2-6-5-6z" /><circle cx="12" cy="9" r="2" /></svg>,
  sarung: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M6 4h12l-1 16H7z" /><path d="M6.5 9h11M7 14h10" /></svg>,
  bus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M3 11h18" /><circle cx="7.5" cy="19" r="1.5" /><circle cx="16.5" cy="19" r="1.5" /></svg>,
  rebahan: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 18V8M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5" /><circle cx="7" cy="11" r="2" /></svg>,
};
export const NavIcon = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round"><path d="M3 11l18-8-8 18-2-8z" /></svg>;
export const AdzanIcon = () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"><path d="M12 3c2.5 2 5 3.5 5 7H7c0-3.5 2.5-5 5-7z" /><path d="M6 10h12v10H6zM10 20v-4a2 2 0 0 1 4 0v4M3 20h18M4 20V8M20 20V8" /></svg>;

const FACS = [["mukena", "Mukena"], ["sarung", "Sarung"], ["bus", "Muat bus"], ["rebahan", "Rebahan"]];

export default function StopCard({ s, m, eta, onReport, canReport }) {
  const a = ago(m.upd), c = m.clean, n = c ? Math.round(c) : 0;
  const tone = !c ? "" : c >= 4 ? "" : c >= 3 ? "mid" : "low";
  return (
    <article className="stop">
      <div className="post" aria-hidden="true"><small>KM</small><span>{s.km}</span></div>
      <div className="card">
        <div>
          <h3>{s.nama}</h3>
          <div className="meta">
            {s.tipe && <span className="tag">Tipe {s.tipe}</span>}
            {s.temporer && <span className="tag">Temporer</span>}
            <span>{s.ruasNama}{s.arahNama ? ` · ${s.arahNama}` : ""}</span>
            <span className={`fresh ${a.c}`}><i className="dot" />{a.t}</span>
          </div>
        </div>
        {eta}
        <div className="clean">
          <span className="lbl">Toilet &amp; wudu</span>
          <div className={`bar ${tone}`}>{[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= n ? "on" : ""} />)}</div>
          <b>{c ? c.toFixed(1) : "–"}</b>
        </div>
        <div className="facs">
          {FACS.map(([k, l]) => {
            const v = m.f[k];
            return <div key={k} className={`fac ${v === false ? "no" : v == null ? "unk" : ""}`}>{I[k]}<span>{l}{v == null ? "?" : ""}</span></div>;
          })}
        </div>
        {m.last?.catatan && <div className="last">Laporan terakhir: <q>{m.last.catatan}</q></div>}
        <div className="actions">
          <a className="btn" href={mapsUrl(s)} target="_blank" rel="noopener noreferrer"><NavIcon />Maps</a>
          <a className="btn" href={wazeUrl(s)} target="_blank" rel="noopener noreferrer">Waze</a>
          <button className="btn primary" type="button" onClick={() => onReport(s)} disabled={!canReport}
            title={canReport ? undefined : "Fitur laporan belum disambungkan ke database"}>Lapor kondisi</button>
        </div>
      </div>
    </article>
  );
}
