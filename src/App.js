import React, { useEffect, useState, useRef } from "react";
import AnimatedMarker from "./components/AnimatedMarker";

import {
  MapContainer,
  TileLayer,
  ZoomControl,
  Marker,
  useMap
} from "react-leaflet";
import SearchBarDropdown from "./components/SearchBarDropdown";
import LoaderOverlay from "./components/loadingOverlay";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const API_URL = "http://127.0.0.1:3000/api/telemetria/recientes";

const userIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const colorPalette = [
  "#FFCDD2", "#F8BBD0", "#E1BEE7", "#D1C4E9", "#C5CAE9",
  "#BBDEFB", "#B3E5FC", "#B2EBF2", "#B2DFDB", "#C8E6C9",
  "#DCEDC8", "#F0F4C3", "#FFECB3", "#FFE0B2", "#FFCCBC"
];

const copiapoCenter = [-27.377665428621032, -70.31697510051582];
const copiapoBounds = [
  [-27.50, -70.50],
  [-27.10, -70.20]
];

function MoveToLocation({ position }) {
  const map = useMap();
  useEffect(() => {
    position && map.flyTo(position, 16);
  }, [position, map]);
  return null;
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [telemetrias, setTelemetrias] = useState([]);
  const [expandedMarkers, setExpandedMarkers] = useState({});
  const [zoom, setZoom] = useState(16);
  const [availableLines, setAvailableLines] = useState([]);
  const [selectedLines, setSelectedLines] = useState([]);

  const colorMapRef = useRef({});
  const usedColorsRef = useRef(new Set());

  const getLineColor = (linea) => {
    const map = colorMapRef.current;
    const used = usedColorsRef.current;

    if (!map[linea]) {
      const availableColors = colorPalette.filter(c => !used.has(c));
      const color = availableColors.length > 0
        ? availableColors[Math.floor(Math.random() * availableColors.length)]
        : colorPalette[Math.floor(Math.random() * colorPalette.length)];

      map[linea] = color;
      used.add(color);
    }

    return map[linea];
  };

  const getLineIcon = (linea, expandido, pasajeros, zoom) => {
    const scale = Math.max(0.6, Math.min(1.4, zoom / 16));
    const size = 48 * scale;
    const fontSize = 11 * scale;
    const color = getLineColor(linea);
    const textColor = "black";

    return new L.DivIcon({
      html: `
        <div style="text-align:center; position: relative; transform: translateY(-10px);">
          <div style="
            position: absolute;
            bottom: ${size + 2}px;
            left: 50%;
            transform: translateX(-50%);
            min-height: ${fontSize + 6}px;
            font-size: ${fontSize}px;
            padding: 2px 6px;
            background: ${color};
            color: ${textColor};
            border-radius: 6px;
            font-family: sans-serif;
            white-space: nowrap;
          ">
            ${linea}${expandido ? `<br/>Pasajeros: ${pasajeros}` : ""}
          </div>
          <img src="/img/taxi.png" style="width: ${size}px; height: ${size}px;" />
        </div>
      `,
      className: "",
      iconSize: [size + 20, size + 30],
      iconAnchor: [size / 2, size]
    });
  };

  useEffect(() => {
    const fetchTelemetrias = async () => {
      try {
        const res = await fetch(API_URL);
        const json = await res.json();
        const nuevos = json.data || [];

        setExpandedMarkers(prev => {
          const updated = { ...prev };
          nuevos.forEach(t => {
            if (updated[t._id] === undefined) updated[t._id] = false;
          });
          return updated;
        });

        setTelemetrias(nuevos);
        const lines = Array.from(new Set(nuevos.map(t => t.linea))).sort();
        setAvailableLines(lines);

        if (selectedLines.length === 0) {
          setSelectedLines(lines);
        }
      } catch (err) {
        console.error("Error obteniendo telemetrías:", err.message);
      }
    };

    fetchTelemetrias();
    const id = setInterval(fetchTelemetrias, 1500);
    return () => clearInterval(id);
  }, [selectedLines]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => setUserLocation([coords.latitude, coords.longitude]),
      err => console.warn("GPS desactivado/denegado:", err.message)
    );
    return () => clearTimeout(timer);
  }, []);

  const toggleExpansion = (id) =>
    setExpandedMarkers((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));

  const dataFiltrada = telemetrias.filter(t => selectedLines.includes(t.linea));

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {loading && <LoaderOverlay />}

      <div style={{ position: "absolute", top: 10, left: 10, zIndex: 1000, width: "90vw", maxWidth: 500 }}>
        <SearchBarDropdown
          lines={availableLines.map(id => ({ name: id, id }))}
          selectedLines={selectedLines}
          onSelectionChange={setSelectedLines}
        />
      </div>

      <MapContainer
        center={copiapoCenter}
        zoom={16}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom
        zoomControl={false}
        maxBounds={copiapoBounds}
        maxBoundsViscosity={1.0}
        whenCreated={map => {
          setZoom(map.getZoom());
          map.on("zoomend", () => setZoom(map.getZoom()));
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />
        {userLocation && <MoveToLocation position={userLocation} />}
        {userLocation && <Marker position={userLocation} icon={userIcon} />}
        {dataFiltrada.map(t => (
          <AnimatedMarker
            key={t._id}
            id={t._id}
            position={[t.gps.lat, t.gps.lng]}
            icon={getLineIcon(t.linea, expandedMarkers[t._id], t.pasajeros, zoom)}
            onClick={() => toggleExpansion(t._id)}
          />
        ))}
      </MapContainer>

      <div style={{
        position: "fixed",
        bottom: 0,
        width: "100%",
        textAlign: "center",
        backgroundColor: "rgba(0,0,0,0.7)",
        color: "white",
        padding: "12px 0",
        fontSize: "16px",
        fontWeight: "bold",
        zIndex: 1000
      }}>
        Coltrack® 2025
      </div>
    </div>
  );
}
