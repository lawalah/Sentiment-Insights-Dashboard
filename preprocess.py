"""
Preprocess sentiment_data_v2.csv for supervisor presentation.
- Lowercase all text
- Remove @mentions, URLs, extra whitespace
- Clean up newlines within text
- Remove duplicate rows
- Add row numbering
"""
import csv
import re
import sys

INPUT_FILE = sys.argv[1] if len(sys.argv) > 1 else 'sentiment_data_v2.csv'
OUTPUT_FILE = INPUT_FILE.replace('.csv', '_preprocessed.csv')

def fix_mojibake(text):
    """Fix common UTF-8 mojibake (broken encoding) artifacts."""
    replacements = {
        '‚Ä¶': '...',   # ellipsis
        '‚Äô': "'",      # right single quote
        '‚Äò': "'",      # left single quote  
        '‚Äú': '"',      # left double quote
        '‚Äù': '"',      # right double quote
        '‚Äì': '-',      # en dash
        '‚Äî': '-',      # em dash
        '‚Ä†': '',        # misc artifact
        '√©': 'é',       # accented e
        '√°': 'ð',       # eth
        '√±': 'ñ',       # tilde n
        'Ô£ø': '',       # emoji artifact
        'ÔÇª': '...',    # another ellipsis variant
        'ÔÇô': '-',      # another dash variant
        'ÔÇÖ': "'",      # another quote variant
        '\u200b': '',     # zero-width space
        '\u200d': '',     # zero-width joiner
        '\ufeff': '',     # BOM
    }
    for broken, fixed in replacements.items():
        text = text.replace(broken, fixed)
    return text

MALAY_SLANG = {
    # Malay abbreviations
    'dh': 'dah', 'nk': 'nak', 'xblh': 'tak boleh',
    'xde': 'takde', 'xdpt': 'tak dapat', 'xleh': 'tak boleh',
    'mcm': 'macam', 'sbb': 'sebab', 'dlm': 'dalam', 'pd': 'pada',
    'yg': 'yang', 'utk': 'untuk', 'dgn': 'dengan', 'lg': 'lagi',
    'blh': 'boleh', 'ngan': 'dengan', 'psl': 'pasal',
    'kt': 'kat', 'dr': 'dari', 'da': 'dah', 'dpt': 'dapat',
    'tk': 'tak', 'tp': 'tapi', 'sgt': 'sangat', 'mmg': 'memang',
    'cmni': 'camni', 'ckp': 'cakap', 'tgk': 'tengok',
    'nnt': 'nanti', 'skrg': 'sekarang', 'sblm': 'sebelum',
    'lpas': 'lepas', 'smpai': 'sampai', 'hrini': 'hari ini',
    'xbole': 'tak boleh', 'xlrt': 'tak boleh', 'dn': 'dan',
    'ngan': 'dengan', 'guna': 'guna', 'camni': 'macam ni',
    'takleh': 'tak boleh', 'takde': 'takde', 'punya': 'punya',
    'je': 'je', 'ni': 'ni', 'tu': 'tu', 'ke': 'ke',
    'dkt': 'dekat', 'kat': 'kat', 'tgh': 'tengah',
    'xboleh': 'tak boleh', 'xdapat': 'tak dapat',
    'tq': 'terima kasih', 'geram': 'geram',
    # English abbreviations
    'pls': 'please', 'smtg': 'something', 'bcs': 'because',
    'tgt': 'together', 'abt': 'about', 'rn': 'right now',
    'bc': 'because', 'w': 'with', 'ur': 'your',
    'idk': 'i dont know', 'ngl': 'not gonna lie',
    'tbh': 'to be honest', 'imo': 'in my opinion',
    'ofc': 'of course', 'btw': 'by the way',
    'dy': 'already', 'alr': 'already',
    'tryna': 'trying to', 'gonna': 'going to',
    'wanna': 'want to', 'gotta': 'got to',
    'cant': 'cannot', 'dont': 'do not', 'doesnt': 'does not',
    'didnt': 'did not', 'isnt': 'is not', 'wasnt': 'was not',
    'wont': 'will not', 'couldnt': 'could not',
    'ive': 'i have', 'im': 'i am', 'youre': 'you are',
    'hes': 'he is', 'shes': 'she is', 'theyre': 'they are',
    'thats': 'that is', 'whats': 'what is',
}

def normalize_slang(text):
    """Expand common Malay & English abbreviations using word-boundary matching."""
    for slang, full in MALAY_SLANG.items():
        text = re.sub(r'\b' + re.escape(slang) + r'\b', full, text)
    return text

def remove_emojis(text):
    """Remove emoji characters."""
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"  # emoticons
        "\U0001F300-\U0001F5FF"  # symbols & pictographs
        "\U0001F680-\U0001F6FF"  # transport & map
        "\U0001F1E0-\U0001F1FF"  # flags
        "\U00002700-\U000027BF"  # dingbats
        "\U0000FE00-\U0000FE0F"  # variation selectors
        "\U0001F900-\U0001F9FF"  # supplemental symbols
        "\U0001FA00-\U0001FA6F"  # chess symbols
        "\U0001FA70-\U0001FAFF"  # symbols extended
        "\U00002702-\U000027B0"  # dingbats
        "\U000024C2-\U0001F251"  # misc
        "\U0000200D"             # zero width joiner
        "\U0000FE0F"             # variation selector
        "]+",
        flags=re.UNICODE
    )
    return emoji_pattern.sub('', text)

def preprocess_text(text):
    """Clean and normalize tweet text."""
    # Fix mojibake encoding artifacts
    text = fix_mojibake(text)
    # Remove @mentions at start of tweet (reply targets)
    text = re.sub(r'^(@\w+\s*\n?\s*)+', '', text)
    # Remove remaining @mentions inline
    text = re.sub(r'@\w+', '', text)
    # Remove URLs (all patterns)
    text = re.sub(r'https?://\S+', '', text)
    text = re.sub(r'\S+\.(com|my|net|org|io|co|be)\S*', '', text)
    text = re.sub(r'youtu\.be/\S+', '', text)
    # Remove hashtags
    text = re.sub(r'#\w+', '', text)
    # Remove emojis
    text = remove_emojis(text)
    # Replace newlines with spaces
    text = text.replace('\n', ' ').replace('\r', ' ')
    # Lowercase
    text = text.lower()
    # Normalize curly/smart apostrophes to straight apostrophe
    text = text.replace('\u2019', "'").replace('\u2018', "'").replace('\u02BC', "'")
    # Expand apostrophe contractions BEFORE removing punctuation
    contractions = {
        "it's": "it is", "i'm": "i am", "i've": "i have", "i'll": "i will",
        "i'd": "i would", "he's": "he is", "she's": "she is",
        "we're": "we are", "they're": "they are", "you're": "you are",
        "that's": "that is", "what's": "what is", "there's": "there is",
        "here's": "here is", "who's": "who is", "how's": "how is",
        "can't": "cannot", "won't": "will not", "don't": "do not",
        "doesn't": "does not", "didn't": "did not", "isn't": "is not",
        "aren't": "are not", "wasn't": "was not", "weren't": "were not",
        "haven't": "have not", "hasn't": "has not", "hadn't": "had not",
        "wouldn't": "would not", "couldn't": "could not",
        "shouldn't": "should not", "let's": "let us",
        "ain't": "is not", "y'all": "you all",
        "we've": "we have", "you've": "you have", "they've": "they have",
        "we'll": "we will", "you'll": "you will", "they'll": "they will",
        "we'd": "we would", "you'd": "you would", "they'd": "they would",
    }
    for contraction, expanded in contractions.items():
        text = text.replace(contraction, expanded)
    # Normalize slang (Malay + English)
    text = normalize_slang(text)
    # Remove punctuation (keep alphanumeric and spaces only)
    text = re.sub(r'[^\w\s]', '', text)
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

kept = []
seen = set()

with open(INPUT_FILE, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    header = next(reader)
    
    for row in reader:
        if len(row) < 2:
            continue
        
        # Preprocess text
        clean_text = preprocess_text(row[1])
        
        # Skip if too short after cleaning
        if len(clean_text) < 20:
            continue
        
        # Skip duplicates
        if clean_text in seen:
            continue
        seen.add(clean_text)
        
        # Update the row with cleaned text
        row[1] = clean_text
        kept.append(row)

# Write preprocessed file
with open(OUTPUT_FILE, 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(header)
    writer.writerows(kept)

print(f"\n{'='*50}")
print(f"📊 Input:        {INPUT_FILE}")
print(f"✅ Output:       {OUTPUT_FILE}")
print(f"📝 Total rows:   {len(kept)}")
print(f"{'='*50}")
print(f"\n📋 Sample preprocessed rows:")
for row in kept[:5]:
    print(f"  [{row[7]}] {row[1][:80]}...")
