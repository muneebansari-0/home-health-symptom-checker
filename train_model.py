import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import pickle
import json

# Load the dataset
df = pd.read_csv('dataset.csv')

# Basic cleaning (dataset is mostly clean)
df = df.dropna(subset=['Disease'])  # Ensure no missing diseases
df = df.fillna(0)  # Non-mentioned symptoms as 0

# Identify symptom columns (all except Disease, Age, Gender if present)
non_symptom_cols = ['Disease']
if 'Age' in df.columns:
    non_symptom_cols.append('Age')
if 'Gender' in df.columns:
    non_symptom_cols.append('Gender')
if 'Patient_ID' in df.columns or 'ID' in df.columns:
    non_symptom_cols.append('Patient_ID' if 'Patient_ID' in df.columns else 'ID')

symptom_cols = [col for col in df.columns if col not in non_symptom_cols]

# Encode symptoms: convert text to binary (1 if present, else 0)
for col in symptom_cols:
    df[col] = df[col].apply(lambda x: 1 if x != 0 else 0)

# Encode Gender if present
if 'Gender' in df.columns:
    le_gender = LabelEncoder()
    df['Gender'] = le_gender.fit_transform(df['Gender'].astype(str))

# Age is already numeric; if not, handle buckets later in app

# Features: symptoms + Age + Gender (if available)
feature_cols = symptom_cols
if 'Age' in df.columns:
    feature_cols.append('Age')
if 'Gender' in df.columns:
    feature_cols.append('Gender')

X = df[feature_cols]
y = df['Disease']

# Encode diseases
le_disease = LabelEncoder()
y_encoded = le_disease.fit_transform(y)

# Train Random Forest (excellent for this multi-class problem)
model = RandomForestClassifier(n_estimators=200, random_state=42)
model.fit(X, y_encoded)

# Save model and encoders
with open('model.pkl', 'wb') as f:
    pickle.dump({
        'model': model,
        'le_disease': le_disease,
        'feature_cols': feature_cols,
        'symptom_cols': symptom_cols
    }, f)

# Save lists for frontend
unique_symptoms = sorted(symptom_cols)
unique_diseases = sorted(le_disease.classes_.tolist())

with open('symptoms_list.json', 'w') as f:
    json.dump(unique_symptoms, f)

with open('diseases_list.json', 'w') as f:
    json.dump(unique_diseases, f)

print("Model trained and saved successfully!")
print(f"Number of symptoms: {len(unique_symptoms)}")
print(f"Number of diseases: {len(unique_diseases)}")