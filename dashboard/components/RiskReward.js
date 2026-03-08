"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

export default function RiskReward({ topicSentiment, selectedSentiments, selectedTopics, onToggleTopic }) {
    const data = Object.entries(topicSentiment)
        .filter(([name]) => name !== "Other")
        .map(([name, counts]) => ({
            name,
            Positive: counts.Positive || 0,
            Neutral: counts.Neutral || 0,
            Negative: counts.Negative || 0,
            total: (counts.Positive || 0) + (counts.Neutral || 0) + (counts.Negative || 0),
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 9);

    const hasSentimentFilter = selectedSentiments.length > 0;

    return (
        <div className="section-wrap">
            <div className="section-header">
                <h3>Risk vs. Reward</h3>
                <div className="legend" style={{ marginBottom: 0 }}>
                    <div className="legend-item">
                        <div className="legend-dot" style={{ background: "#b8e550" }} />
                        Positive
                    </div>
                    <div className="legend-item">
                        <div className="legend-dot" style={{ background: "#c3b8f0" }} />
                        Neutral
                    </div>
                    <div className="legend-item">
                        <div className="legend-dot" style={{ background: "#f5a3a3" }} />
                        Negative
                    </div>
                </div>
            </div>

            <div className="panel">
                <div className="chart-area">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            layout="vertical"
                            margin={{ left: 0, right: 16, top: 4, bottom: 4 }}
                            onClick={(e) => e && e.activeLabel && onToggleTopic(e.activeLabel)}
                        >
                            <XAxis type="number" tick={{ fontSize: 10, fill: "#7a7a72" }} axisLine={false} tickLine={false} />
                            <YAxis
                                type="category"
                                dataKey="name"
                                tick={{ fontSize: 11, fill: "#1a1a1a" }}
                                width={110}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: 8,
                                    border: "1px solid #e8e8e0",
                                    fontSize: 12,
                                    fontFamily: "DM Sans",
                                }}
                            />
                            <Bar
                                dataKey="Positive"
                                stackId="a"
                                fill="#b8e550"
                                opacity={hasSentimentFilter && !selectedSentiments.includes("Positive") ? 0.15 : 1}
                            />
                            <Bar
                                dataKey="Neutral"
                                stackId="a"
                                fill="#c3b8f0"
                                opacity={hasSentimentFilter && !selectedSentiments.includes("Neutral") ? 0.15 : 1}
                            />
                            <Bar
                                dataKey="Negative"
                                stackId="a"
                                fill="#f5a3a3"
                                radius={[0, 5, 5, 0]}
                                opacity={hasSentimentFilter && !selectedSentiments.includes("Negative") ? 0.15 : 1}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
