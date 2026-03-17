"""
Near-real-time ingest + inference + dashboard refresh pipeline.

What this does in one loop:
1) Pull fresh MAE tweets from X live search (Selenium, attach-mode to Chrome debugger)
2) Append only new rows into mae_results.csv
3) Apply sentiment + topic assignment for appended rows
4) Regenerate dashboard realtime JSON

Notes:
- Uses model sentiment if transformers is installed, otherwise heuristic fallback.
- Topic assignment uses existing keyword/topic heuristics from scraper.py.
- Intended to run as an always-on background job (e.g. launchd on macOS).
- Default browser mode is attach-mode at 127.0.0.1:9222.
"""

import argparse
import csv
import json
import os
import time
import urllib.parse
from datetime import datetime, timedelta, timezone

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By

from generate_dashboard_data import generate
from scraper import (
    QUERY_APP_NAMES,
    QUERY_EXCLUSIONS,
    determine_topic_and_keyword,
    extract_stats,
    guess_sentiment,
    is_spam,
    normalize_text,
)


DEFAULT_CSV = "mae_results.csv"
DEFAULT_OUTPUT = "dashboard/public/realtime/data_latest.json"
DEFAULT_HEALTH_FILE = "dashboard/public/realtime/pipeline_health.json"


TOPIC_FROM_KEYWORD = {
    "transaction_issue": (0, "0_mae app_mae_mymaybank_app"),
    "security_access": (4, "4_secure2u_phone_activate_mae app"),
    "feature_usability": (8, "8_manage_movie_saving_save"),
    "system_stability": (5, "5_maybank mae_maybank_fuck_mae"),
    "general_service": (1, "1_maybank app_maybank_app_mae"),
    "general": (-1, "Outlier"),
}


STRICT_RELEVANCE_TERMS = [
    "mae",
    "maybank",
    "m2u",
    "secure2u",
    "duitnow",
    "qr",
    "tabung",
    "transfer",
    "transaction",
    "login",
    "password",
    "otp",
]


USER_FEEDBACK_TERMS = [
    "cannot",
    "can't",
    "cant",
    "issue",
    "problem",
    "error",
    "down",
    "stuck",
    "slow",
    "failed",
    "unsuccessful",
    "refund",
    "why",
    "how",
    "help",
    "please",
    "i ",
    "my ",
    "me ",
    "we ",
]


PROMO_NOISE_PATTERNS = [
    "guaranteed results",
    "bonus",
    "deposit",
    "register now",
    "promo",
    "campaign",
    "for sale",
    "shop now",
    "buy now",
    "limited time",
    "terms and conditions",
]


BRANDISH_HANDLE_TOKENS = [
    "official",
    "malaysia",
    "studio",
    "news",
    "prime",
    "ai",
    "toyota",
    "nike",
]


def load_existing_fingerprints(csv_path):
    seen = set()
    try:
        with open(csv_path, encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                text = (row.get("Text") or "").strip()
                if text:
                    seen.add(normalize_text(text))
    except FileNotFoundError:
        pass
    return seen


def setup_persistent_driver(chrome_user_data_dir, chrome_profile_directory, chromedriver_path=None, headless=False):
    os.makedirs(chrome_user_data_dir, exist_ok=True)

    options = Options()
    options.add_argument(f"--user-data-dir={chrome_user_data_dir}")
    options.add_argument(f"--profile-directory={chrome_profile_directory}")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--no-sandbox")
    options.add_argument("--window-size=1600,1000")
    if headless:
        options.add_argument("--headless=new")

    if chromedriver_path:
        return webdriver.Chrome(service=Service(executable_path=chromedriver_path), options=options)

    return webdriver.Chrome(options=options)


def setup_attach_driver(debugger_address, chromedriver_path=None):
    options = Options()
    options.add_experimental_option("debuggerAddress", debugger_address)

    if chromedriver_path:
        return webdriver.Chrome(service=Service(executable_path=chromedriver_path), options=options)

    return webdriver.Chrome(options=options)


def load_sentiment_model():
    try:
        import torch
        from transformers import pipeline

        device = "mps" if torch.backends.mps.is_available() else "cpu"
        model = pipeline(
            "sentiment-analysis",
            model="cardiffnlp/twitter-roberta-base-sentiment-latest",
            device=device,
            truncation=True,
            max_length=512,
        )
        print("✅ Sentiment model loaded: cardiffnlp/twitter-roberta-base-sentiment-latest")
        return model
    except Exception as error:
        print(f"⚠️ Sentiment model unavailable, fallback to heuristic: {error}")
        return None


def infer_sentiment(text, model):
    if model is None:
        return guess_sentiment(text), "0.50"

    try:
        result = model(text[:512])[0]
        label_map = {
            "positive": "Positive",
            "neutral": "Neutral",
            "negative": "Negative",
        }
        label = label_map.get(result["label"].lower(), "Neutral")
        return label, f"{float(result['score']):.4f}"
    except Exception:
        return guess_sentiment(text), "0.50"


def parse_iso_datetime(value):
    if not value or value == "Unknown":
        return None
    try:
        # X timestamps are usually ISO8601 with trailing Z
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)
    except Exception:
        return None


def is_recent_timestamp(timestamp, max_age_hours):
    if max_age_hours <= 0:
        return True

    parsed = parse_iso_datetime(timestamp)
    if parsed is None:
        return False

    cutoff = datetime.now(timezone.utc) - timedelta(hours=max_age_hours)
    return parsed >= cutoff


def is_high_signal_user_feedback(handle, text):
    text_lower = (text or "").lower()
    handle_lower = (handle or "").lower()

    if not text_lower:
        return False

    # Must be in MAE/Maybank user-feedback context.
    if not any(term in text_lower for term in STRICT_RELEVANCE_TERMS):
        return False

    # Must look like user sentiment/question/experience, not generic broadcast copy.
    if not any(term in text_lower for term in USER_FEEDBACK_TERMS):
        return False

    # Reject obvious promotional/marketing phrasing.
    if any(term in text_lower for term in PROMO_NOISE_PATTERNS):
        return False

    # Reject high-probability brand/broadcast handles.
    if any(token in handle_lower for token in BRANDISH_HANDLE_TOKENS):
        return False

    return True


def scrape_live_batch(
    driver,
    seen_fingerprints,
    max_new=20,
    max_scrolls=8,
    max_age_hours=24,
    allow_unknown_time=False,
):
    rows = []

    for app_name in QUERY_APP_NAMES:
        query = f'(lang:en OR lang:ms) {app_name} {QUERY_EXCLUSIONS}'
        encoded_query = urllib.parse.quote(query)
        url = f"https://x.com/search?q={encoded_query}&src=typed_query&f=live"
        driver.get(url)
        time.sleep(2)

        scroll_attempts = 0
        last_height = driver.execute_script("return document.body.scrollHeight")

        while scroll_attempts <= max_scrolls and len(rows) < max_new:
            articles = driver.find_elements(By.TAG_NAME, "article")
            if not articles:
                time.sleep(1)
                scroll_attempts += 1
                continue

            for article in articles:
                if len(rows) >= max_new:
                    break

                try:
                    try:
                        text_element = article.find_element(By.CSS_SELECTOR, '[data-testid="tweetText"]')
                        text = text_element.text.strip()
                    except Exception:
                        continue

                    if not text:
                        continue

                    fp = normalize_text(text)
                    if fp in seen_fingerprints:
                        continue

                    try:
                        user_element = article.find_element(By.CSS_SELECTOR, '[data-testid="User-Name"]')
                        user_text = user_element.text
                        handle = "Unknown"
                        for line in user_text.split("\n"):
                            if line.startswith("@"):
                                handle = line.strip()
                                break
                    except Exception:
                        handle = "Unknown"

                    if is_spam(handle, text):
                        continue

                    if not is_high_signal_user_feedback(handle, text):
                        continue

                    try:
                        time_element = article.find_element(By.TAG_NAME, "time")
                        timestamp = time_element.get_attribute("datetime") or "Unknown"
                    except Exception:
                        timestamp = "Unknown"

                    if timestamp == "Unknown" and not allow_unknown_time:
                        continue

                    if not is_recent_timestamp(timestamp, max_age_hours=max_age_hours):
                        continue

                    replies, reposts, likes = extract_stats(article)
                    keyword, _topic_name = determine_topic_and_keyword(text)
                    topic_id, topic_label = TOPIC_FROM_KEYWORD.get(keyword, (-1, "Outlier"))

                    rows.append(
                        {
                            "Username": handle,
                            "Text": text,
                            "Time": timestamp,
                            "Keyword": keyword,
                            "Likes": likes,
                            "Comments": replies,
                            "Reposts": reposts,
                            "Topic_ID": str(topic_id),
                            "Topic_Label": topic_label,
                        }
                    )
                    seen_fingerprints.add(fp)
                except Exception:
                    continue

            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(1.5)
            new_height = driver.execute_script("return document.body.scrollHeight")
            if new_height == last_height:
                scroll_attempts += 1
            else:
                last_height = new_height
                scroll_attempts = 0

        if len(rows) >= max_new:
            break

    return rows


def ensure_csv_header(csv_path):
    headers = [
        "Username",
        "Text",
        "Time",
        "Keyword",
        "Likes",
        "Comments",
        "Reposts",
        "Sentiment_Label",
        "Topic_Label",
        "Old_Label",
        "Predicted_Label",
        "Confidence",
        "Topic_ID",
    ]
    try:
        with open(csv_path, encoding="utf-8-sig") as f:
            reader = csv.reader(f)
            first = next(reader, None)
            if first == headers:
                return
    except FileNotFoundError:
        pass

    with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(headers)


def append_results(csv_path, rows, sentiment_model):
    if not rows:
        return 0

    with open(csv_path, "a", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        for row in rows:
            sentiment, confidence = infer_sentiment(row["Text"], sentiment_model)
            writer.writerow(
                [
                    row["Username"],
                    row["Text"],
                    row["Time"],
                    row["Keyword"],
                    row["Likes"],
                    row["Comments"],
                    row["Reposts"],
                    sentiment,
                    row["Topic_Label"],
                    sentiment,
                    sentiment,
                    confidence,
                    row["Topic_ID"],
                ]
            )
    return len(rows)


def write_health(path, status, appended, error_message=None):
    payload = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "status": status,
        "appended": appended,
        "error": error_message,
    }
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def utc_now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def build_driver(args):
    if args.browser_mode == "attach":
        return setup_attach_driver(
            debugger_address=args.debugger_address,
            chromedriver_path=args.chromedriver_path,
        )

    return setup_persistent_driver(
        chrome_user_data_dir=args.chrome_user_data_dir,
        chrome_profile_directory=args.chrome_profile_directory,
        chromedriver_path=args.chromedriver_path,
        headless=args.headless,
    )


def main():
    parser = argparse.ArgumentParser(description="Near-realtime scraper + model inference + dashboard writer")
    parser.add_argument("--csv", default=DEFAULT_CSV, help="Pipeline output CSV (mae_results-compatible)")
    parser.add_argument("--output", default=DEFAULT_OUTPUT, help="Realtime dashboard JSON path")
    parser.add_argument("--interval", type=int, default=60, help="Loop interval in seconds")
    parser.add_argument("--max-new", type=int, default=20, help="Max new tweets per cycle")
    parser.add_argument("--max-scrolls", type=int, default=8, help="Max no-growth scroll retries per query")
    parser.add_argument(
        "--max-age-hours",
        type=int,
        default=24,
        help="Only append tweets newer than this many hours (<=0 disables age filtering)",
    )
    parser.add_argument(
        "--allow-unknown-time",
        action="store_true",
        help="Allow appending rows when tweet timestamp is missing/unknown",
    )
    parser.add_argument("--health-file", default=DEFAULT_HEALTH_FILE, help="Health status JSON for monitoring")
    parser.add_argument(
        "--browser-mode",
        choices=["attach", "persistent"],
        default="attach",
        help="Browser connection mode: attach to existing Chrome debugger, or launch persistent profile",
    )
    parser.add_argument(
        "--debugger-address",
        default="127.0.0.1:9222",
        help="Chrome remote debugger address for attach mode",
    )
    parser.add_argument(
        "--chrome-user-data-dir",
        default="/Users/lawalah/Library/Application Support/Google/Chrome-RealTimeX",
        help="Chrome user data directory for persistent login session",
    )
    parser.add_argument(
        "--chrome-profile-directory",
        default="Default",
        help="Chrome profile directory inside user-data-dir",
    )
    parser.add_argument(
        "--chromedriver-path",
        default=None,
        help="Optional explicit chromedriver path",
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Run Chrome in headless mode (not recommended for login bootstrap)",
    )
    args = parser.parse_args()

    print("🚀 Starting near-realtime pipeline")
    print(f"   csv: {args.csv}")
    print(f"   output: {args.output}")
    print(f"   interval: {args.interval}s")
    print(f"   max_new_per_cycle: {args.max_new}")
    print(f"   max_age_hours: {args.max_age_hours}")
    print(f"   allow_unknown_time: {args.allow_unknown_time}")
    print(f"   health_file: {args.health_file}")
    print(f"   browser_mode: {args.browser_mode}")
    print(f"   debugger_address: {args.debugger_address}")
    print(f"   chrome_user_data_dir: {args.chrome_user_data_dir}")
    print(f"   chrome_profile_directory: {args.chrome_profile_directory}")

    ensure_csv_header(args.csv)
    seen_fingerprints = load_existing_fingerprints(args.csv)
    print(f"📌 Loaded dedupe fingerprints: {len(seen_fingerprints)}")

    sentiment_model = load_sentiment_model()
    driver = None
    write_health(args.health_file, status="starting", appended=0, error_message=None)

    while True:
        started = utc_now_iso()
        try:
            if driver is None:
                driver = build_driver(args)

            new_rows = scrape_live_batch(
                driver,
                seen_fingerprints,
                max_new=max(args.max_new, 1),
                max_scrolls=max(args.max_scrolls, 1),
                max_age_hours=args.max_age_hours,
                allow_unknown_time=args.allow_unknown_time,
            )
            appended = append_results(args.csv, new_rows, sentiment_model)
            print(f"✅ ingest complete at {started} | appended={appended}")

            generate(csv_path=args.csv, output_path=args.output)
            print(f"✅ dashboard refresh complete at {utc_now_iso()}")
            write_health(args.health_file, status="ok", appended=appended, error_message=None)
        except Exception as error:
            print(f"❌ cycle failed at {started}: {error}")
            write_health(args.health_file, status="error", appended=0, error_message=str(error))
            try:
                if driver is not None:
                    driver.quit()
            except Exception:
                pass
            time.sleep(3)
            driver = None
            print("🔁 Selenium driver marked for restart on next cycle")

        time.sleep(max(args.interval, 1))


if __name__ == "__main__":
    main()
