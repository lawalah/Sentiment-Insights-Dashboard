"use client";

import { useState, useMemo } from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

const ARROW_MAP = {
    worsening: "↑",
    improving: "↓",
    stable: "→",
};

const selectStyle = {
    padding: "3px 6px",
    borderRadius: 6,
    border: "1px solid #eaeaea",
    fontSize: 10,
    fontFamily: "inherit",
    fontWeight: 600,
    background: "#fff",
    cursor: "pointer",
    outline: "none",
};

export default function V2TopicVelocity({ topicVelocity, topicQuarter, timeline }) {
    const quarters = useMemo(() => timeline?.map((t) => t.period) || [], [timeline]);
    
    const [prevQ, setPrevQ] = useState(() => quarters.length >= 2 ? quarters[quarters.length - 2] : (quarters[0] || ""));
    const [currQ, setCurrQ] = useState(() => quarters[quarters.length - 1] || "");

    const displayData = useMemo(() => {
        if (!topicQuarter || !quarters.length) return topicVelocity;
        
        const out = topicVelocity.map((t) => {
            const currNeg = topicQuarter[t.topic]?.[currQ]?.Negative || 0;
            const prevNeg = topicQuarter[t.topic]?.[prevQ]?.Negative || 0;
            
            const changePct = prevNeg > 0 ? Math.round(((currNeg - prevNeg) / prevNeg) * 100) : (currNeg > 0 ? 100 : 0);
            const direction = changePct > 20 ? "worsening" : changePct < -20 ? "improving" : "stable";

            const q1 = prevQ <= currQ ? prevQ : currQ;
            const q2 = prevQ <= currQ ? currQ : prevQ;
            const filteredQuarters = quarters.filter(q => q >= q1 && q <= q2);
            
            const sparkline = filteredQuarters.map(q => ({
                period: q,
                negative: topicQuarter[t.topic]?.[q]?.Negative || 0,
                total: topicQuarter[t.topic]?.[q]?.total || 0,
            }));

            return {
                ...t,
                changePct,
                direction,
                currentNeg: currNeg,
                previousNeg: prevNeg,
                sparkline: sparkline.length > 0 ? sparkline : t.sparkline,
            };
        });
        
        return out.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
    }, [topicVelocity, topicQuarter, prevQ, currQ, quarters]);
    return (
        <div className="v2-section">
            <div className="v2-section-header">
                <div>
                    <h3>Topic Velocity</h3>
                    <span style={{ fontSize: 10, color: "#888" }}>Negative trend vs previous</span>
                </div>
                <div style={{ display: "flex", gap: 4, alignItems: "center", marginLeft: "auto" }}>
                    <select value={prevQ} onChange={(e) => setPrevQ(e.target.value)} style={selectStyle}>
                        {quarters.map((q) => <option key={q} value={q}>{q}</option>)}
                    </select>
                    <span style={{ fontSize: 10, color: "#888" }}>vs</span>
                    <select value={currQ} onChange={(e) => setCurrQ(e.target.value)} style={selectStyle}>
                        {quarters.map((q) => <option key={q} value={q}>{q}</option>)}
                    </select>
                </div>
            </div>
            <div className="v2-panel" style={{ padding: 10 }}>
                <div className="v2-velocity-grid">
                    {displayData.map((t) => (
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
