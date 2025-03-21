import config from './config.js';
import { addAuthHeader } from './config.js';

document.addEventListener('DOMContentLoaded', async function () {
    const currentUserId = localStorage.getItem('userId'); // Retrieve the current user ID from local storage
    let currentLeagueId; // Track current league ID

    // Function to fetch and display leagues for the current user
    async function fetchAndDisplayLeagues() {
        try {
            const response = await fetch(`${config.backendUrl}/Leagues/byUser/${currentUserId}`, addAuthHeader());

            if (!response.ok) {
                console.error('Failed to fetch leagues:', response.status, response.statusText);
                return;
            }
            const leagues = await response.json();
            const leagueDropdown = document.getElementById('leagueDropdown');
            leagueDropdown.innerHTML = ''; // Clear existing options
            leagues.forEach(league => {
                const option = document.createElement('option');
                option.value = league.id;
                option.text = league.name;
                leagueDropdown.appendChild(option);
            });

            // Set default value to the first league
            if (leagues.length > 0) {
                leagueDropdown.value = leagues[0].id;
                currentLeagueId = leagues[0].id;
                fetchAndDisplayRankings(leagues[0].id);
                updateLeagueDetails(leagues[0].id);
            }

            // Update league details when the selected league changes
            leagueDropdown.addEventListener('change', function () {
                currentLeagueId = this.value;
                fetchAndDisplayRankings(this.value);
                updateLeagueDetails(this.value);

                // Clear squad table when league changes
                clearSquadTable();
            });
        } catch (error) {
            console.error('Error fetching leagues:', error);
        }
    }

    // Function to update league details based on the selected league
    async function updateLeagueDetails(leagueId) {
        // Fetch league details
        try {
            const response = await fetch(`${config.backendUrl}/Leagues/${leagueId}`, addAuthHeader());

            if (!response.ok) {
                console.error('Failed to fetch league details:', response.status, response.statusText);
                return;
            }
            const league = await response.json();
            document.getElementById('leagueName').innerText = `${league.name}`;

            // Don't fetch squads here anymore - we'll do it on demand
        } catch (error) {
            console.error('Error fetching league details:', error);
        }
    }

    // Function to clear the squad table
    function clearSquadTable() {
        const squadTableHeader = document.getElementById('squadTableHeader');
        const squadTableRow = document.getElementById('squadTableRow');
        squadTableHeader.innerHTML = ''; // Clear existing headers
        squadTableRow.innerHTML = ''; // Clear existing row
    }

    // Function to display a specific squad
    async function displaySquad(squadId, squadName, username) {
        // Clear existing content first
        clearSquadTable();

        const squadTableHeader = document.getElementById('squadTableHeader');
        const squadTableRow = document.getElementById('squadTableRow');

        // Create header
        const th = document.createElement('th');
        const squadLink = document.createElement('a');
        squadLink.href = `Squad.html?id=${squadId}&leagueId=${currentLeagueId}`;
        squadLink.innerText = `${squadName} - ${username}`;
        th.appendChild(squadLink);
        squadTableHeader.appendChild(th);

        // Create iframe for the squad
        const td = document.createElement('td');
        const iframeContainer = document.createElement('div');
        iframeContainer.className = 'iframe-container';
        const iframe = document.createElement('iframe');
        iframe.src = `Squad.html?id=${squadId}&leagueId=${currentLeagueId}`;
        iframeContainer.appendChild(iframe);
        td.appendChild(iframeContainer);
        squadTableRow.appendChild(td);
    }

    async function fetchAndDisplayRankings(leagueId) {
        try {
            const response = await fetch(`${config.backendUrl}/Teams/league/${leagueId}/userteams`, addAuthHeader());
            if (!response.ok) {
                console.error('Failed to fetch rankings:', response.status, response.statusText);
                return;
            }

            const userTeams = await response.json();
            const rankings = processRankings(userTeams);
            displayRankings(rankings);

            // Fetch squad details to have them ready when user clicks on a row
            fetchSquadDetails(leagueId, rankings);
        } catch (error) {
            console.error('Error fetching rankings:', error);
        }
    }

    // Store squad details for quick access when user clicks
    let squadsMap = {};

    // Fetch squad details for the rankings
    async function fetchSquadDetails(leagueId, rankings) {
        try {
            const respSquads = await fetch(`${config.backendUrl}/UserSquads/ByLeague/${leagueId}`, addAuthHeader());

            if (!respSquads.ok) {
                console.error('Failed to fetch squads:', respSquads.status, respSquads.statusText);
                return;
            }

            const squads = await respSquads.json();
            const selectedDraftPeriodId = document.getElementById('filterDraftPeriodDropdown').value;
            const filteredSquads = squads.filter(squad => squad.draftPeriodId == selectedDraftPeriodId);

            // Create a map of user IDs to squad details
            squadsMap = {};
            filteredSquads.forEach(squad => {
                if (!squadsMap[squad.userId]) {
                    squadsMap[squad.userId] = [];
                }
                squadsMap[squad.userId].push(squad);
            });
        } catch (error) {
            console.error('Error fetching squad details:', error);
        }
    }

    function processRankings(userTeams) {
        // First, group all entries by userId to get unique users
        const uniqueUsers = {};
        userTeams.forEach(team => {
            if (!uniqueUsers[team.userId]) {
                uniqueUsers[team.userId] = {
                    userId: team.userId,
                    squadName: team.squadName,
                    entries: []
                };
            }
            uniqueUsers[team.userId].entries.push(team);
        });

        // Group teams by gameweek
        const gameweeks = {};
        userTeams.forEach(team => {
            if (!gameweeks[team.gameweekNumber]) {
                gameweeks[team.gameweekNumber] = [];
            }
            gameweeks[team.gameweekNumber].push(team);
        });

        // Initialize statistics for each unique user
        const userStats = {};
        Object.values(uniqueUsers).forEach(user => {
            userStats[user.userId] = {
                userId: user.userId, // Add userId to the stats object
                squadName: user.squadName,
                totalPoints: 0,
                firstPlaces: 0,
                secondPlaces: 0,
                lastPlaces: 0,
                prizePoints: 0
            };
        });

        // Process each gameweek
        Object.entries(gameweeks).forEach(([gameweekNumber, gameweekTeams]) => {
            // Check if all users have 0 points for this gameweek
            const allZeroPoints = gameweekTeams.every(team => team.points === 0);
            if (allZeroPoints) {
                console.log(`Skipping gameweek ${gameweekNumber} - all users have 0 points`);
                return; // Skip this gameweek
            }

            // Sort teams by points for this gameweek
            const sortedTeams = gameweekTeams.sort((a, b) => b.points - a.points);
            const teamsCount = sortedTeams.length;

            // Group teams by points to handle ties
            const pointsGroups = {};
            sortedTeams.forEach(team => {
                if (!pointsGroups[team.points]) {
                    pointsGroups[team.points] = [];
                }
                pointsGroups[team.points].push(team);
            });

            // Sort points in descending order
            const sortedPoints = Object.keys(pointsGroups).map(Number).sort((a, b) => b - a);

            let currentPosition = 0;
            sortedPoints.forEach(points => {
                const tiedTeams = pointsGroups[points];
                const tiedCount = tiedTeams.length;
                const positionsSpanned = tiedCount;

                // Calculate what positions these teams are splitting
                const isFirst = currentPosition === 0;
                const isSecond = currentPosition === 1 || (currentPosition === 0 && positionsSpanned > 1);
                const isLast = currentPosition + tiedCount === teamsCount;

                // Calculate prize points for this group
                let prizePointsPool = 0;
                if (isFirst) {
                    // Get 75 from last place
                    prizePointsPool += 75;
                    // Get 50 from each middle position
                    prizePointsPool += 50 * (teamsCount - tiedCount - (isLast ? 0 : 1));
                }

                // Distribute statistics and prize points among tied teams
                tiedTeams.forEach(team => {
                    const stats = userStats[team.userId];
                    if (!stats) return;

                    stats.totalPoints += team.points;

                    // Split placement counts
                    if (isFirst) stats.firstPlaces += 1 / tiedCount;
                    if (isSecond && !isFirst) stats.secondPlaces += 1 / tiedCount;
                    if (isLast) stats.lastPlaces += 1 / tiedCount;

                    // Split prize points
                    if (isFirst) {
                        stats.prizePoints += prizePointsPool / tiedCount;
                    } else if (isLast) {
                        stats.prizePoints -= 75 / tiedCount;
                    } else if (!isSecond) {
                        stats.prizePoints -= 50;
                    }
                });

                currentPosition += tiedCount;
            });
        });

        return Object.values(userStats);
    }

    function displayRankings(rankings) {
        const tbody = document.getElementById('rankingsTableBody');
        tbody.innerHTML = '';

        // Sort by total points descending
        rankings.sort((a, b) => b.totalPoints - a.totalPoints);

        rankings.forEach(squad => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td data-label="Squad">${squad.squadName}</td>
                <td data-label="Total Points">${squad.totalPoints}</td>
                <td data-label="1st Places">${squad.firstPlaces}</td>
                <td data-label="2nd Places">${squad.secondPlaces}</td>
                <td data-label="Last Places">${squad.lastPlaces}</td>
                <td data-label="Prize Points">${squad.prizePoints}</td>
                <td class="chevron-cell" data-label="View"><i class="fas fa-chevron-right"></i></td>
            `;

            // Add click event to each row
            //row.style.cursor = 'pointer';
            row.classList.add('clickable-row');
            row.addEventListener('click', async function () {
                // Get user details
                const userId = squad.userId;

                try {
                    // Get the squad for this user
                    if (squadsMap[userId] && squadsMap[userId].length > 0) {
                        const userSquad = squadsMap[userId][0];
                        const username = users.find(user => user.id === userId)?.username || `User ${userId}`;
                        displaySquad(userSquad.id, squad.squadName, username);
                    } else {
                        console.error('No squad found for user', userId);
                    }
                } catch (error) {
                    console.error('Error displaying squad:', error);
                }
            });
        });

        // Start with an empty squad table
        clearSquadTable();
    }

    // Fetch users for dropdown
    let users = [];
    try {
        const respUsers = await fetch(`${config.backendUrl}/User/all`, addAuthHeader());

        if (!respUsers.ok) {
            console.error('Failed to fetch users:', respUsers.status, respUsers.statusText);
        } else {
            users = await respUsers.json();
        }
    } catch (error) {
        console.error('Error fetching users:', error);
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

    // Populate filter draft period dropdown and set default value
    const filterDraftPeriodDropdown = document.getElementById('filterDraftPeriodDropdown');
    draftPeriods.sort((a, b) => a.name.localeCompare(b.name)).forEach(draft => {
        const option = document.createElement('option');
        option.value = draft.id;
        option.text = draft.name || `Draft ${draft.id}`;
        filterDraftPeriodDropdown.appendChild(option);
    });
    filterDraftPeriodDropdown.value = draftPeriods[draftPeriods.length - 1].id;

    // Add event listener for draft period filter changes
    filterDraftPeriodDropdown.addEventListener('change', function () {
        const currentLeagueId = document.getElementById('leagueDropdown').value;
        // Clear squad table when draft period changes
        clearSquadTable();
        // Update rankings with new draft period
        fetchAndDisplayRankings(currentLeagueId);
    });

    // Fetch and display existing leagues on page load
    fetchAndDisplayLeagues();
});
