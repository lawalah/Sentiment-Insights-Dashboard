"""
Step 2: Fine-tune MalayBERT with transfer learning.

Pipeline:
  Phase A: Pre-train on mesolitica supervised-twitter (2,008 Malay tweets)
  Phase B: Fine-tune on MAE-specific data (402-407 rows)

Trains on both original and preprocessed MAE text for comparison.
Saves models and evaluation metrics.
"""
import os
import sys
import json
import torch
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, f1_score
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
    EarlyStoppingCallback,
)
from torch.utils.data import Dataset

# ── Config ────────────────────────────────────────────────────────────
MODEL_NAME = "xlm-roberta-base"
LABEL2ID = {"Positive": 0, "Neutral": 1, "Negative": 2}
ID2LABEL = {v: k for k, v in LABEL2ID.items()}
NUM_LABELS = 3

DEVICE = "mps" if torch.backends.mps.is_available() else "cpu"
OUTPUT_DIR = "model"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# External dataset
EXTERNAL_DATA = "external_data/supervised_twitter.csv"

# MAE datasets (both versions for comparison)
MAE_ORIGINAL = "sentiment_data_v2_labeled.csv"
MAE_PREPROCESSED = "sentiment_data_v2_preprocessed_labeled.csv"

print(f"🔧 Device: {DEVICE}")
print(f"🧠 Base model: {MODEL_NAME}")

# ── Dataset Class ─────────────────────────────────────────────────────
class SentimentDataset(Dataset):
    def __init__(self, texts, labels, tokenizer, max_length=256):
        self.encodings = tokenizer(
            texts, truncation=True, padding="max_length",
            max_length=max_length, return_tensors="pt"
        )
        self.labels = torch.tensor(labels, dtype=torch.long)

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        return {
            "input_ids": self.encodings["input_ids"][idx],
            "attention_mask": self.encodings["attention_mask"][idx],
            "labels": self.labels[idx],
        }

# ── Helper Functions ──────────────────────────────────────────────────
def compute_metrics(eval_pred):
    preds = np.argmax(eval_pred.predictions, axis=1)
    labels = eval_pred.label_ids
    f1 = f1_score(labels, preds, average="macro")
    acc = (preds == labels).mean()
    return {"f1": f1, "accuracy": acc}

def load_external_data():
    """Load mesolitica supervised-twitter dataset."""
    df = pd.read_csv(EXTERNAL_DATA, sep="\t")
    df = df.dropna(subset=["text", "sentiment"])
    df = df[df["sentiment"].isin(LABEL2ID.keys())]
    texts = df["text"].astype(str).tolist()
    labels = [LABEL2ID[s] for s in df["sentiment"]]
    return texts, labels

def load_mae_data(filepath):
    """Load MAE data with predicted labels."""
    df = pd.read_csv(filepath)
    texts = df["Text"].tolist()
    labels = [LABEL2ID.get(s, 1) for s in df["Predicted_Label"]]
    return texts, labels

def train_phase(
    name, tokenizer, model, train_texts, train_labels,
    val_texts, val_labels, output_subdir, epochs=5, lr=2e-5, batch_size=16
):
    """Train a single phase (pre-train or fine-tune)."""
    print(f"\n{'='*60}")
    print(f"🚀 {name}")
    print(f"   Train: {len(train_texts)} | Val: {len(val_texts)}")
    print(f"   Epochs: {epochs} | LR: {lr} | Batch: {batch_size}")
    print(f"{'='*60}")

    train_ds = SentimentDataset(train_texts, train_labels, tokenizer)
    val_ds = SentimentDataset(val_texts, val_labels, tokenizer)

    save_dir = os.path.join(OUTPUT_DIR, output_subdir)
    os.makedirs(save_dir, exist_ok=True)

    training_args = TrainingArguments(
        output_dir=save_dir,
        num_train_epochs=epochs,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size,
        learning_rate=lr,
        weight_decay=0.01,
        warmup_ratio=0.1,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="f1",
        greater_is_better=True,
        save_total_limit=2,
        logging_steps=10,
        report_to="none",
        use_mps_device=(DEVICE == "mps"),
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        compute_metrics=compute_metrics,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=3)],
    )

    trainer.train()

    # Evaluate
    results = trainer.evaluate()
    print(f"\n📊 {name} Results:")
    print(f"   F1 (macro): {results['eval_f1']:.4f}")
    print(f"   Accuracy:   {results['eval_accuracy']:.4f}")

    # Save model
    model.save_pretrained(save_dir)
    tokenizer.save_pretrained(save_dir)
    print(f"   💾 Model saved: {save_dir}")

    return model, results

def evaluate_on_test(name, model, tokenizer, test_texts, test_labels, output_subdir):
    """Full evaluation on held-out test set."""
    test_ds = SentimentDataset(test_texts, test_labels, tokenizer)
    
    trainer = Trainer(model=model)
    preds = trainer.predict(test_ds)
    pred_labels = np.argmax(preds.predictions, axis=1)
    
    # Classification report
    report = classification_report(
        test_labels, pred_labels,
        target_names=["Positive", "Neutral", "Negative"],
        output_dict=True
    )
    report_text = classification_report(
        test_labels, pred_labels,
        target_names=["Positive", "Neutral", "Negative"],
    )
    
    # Confusion matrix
    cm = confusion_matrix(test_labels, pred_labels)
    
    print(f"\n{'='*60}")
    print(f"📋 Test Evaluation: {name}")
    print(f"{'='*60}")
    print(report_text)
    print(f"Confusion Matrix:")
    print(f"                Pred_Pos  Pred_Neu  Pred_Neg")
    for i, label in enumerate(["Positive", "Neutral", "Negative"]):
        print(f"  True_{label:8s}  {cm[i][0]:8d}  {cm[i][1]:8d}  {cm[i][2]:8d}")
    
    # Save metrics
    save_dir = os.path.join(OUTPUT_DIR, output_subdir)
    os.makedirs(save_dir, exist_ok=True)
    
    metrics = {
        "name": name,
        "f1_macro": report["macro avg"]["f1-score"],
        "accuracy": report["accuracy"],
        "per_class": {
            label: {
                "precision": report[label]["precision"],
                "recall": report[label]["recall"],
                "f1": report[label]["f1-score"],
                "support": report[label]["support"],
            }
            for label in ["Positive", "Neutral", "Negative"]
        },
        "confusion_matrix": cm.tolist(),
    }
    
    with open(os.path.join(save_dir, "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)
    
    return metrics

# ══════════════════════════════════════════════════════════════════════
# MAIN TRAINING PIPELINE
# ══════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # ── Phase A: Pre-train on external Malay Twitter data ─────────
    print("\n📦 Loading external dataset (mesolitica supervised-twitter)...")
    ext_texts, ext_labels = load_external_data()
    print(f"   Loaded {len(ext_texts)} rows")

    ext_train_t, ext_val_t, ext_train_l, ext_val_l = train_test_split(
        ext_texts, ext_labels, test_size=0.15, random_state=42, stratify=ext_labels
    )

    print("📦 Loading tokenizer and model...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model_a = AutoModelForSequenceClassification.from_pretrained(
        MODEL_NAME, num_labels=NUM_LABELS, id2label=ID2LABEL, label2id=LABEL2ID
    )

    model_a, results_a = train_phase(
        name="Phase A: Pre-train on Malay Twitter (2K rows)",
        tokenizer=tokenizer,
        model=model_a,
        train_texts=ext_train_t,
        train_labels=ext_train_l,
        val_texts=ext_val_t,
        val_labels=ext_val_l,
        output_subdir="phase_a_pretrain",
        epochs=10,
        lr=2e-5,
        batch_size=16,
    )

    # ── Phase B: Fine-tune on MAE data (both versions) ────────────
    all_metrics = {"phase_a": results_a}

    for mae_file, label in [
        (MAE_ORIGINAL, "original"),
        (MAE_PREPROCESSED, "preprocessed"),
    ]:
        print(f"\n📦 Loading MAE data: {mae_file}...")
        mae_texts, mae_labels = load_mae_data(mae_file)
        print(f"   Loaded {len(mae_texts)} rows")

        # Split: 70% train, 15% val, 15% test
        train_t, temp_t, train_l, temp_l = train_test_split(
            mae_texts, mae_labels, test_size=0.30, random_state=42, stratify=mae_labels
        )
        val_t, test_t, val_l, test_l = train_test_split(
            temp_t, temp_l, test_size=0.50, random_state=42, stratify=temp_l
        )

        # Load pre-trained Phase A model as starting point
        model_b = AutoModelForSequenceClassification.from_pretrained(
            os.path.join(OUTPUT_DIR, "phase_a_pretrain"),
            num_labels=NUM_LABELS,
        )

        subdir = f"phase_b_mae_{label}"
        model_b, results_b = train_phase(
            name=f"Phase B: Fine-tune on MAE ({label} text, {len(train_t)} train rows)",
            tokenizer=tokenizer,
            model=model_b,
            train_texts=train_t,
            train_labels=train_l,
            val_texts=val_t,
            val_labels=val_l,
            output_subdir=subdir,
            epochs=10,
            lr=1e-5,  # lower LR for fine-tuning
            batch_size=8,  # smaller batch for small dataset
        )

        # Evaluate on test set
        test_metrics = evaluate_on_test(
            name=f"MAE {label} text",
            model=model_b,
            tokenizer=tokenizer,
            test_texts=test_t,
            test_labels=test_l,
            output_subdir=subdir,
        )
        all_metrics[f"phase_b_{label}"] = test_metrics

    # ── Final Comparison ──────────────────────────────────────────
    print(f"\n{'='*60}")
    print("🏆 FINAL COMPARISON")
    print(f"{'='*60}")
    print(f"{'Model':<35} {'F1 (macro)':<12} {'Accuracy':<10}")
    print(f"{'-'*60}")

    for key, m in all_metrics.items():
        name = key.replace("_", " ").title()
        f1 = m.get("f1_macro", m.get("eval_f1", 0))
        acc = m.get("accuracy", m.get("eval_accuracy", 0))
        print(f"{name:<35} {f1:<12.4f} {acc:<10.4f}")

    # Save comparison
    with open(os.path.join(OUTPUT_DIR, "comparison.json"), "w") as f:
        json.dump(all_metrics, f, indent=2, default=str)

    print(f"\n💾 All results saved to {OUTPUT_DIR}/")
    print("✅ Training complete!")
