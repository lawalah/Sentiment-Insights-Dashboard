"use client";

export default function DataExplorer({ tweets, search, onSearchChange, onToggleSentiment, onToggleTopic }) {
    return (
        <div className="section-wrap">
            <div className="section-header">
                <h3>Data Explorer</h3>
                <span style={{ fontSize: 11, color: "#7a7a72" }}>{tweets.length} tweets</span>
                <input
                    type="text"
                    className="explorer-search"
                    placeholder="🔍  Search tweets..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    style={{ flex: 1 }}
                />
            </div>

            <div className="explorer">
                <div className="table-wrap">
                    <table className="explorer-table">
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
                                    <td className="tweet-text">{t.text}</td>
                                    <td>
                                        <span
                                            className={`badge ${t.sentiment.toLowerCase()}`}
                                            onClick={() => onToggleSentiment(t.sentiment)}
                                        >
                                            {t.sentiment}
                                        </span>
                                    </td>
                                    <td>
                                        <span
                                            className="topic-link"
                                            onClick={() => onToggleTopic(t.topic)}
                                        >
                                            {t.topic}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {tweets.length === 0 && (
                                <tr>
                                    <td colSpan={3} style={{ textAlign: "center", padding: 24, color: "#9ca3af" }}>
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
