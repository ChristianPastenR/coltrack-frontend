import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.marker.slideto";
import { getBearing, getDistanceMeters } from "../utils/geoUtils";

const ICON_TAXI = "/img/taxi-right.png";

function normalizeBearing(prev, next) {
  let delta = next - prev;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
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
  const markerRef = useRef(null);
  const imgRef = useRef(null);
  const wrapperRef = useRef(null);
  const labelTextRef = useRef(null);
  const prevState = useRef({ pos: position, bearing: 0 });
  const prevZoomMode = useRef(null);

  const zoomMode = zoom < 14 ? "dot" : "taxi";

  useEffect(() => {
    const shouldRecreate = zoomMode !== prevZoomMode.current || !markerRef.current;
    if (!shouldRecreate) return;

    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    const div = document.createElement("div");
    div.style.position = "relative";

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
      div.appendChild(circle);
    } else {
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

      const validPasajeros = typeof pasajeros === "number" && !isNaN(pasajeros);
      labelText.textContent = focused && validPasajeros ? `👤 ${pasajeros}` : `${linea}`;
      labelText.style.cssText = `
        font: ${focused && validPasajeros ? "bold 14px" : "normal 11px"} sans-serif;
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

      const img = document.createElement("img");
      imgRef.current = img;
      img.src = ICON_TAXI;
      img.width = 36;
      img.height = 36;
      img.style.cssText = `
        opacity: ${opacity};
        transition: transform 0.3s ease;
      `;

      wrapper.appendChild(label);
      wrapper.appendChild(img);
      div.appendChild(wrapper);
    }

    const icon = L.divIcon({
      html: div,
      className: "",
      iconSize: zoomMode === "dot" ? [20, 20] : [60, 60],
      iconAnchor: zoomMode === "dot" ? [10, 10] : [30, 55]
    });

    const marker = L.marker(position, { icon });
    marker.addTo(map);
    marker.on("click", (e) => {
      e.originalEvent.stopPropagation();
      if (onClick) onClick(id);
    });

    markerRef.current = marker;
    prevZoomMode.current = zoomMode;
  }, [zoomMode, linea, color, opacity, focused, id, onClick, pasajeros]);

  useEffect(() => {
    if (!markerRef.current) return;

    const { pos: prevPos, bearing: prevBearing } = prevState.current;
    const distance = getDistanceMeters(prevPos, position);
    let bearing = prevBearing;

    if (distance > 1.5) {
      bearing = normalizeBearing(prevBearing, getBearing(prevPos, position));
    }

    prevState.current = { pos: position, bearing };

    if (zoomMode === "taxi" && wrapperRef.current && imgRef.current) {
      const angle = (bearing - 90 + 360) % 360;
      wrapperRef.current.style.transform = `rotate(${angle}deg)`;

      const flip = angle > 90 && angle < 270;
      imgRef.current.style.transform = flip ? "scaleY(-1)" : "scaleY(1)";
      wrapperRef.current.style.flexDirection = flip ? "column-reverse" : "column";

      const label = wrapperRef.current.firstChild;
      if (label) {
        label.style.transform = flip ? "rotate(180deg)" : "rotate(0deg)";
      }
    }

    const cur = markerRef.current.getLatLng();
    if (Math.abs(cur.lat - position[0]) > 0.00001 || Math.abs(cur.lng - position[1]) > 0.00001) {
      markerRef.current.slideTo(position, {
        duration: 2000,
        easing: "easeInOutSine"
      });
    }
  }, [position, zoomMode]);

  // 🔁 Actualiza dinámicamente el texto del label
  useEffect(() => {
    if (!labelTextRef.current) return;
    const validPasajeros = typeof pasajeros === "number" && !isNaN(pasajeros);
    labelTextRef.current.textContent = focused && validPasajeros ? `👤 ${pasajeros}` : `${linea}`;
  }, [pasajeros, focused, linea]);

  // 🔁 Actualiza opacidad del ícono y el texto al hacer foco
  useEffect(() => {
    if (zoomMode === "taxi") {
      if (imgRef.current) imgRef.current.style.opacity = opacity;
      const label = wrapperRef.current?.querySelector("div");
      if (label) label.style.opacity = opacity;
    } else {
      const circle = markerRef.current?.getElement()?.firstChild;
      if (circle) circle.style.opacity = opacity;
    }
  }, [opacity, zoomMode]);

  return null;
}
