import { useEffect, useMemo, useState } from "react";
import StopCard, { AdzanIcon } from "./StopCard";
import { CITIES, LINES, findCity, planRoute } from "../lib/route";
import { merged, passFilter } from "../lib/data";
import { jam, prayerNow, WIB, P_LABEL } from "../lib/prayer";
import { buildTimeline, prayerEvents, legStops } from "../lib/trip";

const pad = (n) => String(n).padStart(2, "0");
const toLocalInput = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const defaultDepart = () => { const d = new Date(Date.now() + 15 * 60e3); d.setMinutes(Math.floor(d.getMinutes() / 5) * 5, 0, 0); return d.getTime(); };

export default function PlanView({ reports, filters, filterBar, onReport, canReport }) {
  const [dari, setDari] = useState(""), [ke, setKe] = useState("");
  const [berangkat, setBerangkat] = useState(""), [speed, setSpeed] = useState(80);
  const [trip, setTrip] = useState(null), [err, setErr] = useState("");

  useEffect(() => {
    let dep = defaultDepart();
    try {
      const t = JSON.parse(localStorage.getItem("jm-trip") || "null");
      if (t?.dari && t?.ke) {
        setDari(t.dari); setKe(t.ke); if (t.speed) setSpeed(t.speed);
        if (t.depart > Date.now() - 6 * 3600e3) dep = t.depart;
        const a = findCity(t.dari), b = findCity(t.ke);
        if (a && b && a !== b) setTrip({ a, b, depart: dep, speed: t.speed || 80 });
      }
    } catch {}
    setBerangkat(toLocalInput(dep));
  }, []);

  const submit = (e) => {
    e.preventDefault();
    const a = findCity(dari), b = findCity(ke);
    if (!a || !b) { setErr(`Kota ${!a ? "asal" : "tujuan"} belum ketemu. Pilih dari daftar yang muncul waktu kamu ngetik, misal Jakarta, Semarang, atau Bandar Lampung.`); return; }
    if (a === b) { setErr("Kota asal dan tujuan masih sama. Ganti salah satunya ya."); return; }
    const dep = berangkat ? new Date(berangkat).getTime() : Date.now();
    if (!isFinite(dep)) { setErr("Jam berangkat belum kebaca. Isi tanggal dan jamnya ya."); return; }
    setErr(""); setDari(a.nama); setKe(b.nama);
    const t = { a, b, depart: dep, speed: Number(speed) || 80 };
    setTrip(t);
    try { localStorage.setItem("jm-trip", JSON.stringify({ dari: a.nama, ke: b.nama, depart: dep, speed: t.speed })); } catch {}
  };
  const swap = () => { setDari(ke); setKe(dari); };

  const plan = useMemo(() => {
    if (!trip) return null;
    const legs = planRoute(trip.a, trip.b);
    if (!legs) return { none: true };
    if (!legs.length) return { near: true };
    const tl = buildTimeline(legs, trip.speed), events = prayerEvents(tl, trip.depart);
    const rows = [];
    let total = 0, km = 0;
    tl.segs.forEach((sg, i) => {
      if (sg.ferry) { rows.push({ kind: "ferry", min: sg.start, key: "f" + i }); return; }
      km += Math.abs(sg.to - sg.from);
      const ss = legStops(sg);
      total += ss.length;
      rows.push({ kind: "leg", min: sg.start - 0.001, sg, count: ss.length, key: "l" + i });
      for (const s of ss) {
        const min = sg.start + (Math.abs(s.linePos - sg.from) / trip.speed) * 60, at = trip.depart + min * 60e3;
        rows.push({ kind: "stop", min, s, at, pr: prayerNow(at, s.lat, s.lon), key: s.id });
      }
    });
    for (const e of events) {
      const r = rows.find((r) => r.kind === "stop" && r.min >= e.min && r.pr === e.nama && !r.pick);
      if (r) r.pick = e.nama;
      e.stop = r || null;
      rows.push({ kind: "adzan", min: e.min - 0.0005, e, key: "a" + e.nama + e.min });
    }
    rows.sort((a, b) => a.min - b.min);
    return { rows, events, total, km, arrive: trip.depart + tl.total * 60e3, ferry: legs.some((l) => l.ferry) };
  }, [trip]);

  let shown = 0;
  return (
    <>
      <div className="plan">
        <form className="wrap" onSubmit={submit} noValidate>
          <div className="rf">
            <div className="col">
              <div className="fld"><label htmlFor="dari">Dari</label><input id="dari" list="kota" value={dari} onChange={(e) => setDari(e.target.value)} placeholder="Ketik kota, misal Jakarta" autoComplete="off" /></div>
              <div className="fld"><label htmlFor="ke">Ke</label><input id="ke" list="kota" value={ke} onChange={(e) => setKe(e.target.value)} placeholder="Ketik kota, misal Semarang" autoComplete="off" /></div>
            </div>
            <button type="button" className="swap" onClick={swap} aria-label="Tukar asal dan tujuan">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4" /></svg>
            </button>
          </div>
          <div className="opts">
            <div className="fld"><label htmlFor="berangkat">Berangkat</label><input id="berangkat" type="datetime-local" value={berangkat} onChange={(e) => setBerangkat(e.target.value)} /></div>
            <div className="fld"><label htmlFor="speed">Rata-rata</label>
              <select id="speed" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>{[60, 70, 80, 90, 100].map((v) => <option key={v} value={v}>{v} km/jam</option>)}</select></div>
          </div>
          <button type="submit" className="go">Cari titik singgah &amp; waktu shalat</button>
          {err && <p className="perr" role="alert">{err}</p>}
          <datalist id="kota">{CITIES.map((c) => <option key={c[0]} value={c[0]}>{c[3]}</option>)}</datalist>
        </form>
      </div>
      <div className="wrap">
        {!trip && <div className="empty" style={{ marginTop: 14 }}>Isi kota asal, tujuan, dan jam berangkat. Nanti muncul semua rest area yang kamu lewati, lengkap sama waktu shalat di jalan.</div>}
        {plan?.none && <div className="summary"><div className="trip">{trip.a.nama} → {trip.b.nama}</div><div className="facts">Dua kota ini belum tersambung jalan tol di data kami.</div></div>}
        {plan?.near && <div className="summary"><div className="trip">{trip.a.nama} → {trip.b.nama}</div><div className="facts">Jaraknya dekat banget, nggak ada rest area tol di antaranya.</div></div>}
        {plan?.rows && (
          <>
            <div className="summary">
              <div className="trip">{trip.a.nama} → {trip.b.nama}</div>
              <div className="facts">
                <span>Berangkat <b>{jam(trip.depart)}</b></span>
                <span>Tiba ± <b>{jam(plan.arrive)}</b>{WIB(plan.arrive).d !== WIB(trip.depart).d ? " (besoknya)" : ""}</span>
                <span><b>{plan.total}</b> titik singgah</span><span>± <b>{Math.round(plan.km)}</b> km</span>
                {plan.ferry && <span>Termasuk nyebrang kapal</span>}
              </div>
              {plan.events.length
                ? <div className="plist">{plan.events.map((e) => <span key={e.nama + e.min} className="pchip">{e.nama} <b>{jam(e.ms)}</b></span>)}</div>
                : <div className="facts">Nggak ada waktu shalat baru yang masuk selama perjalanan ini.</div>}
              <div className="note">Jadwal metode Kemenag dari posisi perkiraan, bisa beda 1 sampai 3 menit dari jadwal masjid setempat. Pas di jalan, pakai tab Live biar ngikutin GPS.</div>
            </div>
            {filterBar}
            <section className="strip">
              {plan.rows.map((r) => {
                if (r.kind === "ferry") return <div key={r.key} className="ferry"><span><b>Nyebrang kapal Merak – Bakauheni.</b> Perkiraan 3 jam termasuk antre. Shalat di musala kapal atau pelabuhan.</span></div>;
                if (r.kind === "leg") return <div key={r.key} className="leg"><h2 className="sect" style={{ margin: 0 }}>{LINES[r.sg.line].nama}</h2><small>{r.count} titik di bagian ini</small></div>;
                if (r.kind === "adzan") {
                  const e = r.e;
                  return (
                    <div key={r.key} className="adzan"><AdzanIcon /><div><b>Masuk {e.nama} ± {jam(e.ms)}</b>
                      <span>Posisi kamu {e.place}. {e.stop ? `Singgah yang pas: ${e.stop.s.nama}, tiba ± ${jam(e.stop.at)}.` : e.ferry ? "Shalat di kapal atau pelabuhan." : "Nggak ada rest area tol lagi sebelum waktunya habis, cari masjid setelah keluar tol."}</span></div></div>
                  );
                }
                const m = merged(r.s, reports);
                if (!passFilter(m, filters)) return null;
                shown++;
                return <StopCard key={r.key} s={r.s} m={m} onReport={onReport} canReport={canReport}
                  eta={<div className={`eta ${r.pick ? "pick" : ""}`}><span>Tiba ± <b>{jam(r.at)}</b></span><span className="pr">{r.pick ? `Pas buat shalat ${r.pick}` : P_LABEL[r.pr]}</span></div>} />;
              })}
            </section>
          </>
        )}
      </div>
    </>
  );
}
