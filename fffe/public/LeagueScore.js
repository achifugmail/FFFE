import config from './config.js';
import { addAuthHeader } from './config.js';

document.addEventListener('DOMContentLoaded', async function () {
    // Fetch leagues for dropdown
    let leagues = [];
    try {
        const respLeagues = await fetch(`${config.backendUrl}/Leagues`, addAuthHeader());

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
    const scoreToggle = document.getElementById('scoreToggle');
    const scoreLabel = document.getElementById('scoreLabel');
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
            gameweekDropdown.appendChild(option);
        });

        // Set default value to the last gameweek by start date that has a start date before the current date and time
        const now = new Date();
        const pastGameweeks = gameweeks.filter(gameweek => new Date(gameweek.startDate + 'Z') < now);
        if (pastGameweeks.length > 0) {
            gameweekDropdown.value = pastGameweeks[pastGameweeks.length - 1].id;
        }

        // Set default value for score toggle
        const selectedGameweek = gameweeks.find(gameweek => gameweek.id == gameweekDropdown.value);
        if (selectedGameweek && new Date(selectedGameweek.endDate + 'Z') > now) {
            scoreToggle.checked = true;
            scoreLabel.innerText = 'Live scores';
        } else {
            scoreToggle.checked = false;
            scoreLabel.innerText = 'Final scores';
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
    scoreToggle.addEventListener('change', function () {
        scoreLabel.innerText = scoreToggle.checked ? 'Live scores' : 'Final scores';
        fetchAndDisplaySquads();
    });

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
        <td>${squad.squadName}</td>
        <td>${squad.totalPoints}</td>
        <td>${squad.firstPlaces.toFixed(1)}</td>
        <td>${squad.secondPlaces.toFixed(1)}</td>
        <td>${squad.lastPlaces.toFixed(1)}</td>
        <td>${squad.prizePoints.toFixed(0)}</td>
    `;
        });
    }

    async function fetchAndDisplayRankings(leagueId) {
        try {
            const response = await fetch(`${config.backendUrl}/Teams/league/${leagueId}/userteams`, addAuthHeader());
            if (!response.ok) {
                console.error('Failed to fetch rankings:', response.status, response.statusText);
                return;
            }

            const userTeams = await response.json();
            displayRankings(processRankings(userTeams));
        } catch (error) {
            console.error('Error fetching rankings:', error);
        }
    }

    // Function to fetch and display existing squads
    async function fetchAndDisplaySquads() {
        const leagueId = leagueDropdown.value;
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
            const score = scoreToggle.checked ? 'live' : 'final';
            const filteredSquads = squads.filter(squad => squad.draftPeriodId == selectedDraftPeriodId);

            // Create iframe for each squad
            filteredSquads.forEach(squad => {
                const iframeContainer = document.createElement('div');
                iframeContainer.className = 'iframe-container';
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
        await fetchAndDisplayLeagueDetails(leagueDropdown.value);
        fetchAndDisplayRankings(leagueDropdown.value);
        fetchAndDisplaySquads();
    }

    // Update league details and squads when league changes
    leagueDropdown.addEventListener('change', async function () {
        await fetchAndDisplayLeagueDetails(this.value);
        fetchAndDisplayRankings(this.value);
        fetchAndDisplaySquads();
    });
});
