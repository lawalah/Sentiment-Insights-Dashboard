"""
Quick script to apply scraper.py filters to an existing CSV file.
Removes spam, promo, dating/social, news, and short-text rows.
"""
import csv
import re
import sys

# ── Import filter lists from scraper ──
from scraper import BLOCKED_USERS, PROMO_KEYWORDS, SPAM_KEYWORDS, SPAM_WORDS_EXACT, is_spam

INPUT_FILE = sys.argv[1] if len(sys.argv) > 1 else 'sentiment_data.csv'
OUTPUT_FILE = INPUT_FILE.replace('.csv', '_v2.csv')

kept = []
removed = []

with open(INPUT_FILE, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    header = next(reader)
    
    for row in reader:
        if len(row) < 2:
            removed.append(('empty', row))
            continue
        
        username = row[0].strip()
        text = row[1].strip()
        
        if is_spam(username, text):
            removed.append((username, text[:60]))
        else:
            kept.append(row)

# Write clean file
with open(OUTPUT_FILE, 'w', encoding='utf-8', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(header)
    writer.writerows(kept)

print(f"\n{'='*50}")
print(f"📊 Input:   {INPUT_FILE} ({len(kept) + len(removed)} rows)")
print(f"✅ Kept:    {len(kept)} rows")
print(f"🚫 Removed: {len(removed)} rows")
print(f"💾 Saved:   {OUTPUT_FILE}")
print(f"{'='*50}\n")

print("🚫 Removed rows:")
for user, text in removed:
    print(f"  {user}: {text}...")
