"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = {
    Positive: "#b8e550",
    Neutral: "#c3b8f0",
    Negative: "#f5a3a3",
};

export default function SentimentDonut({ counts, selectedSentiments, onToggle }) {
    const data = Object.entries(counts).map(([name, value]) => ({ name, value }));
    const total = data.reduce((acc, d) => acc + d.value, 0);
    const hasSelection = selectedSentiments.length > 0;

    return (
        <div className="section-wrap">
            <div className="section-header">
                <h3>Sentiment Distribution</h3>
                <div className="legend" style={{ marginBottom: 0 }}>
                    {data.map((d) => (
                        <div
                            key={d.name}
                            className={`legend-item ${selectedSentiments.includes(d.name) ? "active" : ""}`}
                            onClick={() => onToggle(d.name)}
                        >
                            <div className="legend-dot" style={{ background: COLORS[d.name] }} />
                            {d.name} ({d.value})
                        </div>
                    ))}
                </div>
            </div>

            <div className="panel">
                <div className="chart-area">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius="55%"
                                outerRadius="85%"
                                paddingAngle={3}
                                dataKey="value"
                                stroke="none"
                                onClick={(_, idx) => onToggle(data[idx].name)}
                            >
                                {data.map((entry) => (
                                    <Cell
                                        key={entry.name}
                                        fill={COLORS[entry.name]}
                                        opacity={hasSelection && !selectedSentiments.includes(entry.name) ? 0.25 : 1}
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
                                    border: "1px solid #e8e8e0",
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
