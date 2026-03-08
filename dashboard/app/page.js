"use client";

import { useState, useEffect, useMemo } from "react";
import KPICards from "@/components/KPICards";
import SentimentDonut from "@/components/SentimentDonut";
import TimelineChart from "@/components/TimelineChart";
import RiskReward from "@/components/RiskReward";
import DataExplorer from "@/components/DataExplorer";
import MultiSelect from "@/components/MultiSelect";

const SENTIMENT_COLORS = {
  Positive: "#b8e550",
  Neutral: "#c3b8f0",
  Negative: "#f5a3a3",
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [selectedSentiments, setSelectedSentiments] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/data.json")
      .then((r) => r.json())
      .then(setData);
  }, []);

  const allTopics = useMemo(
    () => (data ? Object.keys(data.topicCounts || {}).filter((t) => t !== "Other").sort() : []),
    [data]
  );

  const filteredTweets = useMemo(() => {
    if (!data) return [];
    return data.tweets.filter((t) => {
      if (selectedSentiments.length > 0 && !selectedSentiments.includes(t.sentiment)) return false;
      if (selectedTopics.length > 0 && !selectedTopics.includes(t.topic)) return false;
      if (search && !t.text.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [data, selectedSentiments, selectedTopics, search]);

  if (!data) {
    return (
      <div className="dashboard" style={{ placeItems: "center", display: "grid" }}>
        <p style={{ color: "var(--text-secondary)" }}>Loading...</p>
      </div>
    );
  }

  const { sentimentCounts, topicCounts, topicSentiment, tweets, timeline } = data;
  const total = Object.values(sentimentCounts).reduce((a, b) => a + b, 0);
  const pos = sentimentCounts.Positive || 0;
  const neg = sentimentCounts.Negative || 0;
  const neu = sentimentCounts.Neutral || 0;
  const brandHealth = Math.round((pos / (pos + neg)) * 100);

  const hasFilters = selectedSentiments.length > 0 || selectedTopics.length > 0;

  // Toggle a sentiment in/out
  const toggleSentiment = (s) => {
    if (selectedSentiments.includes(s)) {
      setSelectedSentiments(selectedSentiments.filter((x) => x !== s));
    } else {
      setSelectedSentiments([...selectedSentiments, s]);
    }
  };

  // Toggle a topic in/out
  const toggleTopic = (t) => {
    if (selectedTopics.includes(t)) {
      setSelectedTopics(selectedTopics.filter((x) => x !== t));
    } else {
      setSelectedTopics([...selectedTopics, t]);
    }
  };

  return (
    <div className="dashboard">
      <div className="header">
        <div className="header-left">
          <h1>Sentiment Insights</h1>
          <span className="subtitle">{total} tweets · Jan 2023 — Feb 2026</span>
        </div>
        <div className="filter-bar">
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

      <KPICards
        total={total}
        positive={pos}
        negative={neg}
        neutral={neu}
        brandHealth={brandHealth}
        filtered={filteredTweets.length}
        hasFilters={hasFilters || search}
      />

      <div className="mid-row">
        <SentimentDonut
          counts={sentimentCounts}
          selectedSentiments={selectedSentiments}
          onToggle={toggleSentiment}
        />
        <TimelineChart timeline={timeline} />
      </div>

      <div className="bot-row">
        <RiskReward
          topicSentiment={topicSentiment}
          selectedSentiments={selectedSentiments}
          selectedTopics={selectedTopics}
          onToggleTopic={toggleTopic}
        />
        <DataExplorer
          tweets={filteredTweets}
          search={search}
          onSearchChange={setSearch}
          onToggleSentiment={toggleSentiment}
          onToggleTopic={toggleTopic}
        />
      </div>
    </div>
  );
}
