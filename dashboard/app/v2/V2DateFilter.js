"use client";

import { useState, useRef, useEffect } from "react";

const PRESETS = [
    { label: "All Time", value: "all" },
    { label: "Last 6 Months", value: "6m" },
    { label: "Last Year", value: "1y" },
    { label: "2025", value: "2025" },
    { label: "2024", value: "2024" },
    { label: "2023", value: "2023" },
    { label: "Custom", value: "custom" },
];

function getDateRange(preset) {
    const now = new Date("2026-02-10");
    switch (preset) {
        case "6m": return { from: "2025-08-10", to: "2026-02-10" };
        case "1y": return { from: "2025-02-10", to: "2026-02-10" };
        case "2025": return { from: "2025-01-01", to: "2025-12-31" };
        case "2024": return { from: "2024-01-01", to: "2024-12-31" };
        case "2023": return { from: "2023-01-01", to: "2023-12-31" };
        default: return { from: "", to: "" };
    }
}

const btnStyle = {
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid #eaeaea",
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "inherit",
    background: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 5,
};

export default function V2DateFilter({ dateRange, onDateChange }) {
    const [open, setOpen] = useState(false);
    const [preset, setPreset] = useState("all");
    const ref = useRef(null);

    useEffect(() => {
        function handleClick(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const handlePreset = (p) => {
        setPreset(p);
        if (p === "all") {
            onDateChange({ from: "", to: "" });
            setOpen(false);
        } else if (p !== "custom") {
            onDateChange(getDateRange(p));
            setOpen(false);
        }
    };

    const activeLabel = PRESETS.find((p) => p.value === preset)?.label || "All Time";
    const hasFilter = dateRange.from || dateRange.to;

    return (
        <div style={{ position: "relative" }} ref={ref}>
            <button
                style={{
                    ...btnStyle,
                    background: hasFilter ? "rgba(57,255,20,0.08)" : "#fff",
                    borderColor: hasFilter ? "rgba(57,255,20,0.3)" : "#eaeaea",
                }}
                onClick={() => setOpen(!open)}
            >
                📅 {hasFilter ? activeLabel : "Date Range"}
                <span style={{ fontSize: 8, color: "#999" }}>▼</span>
            </button>

            {open && (
                <div style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: 4,
                    background: "#fff",
                    border: "1px solid #eaeaea",
                    borderRadius: 10,
                    padding: 10,
                    zIndex: 100,
                    width: 220,
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                }}>
                    {PRESETS.map((p) => (
                        <button
                            key={p.value}
                            onClick={() => handlePreset(p.value)}
                            style={{
                                padding: "6px 10px",
                                border: "none",
                                borderRadius: 6,
                                fontSize: 12,
                                fontFamily: "inherit",
                                fontWeight: preset === p.value ? 700 : 500,
                                background: preset === p.value ? "rgba(57,255,20,0.1)" : "transparent",
                                color: preset === p.value ? "#111" : "#666",
                                cursor: "pointer",
                                textAlign: "left",
                            }}
                        >
                            {p.label}
                        </button>
                    ))}

                    {preset === "custom" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6, borderTop: "1px solid #eee", paddingTop: 8 }}>
                            <label style={{ fontSize: 10, color: "#888", fontWeight: 600 }}>FROM</label>
                            <input
                                type="date"
                                value={dateRange.from}
                                onChange={(e) => onDateChange({ ...dateRange, from: e.target.value })}
                                style={{ padding: "4px 8px", border: "1px solid #ddd", borderRadius: 6, fontSize: 11, fontFamily: "inherit" }}
                            />
                            <label style={{ fontSize: 10, color: "#888", fontWeight: 600 }}>TO</label>
                            <input
                                type="date"
                                value={dateRange.to}
                                onChange={(e) => onDateChange({ ...dateRange, to: e.target.value })}
                                style={{ padding: "4px 8px", border: "1px solid #ddd", borderRadius: 6, fontSize: 11, fontFamily: "inherit" }}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
