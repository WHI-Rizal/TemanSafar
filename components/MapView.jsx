import { useEffect, useRef, useState } from "react";
import L from "leaflet";

// Peta OpenStreetMap: titik biru = posisi lu, lingkaran = rest area.
export default function MapView({ stops, me, aheadIds, pickIds, onSelect }) {
  const box = useRef(null), map = useRef(null), layer = useRef(null), meMk = useRef(null), accC = useRef(null);
  const [follow, setFollow] = useState(true);
  const followRef = useRef(true);
  followRef.current = follow;

  useEffect(() => {
    const m = L.map(box.current, { zoomControl: false, attributionControl: true }).setView([-6.6, 108.3], 7);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    L.control.zoom({ position: "topright" }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    m.on("dragstart", () => setFollow(false));
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    const css = getComputedStyle(document.documentElement);
    const col = { pick: css.getPropertyValue("--accent").trim(), ahead: css.getPropertyValue("--sign").trim(), other: css.getPropertyValue("--muted").trim() };
    for (const s of stops) {
      const kind = pickIds?.has(s.id) ? "pick" : aheadIds?.has(s.id) ? "ahead" : "other";
      const c = L.circleMarker([s.lat, s.lon], {
        radius: kind === "pick" ? 10 : kind === "ahead" ? 8 : 5,
        color: "#fff", weight: 2, fillColor: col[kind], fillOpacity: kind === "other" ? 0.6 : 1,
      });
      c.bindTooltip(`${s.nama} · ${s.ruasNama}`, { direction: "top" });
      if (onSelect) c.on("click", () => onSelect(s));
      c.addTo(g);
    }
  }, [stops, aheadIds, pickIds, onSelect]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!me) {
      if (meMk.current) { meMk.current.remove(); accC.current.remove(); meMk.current = null; accC.current = null; }
      return;
    }
    const ll = [me.lat, me.lon];
    if (!meMk.current) {
      meMk.current = L.marker(ll, { icon: L.divIcon({ className: "", html: '<div class="me-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), zIndexOffset: 1000, interactive: false }).addTo(m);
      accC.current = L.circle(ll, { radius: me.acc || 30, color: "#1a73e8", weight: 1, fillOpacity: 0.08, interactive: false }).addTo(m);
      m.setView(ll, 11);
    } else {
      meMk.current.setLatLng(ll);
      accC.current.setLatLng(ll).setRadius(Math.min(me.acc || 30, 2000));
      if (followRef.current) m.panTo(ll, { animate: true });
    }
  }, [me]);

  return (
    <div className="map">
      <div ref={box} style={{ height: "100%" }} aria-label="Peta posisi dan rest area" role="region" />
      {me && !follow && <button className="mapbtn" type="button" onClick={() => { setFollow(true); map.current?.setView([me.lat, me.lon], Math.max(map.current.getZoom(), 11)); }}>Ikuti posisi saya</button>}
    </div>
  );
}
