// js/calculator.js

import { addEmission, getTodayLog } from './storage.js';

// Emission Factors
const FACTORS = {
    carPetrol: 0.21,
    carDiesel: 0.17,
    carElectric: 0.05,
    transit: 0.089,
    flight: 90.0,
    elec: 0.475,
    gas: 2.04,
    beef: 3.86,
    chicken: 0.69,
    vegan: 0.2,
    clothes: 10.0,
    orders: 3.5
};

let currentStep = 1;
const totalSteps = 4;
let wizardChart = null;

export function initCalculator() {
    setupWizardNavigation();
    setupLiveCalculation();
}

function setupWizardNavigation() {
    const btnNext = document.getElementById('btn-next');
    const btnPrev = document.getElementById('btn-prev');
    const btnSave = document.getElementById('btn-save-wizard');

    if (!btnNext) return;

    btnNext.addEventListener('click', () => {
        if (currentStep < totalSteps) {
            currentStep++;
            showStep(currentStep);
        } else if (currentStep === totalSteps) {
            // Move to results screen
            showResultsScreen();
        }
    });

    btnPrev.addEventListener('click', () => {
        if (currentStep > 1) {
            if (document.getElementById('step-results').classList.contains('active-step')) {
                // Going back from results
                document.getElementById('step-results').classList.remove('active-step');
                showStep(totalSteps);
                btnNext.style.display = 'block';
            } else {
                currentStep--;
                showStep(currentStep);
            }
        }
    });

    btnSave?.addEventListener('click', saveToDashboard);
}

function showStep(stepNum) {
    document.querySelectorAll('.wizard-step').forEach(step => step.classList.remove('active-step'));
    document.getElementById(`step-${stepNum}`).classList.add('active-step');

    document.getElementById('wizard-step-num').innerText = stepNum;
    document.getElementById('wizard-progress-fill').style.width = `${(stepNum / totalSteps) * 100}%`;

    document.getElementById('btn-prev').style.display = stepNum === 1 ? 'none' : 'block';
    document.getElementById('btn-next').innerText = stepNum === totalSteps ? 'Show Results →' : 'Next Step →';
}

function setupLiveCalculation() {
    const sliders = document.querySelectorAll('.impact-slider');
    const toggles = document.querySelectorAll('.neon-toggle');

    const calculateLive = () => {
        const impact = calculateCurrentImpact();
        document.getElementById('wizard-running-total').innerText = `${impact.total.toFixed(2)} kg CO₂e`;

        // Update live val text next to each slider
        sliders.forEach(slider => {
            const valId = slider.id.replace('slider', 'val');
            const valEl = document.getElementById(valId);
            if (valEl) {
                // Extract unit from existing text or guess
                const unit = valEl.innerText.split(' ')[1] || '';
                valEl.innerText = `${slider.value} ${unit}`;
            }
        });
    };

    sliders.forEach(slider => {
        slider.addEventListener('input', calculateLive);
    });

    toggles.forEach(toggle => {
        toggle.addEventListener('change', calculateLive);
    });
}

function calculateCurrentImpact() {
    // Transport — validated numeric inputs
    const carKm = Math.max(0, parseFloat(document.getElementById('slider-car')?.value) || 0);
    const isElectric = document.getElementById('toggle-electric-car')?.checked ?? false;
    const isDiesel = document.getElementById('toggle-diesel-car')?.checked ?? false;
    const transitKm = Math.max(0, parseFloat(document.getElementById('slider-transit')?.value) || 0);
    const flightHrs = Math.max(0, parseFloat(document.getElementById('slider-flight')?.value) || 0);

    let carFactor = FACTORS.carPetrol;
    if (isElectric) carFactor = FACTORS.carElectric;
    else if (isDiesel) carFactor = FACTORS.carDiesel;

    const transport = (carKm * carFactor) + (transitKm * FACTORS.transit) + (flightHrs * FACTORS.flight);

    // Energy
    const elecKwh = Math.max(0, parseFloat(document.getElementById('slider-elec')?.value) || 0);
    const gasM3 = Math.max(0, parseFloat(document.getElementById('slider-gas')?.value) || 0);
    const energy = (elecKwh * FACTORS.elec) + (gasM3 * FACTORS.gas);

    // Diet
    const beefMeals = Math.max(0, parseFloat(document.getElementById('slider-beef')?.value) || 0);
    const chickenMeals = Math.max(0, parseFloat(document.getElementById('slider-chicken')?.value) || 0);
    const veganMeals = Math.max(0, parseFloat(document.getElementById('slider-vegan')?.value) || 0);
    const diet = (beefMeals * FACTORS.beef) + (chickenMeals * FACTORS.chicken) + (veganMeals * FACTORS.vegan);

    // Shopping
    const clothes = Math.max(0, parseFloat(document.getElementById('slider-clothes')?.value) || 0);
    const orders = Math.max(0, parseFloat(document.getElementById('slider-orders')?.value) || 0);
    const shopping = (clothes * FACTORS.clothes) + (orders * FACTORS.orders);

    const total = transport + energy + diet + shopping;

    return { transport, energy, diet, shopping, total };
}

function showResultsScreen() {
    document.querySelectorAll('.wizard-step').forEach(step => step.classList.remove('active-step'));
    document.getElementById('step-results').classList.add('active-step');

    document.getElementById('wizard-progress-fill').style.width = '100%';
    document.getElementById('btn-next').style.display = 'none';

    const impact = calculateCurrentImpact();

    // Animate total
    animateValue('wizard-final-total', 0, impact.total, 1000);

    // Draw Chart
    drawResultsChart(impact);

    // Set Badge
    const badgeEl = document.getElementById('wizard-badge');
    if (impact.total < 10) {
        badgeEl.innerHTML = '🟢 Eco Hero';
        badgeEl.style.color = 'var(--accent-neon)';
    } else if (impact.total < 25) {
        badgeEl.innerHTML = '🟡 Average Citizen';
        badgeEl.style.color = 'var(--accent-amber)';
    } else {
        badgeEl.innerHTML = '🔴 High Emitter';
        badgeEl.style.color = 'var(--danger)';
    }

    // Cycle Equivalences
    const eqEl = document.getElementById('wizard-equivalence');
    const trees = (impact.total / 21).toFixed(1); // Assuming 21kg/year per tree for context
    const kmFlight = (impact.total / (FACTORS.flight / 800)).toFixed(0); // Approx
    const daysPowered = (impact.total / 5).toFixed(1);

    let eqIndex = 0;
    const eqList = [
        `= 🌳 ${trees} trees needed to offset yearly`,
        `= ✈️ ${kmFlight} km of flight`,
        `= 💡 ${daysPowered} days of home power`
    ];

    eqEl.innerText = eqList[0];
    clearInterval(window.eqInterval);
    window.eqInterval = setInterval(() => {
        eqIndex = (eqIndex + 1) % eqList.length;
        eqEl.innerText = eqList[eqIndex];
    }, 3000);
}

function drawResultsChart(impact) {
    const ctx = document.getElementById('wizard-result-chart');
    if (!ctx) return;

    if (wizardChart) {
        wizardChart.destroy();
    }

    wizardChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Transport', 'Energy', 'Diet', 'Shopping'],
            datasets: [{
                data: [impact.transport, impact.energy, impact.diet, impact.shopping],
                backgroundColor: ['#39FF6A', '#FFB830', '#A8FF3E', '#FF6B9D'],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: { display: false }
            },
            animation: {
                animateScale: true,
                animateRotate: true,
                duration: 1500,
                easing: 'easeOutQuart'
            }
        }
    });
}

function saveToDashboard() {
    try {
        const impact = calculateCurrentImpact();

        if (impact.total === 0) {
            showToast('⚠️ No values entered. Please set at least one activity before saving.');
            return;
        }

        if (impact.transport > 0) addEmission('transport', impact.transport);
        if (impact.energy > 0) addEmission('energy', impact.energy);
        if (impact.diet > 0) addEmission('diet', impact.diet);
        if (impact.shopping > 0) addEmission('shopping', impact.shopping);

        // Reset wizard
        currentStep = 1;
        showStep(1);
        document.querySelectorAll('.impact-slider').forEach(s => s.value = 0);
        document.getElementById('wizard-running-total').innerText = '0.00 kg CO₂e';

        showToast('✅ Saved to Dashboard!');
        document.querySelector('.nav-item[data-target="dashboard"]')?.click();
        document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        console.error('Error saving to dashboard:', err);
        showToast('❌ Failed to save. Please try again.');
    }
}

// Add this toast helper function at the bottom of calculator.js
function showToast(message) {
    const existing = document.getElementById('eco-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'eco-toast';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.style.cssText = `
        position: fixed; bottom: 24px; right: 24px; z-index: 9999;
        background: var(--bg-elevated); color: var(--text-primary);
        padding: 12px 20px; border-radius: var(--radius-md);
        border: 1px solid rgba(57, 255, 106, 0.3);
        font-family: 'Inter', sans-serif; font-size: 0.9rem;
        animation: slideInRight 0.3s ease;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    `;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Helper
function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;

    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = start + (end - start) * progress;
        obj.innerHTML = current.toFixed(1);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}
