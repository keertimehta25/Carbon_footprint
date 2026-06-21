// js/main.js

import { loadData } from './storage.js';
import { initHero } from './hero.js';
import { initCalculator } from './calculator.js';
import { initDashboard } from './dashboard.js';
import { initTracker } from './tracker.js';
import { initGamification } from './gamification.js';
import { initInsights } from './insights.js';
import { initLeaderboard } from './leaderboard.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Storage
    loadData();

    // 2. Setup Navigation
    setupNavigation();

    // 3. Initialize modules with error boundaries
    const modules = [
        { name: 'Hero', fn: initHero },
        { name: 'Calculator', fn: initCalculator },
        { name: 'Dashboard', fn: initDashboard },
        { name: 'Tracker', fn: initTracker },
        { name: 'Gamification', fn: initGamification },
        { name: 'Insights', fn: initInsights },
        { name: 'Leaderboard', fn: initLeaderboard },
    ];

    modules.forEach(({ name, fn }) => {
        try {
            fn();
        } catch (err) {
            console.error(`EcoTrack: Failed to initialize module "${name}":`, err);
        }
    });
});

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    // Intersection Observer for scroll-spy active state
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                navItems.forEach(nav => nav.classList.remove('active'));
                const activeNav = document.querySelector(`.nav-item[data-target="${id}"]`);
                if (activeNav) activeNav.classList.add('active');
            }
        });
    }, { root: null, rootMargin: '0px', threshold: 0.4 });

    document.querySelectorAll('.section').forEach(section => observer.observe(section));
}
