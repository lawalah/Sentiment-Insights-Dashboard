"use client";

const BADGE_MAP = {
    Positive: "v2-badge-pos",
    Neutral: "v2-badge-neu",
    Negative: "v2-badge-neg",
};

export default function V2Explorer({ tweets, search, onSearchChange, onToggleSentiment, onToggleTopic }) {
    return (
        <div className="v2-section">
            <div className="v2-section-header">
                <h3>Data Explorer</h3>
                <span style={{ fontSize: 11, color: "#888" }}>{tweets.length} tweets</span>
                <input
                    type="text"
                    className="v2-search"
                    placeholder="🔍  Search tweets..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>

            <div className="v2-panel">
                <div className="v2-table-wrap">
                    <table className="v2-table">
                        <thead>
                            <tr>
                                <th>Tweet</th>
                                <th>Sentiment</th>
                                <th>Topic</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tweets.map((t, i) => (
                                <tr key={i}>
                                    <td className="tweet-text">
                                        {t.isBlocker && (
                                            <span style={{
                                                display: "inline-block",
                                                padding: "1px 6px",
                                                borderRadius: 10,
                                                fontSize: 9,
                                                fontWeight: 700,
                                                textTransform: "uppercase",
                                                letterSpacing: "0.3px",
                                                background: "rgba(255,68,68,0.1)",
                                                color: "#FF4444",
                                                border: "1px solid rgba(255,68,68,0.25)",
                                                marginRight: 6,
                                            }}>
                                                Blocker
                                            </span>
                                        )}
                                        {t.text}
                                    </td>
                                    <td>
                                        <span
                                            className={BADGE_MAP[t.sentiment]}
                                            onClick={() => onToggleSentiment(t.sentiment)}
                                        >
                                            {t.sentiment}
                                        </span>
                                    </td>
                                    <td>
                                        <span
                                            className="v2-topic-link"
                                            onClick={() => onToggleTopic(t.topic)}
                                        >
                                            {t.topic}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {tweets.length === 0 && (
                                <tr>
                                    <td colSpan={3} style={{ textAlign: "center", padding: 24, color: "#999" }}>
                                        No tweets found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
