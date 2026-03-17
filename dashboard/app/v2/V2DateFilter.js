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

function quarterToRange(quarter) {
    const m = /^(\d{4})Q([1-4])$/.exec(quarter || "");
    if (!m) return { from: "", to: "" };

    const year = Number(m[1]);
    const q = Number(m[2]);
    const startMonth = (q - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    const from = `${year}-${String(startMonth).padStart(2, "0")}-01`;
    const endDate = new Date(Date.UTC(year, endMonth, 0));
    const to = `${year}-${String(endMonth).padStart(2, "0")}-${String(endDate.getUTCDate()).padStart(2, "0")}`;
    return { from, to };
}

function getDateRange(preset) {
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
    padding: "5px 12px",
    borderRadius: 8,
    border: "1px solid #eaeaea",
    fontSize: 12,
    fontWeight: 500,
    fontFamily: "inherit",
    background: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap",
};

const countStyle = {
    background: "#111",
    color: "#fff",
    fontSize: 10,
    padding: "1px 6px",
    borderRadius: 10,
    fontWeight: 600,
};

const menuStyle = {
    position: "absolute",
    top: "calc(100% + 4px)",
    right: 0,
    width: "max-content",
    minWidth: 180,
    background: "#fff",
    border: "1px solid #eaeaea",
    borderRadius: 8,
    zIndex: 100,
    padding: "6px 0",
    maxHeight: 260,
    overflowY: "auto",
};

const itemStyle = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 14px",
    fontSize: 12,
    cursor: "pointer",
    border: "none",
    background: "transparent",
    textAlign: "left",
    width: "100%",
    fontFamily: "inherit",
    color: "#333",
};

const checkStyle = {
    width: 16,
    height: 16,
    borderRadius: 4,
    border: "1.5px solid #eaeaea",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    flexShrink: 0,
    transition: "all 0.15s",
    color: "transparent",
    background: "#fff",
};

export default function V2DateFilter({ dateRange, onDateChange, quarters = [] }) {
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

    const handleQuarter = (q) => {
        setPreset(`q:${q}`);
        onDateChange(quarterToRange(q));
        setOpen(false);
    };

    const activeLabel = preset.startsWith("q:")
        ? preset.slice(2)
        : (PRESETS.find((p) => p.value === preset)?.label || "All Time");
    const hasFilter = dateRange.from || dateRange.to;
    const isSelected = hasFilter || preset !== "all";

    const clearDateFilter = () => {
        setPreset("all");
        onDateChange({ from: "", to: "" });
        setOpen(false);
    };

    return (
        <div style={{ position: "relative" }} ref={ref}>
            <button
                style={btnStyle}
                onClick={() => setOpen(!open)}
            >
                Date Range
                {isSelected && <span style={countStyle}>1</span>}
                <span style={{ fontSize: 10, opacity: 0.5 }}>▾</span>
            </button>

            {open && (
                <div style={menuStyle}>
                    {PRESETS.map((p) => (
                        <button
                            key={p.value}
                            onClick={() => handlePreset(p.value)}
                            style={itemStyle}
                        >
                            <span
                                style={{
                                    ...checkStyle,
                                    background: preset === p.value ? "#111" : "#fff",
                                    borderColor: preset === p.value ? "#111" : "#eaeaea",
                                    color: preset === p.value ? "#fff" : "transparent",
                                }}
                            >
                                ✓
                            </span>
                            {p.label}
                        </button>
                    ))}

                    {quarters.length > 0 && (
                        <>
                            <div style={{ borderTop: "1px solid #eee", margin: "6px 0" }} />
                            <div style={{ fontSize: 10, color: "#888", fontWeight: 700, padding: "2px 14px 6px" }}>
                                QUARTER
                            </div>
                            {[...quarters].reverse().map((q) => (
                                <button
                                    key={q}
                                    onClick={() => handleQuarter(q)}
                                    style={itemStyle}
                                >
                                    <span
                                        style={{
                                            ...checkStyle,
                                            background: preset === `q:${q}` ? "#111" : "#fff",
                                            borderColor: preset === `q:${q}` ? "#111" : "#eaeaea",
                                            color: preset === `q:${q}` ? "#fff" : "transparent",
                                        }}
                                    >
                                        ✓
                                    </span>
                                    {q}
                                </button>
                            ))}
                        </>
                    )}

                    {isSelected && (
                        <button
                            onClick={clearDateFilter}
                            style={{
                                ...itemStyle,
                                borderTop: "1px solid #eaeaea",
                                marginTop: 4,
                                paddingTop: 8,
                                color: "#7c3aed",
                                fontWeight: 500,
                            }}
                        >
                            Clear date filter
                        </button>
                    )}

                    {preset === "custom" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6, borderTop: "1px solid #eee", padding: "8px 14px 2px" }}>
                            <label style={{ fontSize: 10, color: "#888", fontWeight: 600 }}>FROM</label>
                            <input
                                type="date"
                                value={dateRange.from}
                                onChange={(e) => onDateChange({ ...dateRange, from: e.target.value })}
                                style={{ padding: "5px 8px", border: "1px solid #ddd", borderRadius: 6, fontSize: 11, fontFamily: "inherit" }}
                            />
                            <label style={{ fontSize: 10, color: "#888", fontWeight: 600 }}>TO</label>
                            <input
                                type="date"
                                value={dateRange.to}
                                onChange={(e) => onDateChange({ ...dateRange, to: e.target.value })}
                                style={{ padding: "5px 8px", border: "1px solid #ddd", borderRadius: 6, fontSize: 11, fontFamily: "inherit" }}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
