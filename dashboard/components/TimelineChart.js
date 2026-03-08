"use client";

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

export default function TimelineChart({ timeline }) {
    return (
        <div className="section-wrap">
            {/* Title + legend outside the dark panel */}
            <div className="section-header">
                <h3>Sentiment Over Time</h3>
                <div className="legend" style={{ marginBottom: 0 }}>
                    <div className="legend-item">
                        <div className="legend-dot" style={{ background: "#b8e550" }} />
                        Positive
                    </div>
                    <div className="legend-item">
                        <div className="legend-dot" style={{ background: "#f5a3a3" }} />
                        Negative
                    </div>
                </div>
            </div>

            {/* Dark panel with chart only */}
            <div className="panel dark">
                <div className="chart-area">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={timeline} margin={{ left: -20, right: 12, top: 8, bottom: 0 }}>
                            <defs>
                                <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#b8e550" stopOpacity={0.4} />
                                    <stop offset="100%" stopColor="#b8e550" stopOpacity={0.05} />
                                </linearGradient>
                                <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#f5a3a3" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#f5a3a3" stopOpacity={0.05} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="period"
                                tick={{ fill: "#6b7280", fontSize: 10 }}
                                axisLine={false}
                                tickLine={false}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                tick={{ fill: "#6b7280", fontSize: 10 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: 8,
                                    background: "#252540",
                                    border: "1px solid #374151",
                                    color: "#fff",
                                    fontSize: 12,
                                    fontFamily: "DM Sans",
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="Negative"
                                stroke="#f5a3a3"
                                strokeWidth={2}
                                fill="url(#redGrad)"
                                dot={false}
                                activeDot={{ r: 4, fill: "#f5a3a3", stroke: "#252540", strokeWidth: 2 }}
                            />
                            <Area
                                type="monotone"
                                dataKey="Positive"
                                stroke="#b8e550"
                                strokeWidth={2.5}
                                fill="url(#greenGrad)"
                                dot={false}
                                activeDot={{ r: 5, fill: "#b8e550", stroke: "#252540", strokeWidth: 2 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
