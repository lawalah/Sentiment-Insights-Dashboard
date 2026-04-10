"""
Generate enriched data.json for the V2 dashboard from mae_results.csv.

Adds:
- Per-tweet: date, category, engagement, isBlocker, impactScore
- Aggregations: quarterComparison, topicVelocity, riskMatrix, categoryBreakdown
"""
import argparse
import json
import os
import re
from collections import defaultdict, Counter

CSV_PATH = "mae_results.csv"
OUTPUT_PATH = "dashboard/public/data.json"

# ── Transaction-blocker keywords ──────────────────────────────────────
BLOCKER_PATTERNS = [
    r"can'?t (pay|transfer|login|log in|open|use|access|scan|make payment|do any|approve|top.?up)",
    r"(unable|cannot|won'?t|couldn'?t|unable|not able) (to |)(pay|transfer|login|log.?in|open|use|access|scan|work|load)",
    r"\b(down|error|crash|crashed|crashing|failed|unsuccessful|rejected|blocked|stuck|hang|hangs|not working|won'?t work|not loading|maintenance)\b",
    r"tak (boleh|dapat|blh) (transfer|bayar|guna|login|open|buka|scan|access)",
    r"(xleh|xblh|xboleh) (transfer|bayar|guna|login|open|buka|scan|access|buat)",
    r"(tak|x) (dapat|dpat|dpt) (transfer|bayar|guna|login|scan|buat)",
]
BLOCKER_RE = [re.compile(p, re.IGNORECASE) for p in BLOCKER_PATTERNS]

# ── Topic label mapping from BERTopic topic IDs ──────────────────────
TOPIC_MAP = {
    "0_mae app_mae_mymaybank_app": "App General Issues",
    "1_maybank app_maybank_app_mae": "App General Issues",
    "2_m2u_m2u app_old_app": "Migration & Device Change",
    "3_qr_pay_code_payment": "QR Payments",
    "4_secure2u_phone_activate_mae app": "Secure2U Issues",
    "5_maybank mae_maybank_fuck_mae": "App Frustration",
    "6_phone_maybank app_new phone_maybank": "Migration & Device Change",
    "7_m2u_m2u app_password_app": "Password & Login",
    "8_manage_movie_saving_save": "Savings (Tabung)",
    "Outlier": "Other",
}


def is_blocker(text):
    """Check if a tweet mentions a transaction-blocking issue."""
    for pattern in BLOCKER_RE:
        if pattern.search(text):
            return True
    return False


def parse_quarter(date_str):
    """Extract quarter string like '2024Q3' from ISO date."""
    if not date_str or date_str == "Unknown":
        return None
    try:
        year = date_str[:4]
        month = int(date_str[5:7])
        q = (month - 1) // 3 + 1
        return f"{year}Q{q}"
    except (ValueError, IndexError):
        return None


def generate(csv_path=CSV_PATH, output_path=OUTPUT_PATH):
    import csv

    rows = []
    seen_texts = set()
    with open(csv_path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            text_fp = (row.get("Text") or "").strip().lower()
            if text_fp in seen_texts:
                continue
            seen_texts.add(text_fp)
            rows.append(row)

    # ── Process each tweet ────────────────────────────────────────────
    tweets = []
    sentiment_counts = Counter()
    topic_counts = Counter()
    topic_sentiment = defaultdict(lambda: Counter())
    category_counts = Counter()
    category_sentiment = defaultdict(lambda: Counter())
    timeline_data = defaultdict(lambda: Counter())
    quarter_data = defaultdict(lambda: Counter())
    topic_quarter = defaultdict(lambda: defaultdict(lambda: Counter()))

    for row in rows:
        text = row.get("Text", "")
        sentiment = row.get("Sentiment_Label", "Neutral")
        topic_raw = row.get("Topic_Label", "Outlier")
        topic = TOPIC_MAP.get(topic_raw, "Other")
        confidence = float(row.get("Confidence", 0))
        category = row.get("Keyword", "general")
        date_str = row.get("Time", "")
        likes = int(row.get("Likes", 0) or 0)
        comments = int(row.get("Comments", 0) or 0)
        reposts = int(row.get("Reposts", 0) or 0)
        engagement = likes + comments + reposts
        blocker = is_blocker(text)
        impact = (2 if blocker else 1) * (1 + engagement * 0.1)

        quarter = parse_quarter(date_str)

        tweet_obj = {
            "text": text[:200],
            "sentiment": sentiment,
            "topic": topic,
            "confidence": confidence,
            "category": category,
            "date": date_str[:10] if date_str and date_str != "Unknown" else None,
            "engagement": engagement,
            "isBlocker": blocker,
            "impactScore": round(impact, 2),
        }
        tweets.append(tweet_obj)

        # Aggregations
        sentiment_counts[sentiment] += 1
        if topic != "Other":
            topic_counts[topic] += 1
        topic_sentiment[topic][sentiment] += 1
        category_counts[category] += 1
        category_sentiment[category][sentiment] += 1

        if quarter:
            quarter_data[quarter][sentiment] += 1
            timeline_data[quarter]["total"] += 1
            timeline_data[quarter][sentiment] += 1
            if topic != "Other":
                topic_quarter[topic][quarter][sentiment] += 1
                topic_quarter[topic][quarter]["total"] += 1

    # ── Timeline (sorted by quarter) ──────────────────────────────────
    sorted_quarters = sorted(timeline_data.keys())
    timeline = []
    for q in sorted_quarters:
        d = timeline_data[q]
        timeline.append({
            "period": q,
            "total": d.get("total", 0),
            "Positive": d.get("Positive", 0),
            "Neutral": d.get("Neutral", 0),
            "Negative": d.get("Negative", 0),
        })

    # ── Quarter Comparison (last 2 quarters) ──────────────────────────
    quarter_comparison = {}
    if len(sorted_quarters) >= 2:
        curr_q = sorted_quarters[-1]
        prev_q = sorted_quarters[-2]
        curr = quarter_data[curr_q]
        prev = quarter_data[prev_q]
        quarter_comparison = {
            "current": {"period": curr_q, **dict(curr)},
            "previous": {"period": prev_q, **dict(prev)},
        }

    # ── Risk Matrix (per topic) ───────────────────────────────────────
    risk_matrix = []
    for topic in topic_counts:
        topic_tweets = [t for t in tweets if t["topic"] == topic]
        volume = len(topic_tweets)
        blockers = sum(1 for t in topic_tweets if t["isBlocker"])
        avg_impact = round(sum(t["impactScore"] for t in topic_tweets) / max(volume, 1), 2)
        neg_pct = round(sum(1 for t in topic_tweets if t["sentiment"] == "Negative") / max(volume, 1) * 100)
        dominant = max(["Positive", "Neutral", "Negative"],
                       key=lambda s: sum(1 for t in topic_tweets if t["sentiment"] == s))

        risk_matrix.append({
            "topic": topic,
            "volume": volume,
            "avgImpact": avg_impact,
            "blockerCount": blockers,
            "blockerPct": round(blockers / max(volume, 1) * 100),
            "negPct": neg_pct,
            "dominant": dominant,
        })

    # ── Topic Velocity (change direction using last 2 quarters) ───────
    topic_velocity = []
    if len(sorted_quarters) >= 2:
        curr_q = sorted_quarters[-1]
        prev_q = sorted_quarters[-2]
        for topic in topic_counts:
            curr_neg = topic_quarter[topic].get(curr_q, {}).get("Negative", 0)
            prev_neg = topic_quarter[topic].get(prev_q, {}).get("Negative", 0)
            curr_total = topic_quarter[topic].get(curr_q, {}).get("total", 0)
            prev_total = topic_quarter[topic].get(prev_q, {}).get("total", 0)

            if prev_neg > 0:
                change_pct = round((curr_neg - prev_neg) / prev_neg * 100)
            elif curr_neg > 0:
                change_pct = 100
            else:
                change_pct = 0

            if change_pct > 20:
                direction = "worsening"
            elif change_pct < -20:
                direction = "improving"
            else:
                direction = "stable"

            # Sparkline data (per quarter negatives)
            sparkline = []
            for q in sorted_quarters[-6:]:
                sparkline.append({
                    "period": q,
                    "negative": topic_quarter[topic].get(q, {}).get("Negative", 0),
                    "total": topic_quarter[topic].get(q, {}).get("total", 0),
                })

            topic_velocity.append({
                "topic": topic,
                "direction": direction,
                "changePct": change_pct,
                "currentNeg": curr_neg,
                "previousNeg": prev_neg,
                "currentTotal": curr_total,
                "previousTotal": prev_total,
                "sparkline": sparkline,
            })

        topic_velocity.sort(key=lambda x: -abs(x["changePct"]))

    # ── Category Breakdown ────────────────────────────────────────────
    category_breakdown = []
    for cat in category_counts:
        total = category_counts[cat]
        sents = category_sentiment[cat]
        dominant = max(["Positive", "Neutral", "Negative"], key=lambda s: sents.get(s, 0))
        category_breakdown.append({
            "category": cat,
            "count": total,
            "Positive": sents.get("Positive", 0),
            "Neutral": sents.get("Neutral", 0),
            "Negative": sents.get("Negative", 0),
            "dominant": dominant,
        })
    category_breakdown.sort(key=lambda x: -x["count"])

    # ── Model Performance ─────────────────────────────────────────────
    confidences = [t["confidence"] for t in tweets]
    avg_conf = round(sum(confidences) / len(confidences), 3) if confidences else 0

    # Confidence histogram bins
    conf_bins = [
        {"range": "<0.5", "count": sum(1 for c in confidences if c < 0.5)},
        {"range": "0.5-0.6", "count": sum(1 for c in confidences if 0.5 <= c < 0.6)},
        {"range": "0.6-0.7", "count": sum(1 for c in confidences if 0.6 <= c < 0.7)},
        {"range": "0.7-0.8", "count": sum(1 for c in confidences if 0.7 <= c < 0.8)},
        {"range": "0.8-0.9", "count": sum(1 for c in confidences if 0.8 <= c < 0.9)},
        {"range": "≥0.9", "count": sum(1 for c in confidences if c >= 0.9)},
    ]

    # Old vs New label agreement (from CSV)
    agreements = 0
    total_with_old = 0
    for row in rows:
        old = row.get("Old_Label", "")
        new = row.get("Predicted_Label", "")
        if old and new and old != "Unknown":
            total_with_old += 1
            if old == new:
                agreements += 1
    agreement_pct = round(agreements / max(total_with_old, 1) * 100)

    # Low confidence count
    low_conf_count = sum(1 for c in confidences if c < 0.6)

    model_performance = {
        "modelName": "cardiffnlp/twitter-roberta-base-sentiment-latest",
        "totalSamples": len(tweets),
        "averageConfidence": avg_conf,
        "medianConfidence": round(sorted(confidences)[len(confidences) // 2], 3) if confidences else 0,
        "lowConfidenceCount": low_conf_count,
        "lowConfidencePct": round(low_conf_count / max(len(tweets), 1) * 100),
        "agreementRate": agreement_pct,
        "confidenceDistribution": conf_bins,
    }

    # ── Build final JSON ──────────────────────────────────────────────
    data = {
        "tweets": tweets,
        "sentimentCounts": dict(sentiment_counts),
        "topicCounts": dict(topic_counts),
        "topicSentiment": {k: dict(v) for k, v in topic_sentiment.items()},
        "topicQuarter": {t: {q: dict(counts) for q, counts in q_dict.items()} for t, q_dict in topic_quarter.items()},
        "timeline": timeline,
        "quarterComparison": quarter_comparison,
        "riskMatrix": risk_matrix,
        "topicVelocity": topic_velocity,
        "categoryBreakdown": category_breakdown,
        "modelPerformance": model_performance,
    }

    output_dir = os.path.dirname(output_path)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    # Stats
    blocker_count = sum(1 for t in tweets if t["isBlocker"])
    blocker_pct = round(blocker_count / max(len(tweets), 1) * 100)
    print(f"✅ Generated {output_path}")
    print(f"   {len(tweets)} tweets")
    print(f"   {blocker_count} transaction blockers ({blocker_pct}%)")
    print(f"   {len(risk_matrix)} topics in risk matrix")
    print(f"   {len(topic_velocity)} topics with velocity")
    print(f"   {len(category_breakdown)} business categories")
    print(f"   {len(timeline)} quarters in timeline")

    return data


def main():
    parser = argparse.ArgumentParser(description="Generate dashboard JSON from mae_results.csv")
    parser.add_argument("--csv", default=CSV_PATH, help="Input CSV path")
    parser.add_argument("--output", default=OUTPUT_PATH, help="Output JSON path")
    args = parser.parse_args()

    generate(csv_path=args.csv, output_path=args.output)


if __name__ == "__main__":
    main()
