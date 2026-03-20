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

function InsightCard({ severity, title, description }) {
    const properties = {
        critical: { bg: "rgba(255,68,68,0.06)", border: "rgba(255,68,68,0.2)", accent: "#FF4444", icon: "⊘" },
        warning: { bg: "rgba(255,170,0,0.06)", border: "rgba(255,170,0,0.2)", accent: "#FFAA00", icon: "▲" },
        positive: { bg: "rgba(57,255,20,0.06)", border: "rgba(57,255,20,0.2)", accent: "#39FF14", icon: "✓" },
        info: { bg: "rgba(0,229,255,0.06)", border: "rgba(0,229,255,0.2)", accent: "#00E5FF", icon: "✦" },
        realtime: { bg: "rgba(138,43,226,0.06)", border: "rgba(138,43,226,0.2)", accent: "#8A2BE2", icon: "◉" },
    };
    const p = properties[severity] || properties.info;

    return (
        <div style={{
            background: p.bg,
            border: `1px solid ${p.border}`,
            borderLeft: `3px solid ${p.accent}`,
            borderRadius: 10,
            padding: "14px 18px",
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
        }}>
            <span style={{ fontSize: 18, color: p.accent, flexShrink: 0, marginTop: -2 }}>{p.icon}</span>
            <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 12, color: "#555", lineHeight: 1.5 }}>{description}</div>
            </div>
        </div>
    );
}

function computePreviousPeriodTweets(allTweets, dateRange) {
    if (!dateRange.from || !dateRange.to) return [];
    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);
    const durationMs = to - from;
    const prevFrom = new Date(from.getTime() - durationMs - 86400000);
    const prevTo = new Date(from.getTime() - 86400000);
    const prevFromStr = prevFrom.toISOString().slice(0, 10);
    const prevToStr = prevTo.toISOString().slice(0, 10);

    return allTweets.filter((t) => {
        if (!t.date) return false;
        return t.date >= prevFromStr && t.date <= prevToStr;
    });
}

function getTopicRank(tweets) {
    const counts = {};
    for (const t of tweets) {
        if (!t.topic) continue;
        counts[t.topic] = (counts[t.topic] || 0) + 1;
    }
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([topic], i) => ({ topic, rank: i + 1 }));
}

function generateHistoricalInsights(data, allTweets, dateRange) {
    const items = [];
    const { tweets, riskMatrix, topicVelocity, categoryBreakdown, sentimentCounts, modelPerformance } = data;
    const total = tweets.length;
    const blockers = tweets.filter((t) => t.isBlocker).length;
    const blockerPct = total > 0 ? Math.round((blockers / total) * 100) : 0;
    const neg = sentimentCounts.Negative || 0;
    const pos = sentimentCounts.Positive || 0;
    const brandHealth = (pos + neg) > 0 ? Math.round((pos / (pos + neg)) * 100) : 0;

    const prevTweets = computePreviousPeriodTweets(allTweets, dateRange);
    const prevTotal = prevTweets.length;
    const prevBlockers = prevTweets.filter((t) => t.isBlocker).length;
    const prevBlockerPct = prevTotal > 0 ? Math.round((prevBlockers / prevTotal) * 100) : 0;
    const prevNeg = prevTweets.filter((t) => t.sentiment === "Negative").length;
    const prevPos = prevTweets.filter((t) => t.sentiment === "Positive").length;
    const prevBrandHealth = (prevPos + prevNeg) > 0 ? Math.round((prevPos / (prevPos + prevNeg)) * 100) : 0;

    const hasPrevData = prevTotal > 0;

    // ── Period volume comparison
    if (hasPrevData) {
        const volChange = Math.round(((total - prevTotal) / prevTotal) * 100);
        if (Math.abs(volChange) > 5) {
            items.push({
                severity: volChange > 0 ? "warning" : "positive",
                title: `Mention volume ${volChange > 0 ? "increased" : "decreased"} by ${Math.abs(volChange)}%`,
                description: `This period has ${total} tweets vs ${prevTotal} in the previous period (${volChange > 0 ? "+" : ""}${volChange}%). ${volChange > 30 ? "A significant surge suggests an emerging issue or event." : volChange < -30 ? "The drop may indicate issues are being resolved." : ""}`,
            });
        }
    }

    // ── Blocker rate: period-relative
    if (hasPrevData) {
        const blockerDelta = blockerPct - prevBlockerPct;
        if (Math.abs(blockerDelta) > 3) {
            items.push({
                severity: blockerDelta > 0 ? "critical" : "positive",
                title: `Blocker rate ${blockerDelta > 0 ? "increased" : "decreased"} by ${Math.abs(blockerDelta)}pp`,
                description: `Transaction blockers went from ${prevBlockerPct}% (${prevBlockers}/${prevTotal}) to ${blockerPct}% (${blockers}/${total}). ${blockerDelta > 0 ? "More users are hitting critical failures. Prioritize payment flow stability." : "Fewer users are blocked from completing transactions. Current fixes are working."}`,
            });
        }
    } else if (blockerPct > 15) {
        items.push({
            severity: "critical",
            title: `${blockerPct}% of tweets are transaction blockers`,
            description: `${blockers} out of ${total} tweets describe issues preventing transaction completion. No previous period data available for comparison.`,
        });
    }

    // ── Brand Health: period-relative
    if (hasPrevData) {
        const healthDelta = brandHealth - prevBrandHealth;
        if (Math.abs(healthDelta) > 3) {
            items.push({
                severity: healthDelta < 0 ? "critical" : "positive",
                title: `Brand Health ${healthDelta > 0 ? "improved" : "declined"} by ${Math.abs(healthDelta)}pp`,
                description: `Brand Health moved from ${prevBrandHealth}% to ${brandHealth}% (${healthDelta > 0 ? "+" : ""}${healthDelta}pp). ${healthDelta < -10 ? "This is a significant decline — investigate recent negative drivers." : healthDelta > 10 ? "Strong improvement — continue current strategies." : ""}`,
            });
        }
    } else if (brandHealth < 30) {
        items.push({
            severity: "critical",
            title: `Brand Health is critically low at ${brandHealth}%`,
            description: `Only ${pos} out of ${pos + neg} opinionated tweets are positive. Industry benchmark for fintech apps is 40-60%.`,
        });
    }

    // ── Topic rank shifts
    if (hasPrevData) {
        const currRanks = getTopicRank(tweets);
        const prevRanks = getTopicRank(prevTweets);
        const shifts = [];

        for (const curr of currRanks.slice(0, 5)) {
            const prev = prevRanks.find((p) => p.topic === curr.topic);
            if (prev && prev.rank > curr.rank) {
                shifts.push(`"${curr.topic}" rose from #${prev.rank} to #${curr.rank}`);
            } else if (!prev && curr.rank <= 3) {
                shifts.push(`"${curr.topic}" is a new entrant at #${curr.rank} (not present in previous period)`);
            }
        }

        if (shifts.length > 0) {
            items.push({
                severity: "warning",
                title: `Topic ranking shifted`,
                description: shifts.join(". ") + ". Monitor newly dominant topics for escalation.",
            });
        }
    }

    // ── Worsening topics (keep existing logic)
    const worsening = topicVelocity.filter((t) => t.direction === "worsening");
    if (worsening.length > 0) {
        const topW = worsening[0];
        items.push({
            severity: "warning",
            title: `${worsening.length} topic(s) worsening`,
            description: `"${topW.topic}" saw a ${Math.abs(topW.changePct)}% increase in negative sentiment vs previous quarter (${topW.previousNeg} → ${topW.currentNeg} negative tweets).`,
        });
    }

    // ── Improving topics
    const improving = topicVelocity.filter((t) => t.direction === "improving");
    if (improving.length > 0) {
        items.push({
            severity: "positive",
            title: `${improving.length} topic(s) showing improvement`,
            description: `${improving.slice(0, 3).map((t) => `"${t.topic}" (${t.changePct}%)`).join(", ")} saw reduced negative sentiment vs previous quarter.`,
        });
    }

    // ── High-risk topics
    const highNeg = [...riskMatrix].filter((r) => r.negPct > 60 && r.volume > 10).sort((a, b) => b.volume - a.volume);
    if (highNeg.length > 0) {
        items.push({
            severity: "warning",
            title: `${highNeg.length} topic(s) in critical risk zone`,
            description: `${highNeg.map((r) => `"${r.topic}" (${r.negPct}% negative, ${r.volume} tweets)`).join(", ")}. High volume + high negativity = highest churn risk.`,
        });
    }

    // ── Model confidence
    if (modelPerformance?.lowConfidencePct > 15) {
        items.push({
            severity: "info",
            title: `${modelPerformance.lowConfidencePct}% of predictions have low confidence`,
            description: `${modelPerformance.lowConfidenceCount} tweets scored below 60% confidence. Consider manual review of low-confidence negative tweets.`,
        });
    }

    // ── Recommendation summary
    const topImpactTopic = [...riskMatrix].sort((a, b) => b.avgImpact * b.volume - a.avgImpact * a.volume)[0];
    items.push({
        severity: "info",
        title: "Period Summary",
        description: `${total} tweets analyzed${hasPrevData ? ` (${total > prevTotal ? "+" : ""}${total - prevTotal} vs previous period)` : ""}. Top-priority topic: "${topImpactTopic?.topic || "N/A"}". Blocker rate: ${blockerPct}%. Brand Health: ${brandHealth}%.`,
    });

    return items;
}

function generateRealtimeInsights(data, allTweets, pipelineHealth) {
    const items = [];
    const { tweets, riskMatrix, topicVelocity, categoryBreakdown, sentimentCounts, modelPerformance } = data;
    const total = tweets.length;
    const blockers = tweets.filter((t) => t.isBlocker).length;
    const blockerPct = total > 0 ? Math.round((blockers / total) * 100) : 0;
    const neg = sentimentCounts.Negative || 0;
    const pos = sentimentCounts.Positive || 0;
    const brandHealth = (pos + neg) > 0 ? Math.round((pos / (pos + neg)) * 100) : 0;

    // ── Pipeline health status
    if (pipelineHealth) {
        const isOk = pipelineHealth.status === "ok";
        const lastTs = pipelineHealth.timestamp;
        const lastAppended = pipelineHealth.appended || 0;
        items.push({
            severity: isOk ? "realtime" : "warning",
            title: isOk ? "Pipeline Active" : "Pipeline Issue Detected",
            description: isOk
                ? `Last scrape cycle: ${lastTs ? new Date(lastTs).toLocaleString() : "unknown"}. ${lastAppended} new tweet(s) appended in last cycle.`
                : `Pipeline error: ${pipelineHealth.error?.slice(0, 120) || "unknown"}. Last heartbeat: ${lastTs || "unknown"}.`,
        });
    }

    // ── Recent 24h activity
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneDayAgoStr = oneDayAgo.toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

    const last24h = allTweets.filter((t) => t.date && t.date >= oneDayAgoStr);
    const last7d = allTweets.filter((t) => t.date && t.date >= sevenDaysAgoStr);

    if (last24h.length > 0) {
        const negLast24 = last24h.filter((t) => t.sentiment === "Negative").length;
        const negRate24 = Math.round((negLast24 / last24h.length) * 100);
        items.push({
            severity: negRate24 > 60 ? "critical" : negRate24 > 40 ? "warning" : "positive",
            title: `${last24h.length} tweet(s) in the last 24 hours`,
            description: `${negLast24} negative (${negRate24}%), ${last24h.filter((t) => t.sentiment === "Positive").length} positive, ${last24h.filter((t) => t.sentiment === "Neutral").length} neutral. ${negRate24 > 60 ? "Unusually high negative rate — possible incident underway." : negRate24 < 30 ? "Healthy sentiment ratio." : ""}`,
        });
    } else {
        items.push({
            severity: "info",
            title: "No tweets in the last 24 hours",
            description: "The pipeline has not picked up new MAE mentions recently. This is normal during low-activity periods.",
        });
    }

    // ── 7-day rolling average comparison
    if (last7d.length > 7) {
        const dailyAvgNeg = last7d.filter((t) => t.sentiment === "Negative").length / 7;
        const todayNeg = last24h.filter((t) => t.sentiment === "Negative").length;
        const deviation = dailyAvgNeg > 0 ? Math.round(((todayNeg - dailyAvgNeg) / dailyAvgNeg) * 100) : 0;

        if (Math.abs(deviation) > 30) {
            items.push({
                severity: deviation > 0 ? "warning" : "positive",
                title: `Today's negative rate is ${Math.abs(deviation)}% ${deviation > 0 ? "above" : "below"} the 7-day average`,
                description: `Today: ${todayNeg} negative tweets. 7-day daily average: ${dailyAvgNeg.toFixed(1)}. ${deviation > 50 ? "Significant spike detected — investigate root cause." : deviation < -50 ? "Notable improvement in user sentiment." : ""}`,
            });
        }
    }

    // ── Topic spike detection (last 24h vs 7d average)
    if (last24h.length > 0 && last7d.length > 7) {
        const topicCounts24h = {};
        for (const t of last24h) {
            if (t.topic) topicCounts24h[t.topic] = (topicCounts24h[t.topic] || 0) + 1;
        }
        const topicCounts7d = {};
        for (const t of last7d) {
            if (t.topic) topicCounts7d[t.topic] = (topicCounts7d[t.topic] || 0) + 1;
        }

        const spikes = [];
        for (const [topic, count24] of Object.entries(topicCounts24h)) {
            const avg7d = (topicCounts7d[topic] || 0) / 7;
            if (avg7d > 0 && count24 > avg7d * 2 && count24 >= 3) {
                spikes.push({ topic, count24, avg7d: avg7d.toFixed(1) });
            }
        }

        if (spikes.length > 0) {
            items.push({
                severity: "warning",
                title: `Topic spike: ${spikes.map((s) => `"${s.topic}"`).join(", ")}`,
                description: spikes.map((s) => `"${s.topic}" has ${s.count24} mentions today vs ${s.avg7d}/day average`).join(". ") + ". Investigate for emerging issues.",
            });
        }
    }

    // ── Overall health baseline alerts (always show)
    if (blockerPct > 15) {
        const topBlockerCat = categoryBreakdown
            .map((c) => ({ cat: c.category, blockers: tweets.filter((t) => t.category === c.category && t.isBlocker).length }))
            .sort((a, b) => b.blockers - a.blockers)[0];
        items.push({
            severity: "critical",
            title: `Overall blocker rate: ${blockerPct}%`,
            description: `${blockers} out of ${total} tweets are transaction blockers. "${CATEGORY_LABELS[topBlockerCat?.cat] || topBlockerCat?.cat}" has the most (${topBlockerCat?.blockers}).`,
        });
    }

    if (brandHealth < 30) {
        items.push({
            severity: "critical",
            title: `Brand Health is critically low at ${brandHealth}%`,
            description: `Only ${pos} out of ${pos + neg} opinionated tweets are positive. Industry benchmark: 40-60%.`,
        });
    }

    // ── Worsening topics
    const worsening = topicVelocity.filter((t) => t.direction === "worsening");
    if (worsening.length > 0) {
        items.push({
            severity: "warning",
            title: `${worsening.length} topic(s) worsening quarter-over-quarter`,
            description: worsening.slice(0, 3).map((t) => `"${t.topic}" (+${Math.abs(t.changePct)}%)`).join(", ") + ".",
        });
    }

    // ── Improving topics
    const improving = topicVelocity.filter((t) => t.direction === "improving");
    if (improving.length > 0) {
        items.push({
            severity: "positive",
            title: `${improving.length} topic(s) showing improvement`,
            description: improving.slice(0, 3).map((t) => `"${t.topic}" (${t.changePct}%)`).join(", ") + ".",
        });
    }

    // ── Realtime summary
    items.push({
        severity: "info",
        title: "Live Dashboard Summary",
        description: `Monitoring ${total} total tweets. Brand Health: ${brandHealth}%. Blocker Rate: ${blockerPct}%. ${last24h.length} tweets in last 24h. Pipeline: ${pipelineHealth?.status || "unknown"}.`,
    });

    return items;
}

export default function V2Insights({ data, allTweets, dateRange, pipelineHealth }) {
    const isHistoricalMode = dateRange?.from || dateRange?.to;

    const insights = useMemo(() => {
        if (!data) return [];

        if (isHistoricalMode) {
            return generateHistoricalInsights(data, allTweets || data.tweets, dateRange);
        }
        return generateRealtimeInsights(data, allTweets || data.tweets, pipelineHealth);
    }, [data, allTweets, dateRange, pipelineHealth, isHistoricalMode]);

    const modeLabel = isHistoricalMode ? "Historical Analysis" : "Realtime Monitor";
    const modeColor = isHistoricalMode ? "#00E5FF" : "#8A2BE2";

    return (
        <div className="v2-tab-content" style={{ gridTemplateRows: "1fr", overflow: "auto" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 2px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700 }}>Actionable Insights</h3>
                    <span style={{
                        fontSize: 9,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: `${modeColor}18`,
                        color: modeColor,
                        fontWeight: 600,
                        border: `1px solid ${modeColor}33`,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                    }}>
                        {modeLabel}
                    </span>
                    <span style={{ fontSize: 10, color: "#888" }}>{insights.length} insights</span>
                </div>
                {insights.map((insight, i) => (
                    <InsightCard key={i} {...insight} />
                ))}
            </div>
        </div>
    );
}
