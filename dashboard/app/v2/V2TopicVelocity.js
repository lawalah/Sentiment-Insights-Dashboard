"use client";

import { AreaChart, Area, ResponsiveContainer } from "recharts";

const ARROW_MAP = {
    worsening: "↑",
    improving: "↓",
    stable: "→",
};

export default function V2TopicVelocity({ topicVelocity }) {
    return (
        <div className="v2-section">
            <div className="v2-section-header">
                <h3>Topic Velocity</h3>
                <span style={{ fontSize: 10, color: "#888" }}>Negative trend vs previous quarter</span>
            </div>
            <div className="v2-panel" style={{ padding: 10 }}>
                <div className="v2-velocity-grid">
                    {topicVelocity.map((t) => (
                        <div key={t.topic} className="v2-velocity-card">
                            <div className="topic-name">{t.topic}</div>
                            <div className="velocity-row">
                                <span className={`v2-velocity-arrow ${t.direction}`}>
                                    {ARROW_MAP[t.direction]}
                                </span>
                                <span className={`v2-velocity-pct ${t.direction}`}>
                                    {t.changePct > 0 ? "+" : ""}{t.changePct}%
                                </span>
                                <div className="v2-velocity-spark">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={t.sparkline} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                                            <Area
                                                type="monotone"
                                                dataKey="negative"
                                                stroke={t.direction === "worsening" ? "#FF10F0" : t.direction === "improving" ? "#39FF14" : "#ccc"}
                                                strokeWidth={1.5}
                                                fill={t.direction === "worsening" ? "rgba(255,16,240,0.1)" : "rgba(57,255,20,0.1)"}
                                                dot={false}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div style={{ fontSize: 9, color: "#888" }}>
                                {t.previousNeg} → {t.currentNeg} negatives
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
