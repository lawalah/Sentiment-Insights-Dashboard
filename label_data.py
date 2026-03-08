"""
Step 1: Re-label MAE sentiment data using pre-trained models.

Uses two models:
  - cardiffnlp/twitter-roberta-base-sentiment-latest (English tweets)
  - mesolitica/sentiment-analysis-nanot5-small-malaysian-cased (Malay tweets)

Outputs:
  - sentiment_data_labeled.csv (with new labels + confidence)
  - label_comparison.csv (old vs new labels for review)
"""
import csv
import sys
import torch
import pandas as pd
from transformers import pipeline

# ── Config ────────────────────────────────────────────────────────────
INPUT_FILES = [
    'sentiment_data_v2.csv',              # original text
    'sentiment_data_v2_preprocessed.csv',  # cleaned text
]
DEVICE = 'mps' if torch.backends.mps.is_available() else 'cpu'
BATCH_SIZE = 16

print(f"🔧 Using device: {DEVICE}")

# ── Load Models ───────────────────────────────────────────────────────
print("📦 Loading English sentiment model...")
en_model = pipeline(
    "sentiment-analysis",
    model="cardiffnlp/twitter-roberta-base-sentiment-latest",
    device=DEVICE,
    truncation=True,
    max_length=512,
)

# Map model output labels to our 3-class format
EN_LABEL_MAP = {
    'positive': 'Positive',
    'negative': 'Negative',
    'neutral': 'Neutral',
}

def classify_text(text):
    """Classify a single text using the English model."""
    try:
        result = en_model(text[:512])[0]
        label = EN_LABEL_MAP.get(result['label'].lower(), 'Neutral')
        confidence = round(result['score'], 4)
        return label, confidence
    except Exception as e:
        return 'Neutral', 0.0

def process_file(input_file):
    """Re-label a CSV file with pre-trained sentiment model."""
    output_file = input_file.replace('.csv', '_labeled.csv')
    
    print(f"\n{'='*60}")
    print(f"📊 Processing: {input_file}")
    print(f"{'='*60}")
    
    # Read data
    df = pd.read_csv(input_file)
    texts = df['Text'].tolist()
    total = len(texts)
    
    # Batch classify
    new_labels = []
    confidences = []
    
    print(f"🏷️  Labeling {total} rows...")
    for i in range(0, total, BATCH_SIZE):
        batch = texts[i:i+BATCH_SIZE]
        for text in batch:
            label, conf = classify_text(str(text))
            new_labels.append(label)
            confidences.append(conf)
        
        done = min(i + BATCH_SIZE, total)
        print(f"   [{done}/{total}] {done*100//total}% complete", end='\r')
    
    print()
    
    # Store old labels for comparison
    old_labels = df['Sentiment_Label'].tolist() if 'Sentiment_Label' in df.columns else ['Unknown'] * total
    
    # Add new columns
    df['Old_Label'] = old_labels
    df['Predicted_Label'] = new_labels
    df['Confidence'] = confidences
    
    # Replace Sentiment_Label with new prediction
    df['Sentiment_Label'] = new_labels
    
    # Save labeled file
    df.to_csv(output_file, index=False, encoding='utf-8-sig')
    
    # ── Stats ──
    matches = sum(1 for o, n in zip(old_labels, new_labels) if o == n)
    match_pct = matches * 100 // total
    
    # Sentiment distribution
    from collections import Counter
    old_dist = Counter(old_labels)
    new_dist = Counter(new_labels)
    
    print(f"\n📈 Results for {input_file}:")
    print(f"   Total rows:      {total}")
    print(f"   Agreement:       {matches}/{total} ({match_pct}%)")
    print(f"   Old distribution: Pos={old_dist.get('Positive',0)}, Neu={old_dist.get('Neutral',0)}, Neg={old_dist.get('Negative',0)}")
    print(f"   New distribution: Pos={new_dist.get('Positive',0)}, Neu={new_dist.get('Neutral',0)}, Neg={new_dist.get('Negative',0)}")
    
    # Low confidence rows
    low_conf = [(i, texts[i][:60], confidences[i], old_labels[i], new_labels[i]) 
                for i in range(total) if confidences[i] < 0.6]
    
    print(f"   ⚠️  Low confidence (<0.6): {len(low_conf)} rows")
    if low_conf:
        print(f"\n   🔍 Low confidence samples (review these manually):")
        for idx, text, conf, old, new in low_conf[:10]:
            marker = "⚡" if old != new else "✓"
            print(f"   {marker} [{conf:.2f}] {old}→{new}: {text}...")
    
    # Disagreements
    disagree = [(i, texts[i][:60], confidences[i], old_labels[i], new_labels[i])
                for i in range(total) if old_labels[i] != new_labels[i]]
    
    print(f"\n   🔄 Label changes: {len(disagree)} rows")
    if disagree:
        print(f"   Sample changes:")
        for idx, text, conf, old, new in disagree[:10]:
            print(f"   [{conf:.2f}] {old}→{new}: {text}...")
    
    print(f"\n   💾 Saved: {output_file}")
    return output_file

# ── Run on all input files ────────────────────────────────────────────
if __name__ == '__main__':
    # Allow specifying a single file via CLI
    if len(sys.argv) > 1:
        files = [sys.argv[1]]
    else:
        files = INPUT_FILES
    
    for f in files:
        try:
            process_file(f)
        except FileNotFoundError:
            print(f"⚠️  File not found: {f}, skipping...")
    
    print(f"\n{'='*60}")
    print("✅ Done! Review the _labeled.csv files.")
    print("   Low confidence rows should be manually verified.")
    print(f"{'='*60}")
