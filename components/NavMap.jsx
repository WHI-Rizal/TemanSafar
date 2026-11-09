import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

// Peta vektor OpenFreeMap (gratis, tanpa API key). Bisa diganti lewat NEXT_PUBLIC_MAP_STYLE.
const STYLE = process.env.NEXT_PUBLIC_MAP_STYLE || "https://tiles.openfreemap.org/styles/liberty";

const POI_SVG = {
  masjid: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M12 4c2.5 2 5 3.5 5 7H7c0-3.5 2.5-5 5-7z"/><path d="M6 11h12v9H6z"/></svg>',
  musala: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M12 5c2 1.6 4 2.8 4 5.5H8C8 7.8 10 6.6 12 5z"/><path d="M7 10.5h10V19H7z"/></svg>',
  rest: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 20V4h7a4 4 0 0 1 0 8H6"/></svg>',
};

function el(cls, html) { const d = document.createElement("div"); d.className = cls; d.innerHTML = html; return d; }

export default function NavMap({ route, pois, pickIds, events, me, mode, follow, onPoi, onUserMove }) {
  const box = useRef(null), map = useRef(null), ready = useRef(false);
  const poiMk = useRef([]), evMk = useRef([]), meMk = useRef(null), destMk = useRef(null);
  const cbs = useRef({});
  cbs.current = { onPoi, onUserMove };

  useEffect(() => {
    const m = new maplibregl.Map({ container: box.current, style: STYLE, center: [107.6, -6.6], zoom: 6, attributionControl: { compact: true }, dragRotate: true });
    m.on("load", () => { ready.current = true; addRouteLayers(m); m.fire("jm-ready"); });
    m.on("dragstart", () => cbs.current.onUserMove && cbs.current.onUserMove());
    map.current = m;
    return () => { m.remove(); map.current = null; ready.current = false; };
  }, []);

  function whenReady(fn) {
    const m = map.current;
    if (!m) return;
    if (ready.current) fn(m); else m.once("jm-ready", () => fn(m));
  }

  // garis rute + bendera tujuan
  useEffect(() => {
    whenReady((m) => {
      const data = { type: "Feature", geometry: { type: "LineString", coordinates: route ? route.line.coords : [] }, properties: {} };
      m.getSource("route")?.setData(data);
      destMk.current?.remove(); destMk.current = null;
      if (route) {
        const end = route.line.coords[route.line.coords.length - 1];
        destMk.current = new maplibregl.Marker({ element: el("dest-pin", "") }).setLngLat(end).addTo(m);
      }
      if (route && mode === "preview") {
        const b = new maplibregl.LngLatBounds();
        for (let i = 0; i < route.line.coords.length; i += Math.max(1, Math.floor(route.line.coords.length / 300))) b.extend(route.line.coords[i]);
        b.extend(route.line.coords[route.line.coords.length - 1]);
        m.fitBounds(b, { padding: { top: 70, bottom: 300, left: 40, right: 40 }, duration: 600, pitch: 0, bearing: 0 });
      }
    });
  }, [route, mode]);

  // masjid / musala / rest area
  useEffect(() => {
    whenReady((m) => {
      poiMk.current.forEach((k) => k.remove());
      poiMk.current = (pois || []).map((p) => {
        const e = el(`poi poi-${p.kind}${pickIds?.has(p.id) ? " pick" : ""}`, POI_SVG[p.kind] || POI_SVG.masjid);
        e.title = p.nama;
        e.setAttribute("role", "button");
        e.setAttribute("aria-label", p.nama);
        e.addEventListener("click", (ev) => { ev.stopPropagation(); cbs.current.onPoi && cbs.current.onPoi(p); });
        return new maplibregl.Marker({ element: e }).setLngLat([p.lon, p.lat]).addTo(m);
      });
    });
  }, [pois, pickIds]);

  // titik masuk waktu shalat di rute
  useEffect(() => {
    whenReady((m) => {
      evMk.current.forEach((k) => k.remove());
      evMk.current = (events || []).map((e) => new maplibregl.Marker({ element: el("ev-pin", `<b>${e.nama}</b> ${e.label}`), anchor: "bottom" }).setLngLat([e.lon, e.lat]).addTo(m));
    });
  }, [events]);

  // posisi & kamera
  useEffect(() => {
    whenReady((m) => {
      if (!me) { meMk.current?.remove(); meMk.current = null; return; }
      if (!meMk.current) {
        meMk.current = new maplibregl.Marker({ element: el("me-arrow", '<svg viewBox="0 0 40 40" width="40" height="40"><circle cx="20" cy="20" r="18" fill="#fff" opacity=".9"/><path d="M20 6 L31 32 L20 26 L9 32 Z" fill="#1a73e8" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>'), rotationAlignment: "map", pitchAlignment: "map" }).setLngLat([me.lon, me.lat]).addTo(m);
      }
      meMk.current.setLngLat([me.lon, me.lat]).setRotation(me.bearing || 0);
      if (mode === "nav" && follow) {
        // taruh panah di tengah area peta yang kelihatan (di antara banner atas dan panel bawah), agak ke bawah
        const h = m.getContainer().clientHeight;
        const sheet = document.querySelector(".navsheet")?.offsetHeight || h * 0.3;
        const top = Math.min(h * 0.45, (document.querySelector(".topstack")?.offsetHeight || 100) + 90);
        const bottom = Math.min(h * 0.6, sheet);
        const z = me.speed > 22 ? 15.3 : me.speed > 12 ? 16 : 16.8;
        m.easeTo({ center: [me.lon, me.lat], bearing: me.bearing || 0, pitch: 55, zoom: z, padding: { top, bottom, left: 0, right: 0 }, duration: 950, easing: (t) => t });
      }
    });
  }, [me, mode, follow]);

  return <div ref={box} className="navmap" role="region" aria-label="Peta navigasi" />;
}

function addRouteLayers(m) {
  m.addSource("route", { type: "geojson", data: { type: "Feature", geometry: { type: "LineString", coordinates: [] }, properties: {} } });
  m.addLayer({ id: "route-casing", type: "line", source: "route", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#0b4fb3", "line-width": ["interpolate", ["linear"], ["zoom"], 6, 5, 16, 14] } });
  m.addLayer({ id: "route-line", type: "line", source: "route", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#3d8bfd", "line-width": ["interpolate", ["linear"], ["zoom"], 6, 3, 16, 10] } });
}
