"""
Merge manual label corrections from review_labels.csv back into training data.

Run after reviewing and correcting labels in review_labels.csv.
Only applies corrections where Corrected_Label is not empty.
"""
import pandas as pd

def merge_corrections():
    review = pd.read_csv('review_labels.csv')
    
    corrections = review[review['Corrected_Label'].notna() & (review['Corrected_Label'] != '')]
    print(f"📝 Found {len(corrections)} corrections out of {len(review)} reviewed rows")
    
    if len(corrections) == 0:
        print("⚠️  No corrections found. Did you fill in the Corrected_Label column?")
        return
    
    valid_labels = {'Positive', 'Neutral', 'Negative'}
    invalid = corrections[~corrections['Corrected_Label'].isin(valid_labels)]
    if len(invalid) > 0:
        print(f"❌ Invalid labels found: {invalid['Corrected_Label'].unique()}")
        print("   Valid labels: Positive, Neutral, Negative")
        return
    
    for file in ['sentiment_data_v2_labeled.csv', 'sentiment_data_v2_preprocessed_labeled.csv']:
        df = pd.read_csv(file)
        changed = 0
        
        for _, row in corrections.iterrows():
            idx = int(row['Row_Index'])
            if idx < len(df):
                old = df.at[idx, 'Sentiment_Label']
                new = row['Corrected_Label']
                if old != new:
                    df.at[idx, 'Sentiment_Label'] = new
                    changed += 1
        
        df.to_csv(file, index=False, encoding='utf-8-sig')
        print(f"✅ {file}: {changed} labels updated")
    
    # Show summary
    print(f"\n📊 Correction summary:")
    changes = corrections[corrections['Current_Label'] != corrections['Corrected_Label']]
    for _, row in changes.iterrows():
        print(f"   {row['Current_Label']:>8} → {row['Corrected_Label']:<8} | {str(row['Text'])[:60]}...")

if __name__ == '__main__':
    merge_corrections()
