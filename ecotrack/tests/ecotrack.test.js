/**
 * ecotrack.test.js
 * Unit tests for EcoTrack core logic
 * Run with: node tests/ecotrack.test.js
 * (No framework needed — uses Node's built-in assert)
 */

const assert = require('assert');

// ─── Mock localStorage ────────────────────────────────────────────────────────
let _storage = {};
const localStorage = {
    getItem: (k) => _storage[k] ?? null,
    setItem: (k, v) => { _storage[k] = v; },
    removeItem: (k) => { delete _storage[k]; },
    clear: () => { _storage = {}; }
};
global.localStorage = localStorage;
global.window = { dispatchEvent: () => { } };

// ─── Inline the functions under test (copy from source) ──────────────────────
const STORAGE_KEY = 'ecotrack_data';
const defaultData = {
    history: [],
    actionsCompleted: [],
    challengeProgress: {},
    streak: 0,
    lastActiveDate: null,
    totalSavings: 0,
    totalXP: 0,
    badges: [],
    tracker: {}
};

function loadData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        const fresh = JSON.parse(JSON.stringify(defaultData));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
        return fresh;
    }
    const parsed = JSON.parse(raw);
    return Object.assign(JSON.parse(JSON.stringify(defaultData)), parsed);
}

function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getCurrentDateStr() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function addEmission(category, amount) {
    const data = loadData();
    const today = getCurrentDateStr();
    let todayLog = data.history.find(log => log.date === today);
    if (!todayLog) {
        todayLog = { date: today, transport: 0, energy: 0, diet: 0, shopping: 0, total: 0 };
        data.history.push(todayLog);
    }
    todayLog[category] += amount;
    todayLog.total += amount;
    saveData(data);
    return todayLog.total;
}

// Carbon calculation factors (from calculator.js)
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

function calculateTransportEmission(carKm, isElectric, isDiesel, transitKm, flightHrs) {
    let carFactor = FACTORS.carPetrol;
    if (isElectric) carFactor = FACTORS.carElectric;
    else if (isDiesel) carFactor = FACTORS.carDiesel;
    return (carKm * carFactor) + (transitKm * FACTORS.transit) + (flightHrs * FACTORS.flight);
}

function calculateDietEmission(beefMeals, chickenMeals, veganMeals) {
    return (beefMeals * FACTORS.beef) + (chickenMeals * FACTORS.chicken) + (veganMeals * FACTORS.vegan);
}

// XP level system (from gamification.js)
const LEVELS = [
    { level: 1, name: 'Seedling', xpRequired: 0 },
    { level: 2, name: 'Sprout', xpRequired: 100 },
    { level: 3, name: 'Sapling', xpRequired: 300 },
    { level: 4, name: 'Tree', xpRequired: 600 },
    { level: 5, name: 'Grove', xpRequired: 1000 },
    { level: 10, name: 'Eco Legend', xpRequired: 5500 },
];

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

// ─── Test Runner ──────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✅ PASS: ${name}`);
        passed++;
    } catch (err) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(`     → ${err.message}`);
        failed++;
    }
    // Reset storage between tests
    localStorage.clear();
}

// ─── Storage Tests ────────────────────────────────────────────────────────────
console.log('\n📦 Storage Tests');

test('loadData() returns default data on fresh start', () => {
    const data = loadData();
    assert.deepStrictEqual(data.history, []);
    assert.strictEqual(data.streak, 0);
    assert.strictEqual(data.totalXP, 0);
    assert.strictEqual(data.totalSavings, 0);
});

test('loadData() persists data between calls', () => {
    const data = loadData();
    data.totalXP = 500;
    saveData(data);
    const reloaded = loadData();
    assert.strictEqual(reloaded.totalXP, 500);
});

test('loadData() merges missing fields from defaultData', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ streak: 5 }));
    const data = loadData();
    assert.strictEqual(data.streak, 5);
    assert.deepStrictEqual(data.badges, []); // Should have default
});

test('addEmission() adds emission to correct category', () => {
    addEmission('transport', 5.5);
    const data = loadData();
    const today = getCurrentDateStr();
    const log = data.history.find(l => l.date === today);
    assert.ok(log, 'Today log should exist');
    assert.strictEqual(log.transport, 5.5);
    assert.strictEqual(log.total, 5.5);
});

test('addEmission() accumulates multiple emissions', () => {
    addEmission('transport', 3.0);
    addEmission('energy', 2.0);
    addEmission('diet', 1.5);
    const data = loadData();
    const today = getCurrentDateStr();
    const log = data.history.find(l => l.date === today);
    assert.strictEqual(log.transport, 3.0);
    assert.strictEqual(log.energy, 2.0);
    assert.strictEqual(log.diet, 1.5);
    assert.strictEqual(log.total, 6.5);
});

test('addEmission() does not create duplicate date entries', () => {
    addEmission('transport', 1.0);
    addEmission('transport', 2.0);
    const data = loadData();
    const today = getCurrentDateStr();
    const todayLogs = data.history.filter(l => l.date === today);
    assert.strictEqual(todayLogs.length, 1);
    assert.strictEqual(todayLogs[0].transport, 3.0);
});

// ─── Carbon Calculation Tests ─────────────────────────────────────────────────
console.log('\n🌍 Carbon Calculation Tests');

test('Transport: petrol car calculation is correct', () => {
    const result = calculateTransportEmission(100, false, false, 0, 0);
    assert.strictEqual(result, 100 * 0.21); // 21 kg
});

test('Transport: electric car emits less than petrol', () => {
    const petrol = calculateTransportEmission(100, false, false, 0, 0);
    const electric = calculateTransportEmission(100, true, false, 0, 0);
    assert.ok(electric < petrol, 'Electric should emit less than petrol');
    assert.strictEqual(electric, 100 * 0.05); // 5 kg
});

test('Transport: diesel factor is between electric and petrol', () => {
    const petrol = calculateTransportEmission(100, false, false, 0, 0);
    const diesel = calculateTransportEmission(100, false, true, 0, 0);
    const electric = calculateTransportEmission(100, true, false, 0, 0);
    assert.ok(electric < diesel && diesel < petrol);
});

test('Transport: public transit lower than petrol per km', () => {
    const carEmission = 10 * FACTORS.carPetrol;
    const transitEmission = 10 * FACTORS.transit;
    assert.ok(transitEmission < carEmission);
});

test('Diet: beef emits most per meal', () => {
    const beef = calculateDietEmission(1, 0, 0);
    const chicken = calculateDietEmission(0, 1, 0);
    const vegan = calculateDietEmission(0, 0, 1);
    assert.ok(beef > chicken && chicken > vegan);
});

test('Diet: zero meals = zero emissions', () => {
    const result = calculateDietEmission(0, 0, 0);
    assert.strictEqual(result, 0);
});

test('Diet: vegan meals have minimal emissions', () => {
    const result = calculateDietEmission(0, 0, 7);
    assert.strictEqual(result, 7 * 0.2);
});

test('Flight emission is very high per hour', () => {
    const flightEmission = calculateTransportEmission(0, false, false, 0, 1);
    assert.strictEqual(flightEmission, 90.0);
    assert.ok(flightEmission > calculateTransportEmission(100, false, false, 0, 0));
});

// ─── Gamification / XP Tests ──────────────────────────────────────────────────
console.log('\n🎮 Gamification Tests');

test('Level 1 at 0 XP', () => {
    const { current } = getLevel(0);
    assert.strictEqual(current.level, 1);
    assert.strictEqual(current.name, 'Seedling');
});

test('Level 2 at exactly 100 XP', () => {
    const { current } = getLevel(100);
    assert.strictEqual(current.level, 2);
});

test('Level 2 at 99 XP (not yet)', () => {
    const { current } = getLevel(99);
    assert.strictEqual(current.level, 1);
});

test('Max level returns null for next', () => {
    const { current, next } = getLevel(6000);
    assert.strictEqual(current.level, 10);
    assert.strictEqual(next, null);
});

test('XP progress is percentage between levels', () => {
    const { current, next } = getLevel(200);
    const range = next.xpRequired - current.xpRequired;
    const progress = 200 - current.xpRequired;
    const pct = (progress / range) * 100;
    assert.ok(pct > 0 && pct <= 100);
});

// ─── Date Utility Tests ───────────────────────────────────────────────────────
console.log('\n📅 Date Utility Tests');

test('getCurrentDateStr() returns YYYY-MM-DD format', () => {
    const result = getCurrentDateStr();
    assert.match(result, /^\d{4}-\d{2}-\d{2}$/);
});

test('getCurrentDateStr() matches today', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    assert.strictEqual(getCurrentDateStr(), expected);
});

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(50));
console.log(`Tests complete: ${passed} passed, ${failed} failed`);
if (failed > 0) {
    console.log('❌ Some tests failed. Fix issues above.');
    process.exit(1);
} else {
    console.log('✅ All tests passed!');
}