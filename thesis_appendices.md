# Thesis Appendices: Core System Components

This document contains selected, crucial code snippets demonstrating the technical implementation of the MAE Sentiment Insights Dashboard. Standard boilerplate, imports, and utility functions have been omitted for brevity.

## Appendix A: Real-Time Orchestration Loop
*From `realtime_pipeline.py`*  
Demonstrates the continuous ingestion and processing cycle that refreshes dashboard data every 60 seconds.

```python
def main():
    # ... (Initialization and model loading omitted) ...
    
    while True:
        try:
            if driver is None:
                driver = build_driver(args)

            # 1. Scrape latest live tweets from browser memory
            new_rows = scrape_live_batch(
                driver,
                seen_fingerprints,
                max_new=max(args.max_new, 1),
                max_scrolls=max(args.max_scrolls, 1),
                max_age_hours=args.max_age_hours,
            )
            
            # 2. Run inference (Sentiment & Topic) and append to dataset
            appended = append_results(args.csv, new_rows, sentiment_model)

            # 3. Regenerate all dashboard JSON analytics
            generate(csv_path=args.csv, output_path=args.output)
            
            # 4. Broadcast pipeline health to dashboard
            write_health(args.health_file, status="ok", appended=appended)
            
        except Exception as error:
            write_health(args.health_file, status="error", error_message=str(error))
            driver = None # Trigger restart next cycle

        time.sleep(max(args.interval, 1))
```

## Appendix B: DOM Scraping Strategy
*From `scraper.py`*  
Demonstrates the Selenium-based extraction mapping X (Twitter) DOM elements to pipeline features.

```python
def scrape_chunk(driver, start_date, end_date, master_seen_set):
    # ... (Search query construction omitted) ...
    
    while True:
        articles = driver.find_elements(By.TAG_NAME, "article")
        
        for article in articles:
            try:
                # 1. Extract and sanitize text content
                text_element = article.find_element(By.CSS_SELECTOR, '[data-testid="tweetText"]')
                clean_text = text_element.text
                
                # 2. Deduplicate using exact-text fingerprinting
                fingerprint = normalize_text(clean_text)
                if fingerprint in master_seen_set: continue

                # 3. Filter spam and promotional noise
                handle = parse_username(article)
                if is_spam(handle, clean_text): continue
                
                master_seen_set.add(fingerprint)
                
                # 4. Extract engagement metrics
                replies, reposts, likes = extract_stats(article)
                
                # 5. Apply regex/keyword heuristics for topics
                keyword_found, topic_found = determine_topic_and_keyword(clean_text)
                
                rows_collected.append([
                    handle, clean_text, timestamp, keyword_found, 
                    likes, replies, reposts, topic_found
                ])
                
            except: continue
            
        # ... (Pagination and scrolling logic omitted) ...
```

## Appendix C: Topic Modeling (BERTopic)
*From `topic_model.py`*  
Demonstrates the advanced NLP pipeline for clustering semantic meaning using sentence embeddings and HDBSCAN.

```python
# 1. HuggingFace Sentence Transformers for linguistic embedding
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

# 2. UMAP for dimensionality reduction optimized for dense tweet clustering
umap_model = UMAP(
    n_neighbors=15,
    n_components=5,
    min_dist=0.0,
    metric="cosine",
    random_state=42,
)

# 3. Custom Vectorizer targeting English + Malay stop words and n-grams
vectorizer = CountVectorizer(
    stop_words="english", # Modified to handle Malay/English mixing locally
    min_df=2,
    max_df=0.95,
    ngram_range=(1, 2),
)

# 4. BERTopic execution yielding topics and confidence probabilities
topic_model = BERTopic(
    embedding_model=embedding_model,
    umap_model=umap_model,
    vectorizer_model=vectorizer,
    nr_topics="auto",
    top_n_words=10,
    min_topic_size=5,
)

topics, probs = topic_model.fit_transform(texts)
```

## Appendix D: Transfer Learning for Sentiment
*From `train_model.py`*  
Demonstrates fine-tuning `xlm-roberta-base` for Malaysian banking context using the HuggingFace Trainer API.

```python
def train_phase(model, train_texts, train_labels, val_texts, val_labels):
    
    train_ds = SentimentDataset(train_texts, train_labels, tokenizer)
    val_ds = SentimentDataset(val_texts, val_labels, tokenizer)

    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        num_train_epochs=10,
        per_device_train_batch_size=8,
        per_device_eval_batch_size=8,
        learning_rate=1e-5,           # Low learning rate to prevent catastrophic forgetting
        weight_decay=0.01,
        warmup_ratio=0.1,
        eval_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="f1",
        greater_is_better=True,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        compute_metrics=compute_metrics,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=3)],
    )

    trainer.train()
    return model
```

## Appendix E: Risk & Velocity Analytics Engine
*From `generate_dashboard_data.py`*  
Demonstrates the programmatic calculation of the Risk Matrix and Topic Velocity metrics for the UI.

```python
# 1. Compute Risk Matrix (Severity vs Volume)
risk_matrix = []
for topic in topic_counts:
    topic_tweets = [t for t in tweets if t["topic"] == topic]
    volume = len(topic_tweets)
    
    # Calculate critical app-blocker percentage and composite impact scores
    blockers = sum(1 for t in topic_tweets if t["isBlocker"])
    avg_impact = sum(t["impactScore"] for t in topic_tweets) / max(volume, 1)
    neg_pct = sum(1 for t in topic_tweets if t["sentiment"] == "Negative") / max(volume, 1) * 100
    
    risk_matrix.append({
        "topic": topic,
        "volume": volume,
        "avgImpact": round(avg_impact, 2),
        "blockerPct": round(blockers / max(volume, 1) * 100),
        "negPct": round(neg_pct),
    })

# 2. Compute Topic Velocity (Quarter-over-Quarter Delta)
curr_neg = topic_quarter[topic].get(curr_q, {}).get("Negative", 0)
prev_neg = topic_quarter[topic].get(prev_q, {}).get("Negative", 0)

# Calculate percentage change between quarters
if prev_neg > 0:
    change_pct = round((curr_neg - prev_neg) / prev_neg * 100)
else:
    change_pct = 100 if curr_neg > 0 else 0

# Tag trajectory for visual flags
if change_pct > 20: direction = "worsening"
elif change_pct < -20: direction = "improving"
else: direction = "stable"
```
