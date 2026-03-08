"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";

const TOPIC_COLORS = [
    "#b8e550", "#c3b8f0", "#f5a3a3", "#93c5fd",
    "#fcd34d", "#f9a8d4", "#6ee7b7", "#fdba74",
    "#a5b4fc", "#d4d4d8",
];

export default function TopicBar({ topicCounts }) {
    const data = Object.entries(topicCounts)
        .filter(([name]) => name !== "Other")
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count]) => ({ name, count }));

    return (
        <div className="panel dark">
            <h3>Top Discovered Topics</h3>
            <p className="desc">Most frequent themes (BERTopic)</p>
            <div className="chart-area">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                        <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fill: "#e5e7eb", fontSize: 11 }}
                            width={110}
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
                        <Bar dataKey="count" radius={[0, 5, 5, 0]} barSize={16}>
                            {data.map((_, i) => (
                                <Cell key={i} fill={TOPIC_COLORS[i % TOPIC_COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
