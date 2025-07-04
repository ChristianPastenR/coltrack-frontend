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
/* 1)  ÍCONO DEL USUARIO                                              */
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
/* 2)  CONSTANTES DE MAPA                                             */
/* ------------------------------------------------------------------ */
const API_URL      = "https://api-coltrackapp.duckdns.org/api/telemetria/recientes";
const copiapoCenter = [-27.377665428621032, -70.31697510051582];
const copiapoBounds = [
  [-27.5068, -70.3971],
  [-27.3105, -70.2165]
];

/* ------------------------------------------------------------------ */
/* 3)  PALETA FIJA SIN PERSISTENCIA                                   */
/* ------------------------------------------------------------------ */
/* Paleta de 20 tonos vivos y saturados (sin amarillos ni blancos) */
/* 20 colores vivos – los 10 primeros cubren el espectro con máxima diferencia */
const colorPalette = [
  "#E53935", // rojo
  "#1E88E5", // azul
  "#43A047", // verde
  "#FB8C00", // naranja
  "#8E24AA", // púrpura
  "#009688", // teal
  "#C2185B", // rosa frambuesa
  "#00ACC1", // cian
  "#7C4DFF", // violeta eléctrico
  "#F4511E", // naranja rojizo
  "#66BB6A", // verde lima
  "#3949AB", // índigo
  "#26C6DA", // turquesa claro
  "#BF360C", // terracota vivo
  "#AB47BC", // lavanda saturada
  "#00C853", // verde neón
  "#EF5350", // rojo coral
  "#3F51B5", // azul violáceo
  "#4CAF50", // verde medio
  "#D81B60"  // fucsia intenso
];



/* hash determinista sencillo */
const hashString = (str) =>
  str.split("").reduce((a, c) => ((a << 5) - a) + c.charCodeAt(0), 0) >>> 0;

/* mismo color para la misma línea en cualquier dispositivo */
const getLineColor = (linea) =>
  colorPalette[hashString(String(linea)) % colorPalette.length];

/* ------------------------------------------------------------------ */
/* 4)  COMPONENTES AUXILIARES                                         */
/* ------------------------------------------------------------------ */
function MoveToLocation({ position }) {
  const map        = useMap();
  const lastCenter = useRef(null);

  useEffect(() => {
    if (!position) return;
    const currentCenter = map.getCenter();
    const dist = map.distance(currentCenter, L.latLng(position));
    const safeZoom = Math.min(17, map.getMaxZoom());

    if (lastCenter.current == null || dist > 80) {
      map.flyTo(position, safeZoom, { duration: 0.5 });
    } else {
      map.panTo(position, { animate: true, duration: 0.5 });
    }
    lastCenter.current = position;
  }, [position, map]);

  return null;
}

function ZoomLogger({ onZoomChange }) {
  useMapEvents({ zoomend: (e) => onZoomChange?.(e.target.getZoom()) });
  return null;
}

/* ------------------------------------------------------------------ */
/* 5)  APP                                                            */
/* ------------------------------------------------------------------ */
export default function App() {
  /* estado principal */
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
  const [rutaResumen, setRutaResumen]     = useState({});

  /* una sola selección completa al primer fetch */
  const firstLoadRef = useRef(true);

  /* ------------------------------------------------------------------
   * 5.1  TELEMETRÍAS
   * ------------------------------------------------------------------ */
  useEffect(() => {
    const fetchTelemetrias = async () => {
      try {
        const res   = await fetch(API_URL);
        const { data = [] } = await res.json();
        const unique = Array.from(new Map(data.map(t => [t.patente, t])).values());
        setTelemetrias(unique);

        const lines = [...new Set(unique.map(t => t.linea))].sort();
        setAvailableLines(lines);

        if (firstLoadRef.current) {
          setSelectedLines(lines);
          firstLoadRef.current = false;
        }
      } catch (err) {
        console.error("❌ Error al obtener telemetrías:", err);
      }
    };

    fetchTelemetrias();
    const id = setInterval(fetchTelemetrias, 1500);
    return () => clearInterval(id);
  }, []);

  /* ------------------------------------------------------------------
   * 5.2  GEOJSON RUTAS + RESUMEN
   * ------------------------------------------------------------------ */
  useEffect(() => {
    const loadData = async () => {
      try {
        const [geo, resumen] = await Promise.all([
          fetch("/rutas/rutas_lineas_precisas.geojson").then(r => r.json()),
          fetch("/rutas/lineas_copiapo_resumen.json").then(r => r.json())
        ]);

        setGeojsonRutas(geo.features || []);

        /* clave igual a “Línea X” para coincidir con telemetría */
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
   * 5.3  LOADER (estético)
   * ------------------------------------------------------------------ */
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(t);
  }, []);

  /* ------------------------------------------------------------------
   * 5.4  CENTRO EN USUARIO
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
      const to = setTimeout(() => { setFocusedUser(false); setIsLocating(false); }, 1000);
      return () => clearTimeout(to);
    }
  }, [focusedUser]);

  /* ------------------------------------------------------------------
   * 5.5  FILTRADO + LIMPIEZA DE FOCO
   * ------------------------------------------------------------------ */
  const dataFiltrada = telemetrias.filter(t => selectedLines.includes(t.linea));

  useEffect(() => {
    if (!focusedVehicle) return;
    const v = telemetrias.find(t => t.patente === focusedVehicle);
    if (!v || !selectedLines.includes(v.linea)) setFocusedVehicle(null);
  }, [selectedLines, telemetrias, focusedVehicle]);

  /* ------------------------------------------------------------------
   * 5.6  RENDER
   * ------------------------------------------------------------------ */
  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {loading && <LoaderOverlay />}

      {/* Búsqueda + leyenda */}
      <div style={{ position: "absolute", top: 10, left: 10, zIndex: 1001, width: "90vw", maxWidth: 500 }}>
        <SearchBarDropdown
          lines={availableLines.map(id => ({ id, desc: rutaResumen[id] || "" }))}
          selectedLines={selectedLines}
          onSelectionChange={setSelectedLines}
          lineColors={availableLines.reduce((o, id) => ({ ...o, [id]: getLineColor(id) }), {})}
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

      {/* Botón GPS */}
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

      {/* Mapa */}
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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ZoomLogger onZoomChange={setZoom} />
        <ZoomControl position="bottomright" />

        {/* Rutas */}
        {geojsonRutas.map((f, idx) => {
          const linea      = f.properties.linea;
          const focalData  = focusedVehicle && telemetrias.find(t => t.patente === focusedVehicle);
          const isFocused  = focalData?.linea === linea;
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

        {/* Usuario */}
        {userLocation && <Marker position={userLocation} icon={userMarker} />}
        {userLocation && focusedUser && (
          <MoveToLocation key={userCenterTrigger} position={userLocation} />
        )}

        {/* Movimiento al vehículo enfocado */}
        {focusedVehicle && (
          <MoveToLocation
            position={telemetrias.find(t => t.patente === focusedVehicle)?.gps || null}
          />
        )}

        {/* Vehículos */}
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

      {/* Pie */}
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
