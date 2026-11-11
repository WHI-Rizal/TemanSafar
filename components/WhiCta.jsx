import { waLink } from "../lib/whi";

// Ajakan WHI yang kalem. Dipasang cuma di layar berhenti (sampai di masjid / tujuan), bukan pas nyetir.
export default function WhiCta({ place }) {
  return (
    <div className="softcta">
      <span className="whi-dot" aria-hidden="true">WHI</span>
      <div><b>Semoga safarnya berkah</b><small>Lagi rencana umroh atau liburan halal? Ngobrol santai dulu sama tim Wisata Halal Indonesia.</small></div>
      <a href={waLink(place)} target="_blank" rel="noopener">Chat</a>
    </div>
  );
}
