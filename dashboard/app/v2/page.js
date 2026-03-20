"use client";

import { useState, useEffect, useMemo } from "react";
import "./v2.css";
import V2KPICards from "./V2KPICards";
import V2SentimentGauge from "./V2SentimentGauge";
import V2Timeline from "./V2Timeline";
import V2Heatmap from "./V2Heatmap";
import V2Explorer from "./V2Explorer";
import V2RiskMatrix from "./V2RiskMatrix";
import V2TopicVelocity from "./V2TopicVelocity";
import V2QuarterCompare from "./V2QuarterCompare";
import V2CategoryBreakdown from "./V2CategoryBreakdown";
import V2DateFilter from "./V2DateFilter";
import V2Insights from "./V2Insights";
import V2ModelInfo from "./V2ModelInfo";
import MultiSelect from "@/components/MultiSelect";

const SENTIMENT_COLORS = {
    Positive: "#39FF14",
    Neutral: "#00E5FF",
    Negative: "#FF10F0",
};

function parseQuarter(dateStr) {
    if (!dateStr) return null;
    const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(dateStr);
    if (!m) return null;
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (!year || !month) return null;
    const q = Math.floor((month - 1) / 3) + 1;
    return `${year}Q${q}`;
}

function buildTimelineFromTweets(tweets) {
    const bucket = {};
    for (const t of tweets) {
        const q = parseQuarter(t.date);
        if (!q) continue;
        if (!bucket[q]) bucket[q] = { period: q, total: 0, Positive: 0, Neutral: 0, Negative: 0 };
        bucket[q].total += 1;
        if (["Positive", "Neutral", "Negative"].includes(t.sentiment)) {
            bucket[q][t.sentiment] += 1;
        }
    }
    return Object.values(bucket).sort((a, b) => a.period.localeCompare(b.period));
}

function buildRiskMatrixFromTweets(tweets) {
    const topics = Array.from(new Set(tweets.map((t) => t.topic).filter(Boolean)));
    return topics.map((topic) => {
        const topicTweets = tweets.filter((t) => t.topic === topic);
        const volume = topicTweets.length;
        const blockers = topicTweets.filter((t) => t.isBlocker).length;
        const totalImpact = topicTweets.reduce((s, t) => s + (Number(t.impactScore) || 0), 0);
        const avgImpact = Number((totalImpact / Math.max(volume, 1)).toFixed(2));
        const negCount = topicTweets.filter((t) => t.sentiment === "Negative").length;
        const negPct = Math.round((negCount / Math.max(volume, 1)) * 100);
        const sentimentCounts = {
            Positive: topicTweets.filter((t) => t.sentiment === "Positive").length,
            Neutral: topicTweets.filter((t) => t.sentiment === "Neutral").length,
            Negative: topicTweets.filter((t) => t.sentiment === "Negative").length,
        };
        const dominant = Object.entries(sentimentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Neutral";

        return {
            topic,
            volume,
            avgImpact,
            blockerCount: blockers,
            blockerPct: Math.round((blockers / Math.max(volume, 1)) * 100),
            negPct,
            dominant,
        };
    });
}

function buildTopicVelocityFromTweets(tweets) {
    const topicQuarter = {};
    const quarters = new Set();

    for (const t of tweets) {
        const q = parseQuarter(t.date);
        if (!q || !t.topic) continue;
        quarters.add(q);
        if (!topicQuarter[t.topic]) topicQuarter[t.topic] = {};
        if (!topicQuarter[t.topic][q]) topicQuarter[t.topic][q] = { Negative: 0, total: 0 };
        topicQuarter[t.topic][q].total += 1;
        if (t.sentiment === "Negative") topicQuarter[t.topic][q].Negative += 1;
    }

    const sortedQuarters = Array.from(quarters).sort();
    if (sortedQuarters.length < 2) return [];

    const currQ = sortedQuarters[sortedQuarters.length - 1];
    const prevQ = sortedQuarters[sortedQuarters.length - 2];

    const out = Object.keys(topicQuarter).map((topic) => {
        const currNeg = topicQuarter[topic][currQ]?.Negative || 0;
        const prevNeg = topicQuarter[topic][prevQ]?.Negative || 0;
        const currTotal = topicQuarter[topic][currQ]?.total || 0;
        const prevTotal = topicQuarter[topic][prevQ]?.total || 0;

        const changePct = prevNeg > 0 ? Math.round(((currNeg - prevNeg) / prevNeg) * 100) : (currNeg > 0 ? 100 : 0);
        const direction = changePct > 20 ? "worsening" : changePct < -20 ? "improving" : "stable";

        const sparkline = sortedQuarters.slice(-6).map((q) => ({
            period: q,
            negative: topicQuarter[topic][q]?.Negative || 0,
            total: topicQuarter[topic][q]?.total || 0,
        }));

        return {
            topic,
            direction,
            changePct,
            currentNeg: currNeg,
            previousNeg: prevNeg,
            currentTotal: currTotal,
            previousTotal: prevTotal,
            sparkline,
        };
    });

    return out.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
}

function buildCategoryBreakdownFromTweets(tweets) {
    const map = {};
    for (const t of tweets) {
        const c = t.category || "general";
        if (!map[c]) map[c] = { category: c, count: 0, Positive: 0, Neutral: 0, Negative: 0 };
        map[c].count += 1;
        if (["Positive", "Neutral", "Negative"].includes(t.sentiment)) {
            map[c][t.sentiment] += 1;
        }
    }

    return Object.values(map)
        .map((c) => ({
            ...c,
            dominant: ["Positive", "Neutral", "Negative"].sort((a, b) => c[b] - c[a])[0],
        }))
        .sort((a, b) => b.count - a.count);
}

export default function V2Dashboard() {
    const [data, setData] = useState(null);
    const [dataMeta, setDataMeta] = useState({ source: "unknown", servedAt: null });
    const [pipelineHealth, setPipelineHealth] = useState(null);
    const [tab, setTab] = useState("overview");
    const [selectedSentiments, setSelectedSentiments] = useState([]);
    const [selectedTopics, setSelectedTopics] = useState([]);
    const [search, setSearch] = useState("");
    const [dateRange, setDateRange] = useState({ from: "", to: "" });

    useEffect(() => {
        let cancelled = false;

        const loadData = async () => {
            try {
                const apiResp = await fetch("/api/realtime-data", { cache: "no-store" });
                if (!apiResp.ok) throw new Error(`API error ${apiResp.status}`);
                const payload = await apiResp.json();
                if (cancelled) return;
                setData(payload);
                setDataMeta(payload?._meta || { source: "api", servedAt: new Date().toISOString() });
            } catch {
                const fallbackResp = await fetch("/data.json", { cache: "no-store" });
                const payload = await fallbackResp.json();
                if (cancelled) return;
                setData(payload);
                setDataMeta({ source: "fallback-json", servedAt: new Date().toISOString() });
            }
        };

        const loadHealth = async () => {
            try {
                const resp = await fetch("/realtime/pipeline_health.json", { cache: "no-store" });
                if (resp.ok) setPipelineHealth(await resp.json());
            } catch {}
        };

        loadData();
        loadHealth();
        const interval = setInterval(() => { loadData(); loadHealth(); }, 60_000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, []);

    // Date-filtered tweets
    const dateFilteredTweets = useMemo(() => {
        if (!data) return [];
        return data.tweets.filter((t) => {
            if (!t.date) return true;
            if (dateRange.from && t.date < dateRange.from) return false;
            if (dateRange.to && t.date > dateRange.to) return false;
            return true;
        });
    }, [data, dateRange]);

    // Full filtered tweets (date + sentiment + topic + search)
    const filteredTweets = useMemo(() => {
        return dateFilteredTweets.filter((t) => {
            if (selectedSentiments.length > 0 && !selectedSentiments.includes(t.sentiment)) return false;
            if (selectedTopics.length > 0 && !selectedTopics.includes(t.topic)) return false;
            if (search && !t.text.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        });
    }, [dateFilteredTweets, selectedSentiments, selectedTopics, search]);

    // Recompute aggregations from date-filtered tweets
    const computedData = useMemo(() => {
        if (!data) return null;
        const tweets = dateFilteredTweets;
        const sentimentCounts = { Positive: 0, Neutral: 0, Negative: 0 };
        const topicSentiment = {};

        tweets.forEach((t) => {
            sentimentCounts[t.sentiment] = (sentimentCounts[t.sentiment] || 0) + 1;
            if (!topicSentiment[t.topic]) topicSentiment[t.topic] = {};
            topicSentiment[t.topic][t.sentiment] = (topicSentiment[t.topic][t.sentiment] || 0) + 1;
        });

        const timeline = buildTimelineFromTweets(tweets);
        const riskMatrix = buildRiskMatrixFromTweets(tweets);
        const topicVelocity = buildTopicVelocityFromTweets(tweets);
        const categoryBreakdown = buildCategoryBreakdownFromTweets(tweets);

        return {
            ...data,
            tweets,
            sentimentCounts,
            topicSentiment,
            timeline,
            riskMatrix,
            topicVelocity,
            categoryBreakdown,
        };
    }, [data, dateFilteredTweets]);

    const allTopics = useMemo(
        () => (computedData ? Object.keys(computedData.topicSentiment || {}).filter((t) => t !== "Other").sort() : []),
        [computedData]
    );

    const availableQuarters = useMemo(
        () => (data?.timeline || []).map((t) => t.period),
        [data]
    );

    if (!data) {
        return (
            <div className="v2" style={{ placeItems: "center", display: "grid" }}>
                <p style={{ color: "#888" }}>Loading...</p>
            </div>
        );
    }

    const { timeline, riskMatrix, topicVelocity, categoryBreakdown } = computedData;
    const { modelPerformance } = data;
    const sentimentCounts = computedData.sentimentCounts;
    const topicSentiment = computedData.topicSentiment;
    const total = Object.values(sentimentCounts).reduce((a, b) => a + b, 0);
    const pos = sentimentCounts.Positive || 0;
    const neg = sentimentCounts.Negative || 0;
    const brandHealth = total > 0 ? Math.round((pos / Math.max(pos + neg, 1)) * 100) : 0;
    const hasFilters = selectedSentiments.length > 0 || selectedTopics.length > 0;
    const hasDateFilter = dateRange.from || dateRange.to;

    const blockerCount = dateFilteredTweets.filter((t) => t.isBlocker).length;

    const toggleSentiment = (s) => {
        setSelectedSentiments((prev) =>
            prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
        );
    };

    const toggleTopic = (t) => {
        setSelectedTopics((prev) =>
            prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
        );
    };

    return (
        <div className="v2" style={{ gridTemplateRows: "auto auto auto 1fr" }}>
            <div className="v2-header">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img
                        src="/logo-black.png"
                        alt="Logo"
                        width={28}
                        height={28}
                        style={{ objectFit: "contain" }}
                    />
                    <h1>
                        Sentiment Insights
                        <span className="v2-badge">V2</span>
                    </h1>
                    <span className="subtitle">
                        {total} tweets{hasDateFilter ? " (filtered)" : ""} · {blockerCount} blockers ({total > 0 ? Math.round(blockerCount / total * 100) : 0}%)
                    </span>
                    <span className="subtitle" style={{ opacity: 0.8 }}>
                        source: {dataMeta.source}
                    </span>
                </div>
                <div className="v2-filters">
                    <div className="v2-tabs">
                        <button
                            className={`v2-tab ${tab === "overview" ? "active" : ""}`}
                            onClick={() => setTab("overview")}
                        >
                            Overview
                        </button>
                        <button
                            className={`v2-tab ${tab === "risk" ? "active" : ""}`}
                            onClick={() => setTab("risk")}
                        >
                            Risk Analysis
                        </button>
                        <button
                            className={`v2-tab ${tab === "insights" ? "active" : ""}`}
                            onClick={() => setTab("insights")}
                        >
                            Insights
                        </button>
                    </div>
                    <V2DateFilter dateRange={dateRange} onDateChange={setDateRange} quarters={availableQuarters} />
                    <MultiSelect
                        label="Sentiment"
                        options={["Positive", "Neutral", "Negative"]}
                        selected={selectedSentiments}
                        onChange={setSelectedSentiments}
                        colorMap={SENTIMENT_COLORS}
                    />
                    <MultiSelect
                        label="Topic"
                        options={allTopics}
                        selected={selectedTopics}
                        onChange={setSelectedTopics}
                    />
                </div>
            </div>

            <V2KPICards
                total={total}
                positive={pos}
                negative={neg}
                neutral={sentimentCounts.Neutral || 0}
                brandHealth={brandHealth}
                filtered={filteredTweets.length}
                hasFilters={hasFilters || search}
                timeline={timeline}
                blockerCount={blockerCount}
                blockerPct={total > 0 ? Math.round(blockerCount / total * 100) : 0}
            />

            {tab === "overview" ? (
                <div className="v2-tab-content">
                    <div className="v2-mid-row">
                        <div className="v2-section">
                            <V2SentimentGauge
                                counts={sentimentCounts}
                                selectedSentiments={selectedSentiments}
                                onToggle={toggleSentiment}
                            />
                            <V2ModelInfo modelPerformance={modelPerformance} />
                        </div>
                        <V2Timeline timeline={timeline} />
                    </div>
                    <div className="v2-bot-row">
                        <V2Heatmap
                            topicSentiment={topicSentiment}
                            selectedSentiments={selectedSentiments}
                            onToggleTopic={toggleTopic}
                        />
                        <V2Explorer
                            tweets={filteredTweets}
                            search={search}
                            onSearchChange={setSearch}
                            onToggleSentiment={toggleSentiment}
                            onToggleTopic={toggleTopic}
                        />
                    </div>
                </div>
            ) : tab === "risk" ? (
                <div className="v2-tab-content">
                    <div className="v2-mid-row">
                        <V2QuarterCompare timeline={timeline} />
                        <V2RiskMatrix riskMatrix={riskMatrix} onToggleTopic={toggleTopic} />
                    </div>
                    <div className="v2-bot-row">
                        <V2TopicVelocity topicVelocity={topicVelocity} />
                        <V2CategoryBreakdown categoryBreakdown={categoryBreakdown} />
                    </div>
                </div>
            ) : (
                <V2Insights data={computedData} allTweets={data?.tweets} dateRange={dateRange} pipelineHealth={pipelineHealth} />
            )}
        </div>
    );
}
