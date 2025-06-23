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
  const passengerRef = useRef(null);
  const prevState = useRef({ pos: position, bearing: 0 });

  const zoomMode = zoom < 14 ? "dot" : "taxi";

  // Crear marcador (solo una vez o si cambia zoomMode)
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    const div = document.createElement("div");
    div.style.position = "relative";

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
      // 🚕 Taxi + etiqueta
      const label = document.createElement("div");
      label.style.cssText = `
        position: absolute;
        bottom: 36px;
        text-align: center;
        left: 50%;
        transform: translateX(-50%);
        background: ${color};
        padding: 4px 8px;
        border-radius: 6px;
        font: bold 12px sans-serif;
        white-space: nowrap;
        opacity: ${opacity};
        transition: all 0.3s ease;
      `;

      const lineText = document.createElement("div");
      lineText.textContent = `${linea}`;
      label.appendChild(lineText);

      const passengerText = document.createElement("div");
      passengerText.textContent = `Pasajeros: ${pasajeros ?? "?"}`;
      passengerText.style.cssText = `
        font-weight: normal;
        font: bold 12px sans-serif;
        max-height: 0;
        overflow: hidden;
        opacity: 0;
        transition: max-height 0.3s ease, opacity 0.3s ease;
      `;
      label.appendChild(passengerText);
      passengerRef.current = passengerText;

      const img = document.createElement("img");
      imgRef.current = img;
      img.src = ICON_TAXI;
      img.width = 36;
      img.height = 36;
      img.style.cssText = `
        opacity: ${opacity};
        transition: transform 0.3s ease;
        transform: scale(${focused ? 1.4 : 1});
      `;

      div.append(label, img);
    }

    const icon = L.divIcon({
      html: div,
      className: "",
      iconSize: zoomMode === "dot" ? [20, 20] : [60, 60],
      iconAnchor: [10, 10]
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
  }, [zoomMode, linea, color, opacity]);

  // Movimiento y rotación
  useEffect(() => {
    if (!markerRef.current) return;

    const { pos: prevPos, bearing: prevBearing } = prevState.current;
    const distance = getDistanceMeters(prevPos, position);
    let bearing = prevBearing;

    if (distance > 1.5) {
      bearing = normalizeBearing(prevBearing, getBearing(prevPos, position));
    }

    prevState.current = { pos: position, bearing };

    // Rotación para taxi
    if (zoomMode === "taxi" && imgRef.current) {
      const rot = (bearing - 90 + 360) % 360;
      const flip = rot > 90 && rot < 270 ? "scaleY(-1)" : "scaleY(1)";
      imgRef.current.style.transform = `rotate(${rot}deg) ${flip} scale(${focused ? 1.4 : 1})`;
    }

    // Movimiento suave
    const cur = markerRef.current.getLatLng();
    if (cur.lat !== position[0] || cur.lng !== position[1]) {
      markerRef.current.slideTo(position, {
        duration: 2000,
        easing: "easeInOutSine"
      });
    }
  }, [position, zoomMode]);

  // Animaciones por selección
  useEffect(() => {
    if (passengerRef.current) {
      passengerRef.current.style.maxHeight = focused ? "40px" : "0";
      passengerRef.current.style.opacity = focused ? "1" : "0";
    }

    if (imgRef.current && zoomMode === "taxi") {
      const current = imgRef.current.style.transform || "";
      const rot = current.match(/rotate\([^)]+\)/)?.[0] || "";
      const flip = current.includes("scaleY(-1)") ? "scaleY(-1)" : "scaleY(1)";
      imgRef.current.style.transform = `${rot} ${flip} scale(${focused ? 1.4 : 1})`.trim();
    }
  }, [focused, zoomMode]);

  return null;
}
