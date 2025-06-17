import React, { useState, useEffect, useRef } from "react";

export default function SearchBarDropdown({ lines = [], onSelectionChange }) {
  const [selected, setSelected] = useState([]);
  const [filter, setFilter] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownWidth, setDropdownWidth] = useState("100%");
  const initializedRef = useRef(false);

  // Solo inicializa una vez
  useEffect(() => {
    if (!initializedRef.current && lines.length > 0) {
      const allIds = lines.map(l => l.id);
      setSelected(allIds);
      initializedRef.current = true;
    }
  }, [lines]);

  // Comunicar cambios al padre
  useEffect(() => {
    onSelectionChange?.(selected);
  }, [selected]);

  // Ancho dinámico del dropdown
  useEffect(() => {
    if (containerRef.current) {
      const width = containerRef.current.getBoundingClientRect().width;
      setDropdownWidth(width);
    }
  }, [isOpen]);

  // Cerrar si se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        containerRef.current &&
        !containerRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Alternar una línea
  const toggleLine = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Alternar todas
  const handleToggleAll = () => {
    const allIds = lines.map(l => l.id);
    setSelected(selected.length === allIds.length ? [] : allIds);
  };

  const filtered = lines.filter(l =>
    l.id.toLowerCase().includes(filter.toLowerCase())
  );

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

          <li style={{
            padding: 8,
            display: "flex",
            alignItems: "center"
          }}>
            <input
              type="checkbox"
              checked={selected.length === lines.length}
              onChange={handleToggleAll}
            />
            <label
              style={{ marginLeft: 8, fontWeight: "bold", cursor: "pointer" }}
              onClick={handleToggleAll}
            >
              Seleccionar todas
            </label>
          </li>

          {filtered.length > 0 ? (
            filtered.map((line) => (
              <li
                key={line.id}
                style={{
                  padding: 8,
                  display: "flex",
                  alignItems: "center"
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(line.id)}
                  onChange={() => toggleLine(line.id)}
                />
                <label
                  style={{ marginLeft: 8, cursor: "pointer" }}
                  onClick={() => toggleLine(line.id)}
                >
                  {line.id}
                </label>
              </li>
            ))
          ) : (
            <li style={{ padding: 8, color: "#888" }}>
              No se encontraron líneas
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
