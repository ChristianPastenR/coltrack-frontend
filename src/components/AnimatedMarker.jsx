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
  color,
  zoom,
  onClick,
  opacity = 1
}) {
  const map = useMap();
  const markerRef = useRef(null);
  const imgRef = useRef(null);
  const prevState = useRef({ pos: position, bearing: 0 });
  const lastZoomType = useRef(null); // track current visual mode

  // Decide visual mode
const zoomMode = zoom < 15 ? "dot" : "taxi";


  // 🛠️ (Re)Create marker icon on zoom mode change
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    const div = document.createElement("div");
    div.style.position = "relative";

    if (zoomMode === "dot") {
      // 🔵 Círculo simple
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
      // 🚕 Taxi con etiqueta de línea
      const label = document.createElement("div");
      label.style.cssText = `
        position: absolute;
        bottom: 36px;
        text-align: center;
        left: 50%;
        transform: translateX(-50%);
        background: ${color};
        padding: 2px 6px;
        border-radius: 6px;
        font: bold 12px sans-serif;
        white-space: nowrap;
        opacity: ${opacity};
      `;
      label.innerHTML = `${linea}`;

      const img = document.createElement("img");
      imgRef.current = img;
      img.src = ICON_TAXI;
      img.width = 36;
      img.height = 36;
      img.style.opacity = opacity;

      div.append(label, img);
    }

    const icon = L.divIcon({
      html: div,
      className: "",
      iconSize: zoomMode === "dot" ? [20, 20] : [60, 60],
      iconAnchor: [10, 10] // center for dot, adjust for taxi if needed
    });

    const marker = L.marker(position, { icon });
    marker.addTo(map);
    marker.on("click", (e) => {
      e.originalEvent.stopPropagation();
      if (onClick) onClick(id);
    });

    markerRef.current = marker;
    lastZoomType.current = zoomMode;

    return () => {
      marker.remove();
    };
  }, [zoomMode, linea, color, opacity]);

  // 🧭 Rotación + movimiento
  useEffect(() => {
    if (!markerRef.current) return;

    const { pos: prevPos, bearing: prevBearing } = prevState.current;
    const distance = getDistanceMeters(prevPos, position);
    let bearing = prevBearing;

    if (distance > 1.5) {
      bearing = normalizeBearing(prevBearing, getBearing(prevPos, position));
    }

    prevState.current = { pos: position, bearing };

    // Solo rota si es taxi
    if (zoomMode === "taxi" && imgRef.current) {
      const rot = (bearing - 90 + 360) % 360;
      const flip = rot > 90 && rot < 270 ? "scaleY(-1)" : "scaleY(1)";
      imgRef.current.style.transform = `rotate(${rot}deg) ${flip}`;
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

  return null;
}
