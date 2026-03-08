"use client";

import { useState, useMemo } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Cell,
} from "recharts";

const selectStyle = {
    padding: "4px 8px",
    borderRadius: 6,
    border: "1px solid #eaeaea",
    fontSize: 11,
    fontFamily: "inherit",
    fontWeight: 600,
    background: "#fff",
    cursor: "pointer",
    outline: "none",
};

export default function V2QuarterCompare({ timeline }) {
    const quarters = useMemo(() => timeline.map((t) => t.period), [timeline]);

    const [prevQ, setPrevQ] = useState(quarters.length >= 2 ? quarters[quarters.length - 2] : quarters[0]);
    const [currQ, setCurrQ] = useState(quarters[quarters.length - 1]);

    const previous = timeline.find((t) => t.period === prevQ);
    const current = timeline.find((t) => t.period === currQ);

    if (!previous || !current) return null;

    const data = ["Positive", "Neutral", "Negative"].map((s) => {
        const curr = current[s] || 0;
        const prev = previous[s] || 0;
        const delta = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : curr > 0 ? 100 : 0;
        return {
            sentiment: s,
            [prevQ]: prev,
            [currQ]: curr,
            delta,
        };
    });

    return (
        <div className="v2-section">
            <div className="v2-section-header">
                <h3>Quarter Comparison</h3>
                <select value={prevQ} onChange={(e) => setPrevQ(e.target.value)} style={selectStyle}>
                    {quarters.map((q) => (
                        <option key={q} value={q}>{q}</option>
                    ))}
                </select>
                <span style={{ fontSize: 11, color: "#888" }}>vs</span>
                <select value={currQ} onChange={(e) => setCurrQ(e.target.value)} style={selectStyle}>
                    {quarters.map((q) => (
                        <option key={q} value={q}>{q}</option>
                    ))}
                </select>
                <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                    {data.map((d) => (
                        <span key={d.sentiment} className={`v2-delta-badge ${d.delta > 0 ? "up" : "down"}`}>
                            {d.sentiment}: {d.delta > 0 ? "+" : ""}{d.delta}%
                        </span>
                    ))}
                </div>
            </div>
            <div className="v2-panel">
                <div className="chart-area">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                                dataKey="sentiment"
                                tick={{ fill: "#777", fontSize: 11, fontWeight: 600 }}
                                axisLine={false}
                            />
                            <YAxis
                                tick={{ fill: "#999", fontSize: 10 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: 8,
                                    border: "1px solid #eaeaea",
                                    fontSize: 12,
                                    fontFamily: "DM Sans",
                                }}
                            />
                            <Bar
                                dataKey={prevQ}
                                fill="#ddd"
                                radius={[4, 4, 0, 0]}
                                name={prevQ}
                            />
                            <Bar
                                dataKey={currQ}
                                radius={[4, 4, 0, 0]}
                                name={currQ}
                            >
                                {data.map((entry, i) => {
                                    const color = entry.sentiment === "Positive" ? "#39FF14"
                                        : entry.sentiment === "Negative" ? "#FF10F0" : "#00E5FF";
                                    return <Cell key={i} fill={color} />;
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
