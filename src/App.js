import React, { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  ZoomControl,
  Marker,
  useMap
} from "react-leaflet";
import SearchBar from "./components/SearchBar";
import LoaderOverlay from "./components/loadingOverlay";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// ---------- CONFIG ----------
const API_URL = "http://127.0.0.1:3000/api/telemetria/recientes";

// Colores por línea (añade más si las necesitas)
const lineColors = {
  "11": "#21a500",
  "22": "#ff5722",
  "33": "#007bff"
};
// --------------------------------

// Icono gris de usuario
const userIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -41]
});

const getLineIcon = (linea, patente, pasajeros) => {
  const showPasajeros = pasajeros > 0;
  const bgColor = lineColors[linea] || "#444";

  return new L.DivIcon({
    html: `
      <div style="position: relative; text-align: center; transform: translateY(-10px);">
        <div style="
          background: ${bgColor};
          color: white;
          padding: 2px 6px;
          border-radius: 6px;
          font-size: 12px;
          line-height: 1.2;
          font-family: sans-serif;
          margin-bottom: 4px;
          display: inline-block;
          border: 1px solid black;
          box-shadow: 0 0 2px rgba(0,0,0,0.5);
        ">
          Línea: ${linea}${showPasajeros ? `<br/>P: ${pasajeros}` : ""}
        </div>
        <img src="/img/taxi.png" style="width: 48px; height: 48px;" />
      </div>
    `,
    className: "",
    iconSize: [80, 70],
    iconAnchor: [24, 48] // el punto que se posiciona en el GPS
  });
};




const copiapoCenter = [-27.377665428621032, -70.31697510051582];
const copiapoBounds = [
  [-27.50, -70.50],
  [-27.10, -70.20]
];

function MoveToLocation({ position }) {
  const map = useMap();
  useEffect(() => {
    position && map.setView(position, 16);
  }, [position, map]);
  return null;
}

function App() {
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [telemetrias, setTelemetrias] = useState([]);

  // ----------------- Obtener telemetrías -----------------
  useEffect(() => {
    const fetchTelemetrias = async () => {
      try {
        const res = await fetch(API_URL);
        const json = await res.json();
        console.log("Telemetrías recibidas:", json);
        setTelemetrias(json.data || []);
      } catch (err) {
        console.error("Error obteniendo telemetrías:", err.message);
      }
    };

    fetchTelemetrias();             // primer disparo
    const id = setInterval(fetchTelemetrias, 5000); // cada 5 s
    return () => clearInterval(id);
  }, []);
  // -------------------------------------------------------

  // ---------- GPS & loader ----------
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => setUserLocation([coords.latitude, coords.longitude]),
      (err) => console.warn("GPS desactivado/denegado:", err.message)
    );
    return () => clearTimeout(timer);
  }, []);
  // -----------------------------------

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {loading && <LoaderOverlay />}

      {/* Buscador */}
      <div style={{ position: "absolute", top: 10, left: 10, zIndex: 1000, width: "90vw", maxWidth: 500 }}>
        <SearchBar />
      </div>

      {/* Mapa */}
      <MapContainer
        center={copiapoCenter}
        zoom={16}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom
        zoomControl={false}
        maxBounds={copiapoBounds}
        maxBoundsViscosity={1.0}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />

        {/* Mover mapa al usuario */}
        {userLocation && <MoveToLocation position={userLocation} />}

        {/* Marcador del usuario */}
        {userLocation && <Marker position={userLocation} icon={userIcon} />}

        {/* Marcadores de colectivos */}
      {telemetrias.map((t) => (
        <Marker
          key={t._id}
          position={[t.gps.lat, t.gps.lng]}
          icon={getLineIcon(t.linea, t.patente, t.pasajeros)}
        />
      ))}



      </MapContainer>

      {/* Banner */}
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
        <span>Coltrack® 2025</span>
      </div>
    </div>
  );
}

export default App;
