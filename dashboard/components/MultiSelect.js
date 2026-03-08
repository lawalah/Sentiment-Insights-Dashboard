"use client";

import { useState, useRef, useEffect } from "react";

export default function MultiSelect({ label, options, selected, onChange, colorMap }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const toggle = (val) => {
        if (selected.includes(val)) {
            onChange(selected.filter((s) => s !== val));
        } else {
            onChange([...selected, val]);
        }
    };

    return (
        <div className="dropdown-wrap" ref={ref}>
            <button className="dropdown-trigger" onClick={() => setOpen(!open)}>
                {label}
                {selected.length > 0 && <span className="count">{selected.length}</span>}
                <span className="arrow">▾</span>
            </button>

            {open && (
                <div className="dropdown-menu">
                    {options.map((opt) => (
                        <div key={opt} className="dropdown-item" onClick={() => toggle(opt)}>
                            <div className={`dropdown-check ${selected.includes(opt) ? "checked" : ""}`}>
                                {selected.includes(opt) && "✓"}
                            </div>
                            {colorMap && colorMap[opt] && (
                                <div style={{
                                    width: 8, height: 8, borderRadius: "50%",
                                    background: colorMap[opt], flexShrink: 0
                                }} />
                            )}
                            {opt}
                        </div>
                    ))}
                    {selected.length > 0 && (
                        <div className="dropdown-clear" onClick={() => onChange([])}>
                            Clear all
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
