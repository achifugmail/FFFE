// nav.js
import config from './config.js';
import { addAuthHeader } from './config.js';

let userLeagues = null;
let activeLeagueMenu = null;

export async function initializeNavigation() {
    // Hide the navigation if the page is in an iframe
    if (window.self !== window.top) {
        document.getElementById('main-nav').style.display = 'none';
        return;
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

    // Fetch leagues for the current user
    await fetchUserLeagues();

    // Attach click event handlers to navigation links
    attachNavLinkHandlers();

    // Add global click handler to close open menus when clicking elsewhere
    document.addEventListener('click', (event) => {
        if (activeLeagueMenu && !event.target.closest('.nav-link') && !event.target.closest('.league-dropdown-menu')) {
            closeAllLeagueMenus();
        }
    });
}

// Fetch leagues for the current user
async function fetchUserLeagues() {
    try {
        const response = await fetch(`${config.backendUrl}/Leagues/byUser`, addAuthHeader());
        if (!response.ok) {
            console.error('Failed to fetch leagues:', response.status, response.statusText);
            userLeagues = [];
            return;
        }
        userLeagues = await response.json();
        console.log('Fetched leagues:', userLeagues); // Debug log
    } catch (error) {
        console.error('Error fetching leagues:', error);
        userLeagues = [];
    }
}

// Attach click event handlers to navigation links
function attachNavLinkHandlers() {
    const navLinks = document.querySelectorAll('.nav-link');

    // Remove any existing click handlers to prevent duplicates
    navLinks.forEach(link => {
        const newLink = link.cloneNode(true);
        if (link.parentNode) {
            link.parentNode.replaceChild(newLink, link);
        }
    });

    // Add fresh click handlers
    document.querySelectorAll('.nav-link').forEach(link => {
        // Skip settings link
        if (link.getAttribute('href').toLowerCase() === 'settings.html') {
            return;
        }

        link.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            console.log('Nav link clicked:', link.getAttribute('href')); // Debug log
            handleNavLinkClick(event, link);
        });
    });
}

// Handle navigation link click
function handleNavLinkClick(event, linkElement) {
    // If user has no leagues or we couldn't fetch leagues, redirect to league admin
    if (!userLeagues || userLeagues.length === 0) {
        console.log('No leagues found, redirecting to LeagueAdmin.html'); // Debug log
        window.location.href = 'LeagueAdmin.html';
        return;
    }

    // If user has only one league, navigate directly with league parameter
    if (userLeagues.length === 1) {
        console.log('Single league found, navigating directly'); // Debug log
        const league = userLeagues[0];
        saveLeagueToLocalStorage(league.id); // Save leagueId to localStorage
        navigateToPage(linkElement.getAttribute('href'));
        return;
    }

    // Close any open menu first
    closeAllLeagueMenus();

    // Then show the league dropdown menu
    console.log('Multiple leagues found, showing dropdown menu'); // Debug log
    showLeagueMenu(linkElement);
}

// Show league dropdown menu
function showLeagueMenu(linkElement) {
    // Get target page URL
    const targetPage = linkElement.getAttribute('href');

    // Create dropdown menu
    const dropdownMenu = document.createElement('div');
    dropdownMenu.className = 'league-dropdown-menu';

    // Add leagues list
    userLeagues.forEach(league => {
        const leagueItem = document.createElement('a');
        leagueItem.textContent = league.name;
        leagueItem.className = 'league-dropdown-item';
        leagueItem.href = '#';
        leagueItem.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            saveLeagueToLocalStorage(league.id); // Save leagueId to localStorage
            navigateToPage(targetPage);
        });
        dropdownMenu.appendChild(leagueItem);
    });

    // Get parent li element
    const parentLi = linkElement.closest('li');

    if (parentLi) {
        // Get the position and dimensions
        const rect = parentLi.getBoundingClientRect();

        // Add the dropdown to the document body (better for absolute positioning)
        document.body.appendChild(dropdownMenu);

        // Position dropdown based on parent li's position
        const isMobile = window.innerWidth <= 1079;

        if (isMobile) {
            // Full-width positioning for mobile
            dropdownMenu.style.position = 'fixed';
            dropdownMenu.style.top = '56px';
            dropdownMenu.style.left = '0';
            dropdownMenu.style.right = '0';
            dropdownMenu.style.width = '100vw';
        } else {
            // Desktop positioning with left/right alignment
            dropdownMenu.style.position = 'absolute';
            dropdownMenu.style.top = `${rect.bottom}px`;

            // Position based on li alignment class
            if (parentLi.classList.contains('left-align')) {
                dropdownMenu.style.left = `${rect.left}px`;
                dropdownMenu.style.right = 'auto';
            } else if (parentLi.classList.contains('right-align')) {
                dropdownMenu.style.right = `${window.innerWidth - rect.right}px`;
                dropdownMenu.style.left = 'auto';
            } else {
                // Default centering if no alignment class
                dropdownMenu.style.left = `${rect.left}px`;
            }
        }

        // Keep track of active menu
        activeLeagueMenu = dropdownMenu;
        console.log('League dropdown menu shown'); // Debug log
    } else {
        console.error('Could not find parent li element');
    }
}

// Save leagueId to localStorage
function saveLeagueToLocalStorage(leagueId) {
    localStorage.setItem('leagueId', leagueId);
    console.log(`Saved leagueId to localStorage: ${leagueId}`); // Debug log
}

// Navigate to the selected page
function navigateToPage(page) {
    console.log(`Navigating to: ${page}`); // Debug log
    window.location.href = page;
}
// Close all league menus
function closeAllLeagueMenus() {
    const menus = document.querySelectorAll('.league-dropdown-menu');
    menus.forEach(menu => {
        if (menu.parentNode) {
            menu.parentNode.removeChild(menu);
        }
    });
    activeLeagueMenu = null;
    console.log('All league menus closed'); // Debug log
}



// Add styles for the league menu
