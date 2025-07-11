import config from './config.js';
import { addAuthHeader } from './config.js';

console.log('PLDataRefresh.js module loaded'); // Add logging to verify module loading

// Export all functions so they're available to the HTML
export async function fetchGameweeks() {
    try {
        const response = await fetch(`${config.backendUrl}/Gameweeks`, addAuthHeader());
        if (!response.ok) {
            console.error('Failed to fetch gameweeks:', response.status, response.statusText);
            return;
        }
        const gameweeks = await response.json();
        const gameweekDropdown = document.getElementById('gameweekDropdown');
        if (!gameweekDropdown) {
            console.error('Gameweek dropdown not found');
            return;
        }
        gameweekDropdown.innerHTML = ''; // Clear existing options
        gameweeks.forEach(gameweek => {
            const option = document.createElement('option');
            option.value = gameweek.id;
            option.text = `${gameweek.number}`;
            gameweekDropdown.appendChild(option);
        });

        // Set default value to the last gameweek by start date that has a start date before the current date and time
        const now = new Date();
        const pastGameweeks = gameweeks.filter(gameweek => new Date(gameweek.startDate + 'Z') < now);
        if (pastGameweeks.length > 0) {
            gameweekDropdown.value = pastGameweeks[pastGameweeks.length - 1].id;
        }
    } catch (error) {
        console.error('Error fetching gameweeks:', error);
        // Ensure the dropdown is still available even if fetching fails
        const gameweekDropdown = document.getElementById('gameweekDropdown');
        if (gameweekDropdown) {
            gameweekDropdown.innerHTML = '<option value="">Failed to load gameweeks</option>';
        }
    }
}

export async function populateGameweeks() {
    const progressIndicator = document.getElementById('progressIndicator');
    if (!progressIndicator) {
        console.error('Progress indicator not found');
        return;
    }
    progressIndicator.style.display = 'block';
    progressIndicator.innerText = 'Populating gameweeks...';

    try {
        const response = await fetch(`${config.backendUrl}/Gameweeks/populate`, addAuthHeader({
            method: 'POST'
        }));
        const result = await response.text();
        if (!response.ok) {
            console.error('Failed to populate gameweeks:', response.status, response.statusText);
            progressIndicator.innerText = `Failed to populate gameweeks: ${result}`;
            return;
        }
        progressIndicator.innerText = `Gameweeks populated successfully: ${result}`;
        // Refresh the gameweeks list after populating
        await fetchGameweeks();
    } catch (error) {
        console.error('Error populating gameweeks:', error);
        progressIndicator.innerText = 'Error populating gameweeks.';
    }
}


export async function copyTodayToNextGameweek() {
    const progressIndicator = document.getElementById('progressIndicator');
    if (progressIndicator) {
        progressIndicator.style.display = 'block';
        progressIndicator.innerText = 'Copying today\'s teams to next gameweek...';
    }
    try {
        const response = await fetch(`${config.backendUrl}/UserTeamPlayers/copy-today-to-next-gameweek`, addAuthHeader({
            method: 'POST'
        }));
        const result = await response.text();
        if (!response.ok) {
            console.error('Failed to copy teams:', response.status, response.statusText);
            if (progressIndicator) progressIndicator.innerText = `Failed: ${result}`;
            return;
        }
        if (progressIndicator) progressIndicator.innerText = `Success: ${result}`;
        alert('Teams copied to next gameweek successfully!');
    } catch (error) {
        console.error('Error copying teams:', error);
        if (progressIndicator) progressIndicator.innerText = 'Error copying teams to next gameweek.';
        alert('Error copying teams to next gameweek.');
    }
}
window.copyTodayToNextGameweek = copyTodayToNextGameweek;

export async function refreshData() {
    const progressIndicator = document.getElementById('progressIndicator');
    if (!progressIndicator) {
        console.error('Progress indicator not found');
        return;
    }
    progressIndicator.style.display = 'block';
    progressIndicator.innerText = 'Refreshing data...';

    try {
        const response = await fetch(`${config.backendUrl}/PlayerGameweekStats/PopulateAllPlayers?daysOffset=365`, addAuthHeader({
            method: 'POST',
            headers: {
                'Connection': 'keep-alive'
            }
        }));
        const result = await response.text();
        if (!response.ok) {
            console.error('Failed to refresh data:', response.status, response.statusText);
            progressIndicator.innerText = `Failed to refresh data: ${result}`;
            return;
        }
        progressIndicator.innerText = `Premier League data refreshed successfully: ${result}`;
    } catch (error) {
        console.error('Error refreshing data:', error);
        progressIndicator.innerText = 'Error refreshing data.';
    }
}

export async function refreshInPlayPlayers() {
    const progressIndicator = document.getElementById('progressIndicator');
    if (!progressIndicator) {
        console.error('Progress indicator not found');
        return;
    }
    progressIndicator.style.display = 'block';
    progressIndicator.innerText = 'Refreshing in-play players...';

    try {
        const response = await fetch(`${config.backendUrl}/PlayerGameweekStats/nextRefreshDateWithRefresh`, addAuthHeader({
            method: 'GET'
        }));
        const result = await response.text();
        if (!response.ok) {
            console.error('Failed to refresh in-play players:', response.status, response.statusText);
            progressIndicator.innerText = `Failed to refresh in-play players: ${result}`;
            return;
        }
        progressIndicator.innerText = `In-play players refreshed successfully: ${result}`;
    } catch (error) {
        console.error('Error refreshing in-play players:', error);
        progressIndicator.innerText = 'Error refreshing in-play players.';
    }
}

// Add event listener for the button
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('refreshInPlayPlayersButton').addEventListener('click', refreshInPlayPlayers);
});


export async function refreshGameweekData() {
    const progressIndicator = document.getElementById('progressIndicator');
    if (!progressIndicator) {
        console.error('Progress indicator not found');
        return;
    }
    progressIndicator.style.display = 'block';
    progressIndicator.innerText = 'Refreshing data...';

    const gameweekDropdown = document.getElementById('gameweekDropdown');
    if (!gameweekDropdown) {
        console.error('Gameweek dropdown not found');
        progressIndicator.innerText = 'Error: Gameweek dropdown not found';
        return;
    }
    const selectedGameweekId = gameweekDropdown.value;

    try {
        const response = await fetch(`${config.backendUrl}/PlayerGameweekStatsLive/populate/${selectedGameweekId}`, addAuthHeader({
            method: 'POST'
        }));
        const result = await response.text();
        if (!response.ok) {
            console.error('Failed to refresh data:', response.status, response.statusText);
            progressIndicator.innerText = `Failed to refresh data: ${result}`;
            return;
        }
        progressIndicator.innerText = `Premier League data refreshed successfully: ${result}`;
    } catch (error) {
        console.error('Error refreshing data:', error);
        progressIndicator.innerText = 'Error refreshing data.';
    }
}

export async function createDraftPeriod() {
    const name = document.getElementById('draftPeriodName').value;
    const startDate = document.getElementById('draftPeriodStartDate').value;
    const endDate = document.getElementById('draftPeriodEndDate').value;

    const draftPeriod = {
        id: 0,
        name: name,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString()
    };

    try {
        const response = await fetch(`${config.backendUrl}/DraftPeriods`, addAuthHeader({
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(draftPeriod)
        }));

        if (response.ok) {
            alert('Draft period created successfully!');
        } else {
            alert('Failed to create draft period. Please try again.');
        }
    } catch (error) {
        console.error('Error creating draft period:', error);
        alert('Error creating draft period. Please try again.');
    }
}

export async function populateFixtures() {
    const progressIndicator = document.getElementById('progressIndicator');
    if (!progressIndicator) {
        console.error('Progress indicator not found');
        return;
    }
    progressIndicator.style.display = 'block';
    progressIndicator.innerText = 'Populating fixtures...';

    try {
        const response = await fetch(`${config.backendUrl}/Fixtures/populate`, addAuthHeader({
            method: 'POST'
        }));
        const result = await response.text();
        if (!response.ok) {
            console.error('Failed to populate fixtures:', response.status, response.statusText);
            progressIndicator.innerText = `Failed to populate fixtures: ${result}`;
            return;
        }
        progressIndicator.innerText = `Fixtures populated successfully: ${result}`;
    } catch (error) {
        console.error('Error populating fixtures:', error);
        progressIndicator.innerText = 'Error populating fixtures.';
    }
}

export async function populateTeams() {
    const progressIndicator = document.getElementById('progressIndicator');
    progressIndicator.style.display = 'block';

    try {
        const response = await fetch(`${config.backendUrl}/Teams/populate`, {
            method: 'POST',
            headers: {
                ...addAuthHeader().headers
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        alert('Teams populated successfully');
    } catch (error) {
        console.error('Error populating teams:', error);
        alert('Failed to populate teams');
    } finally {
        progressIndicator.style.display = 'none';
    }
}

export async function populateAllPlayers() {
    const progressIndicator = document.getElementById('progressIndicator');
    if (!progressIndicator) {
        console.error('Progress indicator not found');
        return;
    }
    progressIndicator.style.display = 'block';
    progressIndicator.innerText = 'Populating all players...';

    try {
        const response = await fetch(`${config.backendUrl}/Players/populateOrUpdate`, addAuthHeader({
            method: 'POST'
        }));
        const result = await response.text();
        if (!response.ok) {
            console.error('Failed to populate all players:', response.status, response.statusText);
            progressIndicator.innerText = `Failed to populate all players: ${result}`;
            return;
        }
        progressIndicator.innerText = `All players populated successfully: ${result}`;
    } catch (error) {
        console.error('Error populating all players:', error);
        progressIndicator.innerText = 'Error populating all players.';
    }
}

export async function createLeague() {
    const leagueName = document.getElementById('leagueName').value.trim();
    const leagueCode = document.getElementById('leagueCode').value.trim();
    const currentUserId = localStorage.getItem('userId'); // Retrieve the current user ID from local storage

    if (!leagueName || !leagueCode) {
        alert('Please fill in all fields');
        return;
    }

    const createUrl = `${config.backendUrl}/Leagues/create`;

    const payload = {
        name: leagueName,
        code: leagueCode,
        adminUserId: parseInt(currentUserId)
    };

    try {
        const respCreate = await fetch(createUrl, addAuthHeader({
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        }));

        if (!respCreate.ok) {
            console.error('Failed to create league:', respCreate.status, respCreate.statusText);
            alert('Failed to create league');
        } else {
            alert('League created successfully!');
            // Optionally, refresh the list of leagues or perform other actions
        }
    } catch (error) {
        console.error('Error creating league:', error);
    }
}

// Initialize when DOM is loaded
try {
    document.addEventListener('DOMContentLoaded', () => {
        fetchGameweeks();


        // Add event listener for collapsible sections
        const collapsibles = document.querySelectorAll('.collapsible');
        collapsibles.forEach(collapsible => {
            collapsible.addEventListener('click', function () {
                this.classList.toggle('active');
                const content = this.nextElementSibling;
                if (content.style.display === 'block') {
                    content.style.display = 'none';
                } else {
                    content.style.display = 'block';
                }
            });
        });


    });
} catch (error) {
    console.error('Error setting up DOMContentLoaded listener:', error);
}

// Make functions available globally for onclick handlers
window.populateGameweeks = populateGameweeks;
window.refreshData = refreshData;
window.refreshGameweekData = refreshGameweekData;
window.createDraftPeriod = createDraftPeriod;
window.populateFixtures = populateFixtures;
window.populateAllPlayers = populateAllPlayers;
window.createLeague = createLeague;
window.populateTeams = populateTeams;