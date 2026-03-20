# Sentiment Insights Dashboard

This project is an interactive dashboard for analyzing user feedback on the MAE banking app. It focuses on **sentiment analysis** and **topic modeling** to help understand what users are talking about and how they feel.

## Project Overview

The pipeline roughly looks like this:

1. Collect user feedback data (e.g., from X/Twitter and other sources).
2. Clean and preprocess the text data.
3. Label or predict sentiment (positive, neutral, negative).
4. Extract topics from the feedback.
5. Aggregate the results into a format suitable for visualization.
6. Display insights in a dashboard.

## Repository Structure

- `.agent` – configuration or helper files for the development environment.
- `dashboard/` – frontend code for the interactive dashboard (e.g., Next.js).
- `topics/` – topic modeling outputs or related assets.
- `clean_csv.py` – cleans raw CSV files.
- `cleaner.py`, `cleaner_dupe.py` – scripts for text cleaning and duplicate handling.
- `generate_dashboard_data.py` – prepares data for the dashboard.
- `label_data.py` – labeling sentiment or preparing training labels.
- `merge_corrections.py` – merges manual corrections into datasets.
- `pilot_scraper.py`, `scraper.py`, `scraperW.py` – scripts to scrape or collect feedback data.
- `preprocess.py` – preprocessing pipeline for text data.
- `topic_model.py` – trains or runs the topic modeling.
- `train_model.py` – trains the sentiment classification model.

## Tech Stack

- Python for data collection, cleaning, modeling, and preprocessing.
- Machine learning / NLP libraries (e.g., scikit-learn, spaCy, or similar).
- Dashboard built with a modern web framework (e.g., Next.js) for interactive visualization.

## How to Run (High-Level)

1. Set up a Python environment and install required dependencies.
2. Run the scraper and cleaning scripts to generate processed datasets.
3. Train or load models for sentiment analysis and topic modeling.
4. Generate dashboard-ready data using `generate_dashboard_data.py`.
5. Start the dashboard app (from the `dashboard` directory) and view insights in the browser.

## Near Real-Time Writer (1-minute refresh)

To continuously generate dashboard-compatible realtime JSON for the API fallback flow:

```bash
python realtime_writer.py --csv mae_results.csv --output dashboard/public/realtime/data_latest.json --interval 60
```

This updates `dashboard/public/realtime/data_latest.json` every 60 seconds.

## True Near-Real-Time Pipeline (Scrape + Inference + Dashboard)

To continuously scrape new tweets, append into `mae_results.csv`, run sentiment/topic assignment, and refresh dashboard JSON in one loop:

```bash
python realtime_pipeline.py --csv mae_results.csv --output dashboard/public/realtime/data_latest.json --interval 60 --max-new 20
```

This pipeline can run in attach-mode (default, recommended) and performs:
- Live scrape from X search
- De-dup append to `mae_results.csv`
- Sentiment inference (model if available, heuristic fallback)
- Topic assignment
- Rebuild `dashboard/public/realtime/data_latest.json`

## True Always-On (macOS launchd + dedicated Chrome profile)

This project now includes a launch agent template at:

`scripts/com.sentiment.realtime.pipeline.plist`

### 1) Start your normal Chrome in remote-debug mode (already logged into X)

Run Chrome with debugger port 9222 (you can keep using your normal profile/session):

```bash
open -na "Google Chrome" --args --remote-debugging-port=9222
```

### 2) Prepare logs folder

```bash
mkdir -p /Users/lawalah/Documents/sentiment_project/logs
```

### 3) Install and start launch agent

```bash
cp /Users/lawalah/Documents/sentiment_project/scripts/com.sentiment.realtime.pipeline.plist /Users/lawalah/Library/LaunchAgents/com.sentiment.realtime.pipeline.plist
launchctl bootstrap gui/$(id -u) /Users/lawalah/Library/LaunchAgents/com.sentiment.realtime.pipeline.plist
launchctl enable gui/$(id -u)/com.sentiment.realtime.pipeline
launchctl kickstart -k gui/$(id -u)/com.sentiment.realtime.pipeline
```

### 4) Check status

```bash
launchctl print gui/$(id -u)/com.sentiment.realtime.pipeline | head -n 40
tail -f /Users/lawalah/Documents/sentiment_project/logs/realtime_pipeline.out.log
```

### 5) Stop / remove service

```bash
launchctl bootout gui/$(id -u) /Users/lawalah/Library/LaunchAgents/com.sentiment.realtime.pipeline.plist
rm /Users/lawalah/Library/LaunchAgents/com.sentiment.realtime.pipeline.plist
```

Health file is written every cycle to:

`dashboard/public/realtime/pipeline_health.json`

Attach-mode details in [`realtime_pipeline.py`](realtime_pipeline.py):
- [`--browser-mode attach`](realtime_pipeline.py:314)
- [`--debugger-address 127.0.0.1:9222`](realtime_pipeline.py:321)

## FYP MVP Always-On on Single VM (recommended)

For stronger uptime than laptop-only runtime, deploy pipeline + dashboard API on one Linux VM and keep local laptop as warm backup.

VM deployment assets:
- `scripts/vm/run_realtime_pipeline.sh`
- `scripts/vm/run_dashboard_api.sh`
- `scripts/vm/sentiment-pipeline.service`
- `scripts/vm/sentiment-dashboard.service`
- `scripts/vm/deploy_vm_mvp.sh`

### 1) Prepare VM project directory

```bash
sudo mkdir -p /opt/sentiment_project
sudo chown -R $USER:$USER /opt/sentiment_project
```

### 2) Deploy code to VM

Copy this repository to `/opt/sentiment_project`.

### 3) Install services

```bash
cd /opt/sentiment_project
bash scripts/vm/deploy_vm_mvp.sh
```

### 4) Check service status

```bash
systemctl status sentiment-pipeline.service --no-pager
systemctl status sentiment-dashboard.service --no-pager
tail -f /opt/sentiment_project/logs/realtime_pipeline.out.log
```

### 5) Local laptop warm backup (manual failover)

If VM is unavailable, run local launch agent fallback:

```bash
launchctl kickstart -k gui/$(id -u)/com.sentiment.realtime.pipeline
```

This fallback uses:
- `scripts/com.sentiment.realtime.pipeline.plist`
- `dashboard/public/realtime/data_latest.json`
- `dashboard/public/realtime/pipeline_health.json`

## Project Goal

The goal is to provide **actionable insights** about MAE app user feedback, helping stakeholders quickly see:
- Key themes users talk about,
- Overall sentiment trends,
- Pain points and areas for improvement.
