// js/hero.js

import { getTodayLog, loadData } from './storage.js';

export function initHero() {
    updateClock();
    setInterval(updateClock, 1000);
    
    updateHeroData();
    window.addEventListener('ecotrackDataChanged', updateHeroData);
}

function updateClock() {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const day = days[now.getDay()];
    
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    
    const timeString = `Today, ${day} — ${hours}:${minutes} ${ampm}`;
    
    const clockEl = document.getElementById('live-clock');
    if (clockEl) {
        clockEl.innerText = timeString;
    }
}

export function updateHeroData() {
    const todayLog = getTodayLog();
    const data = loadData();
    
    // Animate stats
    animateValue('stat-transport', 0, todayLog.transport, 1500, true);
    animateValue('stat-energy', 0, todayLog.energy, 1500, true);
    animateValue('stat-diet', 0, todayLog.diet, 1500, true);
    animateValue('stat-streak', 0, data.streak || 0, 1500, false);
    
    // Animate Main Gauge
    const gaugeValue = document.getElementById('main-co2-value');
    if (gaugeValue) {
        animateValue('main-co2-value', parseFloat(gaugeValue.innerText) || 0, todayLog.total, 1500, true);
    }
    
    const gaugeFill = document.getElementById('main-co2-gauge');
    if (gaugeFill) {
        // Daily budget assumption around 25kg
        const budget = 25;
        let percentage = Math.min(todayLog.total / budget, 1);
        
        // 816 is max dashoffset (empty ring)
        const circumference = 816;
        const offset = circumference - (percentage * circumference);
        
        gaugeFill.style.strokeDashoffset = offset;
        
        // Color based on performance
        if (percentage > 0.8) {
            gaugeFill.style.stroke = 'var(--danger)';
        } else if (percentage > 0.5) {
            gaugeFill.style.stroke = 'var(--accent-amber)';
        } else {
            gaugeFill.style.stroke = 'var(--accent-neon)';
        }
    }
    
    // Earth pulse logic (approximate pulse duration)
    const glow = document.getElementById('hero-glow-element');
    if (glow) {
        if (todayLog.total > 20) {
            glow.style.animationDuration = '1.5s'; // Fast pulse
            glow.style.background = 'radial-gradient(circle, rgba(255, 71, 87, 0.15) 0%, transparent 70%)';
        } else {
            glow.style.animationDuration = '4s'; // Slow pulse
            glow.style.background = 'radial-gradient(circle, rgba(57, 255, 106, 0.1) 0%, transparent 70%)';
        }
    }
}

// Helper for count-up animation using requestAnimationFrame
function animateValue(id, start, end, duration, isFloat) {
    const obj = document.getElementById(id);
    if (!obj) return;
    
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        
        // Ease out quad
        const easeProgress = progress * (2 - progress);
        const current = start + (end - start) * easeProgress;
        
        obj.innerHTML = isFloat ? current.toFixed(1) : Math.floor(current);
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}
