"use client";

const COLORS = {
    Positive: "#39FF14",
    Neutral: "#00E5FF",
    Negative: "#FF10F0",
};

const CATEGORY_LABELS = {
    transaction_issue: "Transaction Issues",
    system_stability: "System Stability",
    security_access: "Security & Access",
    feature_usability: "Feature/Usability",
    general: "General",
    general_service: "General Service",
};

export default function V2CategoryBreakdown({ categoryBreakdown }) {
    const maxCount = Math.max(...categoryBreakdown.map((c) => c.count));

    return (
        <div className="v2-section">
            <div className="v2-section-header">
                <h3>Business Categories</h3>
                <span style={{ fontSize: 10, color: "#888" }}>By complaint type</span>
            </div>
            <div className="v2-panel">
                <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, justifyContent: "center" }}>
                    {categoryBreakdown.map((cat) => {
                        const total = cat.count;
                        return (
                            <div key={cat.category} className="v2-cat-row">
                                <div className="v2-cat-label" title={cat.category}>
                                    {CATEGORY_LABELS[cat.category] || cat.category}
                                </div>
                                <div className="v2-cat-bar-track">
                                    {["Positive", "Neutral", "Negative"].map((s) => {
                                        const w = total > 0 ? (cat[s] / total) * (total / maxCount) * 100 : 0;
                                        return (
                                            <div
                                                key={s}
                                                className="v2-cat-bar-seg"
                                                style={{
                                                    width: `${w}%`,
                                                    background: COLORS[s],
                                                    opacity: 0.7,
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                                <span className="v2-cat-count">{total}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
