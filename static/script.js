let allSymptoms = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Fetch symptoms from backend
    try {
        const response = await fetch('/symptoms');
        allSymptoms = await response.json();
        allSymptoms.sort();
    } catch (err) {
        console.error('Failed to load symptoms');
        document.getElementById('symptoms-container').innerHTML = '<p class="text-danger">Error loading symptoms. Please refresh.</p>';
        return;
    }

    // Expanded professional categories
    const categories = {
        'General': ['fatigue', 'fever', 'chills', 'high_fever', 'sweating', 'malaise', 'loss_of_appetite', 'weight_loss', 'weight_gain', 'lethargy'],
        'Head & Neck': ['headache', 'dizziness', 'neck_pain', 'blurred_vision', 'visual_disturbances', 'sinus_pressure', 'stiff_neck'],
        'Respiratory': ['cough', 'shortness_of_breath', 'difficulty_in_breathing', 'runny_nose', 'sore_throat', 'chest_pain', 'phlegm', 'breathlessness'],
        'Digestive': ['nausea', 'vomiting', 'diarrhoea', 'constipation', 'abdominal_pain', 'indigestion', 'acidity', 'stomach_pain', 'bloating'],
        'Skin': ['itching', 'skin_rash', 'redness_of_skin', 'nodal_skin_eruptions', 'dischromic_patches', 'skin_peeling', 'silver_like_dusting'],
        'Musculoskeletal': ['joint_pain', 'muscle_weakness', 'back_pain', 'knee_pain', 'hip_joint_pain', 'muscle_pain', 'swelling_joints'],
        'Urinary': ['burning_micturition', 'bladder_discomfort', 'continuous_feel_of_urine'],
        'Neurological': ['altered_sensorium', 'weakness_in_limbs', 'unsteadiness', 'loss_of_balance', 'anxiety'],
        'Other': []
    };

    // Auto-assign remaining symptoms to Other
    allSymptoms.forEach(sym => {
        let assigned = false;
        for (let cat in categories) {
            if (categories[cat].includes(sym)) {
                assigned = true;
                break;
            }
        }
        if (!assigned) {
            categories['Other'].push(sym);
        }
    });

    const container = document.getElementById('symptoms-container');
    container.innerHTML = ''; // Clear

    for (let cat in categories) {
        if (categories[cat].length === 0) continue;

        const col = document.createElement('div');
        col.className = 'col-md-6 mb-4';

        const checkboxes = categories[cat].map(sym => `
            <div class="form-check">
                <input class="form-check-input" type="checkbox" value="${sym}" id="${sym}">
                <label class="form-check-label" for="${sym}">${sym.replace(/_/g, ' ')}</label>
            </div>
        `).join('');

        col.innerHTML = `
            <div class="symptom-card p-4 border rounded bg-white shadow-sm">
                <h5 class="mb-3">${cat} Symptoms</h5>
                ${checkboxes}
            </div>`;
        container.appendChild(col);
    }

    // Search filter
    document.getElementById('search').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        document.querySelectorAll('.form-check').forEach(item => {
            const label = item.querySelector('label').textContent.toLowerCase();
            item.style.display = label.includes(term) ? 'block' : 'none';
        });
    });

    // Submit
    document.getElementById('submit').addEventListener('click', async () => {
        const selected = Array.from(document.querySelectorAll('.form-check-input:checked')).map(cb => cb.value);
        if (selected.length === 0) {
            alert('Please select at least one symptom.');
            return;
        }

        const age = document.getElementById('age').value || null;
        const gender = document.getElementById('gender').value || null;

        document.getElementById('submit').disabled = true;
        document.getElementById('submit').textContent = 'Checking...';

        const res = await fetch('/predict', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({symptoms: selected, age: age ? Number(age) : null, gender})
        });
        const result = await res.json();

        document.getElementById('input-section').classList.add('d-none');
        document.getElementById('results-section').classList.remove('d-none');

        let content = '<div class="alert alert-warning">Remember: This is NOT a diagnosis. Always consult a doctor.</div>';

        if (result.emergency) {
            content += `<div class="alert alert-danger text-center fs-4">${result.message}</div>`;
        } else {
            content += '<h4 class="mt-3">Possible common conditions (general info only):</h4>';
            (result.predictions || []).forEach(p => {
                const width = p.probability || 0;
                content += `
                    <div class="card mb-3">
                        <div class="card-body">
                            <strong>${p.disease}</strong> — ${width}% confidence
                            <div class="progress mt-2">
                                <div class="progress-bar bg-success" style="width: ${width}%">${width}%</div>
                            </div>
                        </div>
                    </div>`;
            });
            content += `<h5>Safe home care suggestions:</h5><p>${result.home_care || 'Rest, stay hydrated, and monitor your symptoms.'}</p>`;
            content += '<p class="mt-3"><strong>When to see a doctor immediately:</strong> Worsening symptoms, high fever, severe pain, or difficulty breathing.</p>';
        }
        content += `<p class="small text-muted">${result.disclaimer}</p>`;

        document.getElementById('results-content').innerHTML = content;

        document.getElementById('submit').disabled = false;
        document.getElementById('submit').textContent = 'Check Symptoms';
    });

    // Restart
    document.getElementById('restart').addEventListener('click', () => {
        document.querySelectorAll('.form-check-input').forEach(cb => cb.checked = false);
        document.getElementById('search').value = '';
        document.getElementById('age').value = '';
        document.getElementById('gender').value = '';
        document.getElementById('results-section').classList.add('d-none');
        document.getElementById('input-section').classList.remove('d-none');
    });
});