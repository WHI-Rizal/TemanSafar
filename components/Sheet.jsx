import { useEffect, useRef } from "react";

// Panel bawah navigasi yang bisa diciutkan: tap pegangan atau geser ke bawah buat ngecilin,
// tap / geser ke atas buat buka lagi. Tinggi panel dikirim ke CSS (--sheet-h) supaya tombol
// di peta dan posisi panah ikut naik-turun.
export default function Sheet({ collapsible, mini, onToggle, summary, children }) {
  const el = useRef(null), startY = useRef(null);

  useEffect(() => {
    const node = el.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const host = node.closest(".navwrap");
    const ro = new ResizeObserver(() => host?.style.setProperty("--sheet-h", node.offsetHeight + "px"));
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const onStart = (e) => { startY.current = e.touches[0].clientY; };
  const onEnd = (e) => {
    if (startY.current == null || !collapsible) return;
    const dy = e.changedTouches[0].clientY - startY.current;
    startY.current = null;
    if (dy > 40 && !mini) onToggle(true);
    else if (dy < -40 && mini) onToggle(false);
  };

  return (
    <div className={`navsheet ${mini ? "mini" : ""}`} ref={el}>
      {collapsible && (
        <button type="button" className="sheet-handle" onClick={() => onToggle(!mini)} onTouchStart={onStart} onTouchEnd={onEnd}
          aria-expanded={!mini} aria-label={mini ? "Buka panel info" : "Sembunyikan panel info"}>
          <span />
        </button>
      )}
      <div className="wrap" onTouchStart={collapsible && mini ? onStart : undefined} onTouchEnd={collapsible && mini ? onEnd : undefined}>
        {collapsible && mini ? summary : children}
      </div>
    </div>
  );
}

export function useMini() {
  const read = () => { try { return localStorage.getItem("ts-mini") === "1"; } catch { return false; } };
  return [read, (v) => { try { localStorage.setItem("ts-mini", v ? "1" : "0"); } catch {} }];
}
