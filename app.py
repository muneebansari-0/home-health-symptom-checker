from flask import Flask, request, jsonify, render_template
import pickle
import json
import numpy as np

app = Flask(__name__, template_folder='templates', static_folder='static')

# Load model and lists
with open('model.pkl', 'rb') as f:
    data = pickle.load(f)
model = data['model']
le_disease = data['le_disease']
feature_cols = data['feature_cols']
symptom_cols = data['symptom_cols']

with open('symptoms_list.json', 'r') as f:
    symptoms_list = json.load(f)

with open('diseases_list.json', 'r') as f:
    diseases_list = json.load(f)

# Urgent symptoms for emergency alert
URGENT_SYMPTOMS = [
    'chest_pain', 'shortness_of_breath', 'difficulty_in_breathing',
    'severe_chest_pain', 'sudden_chest_pain', 'loss_of_consciousness'
]

# Load home care advice (create static/advice.json first if missing)
try:
    with open('static/advice.json', 'r') as f:
        advice_data = json.load(f)
except FileNotFoundError:
    advice_data = {"default": "Rest, stay hydrated, monitor symptoms. Seek medical help if symptoms worsen."}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/symptoms')
def get_symptoms():
    return jsonify(symptoms_list)

@app.route('/predict', methods=['POST'])
def predict():
    input_data = request.json

    selected_symptoms = input_data.get('symptoms', [])
    age = input_data.get('age', None)
    gender = input_data.get('gender', None)

    # Emergency override
    if any(sym in selected_symptoms for sym in URGENT_SYMPTOMS):
        return jsonify({
            'emergency': True,
            'message': '⚠️ SEEK IMMEDIATE EMERGENCY MEDICAL HELP! Possible serious condition (e.g., heart or breathing issue). Call emergency services now.'
        })

    # Build feature vector
    features = np.zeros(len(feature_cols))
    for i, col in enumerate(feature_cols):
        if col in symptom_cols and col in selected_symptoms:
            features[i] = 1
        elif col == 'Age' and age is not None:
            features[i] = age
        elif col == 'Gender' and gender is not None:
            gender_map = {'Male': 0, 'Female': 1, 'Other': 2}
            features[i] = gender_map.get(gender, 2)

    # Predict top 3
    probs = model.predict_proba([features])[0]
    top_indices = np.argsort(probs)[::-1][:3]
    predictions = []
    for idx in top_indices:
        prob = probs[idx] * 100
        if prob > 1:
            disease = le_disease.inverse_transform([idx])[0]
            predictions.append({'disease': disease, 'probability': round(prob, 1)})

    # Home care advice
    top_disease = predictions[0]['disease'] if predictions else None
    home_care = advice_data.get(top_disease, advice_data['default'])

    return jsonify({
        'emergency': False,
        'predictions': predictions or [{'disease': 'No strong match found', 'probability': 0}],
        'home_care': f"Safe suggestions for {top_disease or 'your symptoms'}: {home_care}",
        'disclaimer': 'This tool provides general information only and is NOT a medical diagnosis. Always consult a qualified healthcare professional.'
    })

if __name__ == '__main__':
    app.run(debug=True)