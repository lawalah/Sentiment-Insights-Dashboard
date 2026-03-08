"use client";

import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Cell,
    ReferenceLine,
} from "recharts";

const COLORS = {
    Positive: "#39FF14",
    Neutral: "#00E5FF",
    Negative: "#FF10F0",
};

function CustomTooltip({ active, payload }) {
    if (!active || !payload?.[0]) return null;
    const d = payload[0].payload;
    return (
        <div style={{
            background: "#fff",
            border: "1px solid #eaeaea",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 12,
            fontFamily: "DM Sans",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.topic}</div>
            <div>Volume: <b>{d.volume}</b></div>
            <div>Avg Impact: <b>{d.avgImpact}</b></div>
            <div>Blockers: <b>{d.blockerCount}</b> ({d.blockerPct}%)</div>
            <div>Negative: <b>{d.negPct}%</b></div>
        </div>
    );
}

export default function V2RiskMatrix({ riskMatrix, onToggleTopic }) {
    const medianVol = riskMatrix.length > 0
        ? riskMatrix.map(r => r.volume).sort((a, b) => a - b)[Math.floor(riskMatrix.length / 2)]
        : 0;
    const medianImpact = riskMatrix.length > 0
        ? riskMatrix.map(r => r.avgImpact).sort((a, b) => a - b)[Math.floor(riskMatrix.length / 2)]
        : 0;

    return (
        <div className="v2-section">
            <div className="v2-section-header">
                <h3>Risk Priority Matrix</h3>
                <span style={{ fontSize: 10, color: "#888" }}>Volume × Impact — top-right = urgent</span>
            </div>
            <div className="v2-panel">
                <div className="chart-area">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ left: -10, right: 20, top: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                                dataKey="volume"
                                name="Volume"
                                tick={{ fill: "#999", fontSize: 10 }}
                                axisLine={false}
                                label={{ value: "Volume →", position: "insideBottom", offset: -2, fontSize: 10, fill: "#aaa" }}
                            />
                            <YAxis
                                dataKey="avgImpact"
                                name="Impact"
                                tick={{ fill: "#999", fontSize: 10 }}
                                axisLine={false}
                                label={{ value: "Impact →", angle: -90, position: "insideLeft", offset: 15, fontSize: 10, fill: "#aaa" }}
                            />
                            <ReferenceLine x={medianVol} stroke="#eee" strokeDasharray="4 4" />
                            <ReferenceLine y={medianImpact} stroke="#eee" strokeDasharray="4 4" />
                            <Tooltip content={<CustomTooltip />} />
                            <Scatter data={riskMatrix} onClick={(d) => onToggleTopic(d.topic)}>
                                {riskMatrix.map((entry, i) => (
                                    <Cell
                                        key={i}
                                        fill={COLORS[entry.dominant] || "#888"}
                                        fillOpacity={0.7}
                                        r={Math.max(6, Math.min(18, entry.blockerCount * 2))}
                                        stroke={COLORS[entry.dominant]}
                                        strokeWidth={1}
                                    />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
