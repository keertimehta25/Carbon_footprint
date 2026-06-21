// js/tracker.js

import { loadData, saveData, getCurrentDateStr, sanitizeHTML } from './storage.js';

let currentSteps = 0;
const STEP_GOAL = 10000;
const STEP_SAVINGS_FACTOR = 0.0008; // kg CO2e per step

export function initTracker() {
    loadTodayTrackerData();
    setupPedometer();
    setupActivityLog();
    renderHeatmap();
    
    // Update if storage changes from elsewhere
    window.addEventListener('ecotrackDataChanged', () => {
        loadTodayTrackerData();
        renderHeatmap();
    });
}

function loadTodayTrackerData() {
    const data = loadData();
    const today = getCurrentDateStr();
    
    // Ensure structure exists
    if (!data.tracker) data.tracker = {};
    if (!data.tracker[today]) {
        data.tracker[today] = { steps: 0, activities: [] };
        saveData(data);
    }
    
    currentSteps = data.tracker[today].steps;
    updatePedometerUI();
    renderActivityLog(data.tracker[today].activities);
    
    // Update today's total savings
    const activitySavings = data.tracker[today].activities.reduce((sum, act) => sum + act.savings, 0);
    const stepSavings = currentSteps * STEP_SAVINGS_FACTOR;
    document.getElementById('today-savings-total').innerText = `Today: ${(activitySavings + stepSavings).toFixed(2)} kg`;
}

function setupPedometer() {
    const input = document.getElementById('manual-step-input');
    
    document.getElementById('btn-step-minus').addEventListener('click', () => {
        input.value = Math.max(0, parseInt(input.value || 0) - 100);
    });
    
    document.getElementById('btn-step-plus').addEventListener('click', () => {
        input.value = parseInt(input.value || 0) + 100;
    });
    
    document.querySelectorAll('.btn-quick-add').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const add = parseInt(e.target.getAttribute('data-add'));
            addSteps(add);
        });
    });
    
    document.getElementById('btn-save-steps').addEventListener('click', () => {
        const val = parseInt(input.value || 0);
        if (val > 0) {
            addSteps(val);
            input.value = 0;
        }
    });
}

function addSteps(amount) {
    const data = loadData();
    const today = getCurrentDateStr();
    
    const wasBelowGoal = currentSteps < STEP_GOAL;
    
    currentSteps += amount;
    data.tracker[today].steps = currentSteps;
    
    // Add to global savings
    const savings = amount * STEP_SAVINGS_FACTOR;
    data.totalSavings = (data.totalSavings || 0) + savings;
    
    saveData(data);
    updatePedometerUI();
    loadTodayTrackerData(); // Refresh totals
    
    window.dispatchEvent(new Event('ecotrackDataChanged'));
    
    if (wasBelowGoal && currentSteps >= STEP_GOAL) {
        triggerConfetti();
    }
}

function updatePedometerUI() {
    const fillEl = document.getElementById('step-ring-fill');
    const countEl = document.getElementById('live-step-count');
    const savingsEl = document.getElementById('live-step-savings');
    
    if (!fillEl || !countEl) return;
    
    // Animate numbers
    animateValue(countEl, parseInt(countEl.innerText) || 0, currentSteps, 500);
    
    const savings = currentSteps * STEP_SAVINGS_FACTOR;
    savingsEl.innerText = `${savings.toFixed(2)} kg saved`;
    
    // Update SVG ring (502 is circumference)
    const percentage = Math.min(currentSteps / STEP_GOAL, 1);
    const offset = 502 - (percentage * 502);
    fillEl.style.strokeDashoffset = offset;
    
    if (percentage >= 1) {
        fillEl.style.stroke = 'var(--accent-lime)';
    } else {
        fillEl.style.stroke = 'var(--accent-neon)';
    }
}

function setupActivityLog() {
    document.querySelectorAll('.activity-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const btnEl = e.target.closest('.activity-btn');
            const id = btnEl.getAttribute('data-id');
            const savings = parseFloat(btnEl.getAttribute('data-savings'));
            const emoji = btnEl.querySelector('.emoji').innerText;
            const name = btnEl.innerText.replace(emoji, '').trim();
            
            logActivity(id, name, emoji, savings);
        });
    });
}

function logActivity(id, name, emoji, savings) {
    const data = loadData();
    const today = getCurrentDateStr();
    
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const activity = { id, name, emoji, savings, time: timeStr };
    data.tracker[today].activities.unshift(activity); // Add to beginning
    
    data.totalSavings = (data.totalSavings || 0) + savings;
    
    saveData(data);
    loadTodayTrackerData();
    window.dispatchEvent(new Event('ecotrackDataChanged'));
}

function renderActivityLog(activities) {
    const container = document.getElementById('activity-log-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    activities.forEach(act => {
        const div = document.createElement('div');
        div.className = 'log-entry';
        const safeName = sanitizeHTML(act.name);
        const safeEmoji = sanitizeHTML(act.emoji);
        const safeTime = sanitizeHTML(act.time);
        div.innerHTML = `
            <div class="log-entry-info">
                <span>${safeEmoji}</span>
                <span>${safeName}</span>
                <span class="log-entry-time">${safeTime}</span>
            </div>
            <span class="log-entry-savings">+${act.savings.toFixed(2)} kg</span>
        `;
        container.appendChild(div);
    });
}

function renderHeatmap() {
    const container = document.getElementById('heatmap-container');
    if (!container) return;
    
    container.innerHTML = '';
    const data = loadData();
    
    // Generate last 28 days (4 weeks * 7 columns)
    const today = new Date();
    const days = [];
    
    for (let i = 27; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        days.push(d);
    }
    
    // Create columns (7 columns of 4 rows, or 4 cols of 7 rows depending on orientation)
    // Github is usually 7 rows (days of week) by X columns (weeks).
    // Let's do 4 columns (weeks), 7 rows (days).
    
    for (let w = 0; w < 4; w++) {
        const colDiv = document.createElement('div');
        colDiv.className = 'heatmap-col';
        
        for (let d = 0; d < 7; d++) {
            const dayIndex = w * 7 + d;
            const dateObj = days[dayIndex];
            
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const dayStr = String(dateObj.getDate()).padStart(2, '0');
            const dateKey = `${year}-${month}-${dayStr}`;
            
            // Calculate activity level
            let level = 0;
            let savings = 0;
            
            if (data.tracker && data.tracker[dateKey]) {
                const dayData = data.tracker[dateKey];
                savings += (dayData.steps || 0) * STEP_SAVINGS_FACTOR;
                savings += (dayData.activities || []).reduce((s, a) => s + a.savings, 0);
            }
            
            if (savings > 0) level = 1;
            if (savings > 2) level = 2;
            if (savings > 5) level = 3;
            if (savings > 10) level = 4;
            
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';
            cell.setAttribute('data-level', level);
            cell.setAttribute('role', 'img');
            cell.setAttribute('tabindex', '0');
            cell.setAttribute(
                'aria-label',
                `${dateObj.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}: ${savings.toFixed(1)} kg CO₂e saved`
            );

            cell.innerHTML = `
                <div class="tooltip">${dateObj.toLocaleDateString()}: ${savings.toFixed(1)}kg saved</div>
            `;
            
            colDiv.appendChild(cell);
        }
        
        container.appendChild(colDiv);
    }
}

// Helpers
function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = start + (end - start) * progress;
        obj.innerHTML = Math.floor(current);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

function triggerConfetti() {
    // A simple programmatic confetti effect could go here
    // For now, let's just animate the pedometer glow
    const svg = document.querySelector('.pedometer-gauge svg');
    svg.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    svg.style.transform = 'rotate(-90deg) scale(1.1)';
    setTimeout(() => {
        svg.style.transform = 'rotate(-90deg) scale(1)';
    }, 300);
}
