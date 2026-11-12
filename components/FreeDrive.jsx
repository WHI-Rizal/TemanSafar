import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NavMap from "./NavMap";
import Sheet, { useMini } from "./Sheet";
import { merged, ago } from "../lib/data";
import { jam, timesAt, nextPrayer, currentEnds, prayerNow, SHALAT } from "../lib/prayer";
import { hav, bearing, pointAt, headingAt } from "../lib/geo";
import { snapToLines, coordAt, nearCity, LINES } from "../lib/route";
import { fetchPois, fetchRoute, fmtDist, sayDist, fmtDur, preferMosque } from "../lib/nav";
import { speak as voiceSpeak, stop as voiceStop, voiceLang } from "../lib/voice";

// Mode "Jalan tanpa tujuan": cukup GPS. Jadwal shalat dari posisi, masjid & rest area asli di depan.
const SIM_SPEED = (typeof window !== "undefined" && Number(new URLSearchParams(window.location.search).get("simx"))) || 10;
const REFETCH_M = 3000;
const AHEAD_KM = 20;
const KIND = { masjid: "Masjid", musala: "Musala", rest: "Rest area", spbu: "SPBU · biasanya ada musala" };
const todayKey = (ms) => new Date(ms + 7 * 3600e3).toISOString().slice(0, 10);
const angDiff = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
const poiStop = (p) => ({ id: p.id, nama: p.nama, ruasNama: KIND[p.kind] + (p.inRest ? ` · di ${p.inRest}` : ""), lat: p.lat, lon: p.lon, approx: false });

// titik sejauh d meter dari p ke arah brg
function dest(p, brg, d) {
  const R = 6371000, r = Math.PI / 180, lat1 = p[1] * r, lon1 = p[0] * r, b = brg * r, dr = d / R;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(dr) + Math.cos(lat1) * Math.sin(dr) * Math.cos(b));
  const lon2 = lon1 + Math.atan2(Math.sin(b) * Math.sin(dr) * Math.cos(lat1), Math.cos(dr) - Math.sin(lat1) * Math.sin(lat2));
  return [lon2 / r, lat2 / r];
}
// titik di kiri arah jalan? (Indonesia lajur kiri, jadi rest area tol yang bisa dimasuki ada di kiri)
function isLeft(here, brg, p) {
  const a = bearing(here, [p.lon, p.lat]);
  const d = ((a - brg) + 360) % 360;
  return d > 180;
}

// Rute simulasi: Jakarta (Monas) ke Bandung (Gedung Sate) lewat jalan beneran, biar panah nempel di jalan
// dan masjid, rest area, SPBU muncul sesuai urutan aslinya.
const SIM_FROM = [106.8272, -6.1754], SIM_TO = [107.6188, -6.9025];
// posisi di rute setelah t detik perjalanan (pakai perkiraan waktu per ruas dari layanan rute, jadi kecepatannya wajar)
function alongAtTime(route, t) {
  const { cumDur, line } = route;
  if (t <= 0) return 0;
  if (t >= cumDur[cumDur.length - 1]) return line.length;
  let lo = 0, hi = cumDur.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cumDur[mid] <= t) lo = mid; else hi = mid; }
  const f = (t - cumDur[lo]) / ((cumDur[hi] - cumDur[lo]) || 1);
  return line.cum[lo] + f * (line.cum[hi] - line.cum[lo]);
}

function speak(text, muted) { voiceSpeak(text, { muted }); }

export default function FreeDrive({ simulate, mode = "mobil", reports, onReport, canReport, setLiveFix, onGo, onSetDest, onExit }) {
  const [fix, setFix] = useState(null);
  const [hdg, setHdg] = useState(null);
  const [speed, setSpeed] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [cache, setCache] = useState(new Map());
  const [loading, setLoading] = useState(false);
  const [follow, setFollow] = useState(true);
  const [muted, setMuted] = useState(false);
  const [tollOverride, setTollOverride] = useState(null);
  const [done, setDone] = useState({});
  const [err, setErr] = useState("");
  const [list, setList] = useState(false);
  const [readMini, writeMini] = useMini();
  const [mini, setMiniState] = useState(readMini);
  const setMini = (v) => { setMiniState(v); writeMini(v); };
  const last = useRef(null), lastFetch = useRef(null), said = useRef(new Set()), wake = useRef(null), watch = useRef(null), simRef = useRef(null);

  useEffect(() => { try { const d = JSON.parse(localStorage.getItem("jm-done") || "{}"); if (d.day === todayKey(Date.now())) setDone(d.p || {}); } catch {} }, []);
  const markDone = (p) => { const nd = { ...done, [p]: true }; setDone(nd); try { localStorage.setItem("jm-done", JSON.stringify({ day: todayKey(now), p: nd })); } catch {} };

  const onFix = useCallback((f) => {
    const p = [f.lon, f.lat];
    setNow(f.t);
    setLiveFix && setLiveFix({ lat: f.lat, lon: f.lon, acc: f.acc });
    const prev = last.current;
    if (typeof f.heading === "number" && !isNaN(f.heading) && (f.speed || 0) > 2) setHdg(f.heading);
    else if (prev && hav(prev.p, p) > 25) setHdg(bearing(prev.p, p));
    if (prev && f.t > prev.t) {
      const v = hav(prev.p, p) / ((f.t - prev.t) / 1000);
      const sv = typeof f.speed === "number" && f.speed >= 0 ? f.speed : v;
      if (sv < 60) setSpeed((s) => (s == null ? sv : s * 0.7 + sv * 0.3));
    }
    if (!prev || hav(prev.p, p) > 25) last.current = { p, t: f.t };
    setFix({ ...f, p });
  }, [setLiveFix]);

  // GPS atau simulasi
  useEffect(() => {
    try { if ("wakeLock" in navigator) navigator.wakeLock.request("screen").then((w) => (wake.current = w)).catch(() => {}); } catch {}
    try { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission(); } catch {}
    if (simulate) {
      const s = { realStart: Date.now(), simStart: Date.now() };
      simRef.current = s;
      let id = null, dead = false;
      const ctl = new AbortController();
      // cadangan kalau rute gagal diambil: garis kasar Tol Trans Jawa seperti dulu
      const tickLine = () => {
        const t = s.simStart + (Date.now() - s.realStart) * SIM_SPEED;
        const pos = Math.min(410, (80 * (t - s.simStart)) / 3600e3);
        const [lat, lon] = coordAt("jawa", pos);
        onFix({ lat, lon, acc: 10, speed: 22, t });
      };
      fetchRoute([SIM_FROM, SIM_TO], { mode }, ctl.signal)
        .then((rt) => {
          if (dead) return;
          s.realStart = Date.now();
          const tick = () => {
            const sec = ((Date.now() - s.realStart) * SIM_SPEED) / 1000;
            const along = alongAtTime(rt, sec);
            const ahead = alongAtTime(rt, sec + 5);
            const [lon, lat] = pointAt(rt.line, along).point;
            onFix({ lat, lon, acc: 10, speed: Math.min(30, (ahead - along) / 5) || 0, heading: headingAt(rt.line, along), t: s.simStart + sec * 1000 });
          };
          tick();
          id = setInterval(tick, 1000);
        })
        .catch((e) => { if (dead || e.name === "AbortError") return; tickLine(); id = setInterval(tickLine, 1000); });
      return () => { dead = true; ctl.abort(); if (id) clearInterval(id); };
    }
    if (!("geolocation" in navigator)) { setErr("HP atau browser ini nggak bisa kasih lokasi."); return; }
    watch.current = navigator.geolocation.watchPosition(
      (p) => onFix({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy, speed: p.coords.speed, heading: p.coords.heading, t: Date.now() }),
      (e) => setErr(e.code === 1 ? "Akses lokasi ditolak. Izinkan lokasi buat situs ini di pengaturan browser." : "Sinyal GPS lemah. Lanjut otomatis begitu lokasi kebaca lagi."),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 }
    );
    return () => { if (watch.current != null) navigator.geolocation.clearWatch(watch.current); try { wake.current?.release(); } catch {} };
  }, [simulate, onFix, mode]);

  // ambil masjid & rest area di sekitar dan 20 km ke depan
  useEffect(() => {
    if (!fix) return;
    if (lastFetch.current && hav(lastFetch.current, fix.p) < REFETCH_M) return;
    lastFetch.current = fix.p;
    const pts = [fix.p];
    if (hdg != null) for (let d = 2000; d <= AHEAD_KM * 1000; d += 2000) pts.push(dest(fix.p, hdg, d));
    setLoading(true);
    const add = (r) => setCache((c) => { const n = new Map(c); r.forEach((p) => n.set(p.id, p)); return n; });
    fetchPois(pts, undefined, add).then(add)
      .catch(() => {}).finally(() => setLoading(false));
  }, [fix, hdg]);

  const snap = fix ? snapToLines(fix.lat, fix.lon) : null;
  // motor nggak boleh masuk tol, jadi anggap selalu di jalan biasa (kecuali diubah manual)
  const onToll = tollOverride ?? (mode !== "motor" && !!(snap && snap.distKm < 3));
  const v = speed && speed > 8 ? speed : onToll ? 22 : 15; // m/s

  const ahead = useMemo(() => {
    if (!fix) return [];
    const here = fix.p, out = [];
    for (const p of cache.values()) {
      const d = hav(here, [p.lon, p.lat]);
      if (d > AHEAD_KM * 1000) continue;
      const inFront = hdg == null || d < 300 || angDiff(bearing(here, [p.lon, p.lat]), hdg) < 55;
      if (!inFront) continue;
      out.push({ ...p, d, at: now + ((d * 1.25) / v) * 1000 });
    }
    let res = out;
    // SPBU cuma buat jalan biasa, di tol cukup rest area
    if (onToll) res = res.filter((p) => p.kind !== "spbu");
    if (onToll && hdg != null) {
      const rests = out.filter((p) => p.kind === "rest" && isLeft(here, hdg, p));
      res = res.filter((p) => {
        if (p.kind === "rest") return rests.includes(p);
        const host = rests.find((r) => hav([r.lon, r.lat], [p.lon, p.lat]) < 300);
        if (host) p.inRest = host.nama;
        return !!host;
      });
      res = res.filter((p) => !(p.kind === "rest" && res.some((q) => q.kind !== "rest" && q.inRest === p.nama)));
    }
    return res.sort((a, b) => a.d - b.d);
  }, [fix, cache, hdg, now, v, onToll]);

  const here = fix?.p;
  const times = here ? timesAt(now, here[1], here[0]) : null;
  const curP = here ? prayerNow(now, here[1], here[0]) : null;
  const cur = here ? currentEnds(now, here[1], here[0]) : null;
  const curActive = cur && SHALAT.includes(cur.nama) && !done[cur.nama];
  const nx = here ? nextPrayer(now, here[1], here[0]) : null;

  let pick = null;
  if (curActive) { const p = preferMosque(ahead.filter((x) => x.at < cur.ends - 10 * 60e3)); pick = { label: `Masih keburu shalat ${cur.nama}`, p }; }
  else if (nx) {
    const p = preferMosque(ahead.filter((x) => x.at >= nx.ms)) || ((nx.ms - now) < 30 * 60e3 ? preferMosque(ahead) : null);
    pick = { label: `Pas buat shalat ${nx.nama} (${jam(nx.ms)})`, p };
  }
  const pickIds = useMemo(() => new Set(pick?.p ? [pick.p.id] : []), [pick?.p?.id]);

  // suara: 15 menit sebelum waktu shalat & pas tempat singgah tinggal 1,5 km
  useEffect(() => {
    if (!nx) return;
    const left = (nx.ms - now) / 60e3, key = "p15-" + nx.nama + todayKey(nx.ms);
    if (left > 0 && left <= 15 && !said.current.has(key)) {
      said.current.add(key);
      speak(voiceLang() === "en" ? `${nx.nama} prayer in ${Math.round(left)} minutes.` + (pick?.p ? ` ${pick.p.nama}, ${sayDist(pick.p.d, "en")} ahead.` : "") : `Waktu ${nx.nama} ${Math.round(left)} menit lagi.` + (pick?.p ? ` ${pick.p.nama}, ${sayDist(pick.p.d)} di depan.` : ""), muted);
      try { if (Notification.permission === "granted") navigator.serviceWorker?.getRegistration().then((r) => r?.showNotification(`${nx.nama} ${Math.round(left)} menit lagi`, { body: pick?.p ? `${pick.p.nama}, ${fmtDist(pick.p.d)} lagi` : "Siapkan tempat berhenti", tag: key, icon: "/icons/icon-192.png" })); } catch {}
    }
    if (pick?.p && pick.p.d < 1500 && !said.current.has("near-" + pick.p.id)) {
      said.current.add("near-" + pick.p.id);
      speak(voiceLang() === "en" ? `${pick.p.nama} in ${sayDist(pick.p.d, "en")}.` : `${pick.p.nama} ${sayDist(pick.p.d)} lagi, ${pick.label.toLowerCase()}.`, muted);
    }
  }, [nx, now, pick, muted]);

  const me = fix ? { lon: fix.lon, lat: fix.lat, bearing: hdg || 0, speed: speed || 0 } : null;
  const simNowPoint = () => (fix ? fix.p : null);

  return (
    <div className="navwrap">
      <NavMap route={null} pois={ahead} pickIds={pickIds} events={[]} me={me} mode="nav" follow={follow}
        onUserMove={() => setFollow(false)} onPoi={(p) => onGo(p, simNowPoint(), simulate)} />

      <div className="topstack">
      <div className="banner banner-lite">
        <div className="banner-main">
          <div>
            <b style={{ fontSize: "1.15rem" }}>Jalan tanpa tujuan</b>
            <span>{!fix ? (simulate ? "Menyiapkan rute simulasi…" : "Nyari sinyal GPS…") : onToll && snap ? `${LINES[snap.line].nama} · sekitar ${nearCity(snap.line, snap.pos)}` : "Di luar tol"}{simulate ? " · simulasi" : ""}</span>
          </div>
          {fix && <button type="button" className="tollbtn" aria-pressed={onToll} onClick={() => setTollOverride(!onToll)}>{onToll ? "Lagi di tol" : "Bukan tol"}</button>}
        </div>
      </div>
      {fix && (curActive || nx) && (
        <div className={`pchip-nav lite ${curActive || (nx.ms - now) / 60e3 <= 15 ? "hot" : ""}`}>
          {curActive ? <>Masih waktu <b>{cur.nama}</b> · sisa {fmtDur((cur.ends - now) / 1000)}</> : <><b>{nx.nama}</b> {jam(nx.ms)} · {fmtDur((nx.ms - now) / 1000)} lagi</>}
        </div>
      )}
      </div>
      <div className="navbtns">
        <button type="button" onClick={() => { if (!muted) voiceStop(); setMuted(!muted); }} aria-label={muted ? "Nyalakan suara" : "Matikan suara"} aria-pressed={muted}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z" />{muted ? <path d="M17 9l5 6m0-6l-5 6" /> : <path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12" />}</svg>
        </button>
        {!follow && <button type="button" className="wide" onClick={() => setFollow(true)}>Ikuti</button>}
      </div>

      <Sheet collapsible mini={mini} onToggle={setMini} summary={
        <div className="mini-row">
          <button type="button" className="mini-main" onClick={() => setMini(false)} aria-label="Buka panel info">
            <b className="eta-big sm">{curActive ? `${cur.nama} · sisa ${fmtDur((cur.ends - now) / 1000)}` : nx ? `${nx.nama} ${jam(nx.ms)}` : "Jalan tanpa tujuan"}</b>
            <small className="mini-pick">{pick?.p ? `${pick.p.nama} · ± ${fmtDist(pick.p.d)}` : !fix ? "Nyari sinyal GPS…" : "Masjid di depan dicari terus"}</small>
          </button>
          <button className="xbtn" type="button" onClick={onExit} aria-label="Selesai">✕</button>
        </div>
      }>
          {times && (
            <div className="times" aria-label="Jadwal shalat hari ini di posisi kamu">
              {SHALAT.map((p) => <div key={p} className={curP === p ? "on" : ""}>{p}<b>{jam(times[p])}</b></div>)}
            </div>
          )}
          {pick && (
            <div className="pickcard">
              <div><small>{pick.label}</small>
                {pick.p ? <><b>{pick.p.nama}</b><span>{KIND[pick.p.kind]}{pick.p.inRest ? ` di ${pick.p.inRest}` : ""} · ± {fmtDist(pick.p.d)} · tiba ± {jam(pick.p.at)}</span></>
                  : <span>{loading ? "Lagi nyari masjid di depan…" : !fix ? "Nunggu lokasi…" : "Belum ada masjid yang pas di depan. Dicari terus selama jalan."}</span>}
              </div>
              {pick.p && <button className="bigbtn sm" type="button" onClick={() => onGo(pick.p, fix.p, simulate)}>Singgah</button>}
            </div>
          )}
          {curActive && <button className="linkbtn" type="button" onClick={() => markDone(cur.nama)}>Udah shalat {cur.nama}</button>}
          <button className="linkbtn" type="button" onClick={() => setList(!list)}>{list ? "Tutup daftar" : `Masjid & tempat singgah di depan (${ahead.filter((p) => p.kind !== "spbu").length})`}</button>
          {list && (
            ahead.length ? (
              <ul className="ahead">
                {(() => { const main = ahead.filter((p) => p.kind !== "spbu").slice(0, 8), sp = ahead.filter((p) => p.kind === "spbu").slice(0, 3); return [...main, ...(sp.length ? [{ id: "_h" }] : []), ...sp]; })().map((p) => {
                  if (p.id === "_h") return <li key="_h" className="ahead-h">SPBU · cadangan kalau masjid masih jauh</li>;
                  const m = merged(poiStop(p), reports), a = ago(m.upd);
                  return (
                    <li key={p.id} className={p.kind === "spbu" ? "is-spbu" : ""}>
                      <div><b>{p.nama}</b><span>{KIND[p.kind]}{p.inRest ? ` di ${p.inRest}` : ""} · ± {fmtDist(p.d)} · tiba ± {jam(p.at)}</span>
                        <span className={`fresh ${a.c}`}><i className="dot" />{m.clean ? `Toilet ${m.clean.toFixed(1)}/5 · ` : ""}{a.t}</span></div>
                      <div className="ahead-btns">
                        <button className="ghost sm" type="button" onClick={() => onGo(p, fix.p, simulate)}>Singgah</button>
                        <button className="ghost sm" type="button" onClick={() => onReport(poiStop(p))} disabled={!canReport}>Lapor</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="note">{loading ? "Lagi nyari…" : "Belum ada data masjid di depan."}</p>
          )}
          {err && <p className="err" role="alert">{err}</p>}
          <p className="note">Jarak masih garis lurus, jam tiba perkiraan. Tap Singgah buat dituntun lewat rute jalan.</p>
          <div className="row2">
            <button className="ghost" type="button" onClick={onExit}>Selesai</button>
            <button className="bigbtn" type="button" onClick={onSetDest}>Pasang tujuan</button>
          </div>
      </Sheet>
    </div>
  );
}
