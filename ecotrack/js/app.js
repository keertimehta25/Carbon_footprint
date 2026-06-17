/**
 * app.js
 * Main entry point for EcoTrack
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // Initialize all modules
    if (window.EcoStorage) {
        window.EcoStorage.loadData();
    }
    
    if (window.EcoCalculator) window.EcoCalculator.init();
    if (window.EcoDashboard) window.EcoDashboard.init();
    if (window.EcoTracker) window.EcoTracker.init();
    if (window.EcoInsights) window.EcoInsights.init();

    // Setup Navigation
    setupNavigation();
});

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all items and views
            navItems.forEach(nav => nav.classList.remove('active'));
            views.forEach(view => view.classList.remove('active-view'));
            
            // Add active class to clicked item
            item.classList.add('active');
            
            // Show corresponding view
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active-view');
            
            // Trigger specific updates if needed
            if (targetId === 'dashboard' && window.EcoDashboard) {
                // Resize charts workaround for Chart.js when container display changes from none to block
                window.dispatchEvent(new Event('resize'));
            }
        });
    });
}
