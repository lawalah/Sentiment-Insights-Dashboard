"""
Topic Modeling for MAE App Feedback using BERTopic.

Performs:
  1. Overall topic discovery across all tweets
  2. Per-sentiment topic analysis (Positive, Neutral, Negative)
  3. Saves visualizations and results to mae_results.csv

Uses sentence-transformers for embeddings and HDBSCAN for clustering.
"""
import os
import warnings
import pandas as pd
import numpy as np
from bertopic import BERTopic
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import CountVectorizer
from umap import UMAP

warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)

OUTPUT_DIR = "topics"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Use original text for richer topic signals
INPUT_FILE = "sentiment_data_v2_labeled.csv"

print("=" * 60)
print("🔍 BERTopic — MAE App Topic Modeling")
print("=" * 60)

# ── Load Data ─────────────────────────────────────────────────────────
print(f"\n📦 Loading data: {INPUT_FILE}")
df = pd.read_csv(INPUT_FILE)
texts = df["Text"].astype(str).tolist()
sentiments = df["Sentiment_Label"].tolist()
print(f"   Loaded {len(texts)} tweets")
print(f"   Sentiment dist: {dict(df['Sentiment_Label'].value_counts())}")

# ── Embedding Model ───────────────────────────────────────────────────
print("\n📦 Loading sentence-transformer model...")
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

# ── Custom Vectorizer (handles short texts, Malay+English) ────────────
vectorizer = CountVectorizer(
    stop_words="english",
    min_df=2,
    max_df=0.95,
    ngram_range=(1, 2),
)

# ── UMAP for dimensionality reduction ─────────────────────────────────
umap_model = UMAP(
    n_neighbors=15,
    n_components=5,
    min_dist=0.0,
    metric="cosine",
    random_state=42,
)

# ═══════════════════════════════════════════════════════════════════════
# 1. OVERALL TOPIC MODELING
# ═══════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("📊 Phase 1: Overall Topic Discovery")
print("=" * 60)

topic_model = BERTopic(
    embedding_model=embedding_model,
    umap_model=umap_model,
    vectorizer_model=vectorizer,
    nr_topics="auto",
    top_n_words=10,
    min_topic_size=5,
    verbose=False,
)

topics, probs = topic_model.fit_transform(texts)

# Summary
topic_info = topic_model.get_topic_info()
n_topics = len(topic_info[topic_info["Topic"] != -1])
outliers = (np.array(topics) == -1).sum()

print(f"\n✅ Found {n_topics} topics ({outliers} outlier tweets)")
print(f"\n{'='*60}")
print(f"{'Topic':<8} {'Count':<8} {'Top Keywords'}")
print(f"{'='*60}")

for _, row in topic_info.iterrows():
    tid = row["Topic"]
    if tid == -1:
        label = "Outliers"
    else:
        label = f"Topic {tid}"
    words = row["Name"] if "Name" in row else ""
    print(f"{label:<8} {row['Count']:<8} {words[:60]}")

# Save visualizations
print("\n📈 Saving visualizations...")

try:
    fig = topic_model.visualize_barchart(top_n_topics=min(n_topics, 10), n_words=8)
    fig.write_html(f"{OUTPUT_DIR}/overall_topics_barchart.html")
    print(f"   ✅ {OUTPUT_DIR}/overall_topics_barchart.html")
except Exception as e:
    print(f"   ⚠️  Barchart skipped: {e}")

try:
    fig = topic_model.visualize_topics()
    fig.write_html(f"{OUTPUT_DIR}/overall_topics_map.html")
    print(f"   ✅ {OUTPUT_DIR}/overall_topics_map.html")
except Exception as e:
    print(f"   ⚠️  Topic map skipped: {e}")

try:
    fig = topic_model.visualize_heatmap()
    fig.write_html(f"{OUTPUT_DIR}/overall_topics_heatmap.html")
    print(f"   ✅ {OUTPUT_DIR}/overall_topics_heatmap.html")
except Exception as e:
    print(f"   ⚠️  Heatmap skipped: {e}")

# ═══════════════════════════════════════════════════════════════════════
# 2. PER-SENTIMENT TOPIC MODELING
# ═══════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("📊 Phase 2: Per-Sentiment Topic Analysis")
print("=" * 60)

# Topics per sentiment using the same model
try:
    fig = topic_model.visualize_topics_per_class(
        topic_model.topics_per_class(texts, classes=sentiments),
        top_n_topics=min(n_topics, 8),
    )
    fig.write_html(f"{OUTPUT_DIR}/topics_per_sentiment.html")
    print(f"   ✅ {OUTPUT_DIR}/topics_per_sentiment.html")
except Exception as e:
    print(f"   ⚠️  Per-sentiment viz skipped: {e}")

# Run separate models per sentiment for deeper analysis
sentiment_topics = {}

for sentiment in ["Positive", "Neutral", "Negative"]:
    mask = df["Sentiment_Label"] == sentiment
    sent_texts = df[mask]["Text"].astype(str).tolist()

    if len(sent_texts) < 10:
        print(f"\n⚠️  {sentiment}: only {len(sent_texts)} tweets, skipping separate model")
        continue

    print(f"\n🏷️  {sentiment} ({len(sent_texts)} tweets):")

    sent_model = BERTopic(
        embedding_model=embedding_model,
        umap_model=UMAP(
            n_neighbors=min(10, len(sent_texts) - 1),
            n_components=min(5, len(sent_texts) - 2),
            min_dist=0.0,
            metric="cosine",
            random_state=42,
        ),
        vectorizer_model=CountVectorizer(
            stop_words="english",
            min_df=2,
            max_df=0.95,
            ngram_range=(1, 2),
        ),
        min_topic_size=3,
        top_n_words=8,
        verbose=False,
    )

    sent_topics, _ = sent_model.fit_transform(sent_texts)
    sent_info = sent_model.get_topic_info()
    n_sent_topics = len(sent_info[sent_info["Topic"] != -1])

    sentiment_topics[sentiment] = {
        "n_topics": n_sent_topics,
        "info": sent_info,
    }

    for _, row in sent_info.iterrows():
        tid = row["Topic"]
        if tid == -1:
            continue
        words = row["Name"] if "Name" in row else ""
        print(f"   Topic {tid} ({row['Count']} tweets): {words[:50]}")

    try:
        fig = sent_model.visualize_barchart(top_n_topics=min(n_sent_topics, 5), n_words=6)
        fig.write_html(f"{OUTPUT_DIR}/{sentiment.lower()}_topics_barchart.html")
        print(f"   ✅ {OUTPUT_DIR}/{sentiment.lower()}_topics_barchart.html")
    except Exception as e:
        print(f"   ⚠️  {sentiment} barchart skipped: {e}")

# ═══════════════════════════════════════════════════════════════════════
# 3. SAVE RESULTS
# ═══════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("💾 Saving Results")
print("=" * 60)

# Add topic assignments to dataframe
df["Topic_ID"] = topics
df["Topic_Label"] = [
    topic_model.get_topic_info().set_index("Topic").loc[t, "Name"]
    if t != -1 else "Outlier"
    for t in topics
]

# Save full results
df.to_csv("mae_results.csv", index=False, encoding="utf-8-sig")
print(f"   ✅ mae_results.csv ({len(df)} rows with topic assignments)")

# Save topic summary
topic_summary = topic_model.get_topic_info()
topic_summary.to_csv(f"{OUTPUT_DIR}/topic_summary.csv", index=False)
print(f"   ✅ {OUTPUT_DIR}/topic_summary.csv")

# Save the model
topic_model.save(f"{OUTPUT_DIR}/bertopic_model", serialization="safetensors", save_ctfidf=True, save_embedding_model=embedding_model)
print(f"   ✅ {OUTPUT_DIR}/bertopic_model/")

print(f"\n{'='*60}")
print(f"✅ Topic modeling complete!")
print(f"   📊 {n_topics} topics discovered")
print(f"   📁 Visualizations in {OUTPUT_DIR}/")
print(f"   📁 Results in mae_results.csv")
print(f"{'='*60}")
