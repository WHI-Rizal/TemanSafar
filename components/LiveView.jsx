import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapView from "./MapView";
import StopCard from "./StopCard";
import { STOPS, merged, passFilter, masjidNearUrl } from "../lib/data";
import { snapToLines, coordAt, nearCity, LINES, distKm } from "../lib/route";
import { jam, timesAt, prayerNow, SHALAT, P_LABEL } from "../lib/prayer";
import { upcoming } from "../lib/trip";

const OFF_TOL_KM = 8;        // geometri jalur masih perkiraan, jadi toleransinya longgar
const SIM_FACTOR = 30;       // 1 detik nyata = 30 detik perjalanan
const NOTIFY_MIN = 15;

function fmtDur(min) {
  min = Math.max(0, Math.round(min));
  if (min < 60) return `${min} mnt`;
  return `${Math.floor(min / 60)} j ${String(min % 60).padStart(2, "0")} mnt`;
}
const todayKey = (ms) => new Date(ms + 7 * 3600e3).toISOString().slice(0, 10);

export default function LiveView({ reports, filters, filterBar, onReport, canReport, setLiveFix }) {
  const [status, setStatus] = useState("idle"); // idle | locating | live | error
  const [error, setError] = useState("");
  const [fix, setFix] = useState(null);
  const [sim, setSim] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [dirAuto, setDirAuto] = useState(null);
  const [dirManual, setDirManual] = useState(null);
  const [speed, setSpeed] = useState(null);
  const [done, setDone] = useState({});
  const watchId = useRef(null), lastSnap = useRef(null), wake = useRef(null), notified = useRef(new Set());

  const clock = useCallback(() => (sim ? sim.simStart + (Date.now() - sim.realStart) * SIM_FACTOR : Date.now()), [sim]);

  // jam berjalan
  useEffect(() => {
    if (status !== "live") return;
    const id = setInterval(() => setNow(clock()), sim ? 1000 : 15000);
    setNow(clock());
    return () => clearInterval(id);
  }, [status, sim, clock]);

  // "udah shalat" disimpan per hari
  useEffect(() => { try { const d = JSON.parse(localStorage.getItem("jm-done") || "{}"); if (d.day === todayKey(Date.now())) setDone(d.p || {}); } catch {} }, []);
  const markDone = (p) => { const nd = { ...done, [p]: true }; setDone(nd); try { localStorage.setItem("jm-done", JSON.stringify({ day: todayKey(now), p: nd })); } catch {} };

  const handleFix = useCallback((f) => {
    const snap = snapToLines(f.lat, f.lon);
    const prev = lastSnap.current;
    if (prev && snap && prev.line === snap.line) {
      const d = snap.pos - prev.pos;
      if (Math.abs(d) > 0.3) {
        setDirAuto(d > 0 ? "T" : "B");
        const hours = (f.t - prev.t) / 3600e3;
        if (hours > 0) {
          const v = Math.abs(d) / hours;
          if (v < 160) setSpeed((s) => (s ? s * 0.6 + v * 0.4 : v));
        }
        lastSnap.current = { ...snap, t: f.t };
      }
    } else if (snap) {
      lastSnap.current = { ...snap, t: f.t };
      if (prev && prev.line !== snap.line) setDirAuto(null);
    }
    if (typeof f.speed === "number" && f.speed > 0) setSpeed((s) => (s ? s * 0.6 + f.speed * 3.6 * 0.4 : f.speed * 3.6));
    setFix({ ...f, snap });
    setLiveFix && setLiveFix(f);
    setStatus("live");
  }, [setLiveFix]);

  const keepAwake = async () => {
    try { if ("wakeLock" in navigator) wake.current = await navigator.wakeLock.request("screen"); } catch {}
  };
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "visible" && status === "live") keepAwake(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [status]);

  const askNotify = () => { try { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission(); } catch {} };

  const start = () => {
    setError("");
    if (!("geolocation" in navigator)) { setStatus("error"); setError("HP atau browser ini nggak bisa kasih lokasi. Coba buka pakai Chrome atau Safari terbaru."); return; }
    askNotify(); keepAwake();
    setStatus("locating");
    watchId.current = navigator.geolocation.watchPosition(
      (p) => handleFix({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy, speed: p.coords.speed, t: Date.now() }),
      (e) => {
        setStatus((s) => (s === "live" ? s : "error"));
        setError(e.code === 1
          ? "Akses lokasi ditolak. Buka pengaturan browser, izinkan lokasi buat situs ini, terus tap Mulai lagi."
          : e.code === 3 ? "Sinyal GPS belum dapet. Pastikan GPS nyala dan coba di tempat terbuka." : "Lokasi belum bisa dibaca. Coba lagi sebentar.");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
  };

  const stop = () => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    try { wake.current?.release(); } catch {}
    setSim(null); setFix(null); setStatus("idle"); setDirAuto(null); setDirManual(null); setSpeed(null); lastSnap.current = null;
  };
  useEffect(() => () => { if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current); }, []);

  // simulasi Jakarta → Semarang
  const startSim = () => {
    askNotify();
    const s = { realStart: Date.now(), simStart: Date.now(), from: 0, to: 410, v: 80 };
    setSim(s); setStatus("locating"); setDirManual(null);
  };
  useEffect(() => {
    if (!sim) return;
    const tick = () => {
      const t = sim.simStart + (Date.now() - sim.realStart) * SIM_FACTOR;
      const pos = Math.min(sim.to, sim.from + (sim.v * (t - sim.simStart)) / 3600e3);
      const [lat, lon] = coordAt("jawa", pos);
      handleFix({ lat, lon, acc: 15, speed: sim.v / 3.6, t });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sim, handleFix]);

  const snap = fix?.snap;
  const onTol = snap && snap.distKm <= OFF_TOL_KM;
  const dir = dirManual || dirAuto;
  const v = speed && speed >= 30 ? speed : 80;

  const up = useMemo(() => {
    if (!fix || !onTol || !dir) return null;
    return upcoming({ line: snap.line, pos: snap.pos, dir, speed: v, now, lat: fix.lat, lon: fix.lon, max: 10, done });
  }, [fix, onTol, dir, snap, v, now, done]);

  const nearest = useMemo(() => {
    if (!fix || onTol) return [];
    return STOPS.map((s) => ({ s, d: distKm(fix.lat, fix.lon, s.lat, s.lon) })).sort((a, b) => a.d - b.d).slice(0, 3);
  }, [fix, onTol]);

  const times = fix ? timesAt(now, fix.lat, fix.lon) : null;
  const curP = fix ? prayerNow(now, fix.lat, fix.lon) : null;

  // notifikasi menjelang waktu shalat
  useEffect(() => {
    if (!up?.nx) return;
    const left = (up.nx.ms - now) / 60e3, key = up.nx.nama + todayKey(up.nx.ms);
    if (left > 0 && left <= NOTIFY_MIN && !notified.current.has(key)) {
      notified.current.add(key);
      const body = up.pickNext ? `Singgah yang pas: ${up.pickNext.s.nama}, ${Math.round(up.pickNext.km)} km lagi.` : "Siapkan tempat berhenti ya.";
      try {
        if ("Notification" in window && Notification.permission === "granted") {
          navigator.serviceWorker?.getRegistration().then((r) =>
            r ? r.showNotification(`${up.nx.nama} ${Math.round(left)} menit lagi`, { body, icon: "/icons/icon-192.png", tag: key })
              : new Notification(`${up.nx.nama} ${Math.round(left)} menit lagi`, { body }));
        }
      } catch {}
    }
  }, [up, now]);

  const aheadIds = useMemo(() => new Set((up?.ahead || []).map((x) => x.s.id)), [up]);
  const pickIds = useMemo(() => new Set([up?.pickCur?.s.id, up?.pickNext?.s.id].filter(Boolean)), [up]);
  const me = fix ? { lat: fix.lat, lon: fix.lon, acc: fix.acc } : null;

  let pcard = null;
  if (fix && times) {
    const cur = up?.cur || null;
    const curActive = cur && SHALAT.includes(cur.nama) && !done[cur.nama];
    const nxt = up?.nx || (() => { for (const p of SHALAT) if (times[p] > now) return { nama: p, ms: times[p] }; return null; })();
    if (curActive) {
      const r = up?.pickCur;
      pcard = (
        <div className="pnow soon">
          <div><div className="lbl">Sekarang waktu</div><div className="big">{cur.nama}</div></div>
          <div className="cd"><div className="lbl">Sisa waktu</div><b>{fmtDur((cur.ends - now) / 60e3)}</b></div>
          <div className="sub">
            {r ? <>Singgah yang pas: <b>{r.s.nama}</b>, {Math.round(r.km)} km lagi, tiba ± {jam(r.at)}.</> : onTol ? "Belum ada rest area di depan yang keburu. Pertimbangkan keluar tol dan cari masjid terdekat." : "Cari masjid terdekat pakai tombol di bawah."}
          </div>
          <button className="ghost" type="button" onClick={() => markDone(cur.nama)} style={{ gridColumn: "1 / -1" }}>Udah shalat {cur.nama}</button>
        </div>
      );
    } else if (nxt) {
      const left = (nxt.ms - now) / 60e3, r = up?.pickNext;
      pcard = (
        <div className={`pnow ${left <= NOTIFY_MIN ? "soon" : ""}`}>
          <div><div className="lbl">Shalat berikutnya</div><div className="big">{nxt.nama} {jam(nxt.ms)}</div></div>
          <div className="cd"><div className="lbl">Lagi</div><b>{fmtDur(left)}</b></div>
          <div className="sub">{r ? <>Pas masuk waktu, lu di sekitar <b>{r.s.nama}</b>, {Math.round(r.km)} km lagi.</> : onTol && dir ? "Nggak ada rest area tol di depan pas waktunya masuk." : "Jadwal dihitung dari posisi lu sekarang."}</div>
        </div>
      );
    }
  }

  const items = (up?.ahead || []).map((x) => ({ ...x, m: merged(x.s, reports) })).filter((x) => passFilter(x.m, filters));

  return (
    <>
      <MapView stops={STOPS} me={me} aheadIds={aheadIds} pickIds={pickIds} />
      <div className="wrap">
        {status === "idle" || status === "error" ? (
          <section className="start">
            <h2>Waktu shalat &amp; rest area dari posisi lu sekarang</h2>
            <ul>
              <li>Titik biru ikut gerak selama halaman ini kebuka</li>
              <li>Jadwal shalat dihitung dari koordinat lu, update terus</li>
              <li>Rest area di depan, lengkap jarak dan jam tibanya</li>
              <li>Notifikasi 15 menit sebelum masuk waktu</li>
            </ul>
            {error && <div className="err" role="alert">{error}</div>}
            <button className="bigbtn" type="button" onClick={start}>Mulai perjalanan</button>
            <button className="ghost" type="button" onClick={startSim}>Coba simulasi Jakarta → Semarang</button>
            <p className="note">Layar dijaga tetap nyala selama perjalanan. Kalau lu pindah ke Waze atau layar mati, update berhenti sebentar dan lanjut lagi pas halaman dibuka.</p>
          </section>
        ) : status === "locating" || !fix ? (
          <section className="start"><h2>Nyari sinyal GPS…</h2><p>Kalau ada pertanyaan izin lokasi, tap Izinkan.</p><button className="ghost" type="button" onClick={stop}>Batal</button></section>
        ) : (
          <section className="now" aria-live="polite">
            {sim && <div className="err" style={{ borderColor: "var(--accent)", background: "var(--surface)" }}>Mode simulasi: Jakarta → Semarang, waktu dipercepat {SIM_FACTOR}x. Jam {jam(now)}.</div>}
            {pcard}
            {times && (
              <div className="times" aria-label="Jadwal shalat hari ini di posisi lu">
                {SHALAT.map((p) => <div key={p} className={curP === p ? "on" : ""}>{p}<b>{jam(times[p])}</b></div>)}
              </div>
            )}
            <div className="where">
              {onTol ? (
                <>
                  <span><b>{LINES[snap.line].nama}</b> · sekitar {nearCity(snap.line, snap.pos)}</span>
                  <span>{Math.round(v)} km/jam</span>
                  <span className="dirs" role="group" aria-label="Arah">
                    {["B", "T"].map((d) => (
                      <button key={d} type="button" aria-pressed={dir === d} onClick={() => setDirManual(d)}>{d === "T" ? "" : "‹ "}{LINES[snap.line][d]}{d === "T" ? " ›" : ""}</button>
                    ))}
                  </span>
                </>
              ) : <span>Lu lagi di luar jalur tol yang ada datanya.</span>}
              <span>Akurasi ± {Math.round(fix.acc)} m</span>
            </div>
            <a className="btn" href={masjidNearUrl(fix.lat, fix.lon)} target="_blank" rel="noopener noreferrer">Cari masjid &amp; musala terdekat di Google Maps</a>
            <button className="ghost" type="button" onClick={stop}>Selesai perjalanan</button>
          </section>
        )}

        {status === "live" && onTol && !dir && <p className="empty" style={{ marginTop: 14 }}>Lagi nentuin arah perjalanan lu. Bisa juga pilih arah di atas.</p>}
        {status === "live" && onTol && dir && (
          <>
            <h2 className="sect">Rest area di depan</h2>
            {filterBar}
            <section className="strip">
              {!items.length && <div className="empty">{up?.ahead.length ? "Nggak ada yang cocok sama filter." : "Nggak ada rest area lagi di depan pada ruas ini."}</div>}
              {items.map((x) => {
                const pk = x.pick;
                return (
                  <StopCard key={x.s.id} s={x.s} m={x.m} onReport={onReport} canReport={canReport}
                    eta={<div className={`eta ${pk ? "pick" : ""}`}><span><b>{x.km < 1 ? "<1" : Math.round(x.km)} km</b> · ± {fmtDur(x.min)} · tiba <b>{jam(x.at)}</b></span><span className="pr">{pk ? (pk.kind === "cur" ? `Masih keburu shalat ${pk.nama}` : `Pas buat shalat ${pk.nama}`) : P_LABEL[x.pr]}</span></div>} />
                );
              })}
            </section>
          </>
        )}
        {status === "live" && !onTol && nearest.length > 0 && (
          <>
            <h2 className="sect">Rest area tol terdekat (garis lurus)</h2>
            <section className="strip">
              {nearest.map(({ s, d }) => <StopCard key={s.id} s={s} m={merged(s, reports)} onReport={onReport} canReport={canReport}
                eta={<div className="eta"><span><b>± {Math.round(d)} km</b> dari posisi lu</span><span className="pr">{s.arahNama}</span></div>} />)}
            </section>
          </>
        )}
      </div>
    </>
  );
}
