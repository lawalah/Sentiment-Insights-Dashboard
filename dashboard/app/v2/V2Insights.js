"use client";

import { useMemo } from "react";

const CATEGORY_LABELS = {
    transaction_issue: "Transaction Issues",
    system_stability: "System Stability",
    security_access: "Security & Access",
    feature_usability: "Feature/Usability",
    general: "General",
    general_service: "General Service",
};

function InsightCard({ severity, icon, title, description }) {
    const colors = {
        critical: { bg: "rgba(255,68,68,0.06)", border: "rgba(255,68,68,0.2)", accent: "#FF4444" },
        warning: { bg: "rgba(255,170,0,0.06)", border: "rgba(255,170,0,0.2)", accent: "#FFAA00" },
        positive: { bg: "rgba(57,255,20,0.06)", border: "rgba(57,255,20,0.2)", accent: "#39FF14" },
        info: { bg: "rgba(0,229,255,0.06)", border: "rgba(0,229,255,0.2)", accent: "#00E5FF" },
    };
    const c = colors[severity] || colors.info;

    return (
        <div style={{
            background: c.bg,
            border: `1px solid ${c.border}`,
            borderLeft: `4px solid ${c.accent}`,
            borderRadius: 10,
            padding: "14px 18px",
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
        }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
            <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 12, color: "#555", lineHeight: 1.5 }}>{description}</div>
            </div>
        </div>
    );
}

export default function V2Insights({ data }) {
    const insights = useMemo(() => {
        if (!data) return [];
        const items = [];
        const { tweets, riskMatrix, topicVelocity, categoryBreakdown, sentimentCounts, modelPerformance } = data;
        const total = tweets.length;
        const blockers = tweets.filter((t) => t.isBlocker).length;
        const blockerPct = Math.round((blockers / total) * 100);
        const neg = sentimentCounts.Negative || 0;
        const pos = sentimentCounts.Positive || 0;
        const brandHealth = Math.round((pos / (pos + neg)) * 100);

        // ── Critical: High blocker rate
        if (blockerPct > 15) {
            const topBlockerCat = categoryBreakdown
                .map((c) => ({ cat: c.category, blockers: tweets.filter((t) => t.category === c.category && t.isBlocker).length }))
                .sort((a, b) => b.blockers - a.blockers)[0];
            items.push({
                severity: "critical",
                icon: "🔴",
                title: `${blockerPct}% of tweets are transaction blockers`,
                description: `${blockers} out of ${total} tweets describe issues that prevent users from completing transactions. "${CATEGORY_LABELS[topBlockerCat?.cat] || topBlockerCat?.cat}" has the most blockers (${topBlockerCat?.blockers}). Recommend prioritizing payment flow stability and error handling.`,
            });
        }

        // ── Critical: Low brand health
        if (brandHealth < 30) {
            items.push({
                severity: "critical",
                icon: "⚠️",
                title: `Brand Health is critically low at ${brandHealth}%`,
                description: `Only ${pos} out of ${pos + neg} opinionated tweets are positive. Industry benchmark for fintech apps is 40-60%. Negative sentiment significantly outweighs positive, indicating widespread user dissatisfaction.`,
            });
        }

        // ── Warning: Worsening topics
        const worsening = topicVelocity.filter((t) => t.direction === "worsening");
        if (worsening.length > 0) {
            const topW = worsening[0];
            items.push({
                severity: "warning",
                icon: "📈",
                title: `${worsening.length} topic(s) worsening`,
                description: `"${topW.topic}" saw a ${Math.abs(topW.changePct)}% increase in negative sentiment vs previous quarter (${topW.previousNeg} → ${topW.currentNeg} negative tweets). Monitor closely for escalation.`,
            });
        }

        // ── Warning: High-volume negative topics
        const highNeg = riskMatrix.filter((r) => r.negPct > 60 && r.volume > 10).sort((a, b) => b.volume - a.volume);
        if (highNeg.length > 0) {
            items.push({
                severity: "warning",
                icon: "🎯",
                title: `${highNeg.length} topic(s) have majority negative sentiment`,
                description: `${highNeg.map((r) => `"${r.topic}" (${r.negPct}% negative, ${r.volume} tweets)`).join(", ")}. These represent the highest-risk areas for customer churn.`,
            });
        }

        // ── Positive: Improving topics
        const improving = topicVelocity.filter((t) => t.direction === "improving");
        if (improving.length > 0) {
            items.push({
                severity: "positive",
                icon: "✅",
                title: `${improving.length} topic(s) showing improvement`,
                description: `${improving.slice(0, 3).map((t) => `"${t.topic}" (${t.changePct}%)`).join(", ")} saw reduced negative sentiment vs previous quarter. Continue current measures.`,
            });
        }

        // ── Info: Model confidence
        if (modelPerformance) {
            const lowConf = modelPerformance.lowConfidencePct;
            if (lowConf > 15) {
                items.push({
                    severity: "warning",
                    icon: "🤖",
                    title: `${lowConf}% of predictions have low confidence`,
                    description: `${modelPerformance.lowConfidenceCount} tweets scored below 60% confidence. These may be misclassified. Consider manual review of low-confidence negative tweets to ensure blocker detection accuracy.`,
                });
            }
        }

        // ── Info: Category with highest blocker density
        const catBlockerRates = categoryBreakdown.map((c) => {
            const catBlockers = tweets.filter((t) => t.category === c.category && t.isBlocker).length;
            return { ...c, blockerRate: Math.round((catBlockers / Math.max(c.count, 1)) * 100), blockerCount: catBlockers };
        }).filter((c) => c.blockerRate > 30).sort((a, b) => b.blockerRate - a.blockerRate);

        if (catBlockerRates.length > 0) {
            items.push({
                severity: "info",
                icon: "📊",
                title: "Category blocker density analysis",
                description: `${catBlockerRates.map((c) => `"${CATEGORY_LABELS[c.category] || c.category}" has ${c.blockerRate}% blocker rate (${c.blockerCount}/${c.count})`).join(". ")}. These categories have disproportionately high complaint severity.`,
            });
        }

        // ── Positive: Top insight summary
        items.push({
            severity: "info",
            icon: "💡",
            title: "Recommendation Summary",
            description: `Key actions: (1) Fix transaction failure points — ${blockerPct}% blocker rate is above threshold. (2) Address "${[...riskMatrix].sort((a, b) => b.avgImpact * b.volume - a.avgImpact * a.volume)[0]?.topic}" as the highest-impact topic. (3) Review ${modelPerformance?.lowConfidenceCount || 0} low-confidence predictions for data quality.`,
        });

        return items;
    }, [data]);

    return (
        <div className="v2-tab-content" style={{ gridTemplateRows: "1fr", overflow: "auto" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 2px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700 }}>Actionable Insights</h3>
                    <span style={{ fontSize: 10, color: "#888" }}>Auto-generated from data — {insights.length} insights found</span>
                </div>
                {insights.map((insight, i) => (
                    <InsightCard key={i} {...insight} />
                ))}
            </div>
        </div>
    );
}
