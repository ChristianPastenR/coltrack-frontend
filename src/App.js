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

// Icono personalizado para la ubicación actual
const userIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -41]
});

const copiapoCenter = [-27.377665428621032, -70.31697510051582];
const copiapoBounds = [
  [-27.50, -70.50],
  [-27.10, -70.20]
];

// Componente auxiliar para mover el mapa a la ubicación del usuario
function MoveToLocation({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, 16);
    }
  }, [position, map]);
  return null;
}

function App() {
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    // Mostrar pantalla de carga y solicitar ubicación
    const timer = setTimeout(() => setLoading(false), 2000);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([
            position.coords.latitude,
            position.coords.longitude
          ]);
        },
        (error) => {
          console.warn("GPS desactivado o denegado:", error.message);
        }
      );
    } else {
      console.warn("Geolocalización no es soportada por este navegador.");
    }

    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {loading && <LoaderOverlay />}

      {/* Buscador */}
      <div style={{
        position: "absolute",
        top: 10,
        left: 10,
        zIndex: 1000,
        width: "90vw",
        maxWidth: 500
      }}>
        <SearchBar />
      </div>

      {/* Mapa */}
      <MapContainer
        center={copiapoCenter}
        zoom={16}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom={true}
        zoomControl={false}
        maxBounds={copiapoBounds}
        maxBoundsViscosity={1.0}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />

        {/* Centrar en ubicación del usuario */}
        {userLocation && <MoveToLocation position={userLocation} />}

        {/* Mostrar marcador si se obtuvo ubicación */}
        {userLocation && (
          <Marker position={userLocation} icon={userIcon}>
          </Marker>
        )}
      </MapContainer>

      {/* Banner inferior */}
      <div style={{
        position: "fixed", // en lugar de "absolute"
        bottom: 0,
        width: "100%",
        textAlign: "center",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        color: "white",
        padding: "12px 0", // más altura para evitar que se lo coma el nav bar
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
