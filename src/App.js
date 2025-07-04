import React, { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  ZoomControl,
  Marker,
  Polyline,
  useMap,
  useMapEvents
} from "react-leaflet";
import L from "leaflet";

import AnimatedMarker from "./components/AnimatedMarker";
import SearchBarDropdown from "./components/SearchBarDropdown";
import LoaderOverlay from "./components/loadingOverlay";
import "leaflet/dist/leaflet.css";
import "./App.css";

/* ------------------------------------------------------------------ */
/* 1)  CONFIGURACIÓN DEL ÍCONO DE USUARIO                              */
/* ------------------------------------------------------------------ */
const userMarker = L.divIcon({
  className: "custom-user-marker",
  html: `
    <div class="user-location-outer">
      <div class="user-location-inner"></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

/* ------------------------------------------------------------------ */
/* 2)  CONSTANTES BÁSICAS                                             */
/* ------------------------------------------------------------------ */
const API_URL = "https://api-coltrackapp.duckdns.org/api/telemetria/recientes";
const copiapoCenter = [-27.377665428621032, -70.31697510051582];
const copiapoBounds = [
  [-27.5068, -70.3971],
  [-27.3105, -70.2165]
];

/* ------------------------------------------------------------------ */
/* 3)  PALETA DE COLORES Y PERSISTENCIA                               */
/* ------------------------------------------------------------------ */
const colorPalette = [
  "#FFB3BA", "#FFDFBA", "#FFFFBA", "#BAFFC9", "#BAE1FF",
  "#E0BBE4", "#D5E8D4", "#C8E6FF", "#FFE7CC", "#F6C1C1",
  "#FAD6A5", "#FFF8B5", "#B0EACD", "#B8DAFF", "#D0C4E4",
  "#D9EAD3", "#E3F2FD", "#FFF2CC", "#C2ECE6", "#F5E6CC"
];

const COLOR_MAP_KEY = "coltrack_lineColorMap";
const loadColorMap = () => {
  try { return JSON.parse(localStorage.getItem(COLOR_MAP_KEY)) || {}; }
  catch { return {}; }
};
const saveColorMap = (map) =>
  localStorage.setItem(COLOR_MAP_KEY, JSON.stringify(map));

/* ------------------------------------------------------------------ */
/* 4)  COMPONENTES AUXILIARES                                         */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/* 5)  APP                                                             */
/* ------------------------------------------------------------------ */
export default function App() {
  /* ----------------------------- estado ---------------------------- */
  const [loading, setLoading]             = useState(true);
  const [telemetrias, setTelemetrias]     = useState([]);
  const [geojsonRutas, setGeojsonRutas]   = useState([]);
  const [userLocation, setUserLocation]   = useState(null);
  const [focusedUser, setFocusedUser]     = useState(false);
  const [userCenterTrigger, setUserCenterTrigger] = useState(0);
  const [isLocating, setIsLocating]       = useState(false);
  const [zoom, setZoom]                   = useState(17);
  const [availableLines, setAvailableLines] = useState([]);
  const [selectedLines, setSelectedLines]   = useState([]);
  const [focusedVehicle, setFocusedVehicle] = useState(null);
  const [showLegend, setShowLegend]       = useState(false);
  const [rutaResumen, setRutaResumen]     = useState({});   // ← nuevo

  /* ---------- refs ---------- */
  const colorMapRef   = useRef(loadColorMap());
  const usedColorsRef = useRef(new Set(Object.values(colorMapRef.current)));
  const firstLoadRef  = useRef(true);

  const getLineColor = (linea) => colorMapRef.current[linea] || "#000000";

  /* ------------------------------------------------------------------
   *  5.1  FETCH TELEMETRÍAS
   * ------------------------------------------------------------------ */
  useEffect(() => {
    const fetchTelemetrias = async () => {
      try {
        const res = await fetch(API_URL);
        const { data = [] } = await res.json();

        const unique = Array.from(
          new Map(data.map(t => [t.patente, t])).values()
        );
        setTelemetrias(unique);

        const lines = [...new Set(unique.map(t => t.linea))].sort();
        setAvailableLines(lines);

        if (firstLoadRef.current) {
          setSelectedLines(lines);
          firstLoadRef.current = false;
        }

        const map  = colorMapRef.current;
        const used = usedColorsRef.current;
        let changed = false;

        lines.forEach(linea => {
          if (!map[linea]) {
            const color = colorPalette.find(c => !used.has(c)) || "#000000";
            map[linea]  = color;
            used.add(color);
            changed = true;
          }
        });
        if (changed) saveColorMap(map);
      } catch (err) {
        console.error("❌ Error al obtener telemetrías:", err);
      }
    };

    fetchTelemetrias();
    const id = setInterval(fetchTelemetrias, 1500);
    return () => clearInterval(id);
  }, []);

  /* ------------------------------------------------------------------
   *  5.2  GEOJSON RUTAS + RESUMEN DE RECORRIDOS
   * ------------------------------------------------------------------ */
  useEffect(() => {
    const loadData = async () => {
      try {
        const [geo, resumen] = await Promise.all([
          fetch("/rutas/rutas_lineas_precisas.geojson").then(r => r.json()),
          fetch("/rutas/lineas_copiapo_resumen.json").then(r => r.json())
        ]);

        setGeojsonRutas(geo.features || []);
        setRutaResumen(Object.fromEntries(
          resumen.map(o => [`Línea ${o.linea}`, o.descripcion])
        ));
      } catch (err) {
        console.error("❌ Error al cargar archivos de rutas:", err);
      }
    };
    loadData();
  }, []);

  /* ------------------------------------------------------------------
   *  5.3  LOADER (estético)
   * ------------------------------------------------------------------ */
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  /* ------------------------------------------------------------------
   *  5.4  CENTRAR EN USUARIO
   * ------------------------------------------------------------------ */
  const centerOnUser = () => {
    if (!navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserLocation([coords.latitude, coords.longitude]);
        setFocusedUser(true);
        setUserCenterTrigger(p => p + 1);
      },
      () => {
        alert("No se pudo obtener tu ubicación.");
        setIsLocating(false);
      }
    );
  };

  useEffect(() => {
    if (focusedUser) {
      const t = setTimeout(() => {
        setFocusedUser(false);
        setIsLocating(false);
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [focusedUser]);

  /* ------------------------------------------------------------------
   *  5.5  DATA FILTRADA Y FOCO
   * ------------------------------------------------------------------ */
  const dataFiltrada = telemetrias.filter(t =>
    selectedLines.includes(t.linea)
  );

  useEffect(() => {
    if (!focusedVehicle) return;
    const v = telemetrias.find(t => t.patente === focusedVehicle);
    if (!v || !selectedLines.includes(v.linea)) {
      setFocusedVehicle(null);
    }
  }, [selectedLines, telemetrias, focusedVehicle]);

  /* ------------------------------------------------------------------
   *  5.6  RENDER
   * ------------------------------------------------------------------ */
  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {loading && <LoaderOverlay />}

      {/* -------- Búsqueda + leyenda -------- */}
      <div style={{ position: "absolute", top: 10, left: 10, zIndex: 1001, width: "90vw", maxWidth: 500 }}>
        <SearchBarDropdown
          lines={availableLines.map(id => ({
            id,
            desc: rutaResumen[id] || ""
          }))}
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
            {availableLines.map(l => (
              <li key={l} style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
                <div style={{
                  width: 12, height: 12, borderRadius: "50%",
                  background: getLineColor(l), marginRight: 8,
                  border: "1px solid #000"
                }} />
                <span style={{ fontSize: 14 }}>{l}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* -------- Botón GPS -------- */}
      <button
        onClick={centerOnUser}
        className={`gps-button ${isLocating ? "gps-button--active" : ""}`}
        title="Centrar en mi ubicación"
        aria-label="Centrar en mi ubicación"
      >
        <svg viewBox="0 0 24 24" width="22" height="22">
          <path
            d="M12 8a4 4 0 100 8 4 4 0 000-8zm9 3h-1.07a8 8 0 00-6.93-6.93V3a1 1 0 10-2 0v1.07a8 8 0 00-6.93 6.93H3a1 1 0 100 2h1.07a8 8 0 006.93 6.93V21a1 1 0 102 0v-1.07a8 8 0 006.93-6.93H21a1 1 0 100-2z"
            fill="currentColor"
          />
        </svg>
      </button>

      {/* ================================================================ */}
      {/* MAPA                                                            */}
      {/* ================================================================ */}
      <MapContainer
        center={copiapoCenter}
        zoom={17}
        minZoom={13}
        maxZoom={19}
        scrollWheelZoom
        zoomControl={false}
        maxBounds={copiapoBounds}
        maxBoundsViscosity={1.0}
        style={{ width: "100%", height: "100%" }}
        whenCreated={(map) => {
          map.on("zoomend", () => setZoom(map.getZoom()));
          map.on("click", () => setFocusedVehicle(null));
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
        />

        <ZoomLogger onZoomChange={setZoom} />
        <ZoomControl position="bottomright" />

        {/* ----- RUTAS ----- */}
        {geojsonRutas.map((f, idx) => {
          const linea = f.properties.linea;
          const focusedData = focusedVehicle
            ? telemetrias.find(t => t.patente === focusedVehicle)
            : null;

          const isFocused  = focusedData?.linea === linea;
          const isSelected = selectedLines.includes(linea);
          if (focusedVehicle && !isFocused) return null;

          return (
            <Polyline
              key={idx}
              positions={f.geometry.coordinates.map(([lng, lat]) => [lat, lng])}
              pathOptions={{
                color: getLineColor(linea),
                weight: isFocused ? 6 : isSelected ? 5 : 2,
                opacity: isFocused ? 0.9 : isSelected ? 0.7 : 0.2,
                dashArray: !isFocused && !isSelected ? "6, 6" : null
              }}
            />
          );
        })}

        {/* ----- Usuario ----- */}
        {userLocation && <Marker position={userLocation} icon={userMarker} />}
        {userLocation && focusedUser && (
          <MoveToLocation key={userCenterTrigger} position={userLocation} />
        )}

        {/* ----- Movimiento al vehículo enfocado ----- */}
        {focusedVehicle && (
          <MoveToLocation
            position={telemetrias.find(t => t.patente === focusedVehicle)?.gps || null}
          />
        )}

        {/* ----- Vehículos ----- */}
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

      {/* -------- Pie -------- */}
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
