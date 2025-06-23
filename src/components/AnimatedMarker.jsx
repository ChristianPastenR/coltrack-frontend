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
  const prevState = useRef({ pos: position, bearing: 0 });

  const zoomMode = zoom < 14 ? "dot" : "taxi";

  useEffect(() => {
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
      const showingPassengers = focused && typeof pasajeros === "number" && !isNaN(pasajeros);

      if (showingPassengers) {
        labelText.textContent = `👤 ${pasajeros}`;
        labelText.style.cssText = `
          font: bold 14px sans-serif;
          color: black;
          text-align: center;
          opacity: 0;
          transform: translateY(6px);
          transition: opacity 0.3s ease, transform 0.3s ease;
        `;
      } else {
        labelText.textContent = `${linea}`;
        labelText.style.cssText = `
          font: normal 11px sans-serif;
          color: black;
          text-align: center;
          opacity: 0;
          transform: translateY(6px);
          transition: opacity 0.3s ease, transform 0.3s ease;
        `;
      }

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

    return () => {
      marker.remove();
    };
  }, [zoomMode, linea, color, opacity, focused]);

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
  // Aplica rotación de 180° adicional solo si el vehículo apunta hacia abajo
  label.style.transform = flip ? "rotate(180deg)" : "rotate(0deg)";
}


    }

    const cur = markerRef.current.getLatLng();
    if (cur.lat !== position[0] || cur.lng !== position[1]) {
      markerRef.current.slideTo(position, {
        duration: 2000,
        easing: "easeInOutSine"
      });
    }
  }, [position, zoomMode]);

  return null;
}
