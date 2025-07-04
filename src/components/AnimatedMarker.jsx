// src/components/AnimatedMarker.jsx
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.marker.slideto";
import { getBearing, getDistanceMeters } from "../utils/geoUtils";

const ICON_TAXI = "/img/taxi-right.png";

/** Devuelve el ángulo siguiente manteniendo la menor diferencia posible (−180‥180) */
function normalizeBearing(prev, next) {
  const delta = ((next - prev + 540) % 360) - 180; // -180 ≤ delta < 180
  return (prev + delta + 360) % 360;
}

export default function AnimatedMarker({
  id,
  position,
  linea,
  pasajeros,
  color,
  zoom,
  onClick,
  opacity = 1,
  focused = false
}) {
  const map = useMap();

  // Refs para Leaflet y para los nodos DOM internos
  const markerRef = useRef(null);
  const imgRef = useRef(null);
  const wrapperRef = useRef(null);
  const labelTextRef = useRef(null);

  // Estado previo (para bearing) guardado en un ref
  const prevState = useRef({ pos: position, bearing: 0 });

  // Modo de visualización según zoom
  const zoomMode = zoom < 14 ? "dot" : "taxi";
  const prevZoomMode = useRef(null);

  /* -----------------------------------------------------------------------
   * 1) CREACIÓN / DESTRUCCIÓN DEL MARKER
   *    Solo depende de zoomMode (y del map/id estáticos).
   * --------------------------------------------------------------------- */
  useEffect(() => {
    // -- Limpieza previa (si ya hay marker)
    if (markerRef.current) {
      markerRef.current.stop?.();
      markerRef.current.off();
      markerRef.current.remove();
      markerRef.current = null;
    }

    /* --------- DOM IMPERATIVO --------- */
    const root = document.createElement("div");
    root.style.position = "relative";

    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      transform-origin: center center;
      transition: transform 0.3s ease, flex-direction 0.3s ease;
    `;
    wrapperRef.current = wrapper;

    if (zoomMode === "dot") {
      // ── Círculo simple
      const circle = document.createElement("div");
      circle.style.cssText = `
        width: 14px;
        height: 14px;
        background: ${color};
        border-radius: 50%;
        border: 2px solid black;
        opacity: ${opacity};
        box-shadow: 0 0 6px rgba(0,0,0,0.4);
        transform: translate(-50%, -50%);
      `;
      root.appendChild(circle);
    } else {
      /* --------- Versión 'taxi' --------- */
      // Etiqueta
      const label = document.createElement("div");
      label.style.cssText = `
        background: ${color};
        padding: 4px 8px;
        border-radius: 6px;
        font: bold 12px sans-serif;
        white-space: nowrap;
        opacity: ${opacity};
        transition: all 0.3s ease;
      `;

      const labelText = document.createElement("div");
      labelTextRef.current = labelText;

      const validPax = typeof pasajeros === "number" && !isNaN(pasajeros);
      labelText.textContent =
        focused && validPax ? `👤 ${pasajeros}` : `${linea}`;

      labelText.style.cssText = `
        font: ${focused && validPax ? "bold 14px" : "normal 11px"} sans-serif;
        color: black;
        text-align: center;
        opacity: 0;
        transform: translateY(6px);
        transition: opacity 0.3s ease, transform 0.3s ease;
      `;
      requestAnimationFrame(() => {
        labelText.style.opacity = "1";
        labelText.style.transform = "translateY(0)";
      });
      label.appendChild(labelText);

      // Icono vehículo
      const img = document.createElement("img");
      imgRef.current = img;
      img.src = ICON_TAXI;
      img.width = 36;
      img.height = 36;
      img.style.cssText = `opacity: ${opacity}; transition: transform 0.3s ease;`;

      wrapper.appendChild(label);
      wrapper.appendChild(img);
      root.appendChild(wrapper);
    }

    /* -------- Icon & Marker Leaflet -------- */
    const icon = L.divIcon({
      html: root,
      className: "",
      iconSize: zoomMode === "dot" ? [20, 20] : [60, 60],
      iconAnchor: zoomMode === "dot" ? [10, 10] : [30, 55]
    });

    const marker = L.marker(position, { icon });
    marker.addTo(map);
    marker.on("click", (e) => {
      e.originalEvent.stopPropagation();
      onClick?.(id);
    });

    markerRef.current = marker;
    prevZoomMode.current = zoomMode;

    /* -------- CLEAN-UP (cuando efecto se vuelva a ejecutar o unmount) ---- */
    return () => {
      if (markerRef.current) {
        markerRef.current.stop?.();
        markerRef.current.off();
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [map, id, zoomMode]); // ⚠️ SÓLO cambia cuando cambia el modo

  /* -----------------------------------------------------------------------
   * 2) ACTUALIZACIÓN DE POSICIÓN & ROTACIÓN
   * --------------------------------------------------------------------- */
  useEffect(() => {
    if (!markerRef.current) return;

    const { pos: prevPos, bearing: prevBearing } = prevState.current;
    const distance = getDistanceMeters(prevPos, position);
    let bearing = prevBearing;

    if (distance > 1.5) {
      bearing = normalizeBearing(prevBearing, getBearing(prevPos, position));
    }
    prevState.current = { pos: position, bearing };

    // Gira el wrapper y voltea la imagen si es modo taxi
    if (zoomMode === "taxi" && wrapperRef.current && imgRef.current) {
      const angle = (bearing - 90 + 360) % 360;
      wrapperRef.current.style.transform = `rotate(${angle}deg)`;

      const flip = angle > 90 && angle < 270;
      imgRef.current.style.transform = flip ? "scaleY(-1)" : "scaleY(1)";
      wrapperRef.current.style.flexDirection = flip
        ? "column-reverse"
        : "column";

      const label = wrapperRef.current.firstChild;
      if (label) label.style.transform = flip ? "rotate(180deg)" : "rotate(0)";
    }

    // Mueve suavemente si cambió la coordenada
    const cur = markerRef.current.getLatLng();
    if (
      Math.abs(cur.lat - position[0]) > 0.00001 ||
      Math.abs(cur.lng - position[1]) > 0.00001
    ) {
      markerRef.current.slideTo(position, {
        duration: 2000,
        easing: "easeInOutSine"
      });
    }
  }, [position, zoomMode]);

  /* -----------------------------------------------------------------------
   * 3) ACTUALIZA TEXTO DEL LABEL (línea / pasajeros)
   * --------------------------------------------------------------------- */
  useEffect(() => {
    if (!labelTextRef.current) return;
    const validPax = typeof pasajeros === "number" && !isNaN(pasajeros);
    labelTextRef.current.textContent =
      focused && validPax ? `👤 ${pasajeros}` : `${linea}`;
  }, [pasajeros, focused, linea]);

  /* -----------------------------------------------------------------------
   * 4) ACTUALIZA OPACITY
   * --------------------------------------------------------------------- */
  useEffect(() => {
    if (zoomMode === "taxi") {
      imgRef.current && (imgRef.current.style.opacity = opacity);
      const label = wrapperRef.current?.querySelector("div");
      label && (label.style.opacity = opacity);
    } else {
      // modo 'dot'
      const circle = markerRef.current?.getElement()?.firstChild;
      circle && (circle.style.opacity = opacity);
    }
  }, [opacity, zoomMode]);

  // Nada que renderizar en JSX
  return null;
}
