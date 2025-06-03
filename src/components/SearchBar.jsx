import React, { useState, useEffect, useRef } from "react";

const lines = [
  { name: "Línea 1", id: "1" },
  { name: "Línea 11", id: "11" },
  { name: "Línea 4", id: "4" },
  { name: "Línea 5", id: "5" },
  { name: "Línea 6", id: "6" },
  { name: "Línea 7", id: "7" },
  { name: "Línea 07", id: "07" },
  { name: "Línea 08", id: "08" },
  { name: "Línea 77", id: "77" },
  { name: "Línea 02", id: "02" },
  { name: "Línea 2", id: "2" },
  { name: "Línea 20", id: "20" },
  { name: "Línea 22", id: "22" },
  { name: "Línea 23", id: "23" },
  { name: "Línea 24", id: "24" }
];

export default function SearchBarDropdown({ onSelectionChange }) {
  const [selectedLines, setSelectedLines] = useState(lines.map(line => line.id));
  const [filter, setFilter] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownWidth, setDropdownWidth] = useState("100%");

  useEffect(() => {
    if (containerRef.current) {
      const width = containerRef.current.getBoundingClientRect().width;
      setDropdownWidth(width);
    }
  }, [isOpen]);

  const toggleLine = (lineId) => {
    const newSelection = selectedLines.includes(lineId)
      ? selectedLines.filter(id => id !== lineId)
      : [...selectedLines, lineId];

    setSelectedLines(newSelection);
    onSelectionChange?.(newSelection);
  };

  const handleToggleAll = () => {
    if (selectedLines.length === lines.length) {
      setSelectedLines([]);
      onSelectionChange?.([]);
    } else {
      const allIds = lines.map(line => line.id);
      setSelectedLines(allIds);
      onSelectionChange?.(allIds);
    }
  };

  const filteredLines = lines.filter(line =>
    line.name.toLowerCase().includes(filter.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allSelected = selectedLines.length === lines.length;

  const hoverStyle = {
    cursor: "pointer",
    transition: "background-color 0.2s",
  };

  return (
    <div ref={containerRef} style={{
      background: "white",
      padding: 12,
      borderRadius: 5,
      width: "100%",
      boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
      position: "relative"
    }}>
      <input
        type="text"
        value={filter}
        onChange={(e) => {
          setFilter(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Buscar línea..."
        style={{
          width: "95%",
          padding: 8,
          fontSize: 16,
          border: "1px solid #ccc",
          borderRadius: 4
        }}
      />

      {isOpen && (
        <ul
          ref={dropdownRef}
          style={{
            listStyle: "none",
            padding: 0,
            marginTop: 8,
            border: "1px solid #ccc",
            borderRadius: 4,
            maxHeight: 250,
            overflowY: "auto",
            backgroundColor: "white",
            position: "absolute",
            zIndex: 10,
            width: dropdownWidth,
            left: 0
          }}
        >
          <li style={{
            position: "sticky",
            top: 0,
            backgroundColor: "#f5f5f5",
            padding: "8px 12px",
            fontWeight: "bold",
            borderBottom: "1px solid #ddd",
            zIndex: 1
          }}>
            Copiapó
          </li>

          <li
            style={{
              padding: 8,
              display: "flex",
              alignItems: "center",
              ...hoverStyle
            }}
            onClick={handleToggleAll}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = "#eee"}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
          >
            <input
              type="checkbox"
              checked={allSelected}
              readOnly
              style={{ pointerEvents: "none" }}
            />
            <label style={{ marginLeft: 8, fontWeight: "bold" }}>
              Seleccionar todas
            </label>
          </li>

          {filteredLines.length > 0 ? (
            filteredLines.map((line) => (
              <li
                key={line.id}
                style={{ padding: 8, display: "flex", alignItems: "center", ...hoverStyle }}
                onClick={() => toggleLine(line.id)}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = "#eee"}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
              >
                <input
                  type="checkbox"
                  checked={selectedLines.includes(line.id)}
                  readOnly
                  style={{ pointerEvents: "none" }}
                />
                <label style={{ marginLeft: 8 }}>{line.name}</label>
              </li>
            ))
          ) : (
            <li style={{ padding: 8, color: "#888" }}>No se encontraron líneas</li>
          )}
        </ul>
      )}
    </div>
  );
}
