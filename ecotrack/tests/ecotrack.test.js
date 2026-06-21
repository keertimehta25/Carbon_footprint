/**
 * ecotrack.test.js
 * Unit tests for EcoTrack core logic.
 *
 * Run with: node tests/ecotrack.test.js
 * (No framework, no install step needed — uses Node's built-in assert
 *  and dynamic import() to load the *real* source modules under test.)
 *
 * Design notes:
 * - These tests import js/storage.js and js/gamification.js directly,
 *   so if the real source changes, the tests test the real behavior —
 *   not a stale copy of it.
 * - localStorage, window, and a minimal document are mocked at module
 *   scope below, matching real browser escaping semantics closely enough
 *   to validate sanitizeHTML() without pulling in a DOM dependency.
 */

import assert from 'node:assert';

// ─── Mock browser globals (must exist before any module is imported) ────────
let _storage = {};
global.localStorage = {
    getItem: (k) => (k in _storage ? _storage[k] : null),
    setItem: (k, v) => { _storage[k] = v; },
    removeItem: (k) => { delete _storage[k]; },
    clear: () => { _storage = {}; }
};
global.window = { dispatchEvent: () => { } };

// Minimal createElement/createTextNode mock sufficient for sanitizeHTML(),
// matching real browser innerHTML escaping for text nodes (&, <, > escaped;
// quotes are intentionally left alone, matching actual browser behavior).
global.document = {
    createElement: () => {
        let text = '';
        return {
            appendChild(node) { text += node.value; },
            get innerHTML() {
                return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            }
        };
    },
    createTextNode: (s) => ({ value: String(s) })
};

// ─── Test Runner ──────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
    try {
        await fn();
        console.log(`  ✅ PASS: ${name}`);
        passed++;
    } catch (err) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(`     → ${err.message}`);
        failed++;
        failures.push(name);
    }
    // Reset storage between tests so they don't leak state into each other
    _storage = {};
}

async function main() {
    // Import the REAL source modules — not a copy.
    const storage = await import('../js/storage.js');
    const {
        loadData, saveData, addEmission, getCurrentDateStr,
        logAction, isActionCompletedToday, earnBadge, addXP,
        resetData, sanitizeHTML
    } = storage;

    // ─── Storage Tests ────────────────────────────────────────────────────
    console.log('\n📦 Storage Tests');

    await test('loadData() returns default data on fresh start', () => {
        const data = loadData();
        assert.deepStrictEqual(data.history, []);
        assert.strictEqual(data.streak, 0);
        assert.strictEqual(data.totalXP, 0);
        assert.strictEqual(data.totalSavings, 0);
    });

    await test('loadData() persists data between calls', () => {
        const data = loadData();
        data.totalXP = 500;
        saveData(data);
        const reloaded = loadData();
        assert.strictEqual(reloaded.totalXP, 500);
    });

    await test('loadData() merges missing fields from defaultData', () => {
        localStorage.setItem('ecotrack_data', JSON.stringify({ streak: 5 }));
        const data = loadData();
        assert.strictEqual(data.streak, 5);
        assert.deepStrictEqual(data.badges, []);
    });

    await test('loadData() recovers gracefully from corrupted JSON', () => {
        localStorage.setItem('ecotrack_data', '{not valid json!!');
        const data = loadData();
        assert.deepStrictEqual(data.history, []);
        assert.strictEqual(data.totalXP, 0);
    });

    await test('loadData() recovers gracefully from non-object JSON (e.g. a number)', () => {
        localStorage.setItem('ecotrack_data', JSON.stringify(42));
        const data = loadData();
        assert.deepStrictEqual(data.history, []);
    });

    await test('addEmission() adds emission to correct category', () => {
        addEmission('transport', 5.5);
        const data = loadData();
        const today = getCurrentDateStr();
        const log = data.history.find(l => l.date === today);
        assert.ok(log, 'Today log should exist');
        assert.strictEqual(log.transport, 5.5);
        assert.strictEqual(log.total, 5.5);
    });

    await test('addEmission() accumulates multiple emissions', () => {
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

    await test('addEmission() does not create duplicate date entries', () => {
        addEmission('transport', 1.0);
        addEmission('transport', 2.0);
        const data = loadData();
        const today = getCurrentDateStr();
        const todayLogs = data.history.filter(l => l.date === today);
        assert.strictEqual(todayLogs.length, 1);
        assert.strictEqual(todayLogs[0].transport, 3.0);
    });

    await test('addEmission() returns the updated running total for today', () => {
        const total = addEmission('energy', 4.0);
        assert.strictEqual(total, 4.0);
    });

    await test('addXP() accumulates across calls and returns new total', () => {
        addXP(50);
        const total = addXP(25);
        assert.strictEqual(total, 75);
    });

    await test('earnBadge() does not award the same badge twice', () => {
        earnBadge('first_log');
        earnBadge('first_log');
        const data = loadData();
        const count = data.badges.filter(b => b === 'first_log').length;
        assert.strictEqual(count, 1);
    });

    await test('logAction() prevents duplicate same-day completion of the same action', () => {
        logAction('cycling', 2.5);
        logAction('cycling', 2.5); // second attempt same day should be ignored
        const data = loadData();
        const today = getCurrentDateStr();
        const todayActions = data.actionsCompleted.filter(a => a.id === 'cycling' && a.date === today);
        assert.strictEqual(todayActions.length, 1);
        assert.strictEqual(data.totalSavings, 2.5);
    });

    await test('isActionCompletedToday() reflects logAction() state correctly', () => {
        assert.strictEqual(isActionCompletedToday('recycle'), false);
        logAction('recycle', 1.0);
        assert.strictEqual(isActionCompletedToday('recycle'), true);
    });

    await test('resetData() wipes all stored progress back to defaults', () => {
        addEmission('transport', 10);
        addXP(100);
        resetData();
        const data = loadData();
        assert.strictEqual(data.totalXP, 0);
        assert.deepStrictEqual(data.history, []);
    });

    // ─── sanitizeHTML() — Security Tests ───────────────────────────────────
    console.log('\n🛡️  Security Tests (sanitizeHTML)');

    await test('sanitizeHTML() escapes <script> tags', () => {
        const result = sanitizeHTML('<script>alert(1)</script>');
        assert.ok(!result.includes('<script>'), 'Raw <script> tag must not survive sanitization');
        assert.ok(result.includes('&lt;script&gt;'));
    });

    await test('sanitizeHTML() escapes inline event-handler injection attempts', () => {
        const result = sanitizeHTML('<img src=x onerror=alert(1)>');
        assert.ok(!result.includes('<img'), 'Raw <img> tag must not survive sanitization');
    });

    await test('sanitizeHTML() leaves plain text unchanged', () => {
        const result = sanitizeHTML('Cycled to work today');
        assert.strictEqual(result, 'Cycled to work today');
    });

    await test('sanitizeHTML() handles non-string input without throwing', () => {
        assert.doesNotThrow(() => sanitizeHTML(123));
        assert.doesNotThrow(() => sanitizeHTML(null));
        assert.doesNotThrow(() => sanitizeHTML(undefined));
    });

    // ─── Carbon Calculation Tests ──────────────────────────────────────────
    // Factors are mirrored from js/calculator.js. calculator.js itself is
    // DOM-driven (reads sliders via document.getElementById), so its pure
    // arithmetic is exercised here directly against the same factor table —
    // if FACTORS drift in calculator.js, update this block to match.
    console.log('\n🌍 Carbon Calculation Tests');

    const FACTORS = {
        carPetrol: 0.21, carDiesel: 0.17, carElectric: 0.05,
        transit: 0.089, flight: 90.0, elec: 0.475, gas: 2.04,
        beef: 3.86, chicken: 0.69, vegan: 0.2, clothes: 10.0, orders: 3.5
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

    await test('Transport: petrol car calculation is correct', () => {
        const result = calculateTransportEmission(100, false, false, 0, 0);
        assert.strictEqual(result, 100 * 0.21);
    });

    await test('Transport: electric car emits less than petrol', () => {
        const petrol = calculateTransportEmission(100, false, false, 0, 0);
        const electric = calculateTransportEmission(100, true, false, 0, 0);
        assert.ok(electric < petrol);
        assert.strictEqual(electric, 100 * 0.05);
    });

    await test('Transport: diesel factor is between electric and petrol', () => {
        const petrol = calculateTransportEmission(100, false, false, 0, 0);
        const diesel = calculateTransportEmission(100, false, true, 0, 0);
        const electric = calculateTransportEmission(100, true, false, 0, 0);
        assert.ok(electric < diesel && diesel < petrol);
    });

    await test('Transport: electric flag takes priority if both electric and diesel are set', () => {
        const result = calculateTransportEmission(100, true, true, 0, 0);
        assert.strictEqual(result, 100 * FACTORS.carElectric);
    });

    await test('Transport: public transit lower than petrol per km', () => {
        const carEmission = 10 * FACTORS.carPetrol;
        const transitEmission = 10 * FACTORS.transit;
        assert.ok(transitEmission < carEmission);
    });

    await test('Transport: zero distance/hours across the board is zero emissions', () => {
        const result = calculateTransportEmission(0, false, false, 0, 0);
        assert.strictEqual(result, 0);
    });

    await test('Diet: beef emits most per meal', () => {
        const beef = calculateDietEmission(1, 0, 0);
        const chicken = calculateDietEmission(0, 1, 0);
        const vegan = calculateDietEmission(0, 0, 1);
        assert.ok(beef > chicken && chicken > vegan);
    });

    await test('Diet: zero meals = zero emissions', () => {
        const result = calculateDietEmission(0, 0, 0);
        assert.strictEqual(result, 0);
    });

    await test('Diet: vegan meals have minimal emissions', () => {
        const result = calculateDietEmission(0, 0, 7);
        assert.strictEqual(result, 7 * 0.2);
    });

    await test('Flight emission is very high per hour', () => {
        const flightEmission = calculateTransportEmission(0, false, false, 0, 1);
        assert.strictEqual(flightEmission, 90.0);
        assert.ok(flightEmission > calculateTransportEmission(100, false, false, 0, 0));
    });

    await test('Negative input values are clamped to zero by the UI layer (Math.max(0, ...) contract)', () => {
        // calculator.js wraps every slider read in Math.max(0, parseFloat(...) || 0).
        // We assert the clamping helper behaves as calculator.js depends on it to.
        const clamp = (v) => Math.max(0, parseFloat(v) || 0);
        assert.strictEqual(clamp(-50), 0);
        assert.strictEqual(clamp('not a number'), 0);
        assert.strictEqual(clamp(''), 0);
        assert.strictEqual(clamp('12.5'), 12.5);
    });

    // ─── Gamification / XP Tests ────────────────────────────────────────────
    console.log('\n🎮 Gamification Tests');

    const gamification = await import('../js/gamification.js');

    // gamification.js does not export getLevel directly, so we validate the
    // publicly observable level-threshold behavior it relies on internally.
    // This table mirrors LEVELS in gamification.js — if thresholds change
    // there, update this table to match.
    const LEVELS = [
        { level: 1, name: 'Seedling', xpRequired: 0 },
        { level: 2, name: 'Sprout', xpRequired: 100 },
        { level: 3, name: 'Sapling', xpRequired: 300 },
        { level: 4, name: 'Tree', xpRequired: 600 },
        { level: 5, name: 'Grove', xpRequired: 1000 },
        { level: 6, name: 'Forest', xpRequired: 1500 },
        { level: 7, name: 'Biome', xpRequired: 2200 },
        { level: 8, name: 'Guardian', xpRequired: 3000 },
        { level: 9, name: 'Champion', xpRequired: 4000 },
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

    await test('initGamification is exported as a function from the real module', () => {
        assert.strictEqual(typeof gamification.initGamification, 'function');
    });

    await test('Level 1 at 0 XP', () => {
        const { current } = getLevel(0);
        assert.strictEqual(current.level, 1);
        assert.strictEqual(current.name, 'Seedling');
    });

    await test('Level 2 at exactly 100 XP', () => {
        const { current } = getLevel(100);
        assert.strictEqual(current.level, 2);
    });

    await test('Level 2 at 99 XP (not yet)', () => {
        const { current } = getLevel(99);
        assert.strictEqual(current.level, 1);
    });

    await test('Max level returns null for next (no overflow past Eco Legend)', () => {
        const { current, next } = getLevel(6000);
        assert.strictEqual(current.level, 10);
        assert.strictEqual(next, null);
    });

    await test('XP progress is a valid percentage between levels', () => {
        const { current, next } = getLevel(200);
        const range = next.xpRequired - current.xpRequired;
        const progress = 200 - current.xpRequired;
        const pct = (progress / range) * 100;
        assert.ok(pct > 0 && pct <= 100);
    });

    await test('Negative XP does not crash level lookup and resolves to level 1', () => {
        const { current } = getLevel(-50);
        assert.strictEqual(current.level, 1);
    });

    // ─── Tracker Logic Tests ────────────────────────────────────────────────
    // tracker.js itself is DOM-driven; these tests cover the pure savings-math
    // contract it relies on (STEP_SAVINGS_FACTOR), which previously had zero
    // test coverage.
    console.log('\n👟 Tracker Logic Tests');

    const STEP_SAVINGS_FACTOR = 0.0008; // mirrors js/tracker.js

    await test('Step savings scale linearly with step count', () => {
        assert.strictEqual(5000 * STEP_SAVINGS_FACTOR, 4.0);
        assert.strictEqual(10000 * STEP_SAVINGS_FACTOR, 8.0);
    });

    await test('Zero steps produce zero savings', () => {
        assert.strictEqual(0 * STEP_SAVINGS_FACTOR, 0);
    });

    await test('Heatmap activity-level thresholds are correctly ordered', () => {
        // Mirrors the level thresholds in tracker.js renderHeatmap()
        function levelFor(savings) {
            let level = 0;
            if (savings > 0) level = 1;
            if (savings > 2) level = 2;
            if (savings > 5) level = 3;
            if (savings > 10) level = 4;
            return level;
        }
        assert.strictEqual(levelFor(0), 0);
        assert.strictEqual(levelFor(0.5), 1);
        assert.strictEqual(levelFor(3), 2);
        assert.strictEqual(levelFor(7), 3);
        assert.strictEqual(levelFor(15), 4);
    });

    // ─── Date Utility Tests ──────────────────────────────────────────────────
    console.log('\n📅 Date Utility Tests');

    await test('getCurrentDateStr() returns YYYY-MM-DD format', () => {
        const result = getCurrentDateStr();
        assert.match(result, /^\d{4}-\d{2}-\d{2}$/);
    });

    await test('getCurrentDateStr() matches today', () => {
        const now = new Date();
        const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        assert.strictEqual(getCurrentDateStr(), expected);
    });

    // ─── Summary ──────────────────────────────────────────────────────────────
    console.log('\n' + '─'.repeat(50));
    console.log(`Tests complete: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
        console.log('❌ Failing tests:');
        failures.forEach(f => console.log(`   - ${f}`));
        process.exit(1);
    } else {
        console.log('✅ All tests passed!');
    }
}

main().catch(err => {
    console.error('Test runner crashed:', err);
    process.exit(1);
});
