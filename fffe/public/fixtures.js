import config from './config.js';
import { addAuthHeader } from './config.js';

document.addEventListener('DOMContentLoaded', async function () {
    const draftPeriodDropdown = document.getElementById('draftPeriodDropdown');
    const gameweekDropdown = document.getElementById('gameweekDropdown');
    const fixturesTableBody = document.getElementById('fixturesTable').querySelector('tbody');
    const saveButton = document.getElementById('saveButton');

    let fixturesData = [];

    async function fetchAndPopulateDraftPeriods() {
        try {
            const response = await fetch(`${config.backendUrl}/DraftPeriods`, addAuthHeader());
            if (!response.ok) {
                console.error('Failed to fetch draft periods:', response.status, response.statusText);
                return;
            }
            const draftPeriods = await response.json();
            draftPeriods.forEach(draft => {
                const option = document.createElement('option');
                option.value = draft.id;
                option.text = draft.name || `Draft ${draft.id}`;
                draftPeriodDropdown.appendChild(option);
            });

            if (draftPeriods.length > 0) {
                draftPeriodDropdown.value = draftPeriods[draftPeriods.length - 1].id;
                await fetchAndPopulateGameweeks(draftPeriodDropdown.value);
            }
        } catch (error) {
            console.error('Error fetching draft periods:', error);
        }
    }

    async function fetchAndPopulateGameweeks(draftPeriodId) {
        try {
            const response = await fetch(`${config.backendUrl}/Gameweeks/by-draft-period/${draftPeriodId}`, addAuthHeader());
            if (!response.ok) {
                console.error('Failed to fetch gameweeks:', response.status, response.statusText);
                return;
            }
            const gameweeks = await response.json();
            gameweekDropdown.innerHTML = '';
            gameweeks.forEach(gameweek => {
                const option = document.createElement('option');
                option.value = gameweek.id;
                option.text = `Gameweek ${gameweek.number}`;
                gameweekDropdown.appendChild(option);
            });

            if (gameweeks.length > 0) {
                gameweekDropdown.value = gameweeks[gameweeks.length - 1].id;
                await fetchAndDisplayFixtures(gameweekDropdown.value);
            }
        } catch (error) {
            console.error('Error fetching gameweeks:', error);
        }
    }

    async function fetchAndDisplayFixtures(gameweekId) {
        try {
            const response = await fetch(`${config.backendUrl}/fixtures/gameweek/${gameweekId}`, addAuthHeader());
            if (!response.ok) {
                console.error('Failed to fetch fixtures:', response.status, response.statusText);
                return;
            }
            fixturesData = await response.json();
            fixturesTableBody.innerHTML = '';
            fixturesData.forEach(fixture => {
                const row = document.createElement('tr');

                const homeTeamCell = document.createElement('td');
                homeTeamCell.innerHTML = `<img src="https://resources.premierleague.com/premierleague/badges/70/t${fixture.homeTeam.code}.png" class="team-logo" alt="${fixture.homeTeam.name}"> ${fixture.homeTeam.name}`;
                row.appendChild(homeTeamCell);

                const awayTeamCell = document.createElement('td');
                awayTeamCell.innerHTML = `<img src="https://resources.premierleague.com/premierleague/badges/70/t${fixture.awayTeam.code}.png" class="team-logo" alt="${fixture.awayTeam.name}"> ${fixture.awayTeam.name}`;
                row.appendChild(awayTeamCell);

                const gameweekCell = document.createElement('td');
                gameweekCell.textContent = fixture.gameweekId;
                row.appendChild(gameweekCell);

                const originalGameweekCell = document.createElement('td');
                const originalGameweekInput = document.createElement('input');
                originalGameweekInput.type = 'number';
                originalGameweekInput.value = fixture.originalGameweekId;
                originalGameweekInput.dataset.fixtureId = fixture.id;
                originalGameweekInput.addEventListener('change', handleOriginalGameweekChange);
                originalGameweekCell.appendChild(originalGameweekInput);
                row.appendChild(originalGameweekCell);

                const dateCell = document.createElement('td');
                dateCell.textContent = new Date(fixture.date).toLocaleString();
                row.appendChild(dateCell);

                const scoreCell = document.createElement('td');
                scoreCell.textContent = fixture.homeTeamScore !== null && fixture.awayTeamScore !== null ? `${fixture.homeTeamScore} - ${fixture.awayTeamScore}` : '';
                row.appendChild(scoreCell);

                fixturesTableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error fetching fixtures:', error);
        }
    }

    function handleOriginalGameweekChange(event) {
        const input = event.target;
        const fixtureId = input.dataset.fixtureId;
        const newOriginalGameweekId = input.value;

        const fixture = fixturesData.find(fixture => fixture.id == fixtureId);
        if (fixture) {
            fixture.originalGameweekId = newOriginalGameweekId;
        }
    }

    async function saveFixtures() {
        const updatedFixtures = fixturesData.filter(fixture => fixture.originalGameweekId != fixture.gameweekId);

        for (const fixture of updatedFixtures) {
            try {
                const response = await fetch(`${config.backendUrl}/Fixtures/${fixture.id}/originalGameweekId`, addAuthHeader({
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: fixture.originalGameweekId
                }));

                if (!response.ok) {
                    console.error(`Failed to update fixture ${fixture.id}:`, response.status, response.statusText);
                    const errorMessage = await response.text();
                    alert(`Failed to update fixture ${fixture.id}: ${errorMessage}`);
                }
            } catch (error) {
                console.error(`Error updating fixture ${fixture.id}:`, error);
                alert(`Error updating fixture ${fixture.id}: ${error.message}`);
            }
        }

        alert('Fixtures updated successfully!');
    }

    draftPeriodDropdown.addEventListener('change', async function () {
        await fetchAndPopulateGameweeks(this.value);
    });

    gameweekDropdown.addEventListener('change', async function () {
        await fetchAndDisplayFixtures(this.value);
    });

    saveButton.addEventListener('click', saveFixtures);

    await fetchAndPopulateDraftPeriods();
});
