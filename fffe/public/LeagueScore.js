import config from './config.js';
import { addAuthHeader } from './config.js';

document.addEventListener('DOMContentLoaded', async function () {
    // Fetch leagues for dropdown
    const currentUserId = localStorage.getItem('userId');
    let leagues = [];
    try {
        const respLeagues = await fetch(`${config.backendUrl}/Leagues/byUser/${currentUserId}`, addAuthHeader());
        
        if (!respLeagues.ok) {
            console.error('Failed to fetch leagues:', respLeagues.status, respLeagues.statusText);
        } else {
            leagues = await respLeagues.json();
        }
    } catch (error) {
        console.error('Error fetching leagues:', error);
    }

    // Populate league dropdown
    const leagueDropdown = document.getElementById('leagueDropdown');
    leagues.sort((a, b) => a.name.localeCompare(b.name)).forEach(league => {
        const option = document.createElement('option');
        option.value = league.id;
        option.text = league.name || `League ${league.id}`;
        leagueDropdown.appendChild(option);
    });

    // Fetch and display league details based on selected league
    async function fetchAndDisplayLeagueDetails(leagueId) {
        try {
            const response = await fetch(`${config.backendUrl}/Leagues/${leagueId}`, addAuthHeader());

            if (!response.ok) {
                console.error('Failed to fetch league details:', response.status, response.statusText);
                return;
            }
            const league = await response.json();
            document.getElementById('leagueName').innerText = league.name;
        } catch (error) {
            console.error('Error fetching league details:', error);
        }
    }

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

    // Populate draft period dropdown
    const draftPeriodDropdown = document.getElementById('draftPeriodDropdown');
    draftPeriods.sort((a, b) => a.name.localeCompare(b.name)).forEach(draft => {
        const option = document.createElement('option');
        option.value = draft.id;
        option.text = draft.name || `Draft ${draft.id}`;
        draftPeriodDropdown.appendChild(option);
    });

    // Set default value to the last draft period alphabetically
    if (draftPeriods.length > 0) {
        draftPeriodDropdown.value = draftPeriods[draftPeriods.length - 1].id;
    }

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
            option.text = `${gameweek.number}`;
            gameweekDropdown.appendChild(option);
        });

        // Set default value to the last gameweek by start date that has a start date before the current date and time
        const now = new Date();
        const pastGameweeks = gameweeks.filter(gameweek => new Date(gameweek.startDate + 'Z') < now);
        if (pastGameweeks.length > 0) {
            gameweekDropdown.value = pastGameweeks[pastGameweeks.length - 1].id;
        }
    }

    // Initial population of gameweeks
    await fetchAndPopulateGameweeks(draftPeriodDropdown.value);

    // Update gameweeks when draft period changes
    draftPeriodDropdown.addEventListener('change', async function () {
        await fetchAndPopulateGameweeks(this.value);
        fetchAndDisplaySquads();
    });

    gameweekDropdown.addEventListener('change', fetchAndDisplaySquads);

    // Function to fetch and display existing squads
    async function fetchAndDisplaySquads() {
        const leagueId = leagueDropdown.value;
        const gameweekId = gameweekDropdown.value;
        try {
            const respSquads = await fetch(`${config.backendUrl}/UserSquads/ByLeague/${leagueId}`, addAuthHeader());

            if (!respSquads.ok) {
                console.error('Failed to fetch squads:', respSquads.status, respSquads.statusText);
                return;
            }
            const squads = await respSquads.json();
            const squadTableRow = document.getElementById('squadTableRow');
            squadTableRow.innerHTML = ''; // Clear existing row

            const selectedDraftPeriodId = draftPeriodDropdown.value;
            const selectedGameweekId = gameweekDropdown.value;
            const score = 'final';
            const filteredSquads = squads.filter(squad => squad.draftPeriodId == selectedDraftPeriodId);

            // Create iframe for each squad
            filteredSquads.forEach(squad => {
                const iframeContainer = document.createElement('div');
                iframeContainer.className = 'iframe-container';
                iframeContainer.setAttribute('data-squad-id', squad.id);
                const iframe = document.createElement('iframe');
                iframe.src = `TeamScore.html?squadId=${squad.id}&draftPeriodId=${selectedDraftPeriodId}&gameweekId=${selectedGameweekId}&score=${score}`;
                iframeContainer.appendChild(iframe);
                squadTableRow.appendChild(iframeContainer);
            });
        } catch (error) {
            console.error('Error fetching squads:', error);
        }
    }

    // Fetch and display league details and squads on page load
    if (leagueDropdown.value) {
        //await fetchAndDisplayLeagueDetails(leagueDropdown.value);
        fetchAndDisplaySquads();
    }

    // Update league details and squads when league changes
    leagueDropdown.addEventListener('change', async function () {
        //await fetchAndDisplayLeagueDetails(this.value);
        fetchAndDisplaySquads();
    });

    // Fetch player gameweek stats and create rankings table
    async function fetchAndDisplayRankings() {
        const gameweekId = gameweekDropdown.value;
        try {
            const response = await fetch(`${config.backendUrl}/UserTeamPlayers/playerGameweekStatsByGameweek?gameweekId=${gameweekId}`, addAuthHeader());

            if (!response.ok) {
                console.error('Failed to fetch player gameweek stats:', response.status, response.statusText);
                return;
            }
            const playerStats = await response.json();
            const rankings = processRankings(playerStats);
            displayRankings(rankings);
        } catch (error) {
            console.error('Error fetching player gameweek stats:', error);
        }
    }

    // Process player stats to create rankings
    function processRankings(playerStats) {
        const userStats = {};

        playerStats.forEach(player => {
            if (!userStats[player.username]) {
                userStats[player.username] = {
                    username: player.username,
                    totalPoints: 0,
                    playerCount: 0,
                    playersRemaining: 0,
                    squadId: player.squadId
                };
            }

            userStats[player.username].totalPoints += player.isCaptain ? player.score * 1.5 : player.score;
            userStats[player.username].playerCount += 1;

            if (player.id === -1) {
                userStats[player.username].playersRemaining += 1;
            }
        });

        Object.values(userStats).forEach(user => {
            user.avgPoints = user.totalPoints / (user.playerCount - user.playersRemaining);
        });

        return Object.values(userStats);
    }

    // Display rankings table
    function displayRankings(rankings) {
        const rankingsTableContainer = document.getElementById('rankingsTableContainer');
        rankingsTableContainer.innerHTML = ''; // Clear existing table

        const table = document.createElement('table');
        table.className = 'rankings-table';
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        thead.innerHTML = `
            <tr>
                <th>Username</th>
                <th>Points</th>
                <th>Avg Points</th>
                <th>Remaining</th>
                <th>Details</th>
            </tr>
        `;

        rankings.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.username}</td>
                <td>${user.totalPoints}</td>
                <td>${user.avgPoints.toFixed(2)}</td>
                <td>${user.playersRemaining}</td>
                <td><input type="checkbox" class="details-checkbox" data-squad-id="${user.squadId}" checked></td>
            `;
            tbody.appendChild(row);
        });

        table.appendChild(thead);
        table.appendChild(tbody);
        rankingsTableContainer.appendChild(table);

        // Add event listeners to checkboxes
        const checkboxes = document.querySelectorAll('.details-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function () {
                const squadId = this.getAttribute('data-squad-id');
                const iframeContainer = document.querySelector(`.iframe-container[data-squad-id="${squadId}"]`);
                if (this.checked) {
                    iframeContainer.style.display = 'block';
                } else {
                    iframeContainer.style.display = 'none';
                }
            });
        });
    }

    // Fetch and display rankings on page load
    fetchAndDisplayRankings();

    // Update rankings when gameweek changes
    gameweekDropdown.addEventListener('change', fetchAndDisplayRankings);
});

