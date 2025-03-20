// nav.js
export function initializeNavigation() {
    // Hide the navigation if the page is in an iframe
    if (window.self !== window.top) {
        document.getElementById('main-nav').style.display = 'none';
    }

    // Function to highlight the current page in the navigation
    const currentPath = window.location.pathname;
    const fileName = currentPath.split('/').pop().toLowerCase();

    // Get all navigation links
    const navLinks = document.querySelectorAll('.nav-link');

    // Remove active class from all links
    navLinks.forEach(link => link.classList.remove('active'));

    // Find the matching link and add active class
    let found = false;
    navLinks.forEach(link => {
        const href = link.getAttribute('href').toLowerCase();

        // Only highlight the exact matching page
        if (fileName === href || (fileName === '' && href === 'leaguescore.html')) {
            link.classList.add('active');
            found = true;
        }
    });

    // If no match found and it's not settings page, highlight Settings
    if (!found && fileName !== 'settings.html') {
        const settingsLink = Array.from(navLinks).find(link =>
            link.getAttribute('href').toLowerCase() === 'settings.html'
        );
        if (settingsLink) {
            settingsLink.classList.add('active');
        }
    }
}
