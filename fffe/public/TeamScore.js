import config from './config.js';

document.addEventListener('DOMContentLoaded', async function () {
    const urlParams = new URLSearchParams(window.location.search);
    const gameweekId = urlParams.get('gameweekId');
    const squadId = urlParams.get('squadId');
    const score = urlParams.get('score');

    // Check if the page is loaded within an iframe
    if (window.self !== window.top) {
        document.body.classList.add('hide-header');
    }

    function toggleColumnVisibility() {
        const hideableColumns = document.querySelectorAll('.hideable');
        hideableColumns.forEach(column => {
            column.classList.toggle('hidden');
        });
        //adjustTableWidth();
    }

    // Fetch and display squad info
    async function fetchAndDisplaySquadInfo(squadId) {
        try {
            // Fetch squad info
            const squadResponse = await fetch(`${config.backendUrl}/UserSquads/${squadId}`, {
                credentials: 'include'
            });
            if (!squadResponse.ok) {
                console.error('Failed to fetch squad info:', squadResponse.status, squadResponse.statusText);
                return;
            }
            const squad = await squadResponse.json();

            // Fetch all users
            const usersResponse = await fetch(`${config.backendUrl}/User/all`, {
                credentials: 'include'
            });
            if (!usersResponse.ok) {
                console.error('Failed to fetch users:', usersResponse.status, usersResponse.statusText);
                return;
            }
            const users = await usersResponse.json();

            // Find the username corresponding to the squad's userId
            const user = users.find(user => user.id === squad.userId);
            const username = user ? user.username : 'Unknown User';

            // Display squad info with username
            const squadInfoDiv = document.getElementById('squadInfo');
            squadInfoDiv.innerHTML = `
            <h2>Squad: ${squad.squadName}</h2>
            <p>User: ${username}</p>
        `;
        } catch (error) {
            console.error('Error fetching squad info:', error);
        }
    }

    // Fetch and display player gameweek stats
    async function fetchAndDisplayPlayerStats(gameweekId, squadId, score) {
        try {
            // Determine the correct endpoint based on the score parameter
            const endpoint = score === 'live'
                ? `${config.backendUrl}/UserTeamPlayers/playerGameweekStatsLiveByGameweekAndSquad`
                : `${config.backendUrl}/UserTeamPlayers/playerGameweekStatsByGameweekAndSquad`;

            // Fetch player stats
            const response = await fetch(`${endpoint}?gameweekId=${gameweekId}&squadId=${squadId}`, {
                credentials: 'include'
            });
            if (!response.ok) {
                console.error('Failed to fetch player stats:', response.status, response.statusText);
                return;
            }
            const playerStats = await response.json();

            // Fetch position data
            const positionsResponse = await fetch(`${config.backendUrl}/PlayerPositions/positions`, {
                credentials: 'include'
            });
            if (!positionsResponse.ok) {
                console.error('Failed to fetch positions:', positionsResponse.status, positionsResponse.statusText);
                return;
            }
            const positions = await positionsResponse.json();

            // Create a map of position names to position IDs
            const positionMap = positions.reduce((map, position) => {
                map[position.name] = position.id;
                return map;
            }, {});

            // Sort players by position ID
            playerStats.sort((a, b) => positionMap[a.position] - positionMap[b.position]);

            const playerStatsTable = document.getElementById('playerStatsTable');
            playerStatsTable.innerHTML = ''; // Clear existing table

            // Create table header
            const headerRow = document.createElement('tr');
            headerRow.innerHTML = `
            <th>Photo</th>
            <th class="web-name">Web Name</th>
            <th>Position</th>
            <th>Score</th>
            <th class="hideable hidden">Apps</th>
            <th class="hideable hidden">Goals</th>
            <th class="hideable hidden">Assists</th>
            <th class="hideable hidden">Clean Sheets</th>
            <th class="hideable hidden">Saves</th>
            <th class="hideable hidden">Yellow Cards</th>
            <th class="hideable hidden">Red Cards</th>
            <th class="hideable hidden">Own Goals</th>
            <th class="hideable hidden">Minutes Played</th>
        `;
            playerStatsTable.appendChild(headerRow);

            // Initialize totals
            let totalApps = 0;
            let totalGoals = 0;
            let totalAssists = 0;
            let totalCleanSheets = 0;
            let totalSaves = 0;
            let totalYellowCards = 0;
            let totalRedCards = 0;
            let totalOwnGoals = 0;
            let totalMinutesPlayed = 0;
            let totalScore = 0;

            // Populate table with player stats
            playerStats.forEach(player => {
                const playerRow = document.createElement('tr');
                if (player.isCaptain) {
                    playerRow.classList.add('highlight-captain');
                }
                playerRow.innerHTML = `
                <td><img src="https://resources.premierleague.com/premierleague/photos/players/40x40/p${player.photo.slice(0, -3)}png" alt="Player Photo" class="player-photo"></td>
                <td class="web-name">${player.webName}</td>
                <td>${player.position}</td>
                <td class="score-column">${player.score}</td>
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

                // Update totals
                totalApps += player.app;
                totalGoals += player.goalsScored;
                totalAssists += player.assists;
                totalCleanSheets += player.cleanSheets;
                totalSaves += player.saves;
                totalYellowCards += player.yellowCards;
                totalRedCards += player.redCards;
                totalOwnGoals += player.ownGoals;
                totalMinutesPlayed += player.minutesPlayed;
                totalScore += player.score;
            });

            // Create totals row
            const totalsRow = document.createElement('tr');
            totalsRow.className = 'player-grid-totals';
            totalsRow.innerHTML = `
            <td><strong>Totals</strong></td>
            <td></td>
            <td></td>
            <td class="score-column">${totalScore}</td>
            <td class="hideable hidden">${totalApps}</td>
            <td class="hideable hidden">${totalGoals}</td>
            <td class="hideable hidden">${totalAssists}</td>
            <td class="hideable hidden">${totalCleanSheets}</td>
            <td class="hideable hidden">${totalSaves}</td>
            <td class="hideable hidden">${totalYellowCards}</td>
            <td class="hideable hidden">${totalRedCards}</td>
            <td class="hideable hidden">${totalOwnGoals}</td>
            <td class="hideable hidden">${totalMinutesPlayed}</td>
        `;
            playerStatsTable.appendChild(totalsRow);
        } catch (error) {
            console.error('Error fetching player stats:', error);
        }
    }


    await fetchAndDisplaySquadInfo(squadId);
    await fetchAndDisplayPlayerStats(gameweekId, squadId, score);
    document.getElementById('toggleColumnsButton').addEventListener('click', toggleColumnVisibility);
    //adjustTableWidth(); // Adjust table width on initial load
});

