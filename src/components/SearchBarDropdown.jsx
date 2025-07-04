import React, { useState, useEffect, useRef } from "react";

export default function SearchBarDropdown({
  lines = [],            // [{ id: "Línea 1", desc: "Paipote …" }]
  onSelectionChange,
  lineColors = {}
}) {
  const [selected, setSelected]   = useState([]);
  const [filter, setFilter]       = useState("");
  const [isOpen, setIsOpen]       = useState(false);
  const containerRef              = useRef(null);
  const dropdownRef               = useRef(null);
  const [dropdownWidth, setDropdownWidth] = useState("100%");
  const initializedRef            = useRef(false);

  /* -------- inicializa todas seleccionadas una sola vez -------- */
  useEffect(() => {
    if (!initializedRef.current && lines.length > 0) {
      setSelected(lines.map(l => l.id));
      initializedRef.current = true;
    }
  }, [lines]);

  /* -------- comunica selección al padre -------- */
  useEffect(() => { onSelectionChange?.(selected); }, [selected]);

  /* -------- ancho dinámico del popup -------- */
  useEffect(() => {
    if (containerRef.current) {
      setDropdownWidth(containerRef.current.getBoundingClientRect().width);
    }
  }, [isOpen]);

  /* -------- cierra al hacer clic fuera -------- */
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

  /* ---------------- helpers ---------------- */
  const toggleLine = (id) =>
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );

  const handleToggleAll = () =>
    setSelected(selected.length === lines.length ? [] : lines.map(l => l.id));

  /* ---------- FILTRO con normalización ---------- */
  const normalize = (str) =>
    str
      .toLowerCase()
      .replace(/línea\s*/g, "")   // quita la palabra “línea”
      .replace(/\s+/g, " ");      // colapsa espacios

  const filterLC = filter.toLowerCase();
  const filtered = lines.filter(
    (l) =>
      normalize(l.id).includes(filterLC) ||
      normalize(l.desc).includes(filterLC)
  );

  /* ---------------- render ---------------- */
  return (
    <div
      ref={containerRef}
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.85)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        padding: 12,
        borderRadius: 8,
        width: "100%",
        boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
        position: "relative"
      }}
    >
      <input
        type="text"
        value={filter}
        onChange={(e) => { setFilter(e.target.value); setIsOpen(true); }}
        onFocus={() => setIsOpen(true)}
        placeholder="Buscar línea o sector..."
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
            backgroundColor: "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            position: "absolute",
            zIndex: 10,
            width: dropdownWidth,
            left: 0
          }}
        >
          {/* Encabezado */}
          <li
            style={{
              position: "sticky",
              top: 0,
              backgroundColor: "#f5f5f5",
              padding: "8px 12px",
              fontWeight: "bold",
              borderBottom: "1px solid #ddd",
              zIndex: 1
            }}
          >
            Copiapó
          </li>

          {/* Checkbox “Seleccionar todas” */}
          <li style={{ padding: 8, display: "flex", alignItems: "center" }}>
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

          {/* Lista de líneas filtradas */}
          {filtered.length > 0 ? (
            filtered.map((line) => (
              <li
                key={line.id}
                style={{
                  padding: 8,
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: lineColors[line.id] || "#fff",
                  borderBottom: "1px solid #ddd"
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(line.id)}
                  onChange={() => toggleLine(line.id)}
                />
                <label
                  style={{
                    marginLeft: 8,
                    cursor: "pointer",
                    fontWeight: "bold",
                    color: "#000"
                  }}
                  onClick={() => toggleLine(line.id)}
                >
                  {line.id} — {line.desc}
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
