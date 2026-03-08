import csv
import re
import os

# --- CONFIGURATION ---
# Use the file you just scraped
INPUT_FILE = 'phase2_data_final_balanced.csv'  
OUTPUT_FILE = 'phase2_data_cleaned.csv'

# --- THE MANGLISH DICTIONARY ---
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
    "babi": "marah",
    "sial": "marah",
    "rosak": "failed",
    "bencinya": "benci",
    "kenot": "cannot"
}

def clean_text(text):
    """Standard cleaning: Lowercase, remove links/mentions, fix slang."""
    if not text: return ""
    text = text.lower()
    text = re.sub(r'http\S+', '', text)
    text = re.sub(r'@\w+', '', text)
    text = re.sub(r'#\w+', '', text)
    text = text.replace('\n', ' ').replace('\r', ' ')
    
    for slang, formal in SLANG_MAP.items():
        text = re.sub(r'\b' + slang + r'\b', formal, text)
        
    text = re.sub(r'[^a-z0-9\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def process_csv():
    print(f"🧹 Starting cleaning process on {INPUT_FILE}...")
    
    if not os.path.exists(INPUT_FILE):
        print(f"❌ Error: Could not find {INPUT_FILE}.")
        return

    unique_texts = set()
    rows_kept = 0
    rows_dropped = 0

    with open(INPUT_FILE, 'r', encoding='utf-8') as infile, \
         open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as outfile:
        
        reader = csv.reader(infile)
        writer = csv.writer(outfile)
        
        # Read Header
        headers = next(reader, None)
        if headers:
            headers.append("Cleaned_Text")
            writer.writerow(headers)
        
        for row in reader:
            if not row or len(row) < 2: continue
            
            original_text = row[1]
            
            # 1. CLEAN IT
            clean_version = clean_text(original_text)
            
            # 2. CHECK DUPLICATE
            # We check the CLEANED version to catch "App down" vs "app down"
            if clean_version in unique_texts:
                rows_dropped += 1
                continue
            
            # 3. CHECK LENGTH (Filter out 1-word tweets)
            if len(clean_version.split()) < 3:
                rows_dropped += 1
                continue

            # Save valid row
            unique_texts.add(clean_version)
            row.append(clean_version)
            writer.writerow(row)
            rows_kept += 1
            
    print(f"\n✅ Finished Cleaning!")
    print(f"📉 Total Rows Processed: {rows_kept + rows_dropped}")
    print(f"🗑️ Duplicates/Short Removed: {rows_dropped}")
    print(f"✨ Final Unique Rows: {rows_kept}")
    print(f"📂 Saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    process_csv()