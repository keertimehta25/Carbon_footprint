// js/dashboard.js

import { loadData } from './storage.js';

let instances = {
    chart7day: null,
    chartCategory: null,
    chartMonthly: null,
    chartComparison: null
};

let hasInitialized = false;

// Theme configuration for dark mode charts
Chart.defaults.color = '#6B8F71';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(17, 26, 20, 0.9)';
Chart.defaults.plugins.tooltip.titleColor = '#F0FFF4';
Chart.defaults.plugins.tooltip.bodyColor = '#F0FFF4';
Chart.defaults.plugins.tooltip.borderColor = 'rgba(57, 255, 106, 0.4)';
Chart.defaults.plugins.tooltip.borderWidth = 1;

export function initDashboard() {
    setupIntersectionObserver();
    window.addEventListener('ecotrackDataChanged', debounce(updateDashboardData, 250));
}

function setupIntersectionObserver() {
    const section = document.getElementById('dashboard');
    if (!section) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !hasInitialized) {
                hasInitialized = true;
                updateDashboardData();
            }
        });
    }, { threshold: 0.1 });

    observer.observe(section);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function updateDashboardData() {
    if (!hasInitialized) return; // Only update if it has been viewed at least once

    const data = loadData();
    const last7Days = data.history.slice(-7);
    
    // Update KPIs
    updateKPIs(data, last7Days);

    // Destroy existing instances to prevent memory leaks
    Object.keys(instances).forEach(key => {
        if (instances[key]) {
            instances[key].destroy();
        }
    });

    // Re-render
    render7DayChart(last7Days);
    renderCategoryChart(last7Days);
    renderMonthlyChart(data.history);
    renderComparisonChart(last7Days);
}

function updateKPIs(data, last7Days) {
    const totalThisWeek = last7Days.reduce((sum, log) => sum + log.total, 0);
    document.getElementById('kpi-week').innerText = `${totalThisWeek.toFixed(1)} kg`;
    
    const previousWeekLog = data.history.slice(-14, -7);
    const totalLastWeek = previousWeekLog.reduce((sum, log) => sum + log.total, 0);
    
    let trend = 0;
    if (totalLastWeek > 0) {
        trend = ((totalThisWeek - totalLastWeek) / totalLastWeek) * 100;
    }
    const trendEl = document.getElementById('kpi-trend');
    trendEl.innerText = `${Math.abs(trend).toFixed(1)}% ${trend > 0 ? '↑' : '↓'}`;
    trendEl.style.color = trend > 0 ? 'var(--danger)' : 'var(--accent-neon)';

    // Best Day
    if (last7Days.length > 0) {
        const bestDayLog = [...last7Days].sort((a, b) => a.total - b.total)[0];
        const dayName = new Date(bestDayLog.date).toLocaleDateString(undefined, { weekday: 'short' });
        document.getElementById('kpi-best-day').innerText = `${dayName} (${bestDayLog.total.toFixed(1)})`;
    }

    document.getElementById('kpi-saved').innerText = `${(data.totalSavings || 0).toFixed(1)} kg`;
}

function render7DayChart(last7Days) {
    const ctx = document.getElementById('chart-7day');
    if (!ctx || last7Days.length === 0) return;

    const labels = last7Days.map(l => new Date(l.date).toLocaleDateString(undefined, { weekday: 'short' }));

    instances.chart7day = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Transport', data: last7Days.map(l => l.transport), backgroundColor: '#39FF6A' },
                { label: 'Energy', data: last7Days.map(l => l.energy), backgroundColor: '#FFB830' },
                { label: 'Diet', data: last7Days.map(l => l.diet), backgroundColor: '#A8FF3E' },
                { label: 'Shopping', data: last7Days.map(l => l.shopping), backgroundColor: '#FF6B9D' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true, grid: { color: 'rgba(107, 143, 113, 0.1)' } },
                y: { stacked: true, grid: { color: 'rgba(107, 143, 113, 0.1)' } }
            },
            plugins: {
                legend: { labels: { color: '#F0FFF4' } }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
}

function renderCategoryChart(last7Days) {
    const ctx = document.getElementById('chart-category');
    if (!ctx || last7Days.length === 0) return;

    let trans = 0, enrg = 0, diet = 0, shop = 0, total = 0;
    last7Days.forEach(l => { trans+=l.transport; enrg+=l.energy; diet+=l.diet; shop+=l.shopping; total+=l.total; });

    instances.chartCategory = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Transport', 'Energy', 'Diet', 'Shopping'],
            datasets: [{
                data: [trans, enrg, diet, shop],
                backgroundColor: ['#39FF6A', '#FFB830', '#A8FF3E', '#FF6B9D'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: { position: 'right', labels: { color: '#F0FFF4', padding: 20 } }
            },
            animation: {
                animateScale: true,
                duration: 1000
            }
        },
        plugins: [{
            id: 'centerText',
            beforeDraw: function(chart) {
                var width = chart.width,
                    height = chart.height,
                    ctx = chart.ctx;
                ctx.restore();
                var fontSize = (height / 114).toFixed(2);
                ctx.font = "bold " + fontSize + "em 'Space Grotesk'";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "#F0FFF4";
                var text = total.toFixed(1) + " kg",
                    textX = Math.round((width - ctx.measureText(text).width) / 2),
                    textY = height / 2;
                ctx.fillText(text, textX, textY);
                ctx.save();
            }
        }]
    });
}

function renderMonthlyChart(history) {
    const ctx = document.getElementById('chart-monthly');
    if (!ctx || history.length === 0) return;

    // Use up to 30 days
    const last30Days = history.slice(-30);
    const labels = last30Days.map(l => new Date(l.date).getDate());
    
    // Create gradient
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(57, 255, 106, 0.4)');
    gradient.addColorStop(1, 'rgba(57, 255, 106, 0.0)');

    instances.chartMonthly = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Total Daily CO₂e',
                data: last30Days.map(l => l.total),
                borderColor: '#39FF6A',
                backgroundColor: gradient,
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { display: false } },
                y: { grid: { color: 'rgba(107, 143, 113, 0.1)' }, beginAtZero: true }
            },
            plugins: {
                legend: { display: false }
            },
            animation: {
                duration: 1000
            }
        }
    });
}

function renderComparisonChart(last7Days) {
    const ctx = document.getElementById('chart-comparison');
    if (!ctx) return;

    // Averages extrapolated to weekly (tons/yr to kg/week: (tons * 1000) / 52)
    const globalAvg = (4.0 * 1000) / 52;
    const euAvg = (6.8 * 1000) / 52;
    const usAvg = (14.5 * 1000) / 52;
    
    const userTotal = last7Days.reduce((s, l) => s + l.total, 0);

    instances.chartComparison = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['You (7 Days)', 'Global Avg', 'EU Avg', 'US Avg'],
            datasets: [{
                data: [userTotal, globalAvg, euAvg, usAvg],
                backgroundColor: [
                    '#39FF6A', 
                    'rgba(107, 143, 113, 0.6)', 
                    'rgba(107, 143, 113, 0.6)', 
                    'rgba(107, 143, 113, 0.6)'
                ],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y', // Horizontal bar chart
            scales: {
                x: { grid: { color: 'rgba(107, 143, 113, 0.1)' }, beginAtZero: true },
                y: { grid: { display: false } }
            },
            plugins: {
                legend: { display: false }
            },
            animation: {
                duration: 1000
            }
        }
    });
}
