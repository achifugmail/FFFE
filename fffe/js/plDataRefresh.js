async function fetchGameweeks() {
    try {
        const response = await fetch('https://localhost:44390/api/Gameweeks', {
            credentials: 'include'
        });
        if (!response.ok) {
            console.error('Failed to fetch gameweeks:', response.status, response.statusText);
            return;
        }
        const gameweeks = await response.json();
        const gameweekDropdown = document.getElementById('gameweekDropdown');
        gameweekDropdown.innerHTML = ''; // Clear existing options
        gameweeks.forEach(gameweek => {
            const option = document.createElement('option');
            option.value = gameweek.id;
            option.text = `${gameweek.number}`;
            gameweekDropdown.appendChild(option);
        });

        // Set default value to the last gameweek by start date that has a start date before the current date and time
        const now = new Date();
        const pastGameweeks = gameweeks.filter(gameweek => new Date(gameweek.startDate) < now);
        if (pastGameweeks.length > 0) {
            gameweekDropdown.value = pastGameweeks[pastGameweeks.length - 1].id;
        }
    } catch (error) {
        console.error('Error fetching gameweeks:', error);
    }
}

async function refreshData() {
    const progressIndicator = document.getElementById('progressIndicator');
    progressIndicator.style.display = 'block';
    progressIndicator.innerText = 'Refreshing data...';

    try {
        const response = await fetch('https://localhost:44390/api/PlayerGameweekStats/PopulateAllPlayers', {
            method: 'POST',
            credentials: 'include'
        });
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

async function refreshGameweekData() {
    const progressIndicator = document.getElementById('progressIndicator');
    progressIndicator.style.display = 'block';
    progressIndicator.innerText = 'Refreshing data...';

    const gameweekDropdown = document.getElementById('gameweekDropdown');
    const selectedGameweekId = gameweekDropdown.value;

    try {
        const response = await fetch(`https://localhost:44390/api/PlayerGameweekStatsLive/populate/${selectedGameweekId}`, {
            method: 'POST',
            credentials: 'include'
        });
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

document.addEventListener('DOMContentLoaded', fetchGameweeks);
