import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.marker.slideto";
import { getBearing, getDistanceMeters } from "../utils/geoUtils";

const ICON_TAXI = "/img/taxi-right.png"; // imagen base mirando a la derecha

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
  pasajeros,
  zoom,
  onClick
}) {
  const map = useMap();
  const markerRef = useRef(null);
  const imgRef = useRef(null);
  const labelRef = useRef(null);
  const prevState = useRef({ pos: position, bearing: 0 });

  useEffect(() => {
    if (!markerRef.current) {
      const div = document.createElement("div");
      div.style.position = "relative";
      div.style.transform = "translateY(-10px)";

      // Texto de línea y pasajeros
      const lbl = document.createElement("div");
      labelRef.current = lbl;
      lbl.style.cssText = `
        position:absolute; bottom:52px; left:50%; transform:translateX(-50%);
        background:${color}; padding:2px 6px; border-radius:6px;
        font:600 ${11 * Math.max(0.6, Math.min(1.4, zoom / 16))}px sans-serif;
        white-space:nowrap;
      `;
      lbl.innerHTML = `${linea}<br/>Pasajeros: ${pasajeros}`;

      // Imagen
      const img = document.createElement("img");
      imgRef.current = img;
      img.src = ICON_TAXI;
      img.width = 48;
      img.height = 48;

      div.append(lbl, img);

      const icon = L.divIcon({
        html: div,
        className: "",
        iconSize: [60, 60],
        iconAnchor: [30, 30]
      });

      markerRef.current = L.marker(position, { icon }).addTo(map);
      if (onClick) markerRef.current.on("click", () => onClick(id));
    }

    const { pos: prevPos, bearing: prevBearing } = prevState.current;
    const distance = getDistanceMeters(prevPos, position);

    let bearing = prevBearing;
    if (distance > 1.5) {
      bearing = normalizeBearing(prevBearing, getBearing(prevPos, position));
    }

    prevState.current = { pos: position, bearing };

    // Rotación + flip para evitar que quede de cabeza
    const rot = (bearing - 90 + 360) % 360;
    const flip = (rot > 90 && rot < 270) ? "scaleY(-1)" : "scaleY(1)";
    imgRef.current.style.transform = `rotate(${rot}deg) ${flip}`;

    // Actualizar texto
    labelRef.current.innerHTML = `${linea}<br/>Pasajeros: ${pasajeros}`;

    // Desplazamiento con slideTo si cambia
    const cur = markerRef.current.getLatLng();
    if (cur.lat !== position[0] || cur.lng !== position[1]) {
      markerRef.current.slideTo(position, {
        duration: 1000,
        easing: "easeInOutSine"
      });
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [position, linea, color, pasajeros, zoom, map, id, onClick]);

  return null;
}
