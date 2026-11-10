import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NavMap from "./NavMap";
import FreeDrive from "./FreeDrive";
import Home from "./Home";
import SearchField, { saveRecent } from "./SearchField";
import { speak as voiceSpeak, stop as voiceStop } from "../lib/voice";
import { CITIES } from "../lib/route";
import { merged, ago } from "../lib/data";
import { jam, nextPrayer, currentEnds, SHALAT } from "../lib/prayer";
import { project, pointAt, headingAt, sample, hav } from "../lib/geo";
import {
  geocode, fetchRoute, fetchPois, placePois, pickStops, stepIndexAt, durAt, etaAt,
  instr, iconKey, fmtDist, sayDist, fmtDur, roadName, ROUTE_PROVIDER, MODES,
} from "../lib/nav";

// simulasi: 10x lebih cepat (bisa diubah buat tes pakai ?simx=60)
const SIM_SPEED = (typeof window !== "undefined" && Number(new URLSearchParams(window.location.search).get("simx"))) || 10;
const POI_WINDOW = 80000;      // ambil masjid untuk 80 km ke depan
const POI_REFETCH = 40000;     // ambil ulang tiap maju 40 km
const OFF_ROUTE_M = 60;

const KIND = { masjid: "Masjid", musala: "Musala", rest: "Rest area" };
const ICONS = {
  left: "M15 19V12a3 3 0 0 0-3-3H6m0 0 4-4M6 9l4 4",
  right: "M9 19V12a3 3 0 0 1 3-3h6m0 0-4-4m4 4-4 4",
  "slight-left": "M15 20v-6L8 7m0 0v5m0-5h5",
  "slight-right": "M9 20v-6l7-7m0 0v5m0-5h-5",
  straight: "M12 20V5m0 0-5 5m5-5 5 5",
  uturn: "M8 20V9a4 4 0 0 1 8 0v4m0 0-3-3m3 3 3-3",
  roundabout: "M12 20v-5m0-6a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm2.1-.9L18 4m0 0h-4m4 0v4",
  arrive: "M12 21s-6-5.5-6-11a6 6 0 1 1 12 0c0 5.5-6 11-6 11zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
};
const Turn = ({ k, size = 44 }) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[k] || ICONS.straight} /></svg>;
const todayKey = (ms) => new Date(ms + 7 * 3600e3).toISOString().slice(0, 10);
const poiStop = (p) => ({ id: p.id, nama: p.nama, ruasNama: KIND[p.kind] + (p.inRest ? ` · di ${p.inRest}` : ""), lat: p.lat, lon: p.lon, approx: false });

function speak(text, muted, urgent = false) { voiceSpeak(text, { muted, urgent }); }

const Car = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17h14v-5l-2-5H7l-2 5z" /><path d="M5 12h14" /><circle cx="8" cy="17" r="1.6" /><circle cx="16" cy="17" r="1.6" /></svg>;
const Moto = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="5.5" cy="16.5" r="3" /><circle cx="18.5" cy="16.5" r="3" /><path d="M5.5 16.5 9 10h5l4.5 6.5M14 10l-1.5-3H10M9 10l3 6.5h-2" /></svg>;

// ---------- kolom cari tempat ----------
function PlaceField({ id, label, value, onPick, placeholder, near, allowMe }) {
  const [q, setQ] = useState(value?.nama || "");
  const [hits, setHits] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setQ(value?.nama || ""); }, [value]);
  useEffect(() => {
    if (!open || q.trim().length < 2 || q === value?.nama) { setHits([]); return; }
    const ac = new AbortController();
    const local = CITIES.filter((c) => c[0].toLowerCase().includes(q.trim().toLowerCase())).slice(0, 3).map((c) => ({ nama: c[0], detail: c[3], lon: c[5], lat: c[4] }));
    setHits(local);
    const t = setTimeout(async () => {
      setBusy(true);
      try { const r = await geocode(q.trim(), near, ac.signal); setHits(r.length ? r : local); } catch (e) { if (e.name !== "AbortError") setHits(local); }
      finally { setBusy(false); }
    }, 350);
    return () => { clearTimeout(t); ac.abort(); };
  }, [q, open, near, value]);
  return (
    <div className="pf">
      <label htmlFor={id}>{label}</label>
      <input id={id} value={q} placeholder={placeholder} autoComplete="off" enterKeyHint="search"
        onChange={(e) => { setQ(e.target.value); setOpen(true); if (!e.target.value) onPick(null); }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 200)} />
      {open && (hits.length > 0 || allowMe || busy) && (
        <ul className="pf-list" role="listbox">
          {allowMe && <li><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick(null); setQ(""); setOpen(false); }}>Lokasi saya (GPS)</button></li>}
          {hits.map((h, i) => (
            <li key={i}><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick(h); setQ(h.nama); setOpen(false); }}>
              <b>{h.nama}</b>{h.detail && <span>{h.detail}</span>}</button></li>
          ))}
          {busy && <li className="pf-busy">Mencari…</li>}
        </ul>
      )}
    </div>
  );
}

export default function NavView({ reports, onReport, canReport, setLiveFix, onPlan }) {
  const [phase, setPhase] = useState("setup"); // setup | routing | preview | nav | arrived
  const [dest, setDest] = useState(null);
  const [mode, setModeState] = useState(() => { try { return localStorage.getItem("ts-mode") === "motor" ? "motor" : "mobil"; } catch { return "mobil"; } });
  const [avoidToll, setAvoidToll] = useState(() => { try { return localStorage.getItem("ts-notoll") === "1"; } catch { return false; } });
  const setMode = (m) => { setModeState(m); try { localStorage.setItem("ts-mode", m); } catch {} };
  const toggleToll = (v) => { setAvoidToll(v); try { localStorage.setItem("ts-notoll", v ? "1" : "0"); } catch {} };
  const routeOpts = { mode, avoidToll: mode === "motor" || avoidToll };
  const [origin, setOrigin] = useState(null); // null = GPS
  const [gps, setGps] = useState(null);
  const [route, setRoute] = useState(null);
  const [stop, setStop] = useState(null);      // tempat singgah yang dipilih
  const [pois, setPois] = useState([]);
  const [err, setErr] = useState("");
  const [sim, setSim] = useState(null);
  const [state, setState] = useState(null);    // posisi terkini di rute
  const [now, setNow] = useState(Date.now());
  const [follow, setFollow] = useState(true);
  const [muted, setMuted] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [done, setDone] = useState({});
  const [atStop, setAtStop] = useState(false);
  const [rerouting, setRerouting] = useState(false);
  const [showFrom, setShowFrom] = useState(false);
  const [free, setFree] = useState(null);        // mode jalan tanpa tujuan: { simulate }
  const [target, setTarget] = useState(null);    // masjid tujuan kalau berangkat dari mode tanpa tujuan

  const watch = useRef(null), wake = useRef(null), said = useRef(new Set()), poiCache = useRef(new Map());
  const lastFetch = useRef(-1e9), off = useRef(0), lastReroute = useRef(0), factor = useRef(1), started = useRef(null), seg = useRef(1);
  const routeRef = useRef(null); routeRef.current = route;
  const atStopRef = useRef(false); atStopRef.current = atStop;

  // posisi awal (buat bias pencarian & titik berangkat)
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition((p) => setGps([p.coords.longitude, p.coords.latitude]), () => {}, { enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 });
  }, []);
  useEffect(() => { try { const d = JSON.parse(localStorage.getItem("jm-done") || "{}"); if (d.day === todayKey(Date.now())) setDone(d.p || {}); } catch {} }, []);
  const markDone = (p) => { const nd = { ...done, [p]: true }; setDone(nd); try { localStorage.setItem("jm-done", JSON.stringify({ day: todayKey(now), p: nd })); } catch {} };

  const clock = useCallback(() => (sim ? sim.simStart + (Date.now() - sim.realStart) * SIM_SPEED : Date.now()), [sim]);

  // ---------- ambil masjid di jendela depan ----------
  const loadPois = useCallback(async (rt, fromAlong) => {
    lastFetch.current = fromAlong;
    const step = Math.max(500, Math.min(2000, POI_WINDOW / 160));
    const pts = sample(rt.line, fromAlong - 2000, fromAlong + POI_WINDOW, step);
    try {
      // tampilkan bertahap: kotak terdekat duluan
      const show = (list) => { list.forEach((p) => poiCache.current.set(p.id, p)); if (routeRef.current === rt) setPois(placePois(rt, [...poiCache.current.values()])); };
      show(await fetchPois(pts, undefined, show));
    } catch { /* tanpa data masjid, navigasi tetap jalan */ }
  }, []);

  // ---------- hitung rute ----------
  const plan = useCallback(async (from, to, via, failPhase = "setup") => {
    setErr(""); setPhase("routing");
    try {
      const pts = [from, ...(via ? [[via.lon, via.lat]] : []), [to.lon, to.lat]];
      const rt = await fetchRoute(pts, routeOpts);
      setRoute(rt); routeRef.current = rt; seg.current = 1;
      setPois(placePois(rt, [...poiCache.current.values()]));
      loadPois(rt, 0);
      return rt;
    } catch (e) {
      setErr(e.message === "no_route" || /NoRoute/i.test(e.message) ? "Rute nggak ketemu. Coba tujuan lain atau titik yang lebih dekat ke jalan." : "Gagal ambil rute. Cek sinyal internet, lalu coba lagi.");
      setPhase(failPhase);
      return null;
    }
  }, [loadPois, mode, avoidToll]);

  const preview = async (d = dest) => {
    if (!d) { setErr("Pilih tujuan dulu dari daftar yang muncul."); return; }
    const from = origin ? [origin.lon, origin.lat] : gps;
    if (!from) { setErr("Lokasi lu belum kebaca. Izinkan akses lokasi, atau isi kolom Dari buat simulasi."); return; }
    const rt = await plan(from, d, null);
    if (rt) { setStop(null); setState({ along: 0, point: rt.line.coords[0], bearing: headingAt(rt.line, 0), speed: 0 }); setNow(Date.now()); setPhase("preview"); }
  };

  // ---------- proses tiap posisi ----------
  const onFix = useCallback((f) => {
    const rt = routeRef.current;
    if (!rt) return;
    const p = [f.lon, f.lat];
    let pr = project(rt.line, p, seg.current - 3, seg.current + 400);
    if (!pr || pr.dist > OFF_ROUTE_M) pr = project(rt.line, p);
    seg.current = pr.seg;
    const t = f.t;
    setNow(t);
    setLiveFix && setLiveFix({ lat: f.lat, lon: f.lon, acc: f.acc });
    if (!started.current) started.current = { t, along: pr.along };
    const el = (t - started.current.t) / 1000, pred = durAt(rt, pr.along) - durAt(rt, started.current.along);
    if (el > 300 && pred > 60) factor.current = factor.current * 0.8 + Math.max(0.6, Math.min(2.5, el / pred)) * 0.2;

    // keluar rute → hitung ulang
    if (pr.dist > OFF_ROUTE_M && (f.acc || 0) < 60) off.current++; else off.current = 0;
    if (off.current >= 3 && t - lastReroute.current > 15000 && !f.sim) {
      lastReroute.current = t; off.current = 0;
      speak("Rute dihitung ulang", muted);
      setRerouting(true);
      const destPt = rt.line.coords[rt.line.coords.length - 1];
      fetchRoute([p, ...(stop && !atStop ? [[stop.lon, stop.lat]] : []), destPt], routeOpts).then((nr) => {
        setRoute(nr); routeRef.current = nr; seg.current = 1; started.current = null;
        setPois(placePois(nr, [...poiCache.current.values()])); loadPois(nr, 0);
      }).catch(() => {}).finally(() => setRerouting(false));
    }

    const along = pr.along;
    const bearing = (f.speed || 0) > 3 && typeof f.heading === "number" && !isNaN(f.heading) && pr.dist > 25 ? f.heading : headingAt(rt.line, along);
    setState({ along, point: pr.dist > 25 ? p : pr.point, bearing, speed: f.speed || 0, acc: f.acc, off: pr.dist });

    if (along > lastFetch.current + POI_REFETCH) loadPois(rt, along);

    // sampai?
    const remain = rt.distance - along;
    const wp = rt.steps.find((s) => s.waypoint);
    if (wp && !atStop && along >= wp.along - 50 && along < wp.along + 600) { setAtStop(true); speak(`Sampai di ${stop?.nama || "tempat singgah"}`, muted); }
    if (remain < 40) { setPhase("arrived"); speak("Sampai di tujuan. Alhamdulillah.", muted); }
  }, [loadPois, muted, setLiveFix, stop, atStop, mode, avoidToll]);

  // ---------- mulai / berhenti ----------
  const keepAwake = async () => { try { if ("wakeLock" in navigator) wake.current = await navigator.wakeLock.request("screen"); } catch {} };
  useEffect(() => {
    const v = () => { if (document.visibilityState === "visible" && phase === "nav") keepAwake(); };
    document.addEventListener("visibilitychange", v);
    return () => document.removeEventListener("visibilitychange", v);
  }, [phase]);

  const begin = (rt = route, simulated = !!origin) => {
    said.current = new Set(); started.current = null; factor.current = 1; off.current = 0;
    keepAwake();
    try { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission(); } catch {}
    speak(instr(rt.steps[0]) + (rt.steps[1] ? `, lalu ${instr(rt.steps[1]).toLowerCase()}` : ""), muted); // juga membuka izin suara di iOS
    setFollow(true); setSheet(false); setPhase("nav");
    if (simulated) { setSim({ realStart: Date.now(), simStart: Date.now() }); return; }
    watch.current = navigator.geolocation.watchPosition(
      (p) => onFixRef.current({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy, speed: p.coords.speed, heading: p.coords.heading, t: Date.now() }),
      (e) => setErr(e.code === 1 ? "Akses lokasi ditolak. Izinkan lokasi buat situs ini di pengaturan browser." : "Sinyal GPS lemah. Navigasi lanjut begitu lokasi kebaca lagi."),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 }
    );
  };
  const onFixRef = useRef(onFix); onFixRef.current = onFix;

  const end = () => {
    if (watch.current != null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null; setSim(null);
    try { wake.current?.release(); } catch {}
    voiceStop();
    setPhase("setup"); setRoute(null); setStop(null); setAtStop(false); setPois([]); setState(null); setTarget(null);
  };

  // dari mode tanpa tujuan: langsung dituntun ke masjid yang dipilih
  const startTo = async (p, here, simulated) => {
    const from = here || gps;
    if (!from) return;
    setFree(null);
    setDest({ nama: p.nama, detail: "", lon: p.lon, lat: p.lat });
    setOrigin(simulated ? { nama: "Posisi simulasi", lon: from[0], lat: from[1] } : null);
    setTarget({ ...p, simulated });
    const rt = await plan(from, { lon: p.lon, lat: p.lat }, null, "setup");
    if (rt) { setStop(null); setAtStop(false); setState({ along: 0, point: rt.line.coords[0], bearing: headingAt(rt.line, 0), speed: 0 }); begin(rt, simulated); }
  };
  const backToFree = () => { const s = !!target?.simulated; end(); setFree({ simulate: s }); };
  useEffect(() => () => { if (watch.current != null) navigator.geolocation.clearWatch(watch.current); }, []);

  // simulasi: jalan di sepanjang rute sesuai perkiraan waktu tempuh, dipercepat
  useEffect(() => {
    if (!sim || phase !== "nav") return;
    const id = setInterval(() => {
      const rt = routeRef.current; if (!rt || atStopRef.current) return;
      const t = sim.simStart + (Date.now() - sim.realStart) * SIM_SPEED;
      const target = (t - sim.simStart) / 1000;
      let lo = 0, hi = rt.distance;
      for (let k = 0; k < 30; k++) { const mid = (lo + hi) / 2; if (durAt(rt, mid) < target) lo = mid; else hi = mid; }
      const along = Math.min(rt.distance, lo), pt = pointAt(rt.line, along).point;
      const v = (durAt(rt, along + 50) - durAt(rt, along)) > 0 ? 50 / (durAt(rt, along + 50) - durAt(rt, along)) : 15;
      onFixRef.current({ lon: pt[0], lat: pt[1], acc: 8, speed: v, t, sim: true });
    }, 1000);
    return () => clearInterval(id);
  }, [sim, phase]);

  // ---------- singgah ----------
  const goStop = async (p) => {
    const here = state?.point || route.line.coords[0];
    const destPt = route.line.coords[route.line.coords.length - 1];
    const keepSim = sim;
    const back = phase === "preview" ? "preview" : "nav";
    const rt = await plan(here, { lon: destPt[0], lat: destPt[1] }, p, back);
    if (rt) {
      setStop(p); setAtStop(false); seg.current = 1; started.current = null; said.current = new Set();
      if (keepSim) setSim({ realStart: Date.now(), simStart: clock() });
      setPhase(back);
      speak(`Singgah di ${p.nama} ditambahkan`, muted);
    }
  };
  const resume = async () => {
    const destPt = route.line.coords[route.line.coords.length - 1], here = state?.point;
    const keepSim = sim;
    const rt = await plan(here, { lon: destPt[0], lat: destPt[1] }, null, "nav");
    if (rt) { setStop(null); setAtStop(false); seg.current = 1; started.current = null; said.current = new Set(); if (keepSim) setSim({ realStart: Date.now(), simStart: clock() }); setPhase("nav"); }
  };

  // ---------- turunan tampilan ----------
  const along = state?.along || 0;
  const here = state?.point || route?.line.coords[0];
  const si = route ? stepIndexAt(route, along) : 0;
  const next = route?.steps[si + 1] || null;
  const toNext = next ? next.along - along : 0;
  const after = route?.steps[si + 2];
  const remain = route ? route.distance - along : 0;
  const remainSec = route ? (route.duration - durAt(route, along)) * factor.current : 0;

  const sel = useMemo(() => {
    if (!route || !here) return null;
    return pickStops(route, pois, along, now, factor.current, here, done);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, pois, Math.round(along / 200), Math.round(now / 30000), done]);

  const pickIds = useMemo(() => new Set((sel?.picks || []).map((k) => k.poi?.id).filter(Boolean).concat(stop ? [stop.id] : [])), [sel, stop]);
  const evPins = useMemo(() => (sel?.events || []).map((e) => ({ ...e, label: jam(e.ms) })), [sel]);
  const nx = here ? nextPrayer(now, here[1], here[0]) : null;
  const cur = here ? currentEnds(now, here[1], here[0]) : null;
  const curActive = cur && SHALAT.includes(cur.nama) && !done[cur.nama];
  const mainPick = (sel?.picks || []).find((k) => k.poi) || null;

  // suara belokan & pengingat shalat
  useEffect(() => {
    if (phase !== "nav" || !route || !next) return;
    const th = next.motorway || route.steps[si]?.motorway ? [2000, 600, 80] : [400, 120, 30];
    for (const d of th) {
      const key = `${route.distance.toFixed(0)}-${si + 1}-${d}`;
      if (toNext <= d && toNext > d * 0.4 - 10 && !said.current.has(key)) {
        said.current.add(key);
        speak(d <= 80 ? instr(next) : `Dalam ${sayDist(toNext)}, ${instr(next).toLowerCase()}`, muted, true);
        break;
      }
    }
  }, [phase, route, si, next, toNext, muted]);
  useEffect(() => {
    if (phase !== "nav" || !nx) return;
    const left = (nx.ms - now) / 60e3, key = "p15-" + nx.nama + todayKey(nx.ms);
    if (left > 0 && left <= 15 && !said.current.has(key)) {
      said.current.add(key);
      const pk = (sel?.picks || []).find((k) => k.nama === nx.nama && k.poi);
      const msg = `Waktu ${nx.nama} ${Math.round(left)} menit lagi.` + (pk ? ` ${pk.poi.nama}, ${sayDist(pk.poi.along - along)} di depan.` : "");
      speak(msg, muted);
      try { if (Notification.permission === "granted") navigator.serviceWorker?.getRegistration().then((r) => r?.showNotification(`${nx.nama} ${Math.round(left)} menit lagi`, { body: pk ? `Singgah di ${pk.poi.nama}, ${fmtDist(pk.poi.along - along)} lagi` : "Siapkan tempat berhenti", tag: key, icon: "/icons/icon-192.png" })); } catch {}
    }
    if (mainPick?.poi) {
      const d = mainPick.poi.along - along, k2 = "near-" + mainPick.poi.id;
      if (d > 0 && d < 2000 && !said.current.has(k2)) { said.current.add(k2); speak(`${mainPick.poi.nama} ${sayDist(d)} lagi${mainPick.poi.side ? " di sebelah " + mainPick.poi.side : ""}, pas buat shalat ${mainPick.nama}.`, muted); }
    }
  }, [phase, nx, now, sel, mainPick, along, muted]);

  // ---------- render ----------
  const me = (phase === "nav" || phase === "arrived") && state ? { lon: state.point[0], lat: state.point[1], bearing: state.bearing, speed: state.speed } : null;
  const showMap = phase !== "setup" && phase !== "routing" || (phase === "routing" && route);
  const aheadList = (sel?.ahead || []).slice(0, 8);

  if (free) {
    return <FreeDrive simulate={free.simulate} mode={mode} reports={reports} onReport={onReport} canReport={canReport} setLiveFix={setLiveFix}
      onGo={startTo} onSetDest={() => setFree(null)} onExit={() => setFree(null)} />;
  }

  if (!showMap) {
    return (
      <Home gps={gps} onFree={() => { setErr(""); setFree({ simulate: false }); }} onSim={() => setFree({ simulate: true })} onPlan={onPlan}
        footnote={`Rute dari ${ROUTE_PROVIDER}, peta & data masjid dari OpenStreetMap. Jadwal shalat metode Kemenag.`}>
        <SearchField value={dest} near={gps} onPick={(h) => { setDest(h); setErr(""); if (h) { saveRecent(h); preview(h); } }} />
        <div className="modes" role="group" aria-label="Kendaraan">
          {["mobil", "motor"].map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>{m === "mobil" ? <Car /> : <Moto />}{MODES[m]}</button>
          ))}
        </div>
        {mode === "mobil"
          ? <label className="check small" htmlFor="notoll"><input id="notoll" type="checkbox" checked={avoidToll} onChange={(e) => toggleToll(e.target.checked)} /><span>Hindari jalan tol</span></label>
          : <p className="note mode-note">Rute motor otomatis lewat jalan biasa, nggak masuk tol.</p>}
        {showFrom || origin ? (
          <PlaceField id="asal" label="Dari" value={origin} onPick={(o) => { setOrigin(o); if (!o) setShowFrom(false); }} placeholder="Lokasi saya (GPS)" near={gps} allowMe />
        ) : (
          <p className="fromline">Dari <b>{gps ? "lokasi lu sekarang" : "lokasi lu (izinkan GPS)"}</b> · <button type="button" className="linkbtn inline" onClick={() => setShowFrom(true)}>Ubah</button></p>
        )}
        {origin && <p className="note">Titik awal bukan lokasi lu sekarang, jadi perjalanan bakal disimulasikan ({SIM_SPEED}x lebih cepat).</p>}
        {err && <div className="err" role="alert">{err}</div>}
        <button className="bigbtn" type="button" onClick={() => preview()} disabled={phase === "routing"}>{phase === "routing" ? "Menghitung rute…" : "Lihat rute"}</button>
      </Home>
    );
  }

  return (
    <div className="navwrap">
      <NavMap route={route} pois={pois} pickIds={pickIds} events={evPins} me={me} mode={phase === "preview" ? "preview" : "nav"} follow={follow}
        onUserMove={() => setFollow(false)} onPoi={(p) => setSheet(p)} />

      <div className="topstack">
      {phase === "nav" && next && !atStop && (
        <div className="banner" role="status" aria-live="polite">
          <div className="banner-main">
            <Turn k={iconKey(next)} />
            <div><b>{fmtDist(Math.max(0, toNext))}</b><span>{instr(next)}</span></div>
          </div>
          {after && after.along - next.along < 300 && <div className="banner-then">Lalu <Turn k={iconKey(after)} size={18} /> {instr(after).toLowerCase()}</div>}
        </div>
      )}
      {phase === "nav" && (curActive || nx) && !atStop && (
        <div className={`pchip-nav ${curActive || (nx && (nx.ms - now) / 60e3 <= 15) ? "hot" : ""}`}>
          {curActive ? <>Masih waktu <b>{cur.nama}</b> · sisa {fmtDur((cur.ends - now) / 1000)}</> : <><b>{nx.nama}</b> {jam(nx.ms)} · {fmtDur((nx.ms - now) / 1000)} lagi</>}
          {rerouting && " · menghitung ulang rute…"}
        </div>
      )}
      </div>
      {phase === "nav" && (
        <div className="navbtns">
          <button type="button" onClick={() => { if (!muted) voiceStop(); setMuted(!muted); }} aria-label={muted ? "Nyalakan suara" : "Matikan suara"} aria-pressed={muted}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z" />{muted ? <path d="M17 9l5 6m0-6l-5 6" /> : <path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12" />}</svg>
          </button>
          {!follow && <button type="button" className="wide" onClick={() => setFollow(true)}>Ikuti</button>}
        </div>
      )}

      <div className="navsheet">
        <div className="wrap">
          {phase === "preview" && (
            <>
              <div className="eta-row">
                <div><b className="eta-big">{fmtDur(route.duration)}</b><span>{fmtDist(route.distance)} · tiba ± {jam(Date.now() + route.duration * 1000)}</span></div>
                <span className="modechip">{route.mode === "motor" ? <Moto /> : <Car />}{MODES[route.mode || "mobil"]}{route.mode !== "motor" && route.avoidToll ? " · tanpa tol" : ""}</span>
              </div>
              <PrayerPlan sel={sel} along={0} onStop={goStop} stop={stop} />
              <div className="row2">
                <button className="ghost" type="button" onClick={end}>Kembali</button>
                <button className="bigbtn" type="button" onClick={() => begin()}>{origin ? "Simulasikan" : "Mulai navigasi"}</button>
              </div>
            </>
          )}

          {phase === "nav" && !atStop && (
            <>
              <div className="eta-row">
                <div><b className="eta-big">{fmtDur(remainSec)}</b><span>{fmtDist(remain)} · tiba ± {jam(now + remainSec * 1000)}{sim ? " · simulasi" : ""}</span></div>
                <button className="xbtn" type="button" onClick={end} aria-label="Akhiri navigasi">✕</button>
              </div>
              {stop ? (
                <div className="pickcard"><div><small>Menuju singgahan</small><b>{stop.nama}</b><span>{fmtDist(Math.max(0, (route.steps.find((s) => s.waypoint)?.along || 0) - along))} lagi</span></div>
                  <button className="ghost" type="button" onClick={resume}>Batal singgah</button></div>
              ) : mainPick ? (
                <div className="pickcard"><div>
                  <small>{mainPick.kind === "cur" ? `Masih keburu shalat ${mainPick.nama}` : `Pas buat shalat ${mainPick.nama} (${jam(mainPick.ms)})`}</small>
                  <b>{mainPick.poi.nama}</b>
                  <span>{KIND[mainPick.poi.kind]}{mainPick.poi.inRest ? ` di ${mainPick.poi.inRest}` : ""} · {fmtDist(mainPick.poi.along - along)} · tiba ± {jam(etaAt(route, along, mainPick.poi.along, now, factor.current))}</span></div>
                  <button className="bigbtn sm" type="button" onClick={() => goStop(mainPick.poi)}>Singgah</button></div>
              ) : curActive || nx ? (
                <div className="pickcard"><div><small>{curActive ? `Waktu ${cur.nama}` : `${nx.nama} ${jam(nx.ms)}`}</small><span>{pois.length ? "Belum ada masjid yang pas di rute depan. Dicari terus selama jalan." : "Lagi ngumpulin data masjid di sepanjang rute…"}</span></div></div>
              ) : null}
              {curActive && <button className="linkbtn" type="button" onClick={() => markDone(cur.nama)}>Udah shalat {cur.nama}</button>}
              <button className="linkbtn" type="button" onClick={() => setSheet(sheet === "list" ? false : "list")}>{sheet === "list" ? "Tutup daftar" : `Masjid & rest area di depan (${(sel?.ahead || []).length})`}</button>
              {sheet === "list" && <AheadList list={aheadList} reports={reports} onStop={goStop} onReport={onReport} canReport={canReport} />}
              {err && <p className="note">{err}</p>}
            </>
          )}

          {phase === "nav" && atStop && (
            <div className="arrive">
              <b>Sampai di {stop?.nama}.</b><span>Selamat shalat. Sekalian bantu musafir lain dengan lapor kondisinya.</span>
              <div className="row2">
                <button className="ghost" type="button" onClick={() => onReport(poiStop(stop))} disabled={!canReport}>Lapor kondisi</button>
                <button className="bigbtn" type="button" onClick={resume}>Lanjut perjalanan</button>
              </div>
            </div>
          )}

          {phase === "arrived" && !target && (
            <div className="arrive"><b>Sampai di tujuan. Alhamdulillah.</b><div className="row2"><button className="bigbtn" type="button" onClick={end}>Selesai</button></div></div>
          )}
          {phase === "arrived" && target && (
            <div className="arrive">
              <b>Sampai di {target.nama}.</b><span>Selamat shalat. Sekalian bantu musafir lain dengan lapor kondisinya.</span>
              <div className="row2">
                <button className="ghost" type="button" onClick={() => onReport(poiStop(target))} disabled={!canReport}>Lapor kondisi</button>
                <button className="bigbtn" type="button" onClick={backToFree}>Lanjut jalan</button>
              </div>
            </div>
          )}

          {phase === "routing" && <p className="note">Menghitung rute…</p>}
        </div>
      </div>

      {sheet && typeof sheet === "object" && (
        <PoiSheet p={sheet} along={along} route={route} now={now} f={factor.current} reports={reports} onClose={() => setSheet(false)}
          onStop={(p) => { setSheet(false); goStop(p); }} onReport={(p) => { setSheet(false); onReport(poiStop(p)); }} canReport={canReport} />
      )}
    </div>
  );
}

function PrayerPlan({ sel, onStop, stop }) {
  if (!sel) return null;
  if (!sel.picks.length) return <p className="note">Nggak ada waktu shalat yang masuk selama perjalanan ini.</p>;
  return (
    <ul className="pplan">
      {sel.picks.map((k, i) => (
        <li key={i}>
          <span className="pp-time">{k.kind === "cur" ? "Sekarang" : jam(k.ms)}</span>
          <div><b>{k.nama}</b>
            <span>{k.poi ? `${k.poi.nama} · ${fmtDist(k.poi.along)} dari awal · tiba ± ${jam(k.poi.at)}` : "Masjid dicari otomatis pas makin dekat"}</span></div>
          {k.poi && stop?.id !== k.poi.id && <button className="ghost sm" type="button" onClick={() => onStop(k.poi)}>Singgah</button>}
        </li>
      ))}
    </ul>
  );
}

function AheadList({ list, reports, onStop, onReport, canReport }) {
  if (!list.length) return <p className="note">Belum ada data masjid di rute depan.</p>;
  return (
    <ul className="ahead">
      {list.map((p) => {
        const m = merged(poiStop(p), reports), a = ago(m.upd);
        return (
          <li key={p.id}>
            <div><b>{p.nama}</b><span>{KIND[p.kind]}{p.inRest ? ` di ${p.inRest}` : ""} · {fmtDist(p.km * 1000)} · tiba ± {jam(p.at)}</span>
              <span className={`fresh ${a.c}`}><i className="dot" />{m.clean ? `Toilet ${m.clean.toFixed(1)}/5 · ` : ""}{a.t}</span></div>
            <div className="ahead-btns">
              <button className="ghost sm" type="button" onClick={() => onStop(p)}>Singgah</button>
              <button className="ghost sm" type="button" onClick={() => onReport(poiStop(p))} disabled={!canReport}>Lapor</button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function PoiSheet({ p, along, route, now, f, reports, onClose, onStop, onReport, canReport }) {
  const m = merged(poiStop(p), reports), a = ago(m.upd), ahead = p.along > along;
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="poi-t">
        <div className="wrap" style={{ paddingBlock: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 id="poi-t">{p.nama}</h2>
          <p className="sub">{KIND[p.kind]}{p.inRest ? ` di ${p.inRest}` : ""}{ahead ? ` · ${fmtDist(p.along - along)} di depan · tiba ± ${jam(etaAt(route, along, p.along, now, f))}` : " · sudah terlewat"}</p>
          <div className="facts"><span className={`fresh ${a.c}`}><i className="dot" />{a.t}</span>{m.clean && <span>Toilet <b>{m.clean.toFixed(1)}</b>/5</span>}{m.last?.catatan && <span>“{m.last.catatan}”</span>}</div>
          <div className="row2">
            <button className="ghost" type="button" onClick={() => onReport(p)} disabled={!canReport}>Lapor kondisi</button>
            {ahead && <button className="bigbtn" type="button" onClick={() => onStop(p)}>Singgah di sini</button>}
          </div>
          <button className="linkbtn" type="button" onClick={onClose}>Tutup</button>
        </div>
      </div>
    </>
  );
}
