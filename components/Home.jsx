import { useEffect, useState } from "react";
import { jam, timesAt, prayerNow, nextPrayer, currentEnds, SHALAT } from "../lib/prayer";

// Halaman depan Teman Safar: sapaan, jadwal shalat dari lokasi, kolom tujuan, dan pintasan.
const FALLBACK = [106.85, -6.2]; // Jakarta, kalau lokasi belum diizinkan

function greet(h) {
  if (h < 4) return "selamat malam";
  if (h < 11) return "selamat pagi";
  if (h < 15) return "selamat siang";
  if (h < 18) return "selamat sore";
  return "selamat malam";
}
function dur(min) {
  min = Math.max(0, Math.round(min));
  return min < 60 ? `${min} mnt` : `${Math.floor(min / 60)} j ${String(min % 60).padStart(2, "0")} mnt`;
}

const Ic = {
  free: <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3 7-3 13-3-13z" /><circle cx="12" cy="9" r="1.5" /></svg>,
  plan: <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4M8 14h3M8 17h6" /></svg>,
  route: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" /><path d="M8 19h7a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h7" /></svg>,
  mosque: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M12 4c2.5 2 5 3.5 5 7H7c0-3.5 2.5-5 5-7z" /><path d="M6 11h12v9H6zM10 20v-3a2 2 0 0 1 4 0v3" /></svg>,
  people: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 4a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6" /></svg>,
};

// Jam berjalan (WIB) + tanggal Masehi & Hijriah. Dipisah biar detiknya nggak bikin seluruh halaman render ulang.
function Clock() {
  const [t, setT] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setT(Date.now()), 1000); return () => clearInterval(id); }, []);
  const d = new Date(t);
  const hm = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false }).format(d).replace(":", ".");
  const sec = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", second: "2-digit" }).format(d).padStart(2, "0");
  const masehi = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
  let hijri = "";
  try {
    hijri = new Intl.DateTimeFormat("id-ID-u-ca-islamic-umalqura", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric" }).format(d)
      .replace(/\s*(SH|H|AH)\.?$/i, "") + " H";
  } catch {}
  return (
    <div className="clock" aria-label={`Sekarang pukul ${hm} WIB`}>
      <div className="clock-time"><b>{hm}</b><span className="clock-sec">{sec}</span><span className="clock-tz">WIB</span></div>
      <div className="clock-date">{masehi}{hijri && <><br />{hijri}</>}</div>
    </div>
  );
}

export default function Home({ gps, children, onFree, onSim, onPlan, footnote }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(id); }, []);

  const here = gps || FALLBACK;
  const times = timesAt(now, here[1], here[0]);
  const cur = prayerNow(now, here[1], here[0]);
  const ends = currentEnds(now, here[1], here[0]);
  const nx = nextPrayer(now, here[1], here[0]);
  const h = new Date(now + 7 * 3600e3).getUTCHours();
  const active = ends && SHALAT.includes(ends.nama);

  return (
    <div className="home">
      <section className="hero">
        <div className="wrap hero-in">
          <div className="hero-top">
            <p className="hello">Assalamu'alaikum,<br />{greet(h)}</p>
            <Clock />
          </div>
          <h2>Mau safar ke mana hari ini?</h2>
          <div className="pcard" aria-live="polite">
            <div className="pcard-top">
              <div>
                <span className="pc-lbl">{active ? "Sekarang waktu" : "Shalat berikutnya"}</span>
                <b className="pc-name">{active ? ends.nama : nx?.nama}</b>
                {!active && nx && <span className="pc-time">{jam(nx.ms)}</span>}
              </div>
              <div className="pc-right">
                <span className="pc-lbl">{active ? "Sisa waktu" : "Lagi"}</span>
                <b className="pc-cd">{active ? dur((ends.ends - now) / 60e3) : nx ? dur((nx.ms - now) / 60e3) : "–"}</b>
              </div>
            </div>
            <div className="pc-row">
              {SHALAT.map((p) => (
                <div key={p} className={cur === p ? "on" : ""}><span>{p}</span><b>{jam(times[p])}</b></div>
              ))}
            </div>
            <p className="pc-where">{gps ? "Dihitung dari lokasi lu sekarang" : "Contoh untuk Jakarta. Izinkan lokasi biar jadwalnya pas"} · metode Kemenag</p>
          </div>
        </div>
      </section>

      <div className="wrap home-body">
        <section className="searchcard" aria-label="Cari tujuan">{children}</section>

        <h3 className="home-h">Pilihan lain</h3>
        <div className="tiles">
          <button type="button" className="tile" onClick={onFree}>
            <span className="tile-ic">{Ic.free}</span>
            <b>Jalan tanpa tujuan</b>
            <span>Langsung jalan. Jadwal shalat dan masjid di depan ikut posisi lu.</span>
          </button>
          <button type="button" className="tile" onClick={onPlan}>
            <span className="tile-ic">{Ic.plan}</span>
            <b>Rencana perjalanan</b>
            <span>Cek dari rumah, shalat apa aja yang kena di jalan.</span>
          </button>
        </div>
        <button type="button" className="linkbtn" onClick={onSim}>Belum di jalan? Coba simulasinya dulu</button>

        <h3 className="home-h">Yang bikin beda</h3>
        <ul className="why">
          <li><span>{Ic.route}</span><div><b>Dituntun belok demi belok</b><small>Rute jalan asli, lengkap sama suara bahasa Indonesia.</small></div></li>
          <li><span>{Ic.mosque}</span><div><b>Masjid yang masih keburu</b><small>Tiap masuk waktu shalat, langsung disaranin tempat singgah di depan.</small></div></li>
          <li><span>{Ic.people}</span><div><b>Info dari sesama musafir</b><small>Kebersihan toilet, mukena, parkir. Dilaporin langsung dari lokasi.</small></div></li>
        </ul>
        <p className="note credit">{footnote}</p>
      </div>
    </div>
  );
}
