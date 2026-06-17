// js/insights.js
// Personalized AI Insights — ES Module

import { loadData } from './storage.js';

const AVG_DAILY_EMISSION = 13.5; // kg CO₂e world average per person per day

// ─── Tips Database ────────────────────────────────────────────────────────────
const TIPS = {
    transport: [
        "Swap one car trip for public transit or cycling this week.",
        "Carpool to work — it cuts your commute emissions in half.",
        "Keep your tires properly inflated to improve fuel efficiency by up to 3%.",
        "Combine errands into a single trip instead of multiple short ones.",
        "Try an e-bike rental for city trips under 5 km.",
    ],
    energy: [
        "Lower your thermostat by 1°C to save up to 10% on heating energy.",
        "Switch all main light bulbs to LEDs — they use 75% less energy.",
        "Unplug phantom power users like TVs and chargers when not in use.",
        "Wash clothes in cold water — it works just as well for most loads.",
        "Install a smart power strip to eliminate standby power waste.",
    ],
    diet: [
        "Try one meat-free day per week — Meatless Monday is a great start.",
        "Substitute beef with chicken or plant proteins to cut 3× the emissions.",
        "Buy local and seasonal produce to reduce food transport emissions.",
        "Plan your meals weekly to reduce food waste, a major carbon culprit.",
        "Grow herbs or vegetables at home — even a windowsill garden counts.",
    ],
    general: [
        "Track your footprint daily to stay aware and accountable.",
        "Small changes compound — don't get discouraged by slow progress!",
        "Share your journey online to inspire others around you.",
        "Carry a reusable bag and water bottle everywhere you go.",
        "Support businesses that prioritize sustainability.",
    ],
};

const FUN_FACTS = [
    "A single tree absorbs up to 21 kg of CO₂ per year — plant more!",
    "The internet accounts for ~3.7% of global greenhouse gas emissions.",
    "What you eat matters more than where your food comes from.",
    "If food waste were a country, it'd be the world's 3rd largest emitter.",
    "Electric vehicles produce 50% less CO₂ over their lifetime than petrol cars.",
    "Flying business class has 3× the carbon footprint of economy.",
    "The fashion industry produces 10% of all global CO₂ emissions.",
    "A 5-minute shower saves about 45 liters compared to a 10-minute one.",
    "Streaming an hour of video produces roughly 36 grams of CO₂.",
    "Cycling 10 km instead of driving saves about 2.5 kg of CO₂.",
];

const WEEKLY_ACTIONS = [
    "🚶 Walk or bike for at least one short trip every day this week.",
    "🌱 Cook one fully plant-based meal from scratch and enjoy it!",
    "💡 Audit your home for phantom power users and unplug them all.",
    "♻️ Sort your recycling carefully — contamination reduces effectiveness.",
    "🚿 Time your showers and aim for under 5 minutes consistently.",
    "🛍️ Go one week without buying anything new — use what you already have.",
    "🌿 Spend time in nature — it reconnects you with your 'why'.",
    "📦 Batch your online orders to reduce delivery trips and packaging.",
];

// ─── Init ─────────────────────────────────────────────────────────────────────
export function initInsights() {
    generateInsights();

    const refreshBtn = document.getElementById('btn-refresh-insights');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshBtn.style.transform = 'rotate(360deg)';
            refreshBtn.style.transition = 'transform 0.4s ease';
            setTimeout(() => { refreshBtn.style.transform = ''; }, 400);
            generateInsights(true);
        });
    }

    window.addEventListener('ecotrackDataChanged', generateInsights);
}

// ─── Main Generation ──────────────────────────────────────────────────────────
function generateInsights(forceRefresh = false) {
    const data = loadData();
    const last7Days = (data.history || []).slice(-7);

    if (last7Days.length === 0 || last7Days.every(d => d.total === 0)) {
        document.getElementById('highest-emission-source').innerHTML =
            `<span style="opacity:0.6">Not enough data yet! Log your daily activities 
            using the <strong style="color:var(--accent-neon)">Calculator</strong> 
            to see personalized insights here.</span>`;
        renderComparisonBars(0);
        renderTips('general');
        renderFunFact();
        renderWeeklyAction();
        return;
    }

    // ── Aggregates ──
    let totalTrans = 0, totalEnergy = 0, totalDiet = 0, totalAll = 0;
    last7Days.forEach(log => {
        totalTrans  += (log.transport || 0);
        totalEnergy += (log.energy   || 0);
        totalDiet   += (log.diet     || 0);
        totalAll    += (log.total    || 0);
    });

    const days    = last7Days.length;
    const avgDaily = totalAll / days;

    // ── Highest emitting category ──
    const cats = [
        { key: 'transport', val: totalTrans },
        { key: 'energy',    val: totalEnergy },
        { key: 'diet',      val: totalDiet },
    ];
    cats.sort((a, b) => b.val - a.val);
    const highestCat = totalAll > 0 ? cats[0].key : 'general';
    const highestVal = cats[0]?.val || 0;
    const catEmoji   = { transport: '🚗', energy: '⚡', diet: '🥗', general: '🌍' };

    // ── Performance message ──
    let performanceMsg, performanceColor;
    if (avgDaily < AVG_DAILY_EMISSION * 0.5) {
        performanceMsg = "You're a genuine eco-hero — more than 50% below the world average! 🌟";
        performanceColor = 'var(--accent-neon)';
    } else if (avgDaily < AVG_DAILY_EMISSION) {
        performanceMsg = "Great work! You're tracking below the world average. Keep going! 💚";
        performanceColor = 'var(--accent-lime)';
    } else if (avgDaily < AVG_DAILY_EMISSION * 1.3) {
        performanceMsg = "You're slightly above average — a few changes could flip that. 💛";
        performanceColor = 'var(--accent-amber)';
    } else {
        performanceMsg = "You're above average, but awareness is step one. You've got this! 🔴";
        performanceColor = 'var(--danger)';
    }

    const pct = totalAll > 0 ? ((highestVal / totalAll) * 100).toFixed(0) : 0;
    const catName = highestCat.charAt(0).toUpperCase() + highestCat.slice(1);

    const storyEl = document.getElementById('highest-emission-source');
    if (storyEl) {
        storyEl.innerHTML = `
            Your biggest footprint driver is 
            <strong>${catEmoji[highestCat]} ${catName}</strong>, 
            making up roughly <strong>${pct}%</strong> of your total over the last 
            <strong>${days} day(s)</strong>. Your average daily footprint is 
            <strong style="color:${performanceColor}">${avgDaily.toFixed(1)} kg CO₂e</strong>. 
            ${performanceMsg}
        `;
    }

    renderComparisonBars(avgDaily);
    renderTips(highestCat);
    renderFunFact();
    renderWeeklyAction();
}

// ─── Comparison Bars ──────────────────────────────────────────────────────────
function renderComparisonBars(avgDaily) {
    const youBar = document.getElementById('insight-bar-you');
    const avgBar = document.getElementById('insight-bar-avg');
    if (!youBar || !avgBar) return;

    const maxVal = Math.max(avgDaily, AVG_DAILY_EMISSION) * 1.2 || AVG_DAILY_EMISSION * 1.2;
    const youPct = Math.max((avgDaily / maxVal) * 100, 5);
    const avgPct = (AVG_DAILY_EMISSION / maxVal) * 100;

    // Reset then animate
    youBar.style.width = '5%';
    avgBar.style.width = '5%';

    setTimeout(() => {
        youBar.style.width = `${youPct}%`;
        youBar.innerText  = avgDaily > 0 ? `You: ${avgDaily.toFixed(1)} kg` : 'You: No data';

        avgBar.style.width = `${avgPct}%`;
        avgBar.innerText   = `Avg: ${AVG_DAILY_EMISSION} kg`;
    }, 200);

    // Color code
    if (avgDaily > AVG_DAILY_EMISSION * 1.3) {
        youBar.style.background = 'var(--danger)';
    } else if (avgDaily > AVG_DAILY_EMISSION) {
        youBar.style.background = 'var(--accent-amber)';
    } else {
        youBar.style.background = 'linear-gradient(90deg, var(--accent-neon), var(--accent-lime))';
    }
    youBar.style.color = avgDaily > AVG_DAILY_EMISSION
        ? 'var(--text-primary)' : 'var(--bg-deep)';
}

// ─── Tips ─────────────────────────────────────────────────────────────────────
function renderTips(category) {
    const list = document.getElementById('quick-wins-list');
    if (!list) return;
    list.innerHTML = '';

    const catKey = TIPS[category] ? category : 'diet';
    const picked = shuffle([...TIPS[catKey]]).slice(0, 2);
    const general = shuffle([...TIPS.general]).slice(0, 1);

    [...picked, ...general].forEach(tip => {
        const li = document.createElement('li');
        li.className = 'tip-item';
        li.innerHTML = `<span class="tip-bullet">→</span> ${tip}`;
        list.appendChild(li);
    });
}

// ─── Fun Fact ─────────────────────────────────────────────────────────────────
function renderFunFact() {
    const el = document.getElementById('fun-fact');
    if (el) el.innerText = pick(FUN_FACTS);
}

// ─── Weekly Action ────────────────────────────────────────────────────────────
function renderWeeklyAction() {
    const el = document.getElementById('weekly-action');
    if (el) el.innerText = pick(WEEKLY_ACTIONS);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function shuffle(arr) { return arr.sort(() => 0.5 - Math.random()); }
function pick(arr)    { return arr[Math.floor(Math.random() * arr.length)]; }
