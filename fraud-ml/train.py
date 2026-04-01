import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
from imblearn.over_sampling import SMOTE
from xgboost import XGBClassifier
import joblib

# -----------------------------
# 1. Generate synthetic data
# -----------------------------
np.random.seed(42)
N = 2000000
n_users = 20000

# Each user has an average spending pattern
user_avg_txn = np.random.exponential(scale=250, size=n_users)
user_balance_avg = np.random.exponential(scale=1200, size=n_users)

userId = np.random.randint(0, n_users, size=N)
avg_amount = user_avg_txn[userId]
balance = np.random.normal(loc=user_balance_avg[userId], scale=300, size=N)
balance = np.clip(balance, 50, None)

# Transaction features
amount = np.random.exponential(scale=200, size=N)
hour = np.random.randint(0, 24, size=N)
is_foreign = np.random.binomial(1, 0.05, size=N)
is_high_risk = np.random.binomial(1, 0.02, size=N)

# -----------------------------
# 2. Define fraud patterns
# -----------------------------
fraud = (
    ((is_foreign == 1) & (is_high_risk == 1) & (amount > balance * 1.2) & ((hour < 6) | (hour > 22))) |
    ((amount > 3 * avg_amount) & (amount > 400)) |
    ((amount > balance * 1.3) & (balance < 500)) |
    ((is_foreign == 1) & (amount > 2 * avg_amount)) |
    (np.random.rand(N) < 0.05)
).astype(int)

# Ensure minimum fraud proportion ~7%
if fraud.mean() < 0.05:
    n_needed = int(0.05 * N - fraud.sum())
    fraud[np.random.choice(np.where(fraud == 0)[0], n_needed, replace=False)] = 1

# -----------------------------
# 3. Create DataFrame
# -----------------------------
df = pd.DataFrame({
    'amount': amount,
    'hour': hour,
    'is_foreign': is_foreign,
    'is_high_risk': is_high_risk,
    'userId': userId,
    'balance': balance,
    'avg_amount': avg_amount,
    'label': fraud
})

# -----------------------------
# 4. Feature Engineering
# -----------------------------
df['high_amount'] = (df['amount'] > df['balance'] * 1.5).astype(int)
df['night_transaction'] = ((df['hour'] < 6) | (df['hour'] > 22)).astype(int)
df['amount_hour_ratio'] = df['amount'] / (df['hour'] + 1)
df['foreign_high'] = df['is_foreign'] * df['high_amount']
df['risk_high'] = df['is_high_risk'] * df['high_amount']
df['amount_to_avg_ratio'] = df['amount'] / (df['avg_amount'] + 1)
df['balance_to_avg_ratio'] = df['balance'] / (df['avg_amount'] + 1)

# -----------------------------
# 5. Prepare data
# -----------------------------
X = df[['amount', 'hour', 'is_foreign', 'is_high_risk', 'userId', 'balance',
        'avg_amount', 'high_amount', 'night_transaction', 'amount_hour_ratio',
        'foreign_high', 'risk_high', 'amount_to_avg_ratio', 'balance_to_avg_ratio']]
y = df['label']

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# -----------------------------
# 6. Balance data with SMOTE
# -----------------------------
sm = SMOTE(random_state=42)
X_train_res, y_train_res = sm.fit_resample(X_train, y_train)

# -----------------------------
# 7. Train XGBoost
# -----------------------------
scale_weight = sum(y_train == 0) / sum(y_train == 1)

clf = XGBClassifier(
    n_estimators=400,
    max_depth=8,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    scale_pos_weight=scale_weight,
    use_label_encoder=False,
    eval_metric='logloss',
    random_state=42
)

clf.fit(X_train_res, y_train_res)

# -----------------------------
# 8. Evaluate
# -----------------------------
pred = clf.predict(X_test)
print("Confusion Matrix:\n", confusion_matrix(y_test, pred))
print("\nClassification Report:\n", classification_report(y_test, pred, digits=4))

# -----------------------------
# 9. Save model
# -----------------------------
joblib.dump(clf, 'model.pkl')
print(" Model saved as model.pkl")