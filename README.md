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

## Project Goal

The goal is to provide **actionable insights** about MAE app user feedback, helping stakeholders quickly see:
- Key themes users talk about,
- Overall sentiment trends,
- Pain points and areas for improvement.
