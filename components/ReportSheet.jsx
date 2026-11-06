import { useEffect, useRef, useState } from "react";
import { addReport } from "../lib/firebase";
import { distKm } from "../lib/route";

const QS = [["mukena", "Ada mukena layak?"], ["sarung", "Ada sarung?"], ["bus", "Parkir muat bus?"], ["rebahan", "Boleh rebahan?"], ["difabel", "Akses difabel?"]];

export default function ReportSheet({ stop, liveFix, onClose, onSent }) {
  const [k, setK] = useState(0);
  const [ans, setAns] = useState({});
  const [note, setNote] = useState("");
  const [useLoc, setUseLoc] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const first = useRef(null);

  const nearKm = liveFix ? distKm(liveFix.lat, liveFix.lon, stop.lat, stop.lon) : null;
  // posisi rest area masih perkiraan, jadi lokasi baru ditawarkan kalau lu cukup dekat
  const canLoc = liveFix && liveFix.acc < 150 && nearKm < (stop.approx ? 15 : 1.5);

  useEffect(() => {
    first.current?.focus();
    const esc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    if (!k) { setErr("Kasih nilai kebersihan dulu ya, 1 sampai 5."); return; }
    const r = { masjidId: stop.id, kebersihan: k, catatan: note.trim().slice(0, 200) || undefined };
    for (const [q] of QS) if (ans[q] === "y") r[q] = true; else if (ans[q] === "n") r[q] = false;
    if (canLoc && useLoc) r.lokasi = { lat: +liveFix.lat.toFixed(6), lon: +liveFix.lon.toFixed(6), acc: Math.round(liveFix.acc) };
    setBusy(true); setErr("");
    try { await addReport(r); onSent(); }
    catch (x) {
      setErr(x?.code === "permission-denied" ? "Laporan ditolak server. Pastikan isiannya lengkap, lalu coba lagi." : "Gagal kirim, sinyal mungkin lagi lemah. Coba kirim lagi sebentar.");
    } finally { setBusy(false); }
  };

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="rs-title">
        <form className="wrap" onSubmit={submit} noValidate>
          <h2 id="rs-title">Lapor kondisi</h2>
          <p className="sub">{stop.nama} · {stop.ruasNama}</p>
          <fieldset>
            <legend>Kebersihan toilet &amp; tempat wudu</legend>
            <div className="stars">
              {[1, 2, 3, 4, 5].map((i) => (
                <label key={i}><input ref={i === 4 ? first : null} type="radio" name="k" id={`k${i}`} checked={k === i} onChange={() => setK(i)} /><span>{i}</span></label>
              ))}
            </div>
            <div className="scale"><span>Jorok</span><span>Bersih banget</span></div>
          </fieldset>
          <fieldset>
            <legend>Yang lu lihat sekarang</legend>
            {QS.map(([q, l]) => (
              <div className="q" key={q}><span>{l}</span>
                <div className="yn">
                  {[["y", "Ada"], ["n", "Nggak"], ["u", "Skip"]].map(([v, t]) => (
                    <label key={v}><input type="radio" name={q} id={`${q}-${v}`} checked={(ans[q] || "u") === v} onChange={() => setAns({ ...ans, [q]: v })} /><span>{t}</span></label>
                  ))}
                </div>
              </div>
            ))}
          </fieldset>
          <label htmlFor="catatan" style={{ fontWeight: 700 }}>Catatan singkat <span style={{ fontWeight: 400, color: "var(--muted)" }}>(opsional)</span></label>
          <textarea id="catatan" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Misal: toilet pria antre, mukena ada tapi sedikit" />
          {canLoc && (
            <label className="check" htmlFor="useloc"><input id="useloc" type="checkbox" checked={useLoc} onChange={(e) => setUseLoc(e.target.checked)} />
              <span>Kirim titik GPS gue sekarang. Ini bantu benerin posisi rest area di peta dan nunjukin laporan ini dikirim dari lokasi.</span></label>
          )}
          {err && <p className="err" role="alert">{err}</p>}
          <div className="actions" style={{ gridTemplateColumns: "1fr 1.4fr" }}>
            <button className="btn" type="button" onClick={onClose}>Batal</button>
            <button className="btn primary" type="submit" disabled={busy}>{busy ? "Mengirim…" : "Kirim laporan"}</button>
          </div>
        </form>
      </div>
    </>
  );
}
