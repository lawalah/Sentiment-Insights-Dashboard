"use client";

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";

export default function V2Timeline({ timeline }) {
    return (
        <div className="v2-section">
            <div className="v2-section-header">
                <h3>Sentiment Trend</h3>
                <div className="v2-legend">
                    <div className="v2-legend-item">
                        <div className="v2-legend-dot glow-green" />
                        Positive
                    </div>
                    <div className="v2-legend-item">
                        <div className="v2-legend-dot glow-cyan" />
                        Neutral
                    </div>
                    <div className="v2-legend-item">
                        <div className="v2-legend-dot glow-pink" />
                        Negative
                    </div>
                </div>
            </div>

            <div className="v2-panel">
                <div className="chart-area">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={timeline} margin={{ left: -20, right: 12, top: 8, bottom: 0 }}>
                            <defs>
                                <linearGradient id="v2-green" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#39FF14" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#39FF14" stopOpacity={0.02} />
                                </linearGradient>
                                <linearGradient id="v2-pink" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#FF10F0" stopOpacity={0.2} />
                                    <stop offset="100%" stopColor="#FF10F0" stopOpacity={0.02} />
                                </linearGradient>
                                <linearGradient id="v2-cyan" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#00E5FF" stopOpacity={0.2} />
                                    <stop offset="100%" stopColor="#00E5FF" stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                                dataKey="period"
                                tick={{ fill: "#999", fontSize: 10 }}
                                axisLine={false}
                                tickLine={false}
                                interval="preserveStartEnd"
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
                            <Area
                                type="monotone"
                                dataKey="Positive"
                                stroke="#39FF14"
                                strokeWidth={2.5}
                                fill="url(#v2-green)"
                                dot={false}
                                activeDot={{ r: 5, fill: "#39FF14", stroke: "#fff", strokeWidth: 2 }}
                            />
                            <Area
                                type="monotone"
                                dataKey="Neutral"
                                stroke="#00E5FF"
                                strokeWidth={2}
                                fill="url(#v2-cyan)"
                                dot={false}
                                activeDot={{ r: 4, fill: "#00E5FF", stroke: "#fff", strokeWidth: 2 }}
                            />
                            <Area
                                type="monotone"
                                dataKey="Negative"
                                stroke="#FF10F0"
                                strokeWidth={2}
                                fill="url(#v2-pink)"
                                dot={false}
                                activeDot={{ r: 4, fill: "#FF10F0", stroke: "#fff", strokeWidth: 2 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
