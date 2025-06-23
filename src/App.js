import React, { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  ZoomControl,
  Marker,
  useMap,
  useMapEvents
} from "react-leaflet";
import L from "leaflet";

import AnimatedMarker from "./components/AnimatedMarker";
import SearchBarDropdown from "./components/SearchBarDropdown";
import LoaderOverlay from "./components/loadingOverlay";
import "leaflet/dist/leaflet.css";

const API_URL = "https://api-coltrackapp.duckdns.org/api/telemetria/recientes";
const copiapoCenter = [-27.377665428621032, -70.31697510051582];
const copiapoBounds = [
  [-27.5068, -70.3971],
  [-27.3105, -70.2165]
];

const userIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MoveToLocation({ position }) {
  const map = useMap();
  const lastCenter = useRef(null);

  useEffect(() => {
    if (!position) return;
    const currentCenter = map.getCenter();
    const distance = map.distance(currentCenter, L.latLng(position));
    const safeZoom = Math.min(17, map.getMaxZoom());
    if (lastCenter.current === null || distance > 80) {
      map.flyTo(position, safeZoom, { duration: 0.5 });
    } else {
      map.panTo(position, { animate: true, duration: 0.5 });
    }
    lastCenter.current = position;
  }, [position, map]);

  return null;
}

function ZoomLogger({ onZoomChange }) {
  useMapEvents({
    zoomend(e) {
      onZoomChange?.(e.target.getZoom());
    }
  });
  return null;
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [telemetrias, setTelemetrias] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [zoom, setZoom] = useState(16);
  const [availableLines, setAvailableLines] = useState([]);
  const [selectedLines, setSelectedLines] = useState([]);
  const [focusedVehicle, setFocusedVehicle] = useState(null);
  const [showLegend, setShowLegend] = useState(false);
  const [mapRef, setMapRef] = useState(null);
  const [gpsButtonActive, setGpsButtonActive] = useState(false);

  const colorPalette = [
    "#FFCDD2", "#F8BBD0", "#E1BEE7", "#D1C4E9", "#C5CAE9",
    "#BBDEFB", "#B3E5FC", "#B2EBF2", "#B2DFDB", "#C8E6C9",
    "#DCEDC8", "#F0F4C3", "#FFECB3", "#FFE0B2", "#FFCCBC"
  ];
  const colorMapRef = useRef({});
  const usedColorsRef = useRef(new Set());

  const getLineColor = (linea) => {
    const map = colorMapRef.current;
    const used = usedColorsRef.current;
    if (!map[linea]) {
      const free = colorPalette.filter(c => !used.has(c));
      const color = free.length
        ? free[Math.floor(Math.random() * free.length)]
        : colorPalette[Math.floor(Math.random() * colorPalette.length)];
      map[linea] = color;
      used.add(color);
    }
    return map[linea];
  };

  useEffect(() => {
    const fetchTelemetrias = async () => {
      try {
        const res = await fetch(API_URL);
        const { data = [] } = await res.json();
        const dedupe = Array.from(new Map(data.map(t => [t.patente, t])).values());
        setTelemetrias(dedupe);
        const lines = [...new Set(dedupe.map(t => t.linea))].sort();
        setAvailableLines(lines);
        if (selectedLines.length === 0) setSelectedLines(lines);
      } catch (err) {
        console.error("Error al obtener datos:", err);
      }
    };
    fetchTelemetrias();
    const id = setInterval(fetchTelemetrias, 1500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleMapMove = () => setShowLegend(false);
    const mapEl = document.querySelector(".leaflet-container");
    if (mapEl) {
      mapEl.addEventListener("mousedown", handleMapMove);
      mapEl.addEventListener("touchstart", handleMapMove);
    }
    return () => {
      mapEl?.removeEventListener("mousedown", handleMapMove);
      mapEl?.removeEventListener("touchstart", handleMapMove);
    };
  }, []);

  useEffect(() => {
    const adjustLeafletControls = () => {
      const zoomCtl = document.querySelector(".leaflet-control-zoom");
      const attrCtl = document.querySelector(".leaflet-control-attribution");
      if (zoomCtl) {
        zoomCtl.style.marginBottom = "35px";
        zoomCtl.style.marginRight = "10px";
      }
      if (attrCtl) {
        attrCtl.style.bottom = "0px";
        attrCtl.style.left = "0px";
        attrCtl.style.right = "0px";
        attrCtl.style.margin = "0";
        attrCtl.style.padding = "2px 8px";
        attrCtl.style.fontSize = "11px";
      }
    };
    const observer = new MutationObserver(adjustLeafletControls);
    observer.observe(document.body, { childList: true, subtree: true });
    adjustLeafletControls();
    return () => observer.disconnect();
  }, []);

  const centerOnUser = () => {
    if (!navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const location = [coords.latitude, coords.longitude];
        setUserLocation(location);
        if (mapRef) {
          mapRef.flyTo(location, 15, { duration: 0.5 });
        }
      },
      () => {
        alert("No se pudo obtener tu ubicación. Por favor, permite el acceso al GPS.");
      }
    );
  };

  const dataFiltrada = telemetrias.filter(t => selectedLines.includes(t.linea));

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden" }}>
      {loading && <LoaderOverlay />}
      <div style={{ position: "absolute", top: 10, left: 10, zIndex: 1001, width: "90vw", maxWidth: 500 }}>
        <SearchBarDropdown
          lines={availableLines.map(id => ({ id }))}
          selectedLines={selectedLines}
          onSelectionChange={setSelectedLines}
          lineColors={availableLines.reduce((acc, id) => {
            acc[id] = getLineColor(id);
            return acc;
          }, {})}
        />
        <button
          onClick={() => setShowLegend(p => !p)}
          style={{
            margin: "8px 0",
            background: "#ffffffdd",
            padding: "4px 10px",
            borderRadius: 4,
            border: "1px solid #ccc",
            fontSize: 12,
            cursor: "pointer"
          }}
        >
          {showLegend ? "✕ Ocultar leyenda" : "☰ Mostrar leyenda"}
        </button>
        <div style={{
          background: "rgba(255,255,255,0.85)",
          padding: showLegend ? "10px" : "0 10px",
          borderRadius: 8,
          boxShadow: "0 0 5px rgba(0,0,0,0.15)",
          overflow: "hidden",
          transition: "max-height .3s ease, padding .3s ease",
          maxHeight: showLegend ? 300 : 0
        }}>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {availableLines.map(linea => (
              <li key={linea} style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
                <div style={{
                  width: 12, height: 12, borderRadius: "50%",
                  background: getLineColor(linea), marginRight: 8,
                  border: "1px solid #000"
                }} />
                <span style={{ fontSize: 14 }}>{linea}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <button
        onClick={() => {
          setGpsButtonActive(true);
          centerOnUser();
          setTimeout(() => setGpsButtonActive(false), 1500);
        }}
        style={{
          position: "absolute",
          bottom: 250,
          right: 7,
          zIndex: 1001,
          background: gpsButtonActive ? "#ff9999" : "#ffffffdd",
          border: "1px solid #ccc",
          borderRadius: "50%",
          width: 40,
          height: 40,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
          padding: 0
        }}
        title="Centrar en mi ubicación"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#000"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="2" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="2" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
        </svg>
      </button>

      <MapContainer
        center={copiapoCenter}
        zoom={15}
        minZoom={13}
        maxZoom={19}
        scrollWheelZoom
        zoomControl={false}
        maxBounds={copiapoBounds}
        maxBoundsViscosity={1.0}
        wheelPxPerZoomLevel={100}
        style={{ width: "100%", height: "100%" }}
        whenCreated={(map) => {
          setMapRef(map);
          setZoom(Math.min(map.getZoom(), map.getMaxZoom()));
          map.on("zoomend", () => {
            const z = map.getZoom();
            if (z > map.getMaxZoom()) {
              map.setZoom(map.getMaxZoom());
            }
            setZoom(z);
          });
          map.on("click", () => setFocusedVehicle(null));
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomLogger onZoomChange={setZoom} />
        <ZoomControl position="bottomright" />
        {userLocation && <Marker position={userLocation} icon={userIcon} />}
        {focusedVehicle && (
          <MoveToLocation
            position={telemetrias.find(t => t.patente === focusedVehicle)?.gps || null}
          />
        )}
        {dataFiltrada.map(t => (
          <AnimatedMarker
            key={t.patente}
            id={t.patente}
            position={[t.gps.lat, t.gps.lng]}
            linea={t.linea}
            pasajeros={t.pasajeros}
            color={getLineColor(t.linea)}
            zoom={zoom}
            onClick={(id) => setFocusedVehicle(c => (c === id ? null : id))}
            opacity={focusedVehicle && focusedVehicle !== t.patente ? 0.4 : 1}
            focused={focusedVehicle === t.patente}
          />
        ))}
      </MapContainer>

      <div style={{
        position: "fixed",
        bottom: 0,
        width: "100%",
        textAlign: "center",
        background: "rgba(0,0,0,0.6)",
        color: "#fff",
        padding: "4px 0",
        fontSize: 12,
        fontWeight: 500,
        zIndex: 1000,
        pointerEvents: "none"
      }}>
        Coltrack® 2025
      </div>
    </div>
  );
}
