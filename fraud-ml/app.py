from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import pandas as pd

app = FastAPI(title="Fraud Detection Service")

# Load model
model = joblib.load("model.pkl")

# ==========================
# Request Models
# ==========================
class Tx(BaseModel):
    amount: float
    hour: int
    is_foreign: int = 0
    is_high_risk: int = 0
    userId: int
    balance: float
    avg_amount: float

class BatchRequest(BaseModel):
    transactions: list[Tx]

# ==========================
# Feature Engineering
# ==========================
def add_features(df: pd.DataFrame) -> pd.DataFrame:
    df["high_amount"] = (df["amount"] > df["balance"] * 1.5).astype(int)
    df["night_transaction"] = ((df["hour"] < 6) | (df["hour"] > 22)).astype(int)
    df["amount_hour_ratio"] = df["amount"] / (df["hour"] + 1)
    df["foreign_high"] = df["is_foreign"] * df["high_amount"]
    df["risk_high"] = df["is_high_risk"] * df["high_amount"]
    df["amount_to_avg_ratio"] = df["amount"] / (df["avg_amount"] + 1)
    df["balance_to_avg_ratio"] = df["balance"] / (df["avg_amount"] + 1)
    return df

# ==========================
# Prediction Endpoint
# ==========================
@app.post("/predict")
def predict(batch: BatchRequest):
    df = pd.DataFrame([t.dict() for t in batch.transactions])
    df = add_features(df)

    X = df[
        [
            "amount", "hour", "is_foreign", "is_high_risk", "userId", "balance",
            "avg_amount", "high_amount", "night_transaction", "amount_hour_ratio",
            "foreign_high", "risk_high", "amount_to_avg_ratio", "balance_to_avg_ratio"
        ]
    ]

    probs = model.predict_proba(X)[:, 1]
    labels = (probs > 0.5).astype(int)

    results = []
    for i, row in df.iterrows():
        results.append({
            "input": row.to_dict(),
            "fraud_probability": float(probs[i]),
            "is_fraud": int(labels[i]),
        })

    return {"results": results}

# Optional health check
@app.get("/health")
def health():
    return {"status": "ok"}