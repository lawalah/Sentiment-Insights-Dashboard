import csv
import time
import os
import re
import urllib.parse
from datetime import datetime, timedelta
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options

# 1) Config
OUTPUT_FILE = 'phase2_data_final_balanced.csv'
TARGET_PER_CHUNK = 50 

# DATE RANGE: Jan 1, 2024 to Feb 28, 2026 (26 Months)
END_DATE = datetime(2026, 2, 28)
START_DATE = datetime(2024, 1, 1)

# --- 2. DUAL QUERY STRATEGY ---
# Query A: Safe App Names (Can use broad adjectives like 'slow', 'best')
QUERY_A_APPS = '("MAE app" OR "Maybank app" OR "M2U app" OR "Maybank2u" OR "Maybank MAE")'
QUERY_A_KEYWORDS = '(down OR slow OR jem OR crash OR login OR secure2u OR tac OR otp OR transfer OR duitnow OR qr OR scan OR tolak OR deduct OR refund OR balance OR screenshot OR ss OR tabung OR "apple pay" OR "tak boleh" OR "can\'t" OR best OR mudah OR suka)'

# Query B: Risky "MAE" (Must use STRICT banking terms only. NO 'best', 'down', 'slow')
QUERY_B_APPS = '("MAE")'
QUERY_B_KEYWORDS = '(login OR secure2u OR tac OR otp OR transfer OR duitnow OR qr OR scan OR tolak OR deduct OR refund OR balance OR baki OR screenshot OR receipt OR resit OR tabung OR "apple pay" OR emas OR gold)'

# --- 3. FILTERING RULES ---
BLOCKED_USERS = [
    '@MyMaybank', '@RinggitPlus', '@SAYS', '@Vocket', '@Bernama', '@Guideaskm', '@grok',
    '@NewsBFM', '@askmaybank', '@501Awani', '@zalehaabidin', '@MaybankID', '@xcess927',
    '@ThaigerNews', '@AnarchistFedNet', '@RappLucy', '@BernamaBiz', '@FintechNewsMy'
]

PROMO_KEYWORDS = [
    '#ItsGottaBeMae', 'Download now', 'T&C apply', 'promotion', 'contest', 
    'giveaway', 'apply now', 'campaign period', 'win prizes', 'cashback',
    'register now', 'find out more', 'terms and conditions'
]

SPAM_KEYWORDS = [
    # Names & Places (The "Mae" Noise)
    'fannie mae', 'molly-mae', 'molly mae', 'mae hong son', 'thailand', 'brazil', 
    'chiang mai', 'donna mae', 'mary mae', 'sallie mae', 'mae west', 'minneapolis',
    'anna mae', 'ellie mae', 'mae martin', 'mae whitman', 'nurse', 'clinic',
    'general hospital', 'gh', 'ward', 'maggie mae', 'sally mae', 'baby sea',
    
    # K-Pop/Music
    'ktown', 'musinsa', 'smstore', 'kpopstore', 'weverse', 'photocard', 
    'wts', 'wtb', 'wtt', 'poca', 'withmuu', 'soundwave', 'makestar', 
    'ygselect', 'kream', 'oliveyoung', 'bunjang', 'GO ', 'group order',
    'nike', 'adidas', 'gmarket', 'carousell', 'rhythm game', 'deemo', 
    'cytus', 'music prod', 'fauna', 'djmax', 'enhypen', 'heeseung', 
    'sunghoon', 'polaroid', 'dicon', 'fate', 'ums', 'BTS', 'Lucky Draw', 
    'luckydraw', 'Jimin', 'jungkook', 'stream', 'comeback', 'teaser'
]

def generate_weekly_chunks(start_date, end_date):
    chunks = []
    current = end_date
    while current > start_date:
        chunk_start = current - timedelta(days=7)
        chunks.append((chunk_start.strftime("%Y-%m-%d"), current.strftime("%Y-%m-%d")))
        current = chunk_start
    return chunks

def setup_driver():
    print("🔹 Connecting to existing Chrome window...")
    options = Options()
    options.add_experimental_option("debuggerAddress", "127.0.0.1:9222")
    try:
        driver = webdriver.Chrome(options=options)
        return driver
    except Exception as e:
        print("\n❌ ERROR: Could not connect to Chrome.")
        print("Make sure you ran the 'open -na...' command in Terminal first!")
        raise e

def normalize_text(text):
    """Creates a fingerprint to detect duplicates."""
    return re.sub(r'\s+', '', text).lower()

def clean_existing_file():
    """Reads the CSV, removes duplicates, and re-saves it CLEAN."""
    if not os.path.exists(OUTPUT_FILE):
        return set()
    
    print("🧹 Cleaning existing file to remove duplicates...")
    unique_fingerprints = set()
    clean_rows = []
    
    try:
        with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            headers = next(reader, None)
            if headers: clean_rows.append(headers)
            
            for row in reader:
                if len(row) < 2: continue
                fingerprint = normalize_text(row[1])
                
                if fingerprint not in unique_fingerprints:
                    unique_fingerprints.add(fingerprint)
                    clean_rows.append(row)
    except:
        return set()

    # Rewrite the file without duplicates
    with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerows(clean_rows)
        
    print(f"✅ File Cleaned. Kept {len(unique_fingerprints)} unique rows.")
    return unique_fingerprints

def is_foreign_text(text):
    if re.search(r'[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]', text): return True
    if re.search(r'[\uac00-\ud7af]', text): return True
    return False

def is_spam(user, text):
    text_lower = text.lower()
    if is_foreign_text(text): return True
    if user in BLOCKED_USERS: return True
    for k in PROMO_KEYWORDS:
        if k.lower() in text_lower: return True
    for k in SPAM_KEYWORDS:
        if k.lower() in text_lower: return True
    if re.search(r'rm\d+/\w+', text_lower): return True
    if re.search(r'\d+/\d+ set', text_lower): return True
    return False

def extract_stats(article):
    try:
        group = article.find_element(By.CSS_SELECTOR, 'div[role="group"]')
        text = group.get_attribute("aria-label") 
        if not text: return ("0", "0", "0")
        replies, reposts, likes = "0", "0", "0"
        
        rep_match = re.search(r'(\d+[KkMm]?)\s+repl', text)
        if rep_match: replies = rep_match.group(1)
        
        ret_match = re.search(r'(\d+[KkMm]?)\s+repost', text)
        if ret_match: reposts = ret_match.group(1)
        
        like_match = re.search(r'(\d+[KkMm]?)\s+like', text)
        if like_match: likes = like_match.group(1)
        return (replies, reposts, likes)
    except:
        return ("0", "0", "0")

def determine_topic_and_keyword(text):
    text_lower = text.lower()
    if re.search(r'\bss\b', text_lower) or any(k in text_lower for k in ["screenshot", "receipt", "resit", "proof"]):
        return ("screenshot/ss", "Feature Usability")
    if any(k in text_lower for k in ["tabung", "apple pay", "gold", "emas", "dark mode", "ui", "interface"]):
        return ("feature_positive", "Feature Usability")
    if any(k in text_lower for k in ["secure2u", "overlay", "tac", "otp", "cooling", "biometric", "scam"]):
        return ("secure2u/security", "Security & Access")
    if any(k in text_lower for k in ["login", "log in", "masuk", "cant login", "password", "reset"]):
        return ("login_failure", "Security & Access")
    if any(k in text_lower for k in ["tolak", "deduct", "refund", "balance", "baki", "missing", "short"]):
        return ("missing_money", "Transaction Failures")
    if any(k in text_lower for k in ["qr", "scan", "transfer", "duitnow", "pay", "payment"]):
        return ("payment_fail", "Transaction Failures")
    if any(k in text_lower for k in ["down", "crash", "jem", "slow", "loading", "pusing", "stuck", "lag"]):
        return ("downtime", "System Stability")
    return ("general", "General Service")

def guess_sentiment(text):
    text_lower = text.lower()
    pos_words = ['suka', 'love', 'best', 'good', 'mudah', 'easy', 'laju', 'fast', 'useful', 'nice', 'mantap', 'terbaik', 'berguna', 'smooth']
    if any(w in text_lower for w in pos_words): return "Positive"
    neg_words = ['slow', 'lambat', 'jem', 'stuck', 'down', 'crash', 'benci', 'hate', 'cannot', 'cant', 'not', 'suck', 'bodoh', 'stupid', 'babi', 'sial', 'problem', 'masalah', 'hassle', 'bugs', 'issue', 'fail', 'gagal', 'tak boleh', "can't", 'broken', 'disappointed', 'kenot', 'teruk', 'useless', 'leceh', 'susah', 'tired', 'penat', 'scam', 'reset', 'frustrated']
    if any(w in text_lower for w in neg_words): return "Negative"
    neu_words = ['how', 'macam mana', 'tanya', 'ask', 'question', 'kenapa', 'why', 'nape']
    if any(w in text_lower for w in neu_words): return "Neutral"
    return "Neutral"

def scrape_chunk(driver, start_date, end_date, master_seen_set):
    # Run TWICE: Once for App Names (Broad), Once for MAE (Strict)
    queries = [
        f'(lang:en OR lang:ms) {QUERY_A_APPS} {QUERY_A_KEYWORDS} since:{start_date} until:{end_date} -filter:retweets',
        f'(lang:en OR lang:ms) {QUERY_B_APPS} {QUERY_B_KEYWORDS} since:{start_date} until:{end_date} -filter:retweets'
    ]
    
    rows_collected = []
    
    for query in queries:
        encoded_query = urllib.parse.quote(query)
        url = f"https://x.com/search?q={encoded_query}&src=typed_query&f=live"
        driver.get(url)
        time.sleep(3)

        scroll_attempts = 0
        last_height = driver.execute_script("return document.body.scrollHeight")
        
        # Scrape loop for this sub-query
        while True:
            articles = driver.find_elements(By.TAG_NAME, "article")
            if not articles:
                time.sleep(2)
                if scroll_attempts > 6: break
            
            for article in articles:
                try:
                    try:
                        text_element = article.find_element(By.CSS_SELECTOR, '[data-testid="tweetText"]')
                        clean_text = text_element.text
                    except: continue 

                    fingerprint = normalize_text(clean_text)
                    if fingerprint in master_seen_set: continue

                    try:
                        user_element = article.find_element(By.CSS_SELECTOR, '[data-testid="User-Name"]')
                        user_text = user_element.text
                        handle = "Unknown"
                        for line in user_text.split('\n'):
                            if line.startswith('@') and '@' in line:
                                handle = line.strip()
                                break
                    except: handle = "Unknown"

                    if is_spam(handle, clean_text): continue

                    # Success - Add to memory and list
                    master_seen_set.add(fingerprint)
                    
                    try:
                        time_element = article.find_element(By.TAG_NAME, "time")
                        timestamp = time_element.get_attribute("datetime") 
                    except: timestamp = "Unknown"

                    replies, reposts, likes = extract_stats(article)
                    keyword_found, topic_found = determine_topic_and_keyword(clean_text)
                    sentiment_guess = guess_sentiment(clean_text)

                    rows_collected.append([handle, clean_text, timestamp, keyword_found, likes, replies, reposts, sentiment_guess, topic_found])
                    print(f"✅ Found: {clean_text[:20]}...")

                except: continue
                
            if len(rows_collected) >= TARGET_PER_CHUNK: break # Move to next week if target hit

            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
            new_height = driver.execute_script("return document.body.scrollHeight")
            if new_height == last_height:
                scroll_attempts += 1
                if scroll_attempts > 6: break
            else:
                last_height = new_height
                scroll_attempts = 0
                
        if len(rows_collected) >= TARGET_PER_CHUNK: break # Stop if we have enough for this week

    return rows_collected

def save_to_csv_append(data):
    file_exists = os.path.exists(OUTPUT_FILE)
    with open(OUTPUT_FILE, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(["Username", "Text", "Time", "Keyword", "Likes", "Comments", "Reposts", "Sentiment_Label", "Topic_Label"]) 
        writer.writerows(data)
    print(f"💾 Appended {len(data)} rows to {OUTPUT_FILE}")

if __name__ == "__main__":
    try:
        driver = setup_driver()
        
        # 1. CLEAN EXISTING FILE FIRST
        master_seen_set = clean_existing_file()
        
        chunks = generate_weekly_chunks(START_DATE, END_DATE)
        print(f"🚀 Created {len(chunks)} weekly search chunks.")
        
        for i, (start, end) in enumerate(chunks):
            print(f"\n--- Chunk {i+1}/{len(chunks)}: {start} to {end} ---")
            try:
                chunk_data = scrape_chunk(driver, start, end, master_seen_set)
                if chunk_data:
                    save_to_csv_append(chunk_data)
                time.sleep(2) 
            except Exception as e:
                print(f"⚠️ Error: {e}")
                continue
            
        print("\n✅ ALL CHUNKS COMPLETED.")
    except Exception as e:
        print(f"Error: {e}")