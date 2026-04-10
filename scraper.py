import csv
import time
import os
import re
import argparse
import urllib.parse
from datetime import datetime, timedelta
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options

# --- 1. CONFIGURATION ---
OUTPUT_FILE = 'sentiment_data.csv'
TARGET_PER_CHUNK = 50 

# DATE RANGE: Jan 1, 2024 to Feb 28, 2026 (26 Months)
END_DATE = datetime(2026, 3, 12)
START_DATE = datetime(2026, 2, 16)

# --- 2. QUERY STRATEGY ---
# Each app name gets its OWN short query (no keyword requirement).
# This avoids X's query length limits and maximizes results.
# The app name alone (e.g. "MAE app") provides enough context.
QUERY_APP_NAMES = [
    '"MAE app"',
    '"Maybank app"',
    '"M2U app"',
    '"Maybank MAE"',
]

# Exclusions appended to every query to block noise
QUERY_EXCLUSIONS = '-filter:retweets -("Molly Mae" OR "Fannie Mae" OR "Sallie Mae")'

# --- 3. FILTERING RULES ---
BLOCKED_USERS = [
    '@MyMaybank', '@RinggitPlus', '@SAYS', '@Vocket', '@Bernama', '@Guideaskm', '@grok',
    '@NewsBFM', '@askmaybank', '@501Awani', '@zalehaabidin', '@MaybankID', '@xcess927',
    '@ThaigerNews', '@AnarchistFedNet', '@RappLucy', '@BernamaBiz', '@FintechNewsMy',
    '@wadekwright', '@faborsky', '@faborsky1', '@LowyatNET', '@loaborsky',
    # News outlets
    '@cryptoguidemy', '@BernamaTV', '@theedgemalaysia', '@technavemy',
    '@therakyatpost', '@ForABetterMY', '@Soya_Cincau', '@staronline',
    '@saysdotcom', '@emohengz',
    # Promo/Advertising/Product listings
    '@HypeMY', '@WowMedia_My', '@BeliSiniLah',
    # Borderline: promo-style threads / news commentary
    '@faierahmat', '@Jeff4Malaysia', '@ketuakampong',
    # New news outlets (found in round 2 scan)
    '@newswav', '@NST_Online', '@NarrativeNetwrk', '@PocketNewsMy',
    '@fmtoday', '@Scoopdotmy', '@tech_trp', '@WetixM',
    # Philippines Maybank news (not about MAE app Malaysia)
    '@philstarbiznews', '@SpeedPHOfficial', '@ChitoBauzon',
    '@nextfeatureph', '@everytechever', '@tribunephl',
    # Promotional content creators
    '@liolisyitikl', '@bosecx', '@Shah976487872',
    '@performerDARA', '@darryiskandar', '@kyechicka',
    # Round 3: spam, wrong bank, news, non-English false positives
    '@MantappMy',        # nicotine pouch ad spam, completely unrelated
    '@RhudeboyT',        # tweets about UBA Cameroon M2U, not Maybank MAE
    '@QRTuning',         # news aggregator
    '@TMReserve',        # news outlet
    '@FinanceMalaysia',  # finance blog
    '@Rajput87Prakash',  # Hindi text, "mae app" = "I to you" in Hindi
    '@Free14836381488',  # spam bot with garbled URLs
    '@liyudiboo',        # referral code spam (misspelled "refferal")
    # Round 3 borderline → filtered
    '@syaafadil',        # coordinated promo campaign copy
    '@eevetanntlsk',     # coordinated promo campaign copy
    '@woohye_subot',     # MAE mentioned in passing (bluray purchase)
    '@ruffleseed',       # prize mention, not app sentiment
    '@TheFuturizts',     # promotional threads (car insurance, feature lists)
    '@edthehairyfairy',  # dating/social
]

PROMO_KEYWORDS = [
    '#ItsGottaBeMae', 'Download now', 'T&C apply', 'promotion', 'contest', 
    'giveaway', 'apply now', 'campaign period', 'win prizes', 'cashback',
    'register now', 'find out more', 'terms and conditions',
    # User-reported promo/news keywords
    '#JomTabung', '#MAETabung', 'win another', 'campaign page', 'chance to win',
    '#NSTBusinessTimes', 'currency conversion fee', 'retail payments', 
    'via the MAE', 'mobile application',
    # Fintech news / press releases
    '#fintechnews', '#bankingtech', '#retailtech', '#ecommercenews',
    'fintechnews.my', 'fintechnews.sg', 'finextra.com',
    'lowy.at', 'lowyat.net',
    # Referral spam
    'referral code', 'download today', 'sign up for a mae',
    'with my code', 'register with my', 'code "JOMMAE"', 'code "JOM',
    "code 'JOMMAE", "code 'JOM",  # single-quote variants
    'welcome bonus', 'instant rm10', 'jommae50',
    # News domains
    'thestar.com', 'thesun.my', 'says.com', 'theedge',
    'brought to you by', 'lomp.at', 'pocketnews.com', 'soyacincau.com',
    # Shopee product listings
    'shopee.com', 'shopee now', 'check out maybank mae soundbox',
    # Advertising
    'wow@wowmedia', 'dooh network',
    # Philippines M2U (not MAE Malaysia)
    '#maybankph', '#speedph', '#nextfeatureph',
]

# Substring-safe spam keywords (multi-word phrases are safe for substring matching)
SPAM_KEYWORDS = [
    # Names & Places
    'fannie mae', 'molly-mae', 'molly mae', 'mae hong son',
    'chiang mai', 'donna mae', 'mary mae', 'sallie mae', 'mae west',
    'anna mae', 'ellie mae', 'mae martin', 'mae whitman',
    'maggie mae', 'sally mae',
    
    # Political Noise
    'trump', 'biden', 'zionist',
    
    # K-Pop/Music (multi-word safe)
    'group order', 'photocard', 'lucky draw', 'luckydraw',
    'otp pairing', 'one true pairing',
    
    # Slang/Meme noise (not about MAE banking app)
    'got exposed',
    
    # Physical card / non-app topics
    'mae card', 'debit card', 'credit card', 'withdrawal overseas',
    'cash withdrawal', 'exc rate', 'exchange rate', 'money changer',
    
    # Marketplace/shopping noise (not about app experience)
    'selling', 'for sale', 'per kilo', 'harumanis',
    
    # Hardware products (not about the app)
    'soundbox', 'ewallet speaker',
    
    # Personal finance allocation (no app sentiment)
    '-commitment', '-gaji', '-investment', '-savings', '-makan', '-petrol',
    
    # Dating/social noise (MAE app social features, not banking)
    'hit on me', 'found me on', 'found your ex', 'found u on',
    'hookup app', 'giving fitness advice', 'find a random',
    'eat ass', 'text me', 'saw someone', 'decline him',
    'sending me messages', 'dry as fuck', 'sending my album',
    'got blocked in the maybank app after',
    
    # Non-English false positives (Urdu/Hindi "mae" = "I")
    'maafi chahta', 'choti behen', 'zamana-e-jahilyat',
    
    # Promotional threads
    'perodua myvi', 'win a ', 'first 100 customers',
    'daily bonus campaign', 'earn rm', 'gandakan',
    
    # Campaign instructions (step-by-step promo posts)
    'follow these steps', 'jom tabung',
    
    # Corporate/marketing spend (not about the app)
    'spent on ramadan', 'shopping mall decoration',
    
    # Promotional feature listings (copy-paste marketing)
    'manage all your lifestyle needs', 'apart from the essential features',
    
    # Clickbait/affiliate
    'duit percuma', 'jutawanautomatik',
    
    # Policy/regulation noise (MAE mentioned in passing)
    'rfid', 'toll payment', '@jpj_malaysia',
]

# Short keywords that need word-boundary matching (to avoid false positives)
# e.g. 'gh' should NOT match 'ugh' or 'high'
SPAM_WORDS_EXACT = [
    'miga', 'maga', 'wts', 'wtb', 'wtt', 'poca', 'bts',
]

def generate_weekly_chunks(start_date, end_date):
    """Splits the date range into 7-day chunks."""
    chunks = []
    current = end_date
    while current > start_date:
        chunk_start = current - timedelta(days=7)
        chunks.append((chunk_start.strftime("%Y-%m-%d"), current.strftime("%Y-%m-%d")))
        current = chunk_start
    return chunks


def parse_date_arg(value):
    """Parse YYYY-MM-DD CLI date input into datetime."""
    try:
        return datetime.strptime(value, "%Y-%m-%d")
    except ValueError as error:
        raise argparse.ArgumentTypeError(f"Invalid date '{value}'. Use YYYY-MM-DD") from error

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
    # Minimum length filter: tweets under 20 chars have no analyzable sentiment
    if len(text.strip()) < 20: return True
    if is_foreign_text(text): return True
    if user in BLOCKED_USERS: return True
    for k in PROMO_KEYWORDS:
        if k.lower() in text_lower: return True
    # Substring matching for multi-word spam phrases
    for k in SPAM_KEYWORDS:
        if k.lower() in text_lower: return True
    # Word-boundary matching for short keywords (avoids false positives)
    for k in SPAM_WORDS_EXACT:
        if re.search(r'\b' + re.escape(k) + r'\b', text_lower): return True
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
    if any(k in text_lower for k in ["transfer", "payment", "fund transfer", "duit", "balance", "transaction", "pending", "failed", "unsuccessful", "gagal", "tak masuk", "tolak", "deduct", "refund", "baki", "short", "qr", "scan", "duitnow"]):
        return ("transaction_issue", "Transaction Failures")
    if any(k in text_lower for k in ["secure2u", "tac", "otp", "verification", "security", "blocked", "locked", "login", "access", "password", "reset", "biometric", "cooling"]):
        return ("security_access", "Security & Access")
    if any(k in text_lower for k in ["screenshot", "ss", "feature", "function", "check", "ui", "ux", "app function", "tabung", "apple pay", "gold", "emas", "dark mode", "interface"]):
        return ("feature_usability", "Feature Usability")
    if any(k in text_lower for k in ["down", "crash", "jem", "slow", "loading", "pusing", "stuck", "lag", "error", "lembap", "broken"]):
        return ("system_stability", "System Stability")
    if any(k in text_lower for k in ["service", "support", "help", "response", "customer service", "cs", "branch", "cawangan", "kaunter", "atm"]):
        return ("general_service", "General Service")
    return ("general", "General Service")

def guess_sentiment(text):
    text_lower = text.lower()
    pos_words = ['okay', 'good', 'smooth', 'fast', 'easy', 'best', 'senang', 'laju', 'nice', 'suka', 'love', 'mudah', 'useful', 'mantap', 'terbaik', 'berguna']
    if any(w in text_lower for w in pos_words): return "Positive"
    neg_words = ['tak boleh', 'problem', 'issue', 'error', 'fail', 'unsuccessful', 'gagal', 'lembap', 'slow', 'stuck', 'down', 'cannot', 'frustrated', 'lambat', 'jem', 'crash', 'benci', 'hate', 'cant', 'not', 'suck', 'bodoh', 'stupid', 'babi', 'sial', 'masalah', 'hassle', 'bugs', 'broken', 'disappointed', 'kenot', 'teruk', 'useless', 'leceh', 'susah', 'tired', 'penat', 'scam', 'reset']
    if any(w in text_lower for w in neg_words): return "Negative"
    neu_words = ['how', 'kenapa', 'why', 'apa', 'question', 'check', 'confirm', 'macam mana', 'tanya', 'ask', 'nape']
    if any(w in text_lower for w in neu_words): return "Neutral"
    return "Neutral"

def scrape_chunk(driver, start_date, end_date, master_seen_set):
    # Build one SHORT query per app name (avoids X query length limits)
    queries = []
    for app_name in QUERY_APP_NAMES:
        q = f'(lang:en OR lang:ms) {app_name} since:{start_date} until:{end_date} {QUERY_EXCLUSIONS}'
        queries.append(q)
    
    rows_collected = []
    
    for query in queries:
        encoded_query = urllib.parse.quote(query)
        url = f"https://x.com/search?q={encoded_query}&src=typed_query&f=live"
        driver.get(url)
        time.sleep(3)

        scroll_attempts = 0
        last_height = driver.execute_script("return document.body.scrollHeight")
        
        while True:
            articles = driver.find_elements(By.TAG_NAME, "article")
            if not articles:
                time.sleep(2)
                scroll_attempts += 1
                if scroll_attempts > 10: break
                continue
            
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
                
            if len(rows_collected) >= TARGET_PER_CHUNK: break

            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
            new_height = driver.execute_script("return document.body.scrollHeight")
            if new_height == last_height:
                scroll_attempts += 1
                if scroll_attempts > 10: break
            else:
                last_height = new_height
                scroll_attempts = 0
                
        if len(rows_collected) >= TARGET_PER_CHUNK: break

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
        parser = argparse.ArgumentParser(description="Scrape X posts for MAE sentiment pipeline")
        parser.add_argument("--start-date", type=parse_date_arg, default=START_DATE, help="Inclusive start date (YYYY-MM-DD)")
        parser.add_argument("--end-date", type=parse_date_arg, default=END_DATE, help="Exclusive end date (YYYY-MM-DD)")
        parser.add_argument("--target-per-chunk", type=int, default=TARGET_PER_CHUNK, help="Max records per weekly chunk")
        args = parser.parse_args()

        if args.end_date <= args.start_date:
            raise ValueError("--end-date must be after --start-date")

        TARGET_PER_CHUNK = max(args.target_per_chunk, 1)

        driver = setup_driver()
        master_seen_set = clean_existing_file()
        chunks = generate_weekly_chunks(args.start_date, args.end_date)
        print(f"📅 Date window: {args.start_date.strftime('%Y-%m-%d')} to {args.end_date.strftime('%Y-%m-%d')}")
        print(f"🎯 Target per chunk: {TARGET_PER_CHUNK}")
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
