import config from './config.js';
import { addAuthHeader } from './config.js';

document.addEventListener('DOMContentLoaded', async function () {
    let currentGameweek = null;

    // Fetch draft periods for dropdown
    let draftPeriods = [];
    try {
        const respDrafts = await fetch(`${config.backendUrl}/DraftPeriods`, addAuthHeader());

        if (!respDrafts.ok) {
            console.error('Failed to fetch draft periods:', respDrafts.status, respDrafts.statusText);
        } else {
            draftPeriods = await respDrafts.json();
        }
    } catch (error) {
        console.error('Error fetching draft periods:', error);
    }

    // Populate draft period dropdown and set default value
    const draftPeriodDropdown = document.getElementById('draftPeriodDropdown');
    draftPeriods.sort((a, b) => a.name.localeCompare(b.name)).forEach(draft => {
        const option = document.createElement('option');
        option.value = draft.id;
        option.text = draft.name || `Draft ${draft.id}`;
        draftPeriodDropdown.appendChild(option);
    });
    draftPeriodDropdown.value = draftPeriods[draftPeriods.length - 1].id;

    // Fetch and populate gameweeks based on selected draft period
    const gameweekDropdown = document.getElementById('gameweekDropdown');
    async function fetchAndPopulateGameweeks(draftPeriodId) {
        let gameweeks = [];
        try {
            const respGameweeks = await fetch(`${config.backendUrl}/Gameweeks/by-draft-period/${draftPeriodId}`, addAuthHeader());

            if (!respGameweeks.ok) {
                console.error('Failed to fetch gameweeks:', respGameweeks.status, respGameweeks.statusText);
            } else {
                gameweeks = await respGameweeks.json();
            }
        } catch (error) {
            console.error('Error fetching gameweeks:', error);
        }

        // Clear existing options
        gameweekDropdown.innerHTML = '';

        // Populate gameweek dropdown
        gameweeks.sort((a, b) => a.number - b.number).forEach(gameweek => {
            const option = document.createElement('option');
            option.value = gameweek.id;
            option.text = `Gameweek ${gameweek.number}`;
            option.setAttribute('data-gameweek', JSON.stringify(gameweek));
            gameweekDropdown.appendChild(option);
        });

        // Set default value to the most recent gameweek that has a start date before today
        const now = new Date();
        const pastGameweeks = gameweeks.filter(gameweek => new Date(gameweek.startDate + 'Z') <= now);
        if (pastGameweeks.length > 0) {
            // Get the most recent past gameweek
            const mostRecentGameweek = pastGameweeks[pastGameweeks.length - 1];
            gameweekDropdown.value = mostRecentGameweek.id;
            updateGameweekDates(mostRecentGameweek);
        } else if (gameweeks.length > 0) {
            // Fallback to first gameweek if no past gameweeks exist
            gameweekDropdown.value = gameweeks[0].id;
            updateGameweekDates(gameweeks[0]);
        }

        // Load stats for the selected gameweek
        await fetchAndDisplayPlayerStats(gameweekDropdown.value);
    }

    // Initial population of gameweeks
    await fetchAndPopulateGameweeks(draftPeriodDropdown.value);

    // Update gameweeks when draft period changes
    draftPeriodDropdown.addEventListener('change', async function () {
        await fetchAndPopulateGameweeks(this.value);
    });

    // Update stats when gameweek changes
    gameweekDropdown.addEventListener('change', async function () {
        const selectedOption = this.options[this.selectedIndex];
        const gameweek = JSON.parse(selectedOption.getAttribute('data-gameweek'));
        updateGameweekDates(gameweek);
        await fetchAndDisplayPlayerStats(this.value);
    });

    function updateGameweekDates(gameweek) {
        currentGameweek = gameweek;
        const startDateElem = document.getElementById('startDate');
        const endDateElem = document.getElementById('endDate');

        // Format dates
        const startDate = new Date(gameweek.startDate + 'Z');
        const endDate = new Date(gameweek.endDate + 'Z');
        const now = new Date();

        // Display start date
        startDateElem.textContent = `Start: ${startDate.toLocaleDateString()}`;

        // Handle end date display
        if (endDate > startDate) {
            endDateElem.textContent = `End: ${endDate.toLocaleDateString()}`;
            endDateElem.style.display = 'inline';
        } else {
            endDateElem.style.display = 'none';
        }

        // Update fields editability
        const shouldBeEditable = now >= startDate && endDate <= startDate;
        updateFieldsEditability(shouldBeEditable);
    }

    function updateFieldsEditability(isEditable) {
        const adjustmentInputs = document.querySelectorAll('.adjustment-input');
        const adjustmentCommentInputs = document.querySelectorAll('.adjustment-comment-input');
        const saveButton = document.getElementById('saveButton');

        adjustmentInputs.forEach(input => {
            input.disabled = !isEditable;
        });

        adjustmentCommentInputs.forEach(input => {
            input.disabled = !isEditable;
        });

        saveButton.style.display = isEditable ? 'block' : 'none';
    }

    async function fetchAndDisplayPlayerStats(gameweekId) {
        try {
            const endpoint = `${config.backendUrl}/UserTeamPlayers/playerGameweekStatsByGameweek`;
            const response = await fetch(`${endpoint}?gameweekId=${gameweekId}`, addAuthHeader());

            if (!response.ok) {
                console.error('Failed to fetch player stats:', response.status, response.statusText);
                return;
            }
            const playerStats = await response.json();

            const playerStatsTable = document.getElementById('playerStatsTable');
            playerStatsTable.innerHTML = ''; // Clear existing table

            // Create table header
            const headerRow = document.createElement('tr');
            headerRow.innerHTML = `
                <th data-column="photo">Photo</th>
                <th data-column="webName" class="web-name">Web Name</th>
                <th data-column="position">Position</th>
                <th data-column="score" class="score-column">Score</th>
                <th data-column="adjustment" class="adjustment-column">Adjustment</th>
                <th data-column="adjustmentComment" class="adjustment-comment-column">Adjustment Comment</th>
                <th data-column="app" class="hideable hidden">Apps</th>
                <th data-column="goalsScored" class="hideable hidden">Goals</th>
                <th data-column="assists" class="hideable hidden">Assists</th>
                <th data-column="cleanSheets" class="hideable hidden">Clean Sheets</th>
                <th data-column="saves" class="hideable hidden">Saves</th>
                <th data-column="yellowCards" class="hideable hidden">Yellow Cards</th>
                <th data-column="redCards" class="hideable hidden">Red Cards</th>
                <th data-column="ownGoals" class="hideable hidden">Own Goals</th>
                <th data-column="minutesPlayed" class="hideable hidden">Minutes Played</th>
            `;
            playerStatsTable.appendChild(headerRow);

            // Populate table with player stats
            playerStats.forEach(player => {
                const playerRow = document.createElement('tr');
                playerRow.innerHTML = `
                    <td><img src="https://resources.premierleague.com/premierleague/photos/players/40x40/p${player.photo.slice(0, -3)}png" alt="Player Photo" class="player-photo"></td>
                    <td class="web-name">${player.webName}</td>
                    <td>${player.position}</td>
                    <td class="score-column">${player.score}</td>
                    <td class="adjustment-column"><input type="number" class="adjustment-input" value="${player.adjustment || 0}" data-player-id="${player.playerId}" data-original-value="${player.adjustment || 0}"></td>
                    <td class="adjustment-comment-column"><input type="text" class="adjustment-comment-input" value="${player.adjustmentComment || ''}" data-player-id="${player.playerId}" data-original-value="${player.adjustmentComment || ''}" placeholder="Enter comment"></td>
                    <td class="hideable hidden">${player.app}</td>
                    <td class="hideable hidden">${player.goalsScored}</td>
                    <td class="hideable hidden">${player.assists}</td>
                    <td class="hideable hidden">${player.cleanSheets}</td>
                    <td class="hideable hidden">${player.saves}</td>
                    <td class="hideable hidden">${player.yellowCards}</td>
                    <td class="hideable hidden">${player.redCards}</td>
                    <td class="hideable hidden">${player.ownGoals}</td>
                    <td class="hideable hidden">${player.minutesPlayed}</td>
                `;
                playerStatsTable.appendChild(playerRow);
            });

            // Add sorting functionality
            const headers = playerStatsTable.querySelectorAll('th');
            headers.forEach(header => {
                header.addEventListener('click', () => {
                    const column = header.getAttribute('data-column');
                    const order = header.getAttribute('data-order') === 'asc' ? 'desc' : 'asc';
                    header.setAttribute('data-order', order);
                    sortTable(playerStatsTable, column, order);
                });
            });

            // Check if fields should be editable based on current gameweek dates
            if (currentGameweek) {
                const startDate = new Date(currentGameweek.startDate + 'Z');
                const endDate = new Date(currentGameweek.endDate + 'Z');
                const now = new Date();
                const shouldBeEditable = now >= startDate && endDate <= startDate;
                updateFieldsEditability(shouldBeEditable);
            }
        } catch (error) {
            console.error('Error fetching player stats:', error);
        }
    }

    // Add save button functionality
    const saveButton = document.getElementById('saveButton');
    saveButton.addEventListener('click', async () => {
        const adjustmentInputs = document.querySelectorAll('.adjustment-input');

        for (const input of adjustmentInputs) {
            const playerId = input.getAttribute('data-player-id');
            const originalValue = input.getAttribute('data-original-value');
            const newValue = input.value;

            if (originalValue !== newValue) {
                const adjustmentCommentInput = document.querySelector(`.adjustment-comment-input[data-player-id="${playerId}"]`);
                const adjustmentComment = adjustmentCommentInput.value;

                const adjustment = {
                    PlayerId: parseInt(playerId),
                    GameweekId: parseInt(gameweekDropdown.value),
                    Adjustment: parseFloat(newValue),
                    AdjustmentComment: adjustmentComment
                };

                try {
                    const response = await fetch(`${config.backendUrl}/UserTeamPlayers/updateAdjustment`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...addAuthHeader().headers
                        },
                        body: JSON.stringify(adjustment)
                    });

                    if (!response.ok) {
                        console.error('Failed to update adjustment:', response.status, response.statusText);
                    } else {
                        console.log('Adjustment updated successfully');
                        // Update the original value to reflect the saved state
                        input.setAttribute('data-original-value', newValue);
                        adjustmentCommentInput.setAttribute('data-original-value', adjustmentComment);
                    }
                } catch (error) {
                    console.error('Error updating adjustment:', error);
                }
            }
        }
    });

    function sortTable(table, column, order) {
        const rows = Array.from(table.querySelectorAll('tr:nth-child(n+2)'));
        rows.sort((a, b) => {
            const cellA = a.querySelector(`td:nth-child(${getColumnIndex(column)})`).textContent.trim();
            const cellB = b.querySelector(`td:nth-child(${getColumnIndex(column)})`).textContent.trim();

            if (!isNaN(cellA) && !isNaN(cellB)) {
                return order === 'asc' ? cellA - cellB : cellB - cellA;
            } else {
                return order === 'asc' ? cellA.localeCompare(cellB) : cellB.localeCompare(cellA);
            }
        });

        rows.forEach(row => table.appendChild(row));
    }

    function getColumnIndex(column) {
        const columns = {
            photo: 1,
            webName: 2,
            position: 3,
            score: 4,
            adjustment: 5,
            adjustmentComment: 6,
            app: 7,
            goalsScored: 8,
            assists: 9,
            cleanSheets: 10,
            saves: 11,
            yellowCards: 12,
            redCards: 13,
            ownGoals: 14,
            minutesPlayed: 15
        };
        return columns[column];
    }
});
