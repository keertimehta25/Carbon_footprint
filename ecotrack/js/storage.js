/**
 * storage.js
 * Manages localStorage for the EcoTrack application.
 */

const STORAGE_KEY = 'ecotrack_data';

// Default state if no data exists
const defaultData = {
    history: [], // Array of daily logs { date: 'YYYY-MM-DD', transport: 0, energy: 0, diet: 0, shopping: 0, total: 0 }
    actionsCompleted: [], // Array of { id, date, savings } for completed green actions
    challengeProgress: {}, // { challengeId: { progress: 0, completed: false } }
    streak: 0,
    lastActiveDate: null,
    totalSavings: 0,
    totalXP: 0,
    badges: [] // Array of badge IDs earned
};

/**
 * Initialize or load data from localStorage
 */
function loadData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            const fresh = JSON.parse(JSON.stringify(defaultData));
            saveData(fresh);
            return fresh;
        }
        const parsed = JSON.parse(raw);
        // Validate it's an object
        if (typeof parsed !== 'object' || parsed === null) {
            throw new Error('Invalid data format');
        }
        return Object.assign(JSON.parse(JSON.stringify(defaultData)), parsed);
    } catch (err) {
        console.warn('EcoTrack: Storage corrupted, resetting.', err);
        const fresh = JSON.parse(JSON.stringify(defaultData));
        saveData(fresh);
        return fresh;
    }
}

/**
 * Save data to localStorage
 * @param {Object} data 
 */
function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Get the current date in YYYY-MM-DD format based on local time
 */
function getCurrentDateStr() {
    const now = new Date();
    // Adjusting for local timezone to get accurate date string
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get or create the log entry for today
 */
function getTodayLog() {
    const data = loadData();
    const today = getCurrentDateStr();

    let todayLog = data.history.find(log => log.date === today);
    if (!todayLog) {
        todayLog = { date: today, transport: 0, energy: 0, diet: 0, shopping: 0, total: 0 };
        data.history.push(todayLog);
        saveData(data);
    }

    return todayLog;
}

/**
 * Update today's emissions for a specific category
 * @param {string} category ('transport', 'energy', 'diet', 'shopping')
 * @param {number} amount (in kg CO2e)
 */
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

    // Dispatch event to notify other modules that data changed
    window.dispatchEvent(new Event('ecotrackDataChanged'));

    return todayLog.total;
}

/**
 * Add a completed green action
 * @param {string} actionId 
 * @param {number} savings (in kg CO2e)
 */
function logAction(actionId, savings) {
    const data = loadData();
    const today = getCurrentDateStr();

    // Check if action was already completed today
    const alreadyDone = (data.actionsCompleted || []).find(a => a.id === actionId && a.date === today);

    if (!alreadyDone) {
        data.actionsCompleted = data.actionsCompleted || [];
        data.actionsCompleted.push({ id: actionId, date: today, savings });
        data.totalSavings = (data.totalSavings || 0) + savings;

        // Award 10 XP per action logged
        data.totalXP = (data.totalXP || 0) + 10;

        // Update streak logic
        if (data.lastActiveDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

            if (data.lastActiveDate === yesterdayStr) {
                data.streak += 1;
            } else {
                data.streak = 1;
            }
            data.lastActiveDate = today;
        }

        saveData(data);
        window.dispatchEvent(new Event('ecotrackDataChanged'));
    }
}

/**
 * Add XP points to the user's total
 * @param {number} amount - XP to add
 */
function addXP(amount) {
    const data = loadData();
    data.totalXP = (data.totalXP || 0) + amount;
    saveData(data);
    window.dispatchEvent(new Event('ecotrackDataChanged'));
    return data.totalXP;
}

/**
 * Check if an action was completed today
 */
function isActionCompletedToday(actionId) {
    const data = loadData();
    const today = getCurrentDateStr();
    return data.actionsCompleted.some(a => a.id === actionId && a.date === today);
}

/**
 * Earn a badge
 */
function earnBadge(badgeId) {
    const data = loadData();
    if (!data.badges.includes(badgeId)) {
        data.badges.push(badgeId);
        saveData(data);
        window.dispatchEvent(new Event('ecotrackDataChanged'));
    }
}

/**
 * Export user data as a JSON file download
 */
function exportData() {
    const data = loadData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ecotrack-backup-${getCurrentDateStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Reset all data (with confirmation)
 */
function resetData() {
    const fresh = JSON.parse(JSON.stringify(defaultData));
    saveData(fresh);
    window.dispatchEvent(new Event('ecotrackDataChanged'));
    return fresh;
}

/**
 * Sanitize string to prevent XSS when inserting into innerHTML
 * @param {string} str - Raw string to sanitize
 * @returns {string} HTML-escaped string safe for innerHTML use
 */
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
}

// Export all functions
export {
    loadData,
    saveData,
    getTodayLog,
    addEmission,
    logAction,
    isActionCompletedToday,
    earnBadge,
    addXP,
    getCurrentDateStr,
    exportData,
    resetData,
    sanitizeHTML
};