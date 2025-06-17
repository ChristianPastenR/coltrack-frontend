// components/AnimatedMarker.jsx
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.marker.slideto";

export default function AnimatedMarker({ id, position, icon, onClick }) {
  const markerRef = useRef(null);
  const map = useMap();

  useEffect(() => {
    if (!markerRef.current) {
      markerRef.current = L.marker(position, { icon }).addTo(map);

      // Conectar click una sola vez
      if (onClick) {
        markerRef.current.on("click", () => onClick(id));
      }
    } else {
      const cur = markerRef.current.getLatLng();
      if (cur.lat !== position[0] || cur.lng !== position[1]) {
        markerRef.current.slideTo(position, {
          duration: 1200,
          easing: "easeInOutSine"
        });
      }
      markerRef.current.setIcon(icon);
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [position, icon, onClick, id, map]);

  return null;
}
