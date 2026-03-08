"use client";

import { AreaChart, Area, ResponsiveContainer } from "recharts";

function Sparkline({ data, dataKey, color }) {
    return (
        <div className="v2-kpi-spark">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                        </linearGradient>
                    </defs>
                    <Area
                        type="monotone"
                        dataKey={dataKey}
                        stroke={color}
                        strokeWidth={1.5}
                        fill={`url(#spark-${color})`}
                        dot={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

export default function V2KPICards({ total, positive, negative, neutral, brandHealth, filtered, hasFilters, timeline, blockerCount, blockerPct }) {
    return (
        <div className="v2-kpi-grid" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
            <div className="v2-kpi">
                <div className="v2-kpi-top">
                    <span className="v2-kpi-label">Total Mentions</span>
                    <div className="v2-kpi-icon">@</div>
                </div>
                <div className="v2-kpi-value">{hasFilters ? filtered : total}</div>
                <Sparkline data={timeline} dataKey="total" color="#39FF14" />
                <div className="v2-kpi-sub">{hasFilters ? `of ${total} total` : "Jan 2023 — Feb 2026"}</div>
            </div>

            <div className="v2-kpi green">
                <div className="v2-kpi-top">
                    <span className="v2-kpi-label">Positive</span>
                    <div className="v2-kpi-icon">+</div>
                </div>
                <div className="v2-kpi-value">{positive}</div>
                <Sparkline data={timeline} dataKey="Positive" color="#39FF14" />
                <div className="v2-kpi-sub">{((positive / total) * 100).toFixed(1)}% of total</div>
            </div>

            <div className="v2-kpi cyan">
                <div className="v2-kpi-top">
                    <span className="v2-kpi-label">Neutral</span>
                    <div className="v2-kpi-icon">◦</div>
                </div>
                <div className="v2-kpi-value">{neutral}</div>
                <Sparkline data={timeline} dataKey="Neutral" color="#00E5FF" />
                <div className="v2-kpi-sub">{((neutral / total) * 100).toFixed(1)}% of total</div>
            </div>

            <div className="v2-kpi pink">
                <div className="v2-kpi-top">
                    <span className="v2-kpi-label">Negative</span>
                    <div className="v2-kpi-icon">−</div>
                </div>
                <div className="v2-kpi-value">{negative}</div>
                <Sparkline data={timeline} dataKey="Negative" color="#FF10F0" />
                <div className="v2-kpi-sub">{((negative / total) * 100).toFixed(1)}% of total</div>
            </div>

            <div className="v2-kpi yellow">
                <div className="v2-kpi-top">
                    <span className="v2-kpi-label">Brand Health</span>
                    <div className="v2-kpi-icon">⚡︎</div>
                </div>
                <div className="v2-kpi-value">{brandHealth}%</div>
                <div className="v2-kpi-sub" style={{ marginTop: 8 }}>Positive ÷ (Positive + Negative)</div>
            </div>

            <div className="v2-kpi" style={{ borderTop: "3px solid #FF4444" }}>
                <div className="v2-kpi-top">
                    <span className="v2-kpi-label">Blockers</span>
                    <div className="v2-kpi-icon">⊘</div>
                </div>
                <div className="v2-kpi-value" style={{ color: "#FF4444" }}>{blockerCount}</div>
                <div className="v2-kpi-sub" style={{ marginTop: 8 }}>
                    <span style={{ fontWeight: 700, color: "#FF4444" }}>{blockerPct}%</span> of tweets block transactions
                </div>
            </div>
        </div>
    );
}
