// js/gamification.js
// Challenges, Badges, and XP Levelling System

import { loadData, saveData, addXP } from './storage.js';

// ─── Level Definitions ────────────────────────────────────────────────────────
const LEVELS = [
    { level: 1,  name: 'Seedling',   xpRequired: 0    },
    { level: 2,  name: 'Sprout',     xpRequired: 100  },
    { level: 3,  name: 'Sapling',    xpRequired: 300  },
    { level: 4,  name: 'Tree',       xpRequired: 600  },
    { level: 5,  name: 'Grove',      xpRequired: 1000 },
    { level: 6,  name: 'Forest',     xpRequired: 1500 },
    { level: 7,  name: 'Biome',      xpRequired: 2200 },
    { level: 8,  name: 'Guardian',   xpRequired: 3000 },
    { level: 9,  name: 'Champion',   xpRequired: 4000 },
    { level: 10, name: 'Eco Legend', xpRequired: 5500 },
];

// ─── Weekly Challenges ────────────────────────────────────────────────────────
const CHALLENGES = [
    {
        id: 'bike_week',
        title: 'Cycling Streak',
        desc: 'Log cycling 3 times this week',
        target: 3,  unit: 'rides',
        category: 'transport', xp: 150, icon: '🚴',
        activityId: 'cycling',
    },
    {
        id: 'meatless_3',
        title: 'Meatless Hero',
        desc: 'Log 3 plant-based meals',
        target: 3, unit: 'meals',
        category: 'diet', xp: 120, icon: '🥗',
        activityId: 'plantmeal',
    },
    {
        id: 'steps_30k',
        title: 'Step Master',
        desc: 'Walk 30,000 steps this week',
        target: 30000, unit: 'steps',
        category: 'fitness', xp: 100, icon: '👟',
        activityId: null, // Handled separately
    },
    {
        id: 'recycle_5',
        title: 'Recycle Habit',
        desc: 'Recycle 5 times this week',
        target: 5, unit: 'times',
        category: 'lifestyle', xp: 80, icon: '♻️',
        activityId: 'recycle',
    },
    {
        id: 'low_emission_3',
        title: 'Low-Carbon Days',
        desc: 'Keep daily emissions under 10 kg for 3 days',
        target: 3, unit: 'days',
        category: 'general', xp: 200, icon: '🌱',
        activityId: null, // Handled separately
    },
    {
        id: 'air_dry_3',
        title: 'Air Dry Hero',
        desc: 'Air dry laundry 3 times this week',
        target: 3, unit: 'times',
        category: 'lifestyle', xp: 60, icon: '🧺',
        activityId: 'laundry',
    },
];

// ─── Badge Definitions ────────────────────────────────────────────────────────
const BADGES = [
    { id: 'first_log',    name: 'First Steps',     desc: 'Logged your first eco-action',   icon: '🌱' },
    { id: 'streak_3',     name: 'On a Roll',        desc: '3-day activity streak',           icon: '🎯' },
    { id: 'streak_7',     name: 'Week Warrior',     desc: '7-day activity streak',           icon: '🔥' },
    { id: 'streak_30',    name: 'Month Master',     desc: '30-day activity streak',          icon: '⚡' },
    { id: 'low_carbon',   name: 'Eco Hero',         desc: 'Kept a day below 5 kg CO₂',      icon: '💚' },
    { id: 'steps_10k',    name: 'Step Champion',    desc: 'Hit 10,000 steps in a single day', icon: '👟' },
    { id: 'challenge_1',  name: 'Challenger',       desc: 'Completed your first challenge',  icon: '🏆' },
    { id: 'tree_saver',   name: 'Tree Saver',       desc: 'Saved 50 kg CO₂ total',          icon: '🌳' },
    { id: 'plant_5',      name: 'Plant Powered',    desc: 'Logged 5 plant-based meals',      icon: '🥗' },
    { id: 'xp_500',       name: 'XP Hunter',        desc: 'Earned 500 XP',                   icon: '⭐' },
];

// ─── Public Init ──────────────────────────────────────────────────────────────
export function initGamification() {
    renderGamification();
    window.addEventListener('ecotrackDataChanged', renderGamification);
}

// ─── Main Render ──────────────────────────────────────────────────────────────
function renderGamification() {
    const data = loadData();
    checkAndAwardBadges(data); // mutates and saves if changed
    const updatedData = loadData(); // reload after potential saves
    renderXPHero(updatedData);
    renderChallenges(updatedData);
    renderBadges(updatedData);
    updateSidebarXP(updatedData);
}

// ─── Level Utilities ──────────────────────────────────────────────────────────
function getLevel(totalXP) {
    let current = LEVELS[0];
    let next = LEVELS[1];
    for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (totalXP >= LEVELS[i].xpRequired) {
            current = LEVELS[i];
            next = LEVELS[i + 1] || null;
            break;
        }
    }
    return { current, next };
}

// ─── XP Hero Card ─────────────────────────────────────────────────────────────
function renderXPHero(data) {
    const totalXP = data.totalXP || 0;
    const { current, next } = getLevel(totalXP);

    const badge = document.getElementById('gam-level-badge');
    const title = document.getElementById('gam-level-title');
    const fill  = document.getElementById('gam-xp-fill');
    const label = document.getElementById('gam-xp-label');
    const streakEl = document.getElementById('gam-streak');
    const badgesEl = document.getElementById('gam-badges-count');
    const chalEl   = document.getElementById('gam-challenges-count');

    if (badge) badge.innerText = current.level;
    if (title) title.innerText = `Lvl ${current.level}: ${current.name}`;
    if (streakEl) streakEl.innerText = data.streak || 0;
    if (badgesEl) badgesEl.innerText = (data.badges || []).length;

    // Count completed challenges
    const completedCount = CHALLENGES.filter(ch => {
        const prog = calculateChallengeProgress(data);
        return prog[ch.id] >= ch.target;
    }).length;
    if (chalEl) chalEl.innerText = completedCount;

    // XP bar
    if (fill && label) {
        if (next) {
            const range = next.xpRequired - current.xpRequired;
            const progress = totalXP - current.xpRequired;
            const pct = Math.min((progress / range) * 100, 100);
            setTimeout(() => { fill.style.width = `${pct}%`; }, 100);
            label.innerText = `${totalXP} / ${next.xpRequired} XP`;
        } else {
            setTimeout(() => { fill.style.width = '100%'; }, 100);
            label.innerText = `${totalXP} XP — MAX LEVEL! 🎉`;
        }
    }
}

// ─── Challenge Progress Calculation ──────────────────────────────────────────
function calculateChallengeProgress(data) {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const progress = {};
    let weekSteps = 0;

    if (data.tracker) {
        Object.entries(data.tracker).forEach(([dateKey, dayData]) => {
            const d = new Date(dateKey);
            if (d >= weekAgo) {
                weekSteps += (dayData.steps || 0);

                (dayData.activities || []).forEach(act => {
                    CHALLENGES.forEach(ch => {
                        if (ch.activityId && act.id === ch.activityId) {
                            progress[ch.id] = (progress[ch.id] || 0) + 1;
                        }
                    });
                });
            }
        });
    }

    progress['steps_30k'] = weekSteps;

    // Low emission days
    let lowDays = 0;
    (data.history || []).forEach(log => {
        const d = new Date(log.date);
        if (d >= weekAgo && log.total > 0 && log.total < 10) lowDays++;
    });
    progress['low_emission_3'] = lowDays;

    return progress;
}

// ─── Render Challenges ────────────────────────────────────────────────────────
function renderChallenges(data) {
    const grid = document.getElementById('challenges-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const progressMap = calculateChallengeProgress(data);
    let newCompletions = false;

    CHALLENGES.forEach(ch => {
        const raw = progressMap[ch.id] || 0;
        const pct = Math.min((raw / ch.target) * 100, 100);
        const completed = raw >= ch.target;

        // Award XP if newly completed
        const alreadyRewarded = (data.challengeProgress || {})[ch.id]?.rewarded;
        if (completed && !alreadyRewarded) {
            data.challengeProgress = data.challengeProgress || {};
            data.challengeProgress[ch.id] = { rewarded: true };
            data.totalXP = (data.totalXP || 0) + ch.xp;
            if (!data.badges.includes('challenge_1')) data.badges.push('challenge_1');
            newCompletions = true;
        }

        const card = document.createElement('div');
        card.className = `challenge-card${completed ? ' challenge-complete' : ''}`;
        card.innerHTML = `
            <div class="challenge-header">
                <span class="challenge-icon">${ch.icon}</span>
                <div class="challenge-info">
                    <h4>${ch.title}</h4>
                    <p class="challenge-desc">${ch.desc}</p>
                </div>
                <div class="challenge-xp">+${ch.xp} XP</div>
            </div>
            <div class="challenge-progress-bar">
                <div class="challenge-progress-fill" style="width: 0%"
                     data-target="${pct}"></div>
            </div>
            <div class="challenge-footer">
                <span class="challenge-count mono">${Math.min(raw, ch.target).toLocaleString()} / ${ch.target.toLocaleString()} ${ch.unit}</span>
                ${completed
                    ? '<span class="challenge-badge">✅ Complete!</span>'
                    : `<span class="challenge-pct">${Math.floor(pct)}%</span>`
                }
            </div>
        `;
        grid.appendChild(card);
    });

    if (newCompletions) {
        saveData(data);
        window.dispatchEvent(new Event('ecotrackDataChanged'));
    }

    // Animate bars after DOM paint
    requestAnimationFrame(() => {
        document.querySelectorAll('.challenge-progress-fill[data-target]').forEach(el => {
            const target = el.getAttribute('data-target');
            setTimeout(() => { el.style.width = `${target}%`; }, 150);
        });
    });
}

// ─── Render Badges ────────────────────────────────────────────────────────────
function renderBadges(data) {
    const grid = document.getElementById('badges-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const earned = data.badges || [];

    BADGES.forEach(badge => {
        const isEarned = earned.includes(badge.id);
        const div = document.createElement('div');
        div.className = `badge-card ${isEarned ? 'badge-earned' : 'badge-locked'}`;
        div.title = isEarned ? badge.desc : `🔒 ${badge.desc}`;
        div.innerHTML = `
            <span class="badge-icon">${isEarned ? badge.icon : '🔒'}</span>
            <span class="badge-name">${badge.name}</span>
            <span class="badge-desc">${badge.desc}</span>
        `;
        grid.appendChild(div);
    });
}

// ─── Auto-Award Badges ────────────────────────────────────────────────────────
function checkAndAwardBadges(data) {
    const earned = data.badges || [];
    let changed = false;

    const award = (id) => {
        if (!earned.includes(id)) {
            earned.push(id);
            data.badges = earned;
            // Also give some XP for badge
            data.totalXP = (data.totalXP || 0) + 25;
            changed = true;
        }
    };

    // First action logged
    const hasActions = (data.actionsCompleted || []).length > 0
        || Object.keys(data.tracker || {}).length > 0;
    if (hasActions) award('first_log');

    // Streaks
    if ((data.streak || 0) >= 3)  award('streak_3');
    if ((data.streak || 0) >= 7)  award('streak_7');
    if ((data.streak || 0) >= 30) award('streak_30');

    // Steps 10k in any single day
    if (data.tracker) {
        Object.values(data.tracker).forEach(d => {
            if ((d.steps || 0) >= 10000) award('steps_10k');
        });
    }

    // Total savings 50 kg
    if ((data.totalSavings || 0) >= 50) award('tree_saver');

    // Plant meals ≥ 5
    let plantCount = 0;
    if (data.tracker) {
        Object.values(data.tracker).forEach(d => {
            (d.activities || []).forEach(a => {
                if (a.id === 'plantmeal') plantCount++;
            });
        });
    }
    if (plantCount >= 5) award('plant_5');

    // XP ≥ 500
    if ((data.totalXP || 0) >= 500) award('xp_500');

    // Low-carbon day
    (data.history || []).forEach(log => {
        if (log.total > 0 && log.total < 5) award('low_carbon');
    });

    if (changed) {
        saveData(data);
    }
}

// ─── Sidebar XP Sync ─────────────────────────────────────────────────────────
function updateSidebarXP(data) {
    const totalXP = data.totalXP || 0;
    const { current, next } = getLevel(totalXP);

    const sidebarLevel = document.querySelector('.level-name');
    if (sidebarLevel) sidebarLevel.innerText = `Lvl ${current.level}: ${current.name}`;

    const sidebarXPText = document.querySelector('.xp-text');
    if (sidebarXPText) {
        sidebarXPText.innerText = next
            ? `${totalXP} / ${next.xpRequired} XP`
            : `${totalXP} XP · MAX`;
    }

    const sidebarFill = document.getElementById('sidebar-xp-fill');
    if (sidebarFill && next) {
        const range = next.xpRequired - current.xpRequired;
        const progress = totalXP - current.xpRequired;
        sidebarFill.style.width = `${Math.min((progress / range) * 100, 100)}%`;
    }
}
