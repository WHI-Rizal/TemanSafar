import { useEffect, useState } from "react";
import { jam, timesAt, prayerNow, nextPrayer, currentEnds, SHALAT } from "../lib/prayer";
import { loadVoices, idVoices, getPrefs, setPrefs, speak } from "../lib/voice";
import { waLink, paketLink } from "../lib/whi";

// Halaman depan Teman Safar (by Wisata Halal Indonesia): sapaan, jadwal shalat dari lokasi, kolom tujuan, dan pintasan.
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

// Pengaturan suara pemandu: pilih suara terbaik yang ada di HP + kecepatan bicara
function VoiceSettings() {
  const [list, setList] = useState([]);
  const [pref, setPref] = useState({ name: "", rate: 1 });
  const [open, setOpen] = useState(false);
  useEffect(() => { setPref(getPrefs()); loadVoices().then(() => setList(idVoices())); }, []);
  const update = (p) => { const n = { ...pref, ...p }; setPref(n); setPrefs(n); };
  const test = () => speak("Dalam 300 meter, belok kanan ke Jalan Asia Afrika. Waktu Ashar 15 menit lagi, masjid satu setengah kilometer di depan.", { urgent: true });
  const current = list.find((v) => v.name === pref.name) || list[0];
  return (
    <div className="voicecard">
      <button type="button" className="voice-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="tile-ic sm"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M17 8.5a5 5 0 0 1 0 7" /></svg></span>
        <span><b>Suara pemandu</b><small>{current ? current.name : "Belum ada suara Bahasa Indonesia di HP ini"}</small></span>
        <span className="chev" aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="voice-body">
          {list.length > 0 ? (
            <div className="fld2"><label htmlFor="vsel">Pilih suara</label>
              <select id="vsel" value={current?.name || ""} onChange={(e) => update({ name: e.target.value })}>
                {list.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
              </select></div>
          ) : (
            <p className="note">Pasang suara Bahasa Indonesia biar pemandunya lancar.<br />Android: Setelan, Bahasa & input, Output text-to-speech, Google, pasang Bahasa Indonesia.<br />iPhone: Setelan, Aksesibilitas, Konten Lisan, Suara, Indonesia, unduh Damayanti (Ditingkatkan).</p>
          )}
          <div className="fld2"><label htmlFor="vrate">Kecepatan bicara · {pref.rate.toFixed(1)}x</label>
            <input id="vrate" type="range" min="0.8" max="1.3" step="0.1" value={pref.rate} onChange={(e) => update({ rate: Number(e.target.value) })} /></div>
          <button type="button" className="ghost" onClick={test}>Tes suara</button>
        </div>
      )}
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
            <p className="hello">Assalamu'alaikum,<br />{greet(h)}<br /><span className="tagline">#JalanLebihTenang</span></p>
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

        <section className="promo" aria-label="Wisata Halal Indonesia">
          <small>Dari Wisata Halal Indonesia</small>
          <b>Safar yang ibadahnya udah diurusin</b>
          <p>Umroh dan halal tour dengan ustadz pendamping, jadwal shalat, dan makanan halal yang terjamin.</p>
          <div className="pbtns">
            <a className="pbtn wa" href={waLink("home")} target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.6 2.5 4 3.5 1.5.6 2 .7 2.8.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.4-.3z"/></svg>Ngobrol sama tim WHI</a>
            <a className="pbtn alt" href={paketLink("home")} target="_blank" rel="noopener">Lihat paket</a>
          </div>
        </section>

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

        <VoiceSettings />

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
