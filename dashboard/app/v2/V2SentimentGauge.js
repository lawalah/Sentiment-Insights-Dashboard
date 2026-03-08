"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = {
    Positive: "#39FF14",
    Neutral: "#00E5FF",
    Negative: "#FF10F0",
};

export default function V2SentimentGauge({ counts, selectedSentiments, onToggle }) {
    const data = Object.entries(counts).map(([name, value]) => ({ name, value }));
    const total = data.reduce((a, d) => a + d.value, 0);
    const hasSelection = selectedSentiments.length > 0;

    return (
        <div className="v2-section">
            <div className="v2-section-header">
                <h3>Sentiment Split</h3>
                <div className="v2-legend">
                    {data.map((d) => (
                        <div key={d.name} className="v2-legend-item" onClick={() => onToggle(d.name)}>
                            <div className={`v2-legend-dot glow-${d.name === "Positive" ? "green" : d.name === "Negative" ? "pink" : "cyan"}`} />
                            {d.name}
                        </div>
                    ))}
                </div>
            </div>
            <div className="v2-panel" style={{ position: "relative" }}>
                <div style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    textAlign: "center",
                    pointerEvents: "none",
                    zIndex: 0
                }}>
                    <span style={{ fontSize: 28, fontWeight: 800 }}>{total}</span>
                    <span style={{ fontSize: 12, color: "#888", display: "block", marginTop: -4 }}>tweets</span>
                </div>
                <div className="chart-area" style={{ height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius="60%"
                                outerRadius="88%"
                                paddingAngle={4}
                                dataKey="value"
                                stroke="none"
                                onClick={(_, idx) => onToggle(data[idx].name)}
                            >
                                {data.map((entry) => (
                                    <Cell
                                        key={entry.name}
                                        fill={COLORS[entry.name]}
                                        opacity={hasSelection && !selectedSentiments.includes(entry.name) ? 0.2 : 1}
                                        style={{
                                            filter: !hasSelection || selectedSentiments.includes(entry.name)
                                                ? `drop-shadow(0 0 6px ${COLORS[entry.name]}60)`
                                                : "none",
                                        }}
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value, name) => [
                                    `${value} (${((value / total) * 100).toFixed(1)}%)`,
                                    name,
                                ]}
                                contentStyle={{
                                    borderRadius: 8,
                                    border: "1px solid #eaeaea",
                                    fontSize: 12,
                                    fontFamily: "DM Sans",
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
