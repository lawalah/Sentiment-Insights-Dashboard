"use client";

export default function KPICards({ total, positive, negative, neutral, brandHealth, filtered, hasFilters }) {
    return (
        <div className="kpi-grid">
            <div className="kpi-card green">
                <div className="kpi-top">
                    <span className="kpi-label">Total Mentions</span>
                    <div className="kpi-icon">@</div>
                </div>
                <div className="kpi-value">{hasFilters ? filtered : total}</div>
                <div className="kpi-sub">{hasFilters ? `of ${total} total` : "Jan 2023 — Feb 2026"}</div>
            </div>

            <div className="kpi-card purple">
                <div className="kpi-top">
                    <span className="kpi-label">Positive</span>
                    <div className="kpi-icon">+</div>
                </div>
                <div className="kpi-value">{positive}</div>
                <div className="kpi-sub">{((positive / total) * 100).toFixed(1)}% of total</div>
            </div>

            <div className="kpi-card red">
                <div className="kpi-top">
                    <span className="kpi-label">Negative</span>
                    <div className="kpi-icon">−</div>
                </div>
                <div className="kpi-value">{negative}</div>
                <div className="kpi-sub">{((negative / total) * 100).toFixed(1)}% of total</div>
            </div>

            <div className="kpi-card dark">
                <div className="kpi-top">
                    <span className="kpi-label">Brand Health</span>
                    <div className="kpi-icon">⚡︎</div>
                </div>
                <div className="kpi-value">{brandHealth}%</div>
                <div className="kpi-sub">Positive ÷ (Positive + Negative)</div>
            </div>
        </div>
    );
}
