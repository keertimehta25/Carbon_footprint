// js/leaderboard.js
// Community Leaderboard — Simulated with realistic eco-warrior data

import { loadData, sanitizeHTML } from './storage.js';

// ─── Simulated Community ──────────────────────────────────────────────────────
const COMMUNITY = [
    { name: 'Nia K.',     avatar: '🌿', weeklyKg: 7.5,  monthlyKg: 30.2,  savings: 96.7  },
    { name: 'Emma T.',    avatar: '🌈', weeklyKg: 6.1,  monthlyKg: 24.8,  savings: 114.3 },
    { name: 'Kai B.',     avatar: '🌊', weeklyKg: 8.2,  monthlyKg: 33.1,  savings: 88.1  },
    { name: 'Yuki T.',    avatar: '🌸', weeklyKg: 9.8,  monthlyKg: 40.5,  savings: 67.2  },
    { name: 'Mei L.',     avatar: '🌙', weeklyKg: 10.3, monthlyKg: 42.9,  savings: 61.8  },
    { name: 'Jin P.',     avatar: '🐢', weeklyKg: 11.1, monthlyKg: 45.6,  savings: 52.4  },
    { name: 'Priya S.',   avatar: '🌺', weeklyKg: 12.4, monthlyKg: 50.1,  savings: 45.3  },
    { name: 'Arjun D.',   avatar: '🌄', weeklyKg: 13.6, monthlyKg: 55.8,  savings: 41.1  },
    { name: 'Luca M.',    avatar: '🍀', weeklyKg: 14.1, monthlyKg: 57.9,  savings: 38.9  },
    { name: 'Amara O.',   avatar: '🌻', weeklyKg: 16.3, monthlyKg: 67.4,  savings: 29.4  },
    { name: 'Sofia R.',   avatar: '🦋', weeklyKg: 19.7, monthlyKg: 81.3,  savings: 15.6  },
    { name: 'Carlos V.',  avatar: '🦅', weeklyKg: 22.4, monthlyKg: 93.7,  savings: 8.2   },
];

let currentPeriod = 'weekly';

// ─── Init ─────────────────────────────────────────────────────────────────────
export function initLeaderboard() {
    renderLeaderboard();

    document.querySelectorAll('.lb-filter-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            document.querySelectorAll('.lb-filter-btn').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            });
            e.currentTarget.classList.add('active');
            e.currentTarget.setAttribute('aria-pressed', 'true');
            currentPeriod = e.currentTarget.getAttribute('data-period');

            // Animate transition
            const layout = document.querySelector('.lb-layout');
            if (layout) {
                layout.style.opacity = '0';
                layout.style.transform = 'translateY(8px)';
                setTimeout(() => {
                    renderLeaderboard();
                    layout.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    layout.style.opacity = '1';
                    layout.style.transform = 'translateY(0)';
                }, 200);
            } else {
                renderLeaderboard();
            }
        });
    });

    window.addEventListener('ecotrackDataChanged', renderLeaderboard);
}

// ─── Main Render ──────────────────────────────────────────────────────────────
function renderLeaderboard() {
    const data     = loadData();
    const userEntry = buildUserEntry(data);
    const period   = currentPeriod;
    const scoreKey = getScoreKey(period);

    // Build full sorted list
    const allUsers = [...COMMUNITY, userEntry];

    // Lower kg = better rank; higher savings = better rank
    if (scoreKey === 'savings') {
        allUsers.sort((a, b) => b.savings - a.savings);
    } else {
        allUsers.sort((a, b) => a[scoreKey] - b[scoreKey]);
    }

    const userRank = allUsers.findIndex(u => u.isUser) + 1;

    renderPodium(allUsers.slice(0, 3), scoreKey, period);
    renderList(allUsers, scoreKey, period);
    renderYourRank(userEntry, userRank, allUsers.length, scoreKey, period);
}

// ─── Build User Entry ─────────────────────────────────────────────────────────
function buildUserEntry(data) {
    const last7  = (data.history || []).slice(-7);
    const last30 = (data.history || []).slice(-30);
    return {
        name:      'You',
        avatar:    '🏃',
        weeklyKg:  last7.reduce((s, l) => s + (l.total || 0), 0),
        monthlyKg: last30.reduce((s, l) => s + (l.total || 0), 0),
        savings:   data.totalSavings || 0,
        isUser:    true,
    };
}

// ─── Podium (Top 3) ───────────────────────────────────────────────────────────
function renderPodium(top3, scoreKey, period) {
    const el = document.getElementById('lb-podium');
    if (!el) return;

    // Arrange: 2nd · 1st · 3rd
    const order   = [top3[1], top3[0], top3[2]].filter(Boolean);
    const heights = top3[1] ? ['120px', '160px', '100px'] : ['160px', '120px', '100px'];
    const medals  = ['🥈', '🥇', '🥉'];
    const ranks   = top3[1] ? [2, 1, 3] : [1, 2, 3];

    el.innerHTML = order.map((user, i) => {
        const rank  = ranks[i];
        const label = formatScore(scoreKey, user[scoreKey], period);
        const safeName = sanitizeHTML(user.name);
        return `
            <div class="podium-slot${user?.isUser ? ' is-user' : ''}">
                <div class="podium-avatar">${user.avatar}</div>
                <div class="podium-name">${safeName}</div>
                <div class="podium-score">${label}</div>
                <div class="podium-stand" style="height:${heights[i]}">
                    <span class="podium-medal">${medals[i]}</span>
                    <span class="podium-rank">#${rank}</span>
                </div>
            </div>
        `;
    }).join('');
}

// ─── Full List ────────────────────────────────────────────────────────────────
function renderList(allUsers, scoreKey, period) {
    const el = document.getElementById('lb-list');
    if (!el) return;

    el.innerHTML = allUsers.map((user, i) => {
        const rank  = i + 1;
        const label = formatScore(scoreKey, user[scoreKey], period);
        const rankDisplay = rank <= 3
            ? ['🥇', '🥈', '🥉'][rank - 1]
            : `#${rank}`;
        const safeName = sanitizeHTML(user.name);

        return `
            <div class="lb-row${user.isUser ? ' lb-row-user' : ''}">
                <span class="lb-rank">${rankDisplay}</span>
                <span class="lb-avatar">${user.avatar}</span>
                <span class="lb-name">${safeName}${user.isUser ? ' <em style="opacity:0.5;font-size:.75rem">(you)</em>' : ''}</span>
                <span class="lb-score">${label}</span>
            </div>
        `;
    }).join('');
}

// ─── Your Rank Card ───────────────────────────────────────────────────────────
function renderYourRank(user, rank, total, scoreKey, period) {
    const el = document.getElementById('lb-your-rank');
    if (!el) return;

    const topPct   = Math.round((1 - rank / total) * 100);
    const label    = formatScore(scoreKey, user[scoreKey], period);
    const topLabel = topPct === 0 ? 'Top 1%' : `Top ${topPct}%`;
    const periodName = { weekly: 'This Week', monthly: 'This Month', alltime: 'All Time' }[period];

    el.innerHTML = `
        <div class="your-rank-inner">
            <div class="your-rank-avatar">${user.avatar}</div>
            <div class="your-rank-info">
                <div class="your-rank-title">Your Community Standing</div>
                <div class="your-rank-num mono">#${rank} <span style="font-size:1rem;color:var(--text-muted)">of ${total}</span></div>
                <div class="your-rank-pct">🌍 ${topLabel} of the community</div>
            </div>
            <div class="your-rank-score">
                <div class="your-rank-score-val mono">${label}</div>
                <div class="your-rank-score-label">${periodName}</div>
            </div>
        </div>
    `;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getScoreKey(period) {
    if (period === 'weekly')  return 'weeklyKg';
    if (period === 'monthly') return 'monthlyKg';
    return 'savings';
}

function formatScore(scoreKey, value, period) {
    if (scoreKey === 'savings') {
        return `${(value || 0).toFixed(1)} kg saved`;
    }
    return `${(value || 0).toFixed(1)} kg CO₂`;
}
