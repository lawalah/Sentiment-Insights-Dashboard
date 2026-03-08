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

export default function V2Dashboard() {
    const [data, setData] = useState(null);
    const [tab, setTab] = useState("overview");
    const [selectedSentiments, setSelectedSentiments] = useState([]);
    const [selectedTopics, setSelectedTopics] = useState([]);
    const [search, setSearch] = useState("");
    const [dateRange, setDateRange] = useState({ from: "", to: "" });

    useEffect(() => {
        fetch("/data.json")
            .then((r) => r.json())
            .then(setData);
    }, []);

    const allTopics = useMemo(
        () => (data ? Object.keys(data.topicCounts || {}).filter((t) => t !== "Other").sort() : []),
        [data]
    );

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

        return { ...data, tweets, sentimentCounts, topicSentiment };
    }, [data, dateFilteredTweets]);

    if (!data) {
        return (
            <div className="v2" style={{ placeItems: "center", display: "grid" }}>
                <p style={{ color: "#888" }}>Loading...</p>
            </div>
        );
    }

    const { timeline, riskMatrix, topicVelocity, categoryBreakdown, modelPerformance } = data;
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
                    <V2DateFilter dateRange={dateRange} onDateChange={setDateRange} />
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
                <V2Insights data={computedData} />
            )}
        </div>
    );
}
