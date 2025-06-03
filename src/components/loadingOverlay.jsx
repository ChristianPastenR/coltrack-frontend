import React from "react";

export default function LoaderOverlay() {
  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0,
      width: "100vw",
      height: "100vh",
      backgroundColor: "rgba(0, 0, 0, 0.85)",
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      color: "#fff",
      fontFamily: "Arial, sans-serif"
    }}>
      <div className="loader" />
      <p style={{ marginTop: 20, fontSize: 18 }}>Coltrack® 2025</p>

      <style>
        {`
          .loader {
            border: 6px solid #f3f3f3;
            border-top: 6px solid #00aced;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
