# MAE Sentiment Insights: Project Journey

**The Goal:** Transform messy, unstructured user feedback (tweets, reviews) about the Maybank MAE App into a clear, actionable Business Intelligence (BI) tool that executives or product managers can use to immediately diagnose app health.

This project was built from absolute scratch, starting from data collection all the way to a deployed, interactive React dashboard.

---

## Phase 1: Data Collection & Machine Learning
Before building any UI, we needed raw material and intelligence.
1. **The Scraper (`scraper.py`)**: We set up a Python processing pipeline specifically targeted at mentions of the MAE App (e.g., "M2U migration", "Secure2U issues", "App frustration").
2. **The ML Engine (`generate_dashboard_data.py`)**: We couldn't just count tweets. We ran them through a categorization and sentiment analysis engine to extract meaning. 
   - We tagged every single mention as **Positive, Neutral, or Negative**.
   - We grouped them into real business **Topics** (e.g., QR Payments, Password & Login).
   - Most importantly, we developed a rigid classifier for **"Blockers"** — specifically identifying critical feedback where a user was physically blocked from completing a transaction.

## Phase 2: The MVP (Dashboard V1)
To prove the concept, we built the first iteration:
- **Stack**: Next.js (App Router), React, Recharts.
- **Features**: A straightforward dashboard featuring high-level KPIs (Total Mentions, Positive/Negative counts), a basic list of recent tweets, and a Sentiment Donut chart.
- **The Result**: It worked perfectly for reading data, but it was visually simple and required the user to manually read tweets to figure out *why* things were happening. It lacked analytical depth.

## Phase 3: The Enterprise BI Overhaul (Dashboard V2)
We tore down the V1 UI and completely rebuilt it with a hyper-modern, "Vibe-Driven" Dark/Neon aesthetic (inspired by platforms like Vercel and Linear). This phase turned the app from a simple reader into a real BI tool.

**Key V2 Upgrades:**
- **The Data Explorer**: We replaced the static tweet list with a searchable, sortable data table that highlights sentiment tags directly next to the user's raw quote.
- **Interactive Multi-Filtering**: We added custom dropdowns so you can filter the *entire* dashboard (charts, KPIs, and tweets) effortlessly by specific Sentiments (e.g., just Negative) or Topics (e.g., just "Secure2U Issues"). 
- **The Risk Analysis Engine**: We built a dedicated secondary tab designed strictly for product triage. It features a **Quarter-over-Quarter comparison** (to see if issues are getting better or worse) and a **2D Risk Matrix** scatter plot (comparing how often an issue happens vs. its negative impact).

## Phase 4: Final Polish & "The AI Analyst"
In our final iterations, we focused on making the dashboard "smart" so it does the thinking for you.

1. **Date Range Filtering**: We built a custom Date Picker with presets (Last 6 Months, 2024, etc.) that instantly recalculates the entire React state when changed.
2. **Actionable Insights Tab**: Instead of making the user guess what went wrong, we built an engine that auto-generates text recommendations based on the active data. If the "blocker rate" crosses a dangerous 15%, it immediately flags a Critical (⊘) warning. If a topic's sentiment drops dramatically, it flags a Warning (▲). 
3. **Model Transparency**: We added a "Model Performance" card that explicitly shows the ML engine's confidence distribution and agreement rate, proving the rigor of the data to stakeholders.

## Phase 5: Version Control & Deployment
Finally, we implemented professional engineering practices to ship the code.
- We set up a rigid `.gitignore` to prevent our massive 22GB ML models from clogging the repository.
- We split our commit history cleanly to show the evolution from V1 to V2.
- We utilized Git branching (`feature/v2-dashboard`) to isolate our highly-experimental upgrades from the stable `main` branch, culminating in a successful push to GitHub.

---

**Summary:** What started as a script to scrape angry tweets evolved into a full-stack, state-aware React BI application equipped with a custom filtering engine, predictive risk matrices, and automated UX auditing.
