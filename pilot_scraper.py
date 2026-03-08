import csv
import time
import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options

# --- CONFIGURATION ---
SEARCH_QUERY = '("MAE app" OR "Maybank app" OR "M2U app" OR "apps maybank" OR "Maybank2u app") -filter:retweets'
TARGET_NEW_COUNT = 50 
OUTPUT_FILE = 'pilot_data_unbiased_copy.csv' 

def setup_driver():
    """Connects to the EXISTING Chrome window running on port 9222."""
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

def load_existing_data():
    """Reads the CSV to find what we already have."""
    existing_content = []
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            next(reader, None) # Skip header
            for row in reader:
                if len(row) > 1:
                    # We store the entire raw row content to check against
                    existing_content.append(row[1]) 
        print(f"📂 Loaded {len(existing_content)} existing rows. Will skip duplicates.")
    else:
        print("📂 No existing file found. Starting fresh.")
    return existing_content

def is_duplicate(new_text, existing_blobs):
    """
    Checks if the new clean text is already inside our file.
    This handles the case where old file has 'Messy Blob' and new scrape gets 'Clean Text'.
    """
    if not new_text: return True
    
    for blob in existing_blobs:
        # Check if the new specific text appears inside the old messy text
        if new_text in blob: 
            return True
        # Also check exact match just in case
        if blob in new_text:
            return True
            
    return False

def scrape_twitter(driver, existing_blobs):
    print(f"🔹 Navigating to search: {SEARCH_QUERY}")
    
    encoded_query = SEARCH_QUERY.replace(' ', '%20').replace('"', '%22').replace('(', '%28').replace(')', '%29')
    url = f"https://x.com/search?q={encoded_query}&src=typed_query&f=live"
    driver.get(url)
    time.sleep(3) 

    new_rows_list = []
    session_seen_texts = set()
    
    scroll_attempts = 0
    last_height = driver.execute_script("return document.body.scrollHeight")

    print(f"🔹 Starting scrape... Looking for {TARGET_NEW_COUNT} NEW tweets.")

    while len(new_rows_list) < TARGET_NEW_COUNT:
        # Find all tweet articles
        articles = driver.find_elements(By.TAG_NAME, "article")
        
        for article in articles:
            try:
                # --- SMARTER SELECTORS ---
                # 1. Get the Tweet Text ONLY (No timestamp, no buttons)
                try:
                    text_element = article.find_element(By.CSS_SELECTOR, '[data-testid="tweetText"]')
                    clean_text = text_element.text
                except:
                    # If no text (e.g. image only), skip
                    continue

                # 2. Get User Handle
                try:
                    user_element = article.find_element(By.CSS_SELECTOR, '[data-testid="User-Name"]')
                    user_text = user_element.text
                    # Extract just the @handle from the user block
                    handle = "Unknown"
                    for line in user_text.split('\n'):
                        if line.startswith('@'):
                            handle = line
                            break
                except:
                    handle = "Unknown"

                # 3. Duplicate Check
                # Check against this session
                if clean_text in session_seen_texts:
                    continue
                
                # Check against file
                if is_duplicate(clean_text, existing_blobs):
                    continue 

                # 4. Success - Add to list
                session_seen_texts.add(clean_text)
                new_rows_list.append([handle, clean_text])
                print(f"✅ Found NEW tweet {len(new_rows_list)}/{TARGET_NEW_COUNT}: {clean_text[:30]}...")

                if len(new_rows_list) >= TARGET_NEW_COUNT:
                    break

            except Exception:
                continue

        # Scroll
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(3) 
        
        new_height = driver.execute_script("return document.body.scrollHeight")
        if new_height == last_height:
            scroll_attempts += 1
            if scroll_attempts > 5:
                print("🛑 Reached end of results.")
                break
        else:
            last_height = new_height
            scroll_attempts = 0

    return new_rows_list

def append_to_csv(new_data):
    file_exists = os.path.exists(OUTPUT_FILE)
    
    with open(OUTPUT_FILE, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(["User", "Raw_Text", "Sentiment_Label", "Topic_Label"]) 
        
        # Append rows with empty labels
        rows_to_write = [row + ["", ""] for row in new_data]
        writer.writerows(rows_to_write)
        
    print(f"\n💾 Appended {len(new_data)} NEW tweets to {OUTPUT_FILE}")

if __name__ == "__main__":
    try:
        driver = setup_driver()
        existing_blobs = load_existing_data()
        new_data = scrape_twitter(driver, existing_blobs)
        
        if new_data:
            append_to_csv(new_data)
        else:
            print("No new tweets found.")
            
        print("Done.")
    except Exception as e:
        print(f"Error: {e}")