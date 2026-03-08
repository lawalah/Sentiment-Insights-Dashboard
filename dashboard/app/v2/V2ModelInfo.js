"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";

export default function V2ModelInfo({ modelPerformance }) {
    const [expanded, setExpanded] = useState(false);

    if (!modelPerformance) return null;

    const { modelName, averageConfidence, medianConfidence, lowConfidenceCount, lowConfidencePct, agreementRate, confidenceDistribution } = modelPerformance;

    return (
        <div style={{
            background: "rgba(0,229,255,0.04)",
            border: "1px solid rgba(0,229,255,0.15)",
            borderRadius: 10,
            overflow: "hidden",
            marginTop: 4,
        }}>
            <button
                onClick={() => setExpanded(!expanded)}
                style={{
                    width: "100%",
                    padding: "8px 14px",
                    border: "none",
                    background: "transparent",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    fontFamily: "inherit",
                }}
            >
                <span style={{ fontSize: 12 }}>🤖</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#333" }}>Model Performance</span>
                <span style={{ fontSize: 10, color: "#888", marginLeft: 4 }}>
                    {averageConfidence * 100}% avg confidence
                </span>
                <span style={{ marginLeft: "auto", fontSize: 10, color: "#999" }}>{expanded ? "▲" : "▼"}</span>
            </button>

            {expanded && (
                <div style={{ padding: "0 14px 14px", borderTop: "1px solid rgba(0,229,255,0.1)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 22, fontWeight: 800, color: "#111" }}>{(averageConfidence * 100).toFixed(1)}%</div>
                            <div style={{ fontSize: 9, color: "#888", fontWeight: 600, textTransform: "uppercase" }}>Avg Confidence</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 22, fontWeight: 800, color: "#111" }}>{agreementRate}%</div>
                            <div style={{ fontSize: 9, color: "#888", fontWeight: 600, textTransform: "uppercase" }}>Label Agreement</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 22, fontWeight: 800, color: lowConfidencePct > 15 ? "#FF4444" : "#111" }}>{lowConfidenceCount}</div>
                            <div style={{ fontSize: 9, color: "#888", fontWeight: 600, textTransform: "uppercase" }}>Low Confidence ({lowConfidencePct}%)</div>
                        </div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "#888", marginBottom: 4 }}>CONFIDENCE DISTRIBUTION</div>
                        <div style={{ height: 80 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={confidenceDistribution} margin={{ left: -20, right: 5, top: 5, bottom: 0 }}>
                                    <XAxis dataKey="range" tick={{ fontSize: 9, fill: "#999" }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 9, fill: "#999" }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: 8, border: "1px solid #eee", fontSize: 11, fontFamily: "DM Sans" }}
                                        formatter={(v) => [`${v} tweets`, "Count"]}
                                    />
                                    <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                                        {confidenceDistribution.map((entry, i) => {
                                            const ratio = i / (confidenceDistribution.length - 1);
                                            const color = ratio < 0.3 ? "#FF10F0" : ratio < 0.6 ? "#00E5FF" : "#39FF14";
                                            return <Cell key={i} fill={color} fillOpacity={0.7} />;
                                        })}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div style={{ fontSize: 10, color: "#999", marginTop: 8, borderTop: "1px solid #f0f0f0", paddingTop: 6 }}>
                        Model: <span style={{ fontWeight: 600, color: "#666" }}>{modelName}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
