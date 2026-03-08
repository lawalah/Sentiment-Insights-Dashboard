"use client";

const COLORS = {
    Positive: "#39FF14",
    Neutral: "#00E5FF",
    Negative: "#FF10F0",
};

function HeatCell({ value, max, color }) {
    const intensity = max > 0 ? value / max : 0;
    return (
        <td
            style={{
                padding: "6px 8px",
                textAlign: "center",
                fontSize: 12,
                fontWeight: 600,
                color: intensity > 0.5 ? "#111" : "#888",
                background: `${color}${Math.round(intensity * 40 + 5).toString(16).padStart(2, "0")}`,
                borderRadius: 4,
                transition: "background 0.15s",
            }}
        >
            {value}
        </td>
    );
}

export default function V2Heatmap({ topicSentiment, selectedSentiments, onToggleTopic }) {
    const topics = Object.entries(topicSentiment)
        .filter(([name]) => name !== "Other")
        .map(([name, counts]) => ({
            name,
            Positive: counts.Positive || 0,
            Neutral: counts.Neutral || 0,
            Negative: counts.Negative || 0,
            total: (counts.Positive || 0) + (counts.Neutral || 0) + (counts.Negative || 0),
        }))
        .sort((a, b) => b.total - a.total);

    const maxVal = Math.max(...topics.flatMap((t) => [t.Positive, t.Neutral, t.Negative]));

    return (
        <div className="v2-section">
            <div className="v2-section-header">
                <h3>Topic × Sentiment</h3>
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
                <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                    <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "3px", fontSize: 12 }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: "left", padding: "4px 8px", fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>Topic</th>
                                <th style={{ textAlign: "center", padding: "4px 8px", fontSize: 10, fontWeight: 700, color: "#1a8a0a" }}>POS</th>
                                <th style={{ textAlign: "center", padding: "4px 8px", fontSize: 10, fontWeight: 700, color: "#0a7a8a" }}>NEU</th>
                                <th style={{ textAlign: "center", padding: "4px 8px", fontSize: 10, fontWeight: 700, color: "#8a0a82" }}>NEG</th>
                                <th style={{ textAlign: "center", padding: "4px 8px", fontSize: 10, fontWeight: 700, color: "#888" }}>TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topics.map((t) => (
                                <tr key={t.name}>
                                    <td
                                        style={{
                                            padding: "6px 8px",
                                            fontWeight: 500,
                                            cursor: "pointer",
                                            color: "#8b5cf6",
                                            whiteSpace: "nowrap",
                                        }}
                                        onClick={() => onToggleTopic(t.name)}
                                    >
                                        {t.name}
                                    </td>
                                    <HeatCell value={t.Positive} max={maxVal} color={COLORS.Positive} />
                                    <HeatCell value={t.Neutral} max={maxVal} color={COLORS.Neutral} />
                                    <HeatCell value={t.Negative} max={maxVal} color={COLORS.Negative} />
                                    <td style={{ padding: "6px 8px", textAlign: "center", fontSize: 12, fontWeight: 700 }}>
                                        {t.total}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
