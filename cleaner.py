import csv
import re
import os

# --- CONFIGURATION ---
INPUT_FILE = 'phase2_data_final.csv'   # The messy file from your scraper
OUTPUT_FILE = 'phase2_data_cleaned.csv' # The clean file for your AI

# --- THE MANGLISH DICTIONARY ---
# This is where we teach the AI to understand Malaysian Slang
SLANG_MAP = {
    "ss": "screenshot",
    "takleh": "tidak boleh",
    "x": "tidak",
    "tak": "tidak",
    "tk": "tidak",
    "org": "orang",
    "diorg": "mereka",
    "acc": "akaun",
    "camne": "macam mana",
    "camtu": "macam itu",
    "jem": "jammed",
    "pusing": "loading",
    "tolak": "deduct",
    "burn": "hangus",
    "baki": "balance",
    "trx": "transaksi",
    "tf": "transfer",
    "pindah": "transfer",
    "online": "talian",
    "sys": "sistem",
    "maintenance": "selenggara",
    "down": "rosak",
    "apps": "aplikasi",
    "app": "aplikasi",
    "prob": "masalah",
    "problem": "masalah",
    "fck": "fuck",
    "babi": "marah", # Mapping swears to emotion keywords can help, or keep raw
    "sial": "marah",
    "rosak": "failed"
}

def clean_text(text):
    """
    The Master Cleaning Function.
    1. Lowercase
    2. Remove URLs & Mentions
    3. Replace Slang
    4. Remove Special Chars
    """
    # 1. Lowercase
    text = text.lower()
    
    # 2. Remove URLs (http...)
    text = re.sub(r'http\S+', '', text)
    
    # 3. Remove Mentions (@user)
    text = re.sub(r'@\w+', '', text)
    
    # 4. Remove Hashtags (#topic)
    text = re.sub(r'#\w+', '', text)
    
    # 5. Remove Newlines (Enter key) - Important for CSVs
    text = text.replace('\n', ' ').replace('\r', ' ')
    
    # 6. Apply Manglish Dictionary (Whole Word matching only)
    # \b matches word boundaries so "pass" doesn't become "pascreenshot"
    for slang, formal in SLANG_MAP.items():
        text = re.sub(r'\b' + slang + r'\b', formal, text)
        
    # 7. Remove extra spaces
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text

def process_csv():
    print(f"🧹 Starting cleaning process on {INPUT_FILE}...")
    
    if not os.path.exists(INPUT_FILE):
        print(f"❌ Error: Could not find {INPUT_FILE}. Run the scraper first!")
        return

    with open(INPUT_FILE, 'r', encoding='utf-8') as infile, \
         open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as outfile:
        
        reader = csv.reader(infile)
        writer = csv.writer(outfile)
        
        # Read Header
        headers = next(reader, None)
        if headers:
            # We add a new column for "Cleaned_Text"
            headers.append("Cleaned_Text")
            writer.writerow(headers)
        
        count = 0
        for row in reader:
            if not row: continue
            
            # Row structure: [Username, Text, Time, Keyword, Likes...]
            # Text is usually at index 1
            original_text = row[1]
            
            # CLEAN IT
            clean_version = clean_text(original_text)
            
            # Add the clean text to the end of the row
            row.append(clean_version)
            writer.writerow(row)
            count += 1
            
    print(f"✅ Finished! Cleaned {count} rows.")
    print(f"📂 Saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    process_csv()