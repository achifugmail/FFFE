import config from './config.js';
import { addAuthHeader } from './config.js';

let previousPlayerScores = {};
let refreshInterval;
const REFRESH_INTERVAL = 60000; // 60 seconds

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
        //fetchAndDisplaySquads();
    });

    //gameweekDropdown.addEventListener('change', fetchAndDisplaySquads);

    
    // Fetch and display league details and squads on page load
    if (leagueDropdown.value) {
        //await fetchAndDisplayLeagueDetails(leagueDropdown.value);
        //fetchAndDisplaySquads();
    }

    // Update league details and squads when league changes
    leagueDropdown.addEventListener('change', async function () {
        //await fetchAndDisplayLeagueDetails(this.value);
        //fetchAndDisplaySquads();
        //fetchAndDisplayRankings().then(() => {
            fetchAndCreateUserTeamCards();
        //});
    });

    async function refreshUserTeamCards() {
        // Store the expanded state of each card
        const expandedStates = {};
        document.querySelectorAll('.user-team-card').forEach(card => {
            const squadId = card.getAttribute('data-squad-id');
            expandedStates[squadId] = card.classList.contains('expanded');
        });

        const gameweekId = gameweekDropdown.value;
        try {
            const response = await fetch(`${config.backendUrl}/UserTeamPlayers/playerGameweekStatsByGameweek?gameweekId=${gameweekId}`, addAuthHeader());

            if (!response.ok) {
                console.error('Failed to fetch player gameweek stats on refresh:', response.status, response.statusText);
                return;
            }

            const playerStats = await response.json();

            // Create new cards
            createUserTeamCards(playerStats, expandedStates);
        } catch (error) {
            console.error('Error refreshing player gameweek stats:', error);
        }
    }
-
    async function fetchAndCreateUserTeamCards() {
        const gameweekId = gameweekDropdown.value;
        try {
            const response = await fetch(`${config.backendUrl}/UserTeamPlayers/playerGameweekStatsByGameweek?gameweekId=${gameweekId}`, addAuthHeader());

            if (!response.ok) {
                console.error('Failed to fetch player gameweek stats:', response.status, response.statusText);
                return;
            }
            const playerStats = await response.json();
            createUserTeamCards(playerStats);

            // Setup the interval for periodic refresh if not already set up
            if (!refreshInterval) {
                refreshInterval = setInterval(refreshUserTeamCards, REFRESH_INTERVAL);
            }
        } catch (error) {
            console.error('Error fetching player gameweek stats:', error);
        }
    }

    // Function to process player stats and create user team cards
    let previousTeamStats = {};

    // Update the createUserTeamCards function to track and highlight total/average changes
    function createUserTeamCards(playerStats, expandedStates = {}) {
        const userTeamCardsContainer = document.getElementById('userTeamCardsContainer');

        // Create a temporary container to build new cards
        const tempContainer = document.createElement('div');

        // Group players by username
        const userTeams = {};

        playerStats.forEach(player => {
            // Create a unique key for each player to track score changes
            const playerKey = `${player.username}-${player.webName}-${player.position}`;

            // Store current score for comparison with next refresh
            if (!previousPlayerScores[playerKey]) {
                previousPlayerScores[playerKey] = player.score;
            }

            if (!userTeams[player.username]) {
                userTeams[player.username] = {
                    username: player.username,
                    squadName: player.squadName,
                    squadId: player.squadId,
                    totalScore: 0,
                    playerCount: 0,
                    playersRemaining: 0,
                    players: []
                };
            }

            // Add player to the user's team
            userTeams[player.username].players.push({
                ...player,
                previousScore: previousPlayerScores[playerKey]
            });

            // Count players and identify remaining players (id === -1)
            userTeams[player.username].playerCount += 1;
            if (player.id === -1) {
                userTeams[player.username].playersRemaining += 1;
            }

            userTeams[player.username].totalScore += player.score;

            // Update previous score for next comparison
            previousPlayerScores[playerKey] = player.score;
        });

        // Calculate average points for each team and add previous stats for comparison
        Object.values(userTeams).forEach(team => {
            team.avgPoints = team.totalScore / (team.playerCount - team.playersRemaining);

            // Add previous totals and averages for comparison
            if (previousTeamStats[team.squadId]) {
                team.previousTotalScore = previousTeamStats[team.squadId].totalScore;
                team.previousAvgPoints = previousTeamStats[team.squadId].avgPoints;
            }

            // Update for next refresh
            previousTeamStats[team.squadId] = {
                totalScore: team.totalScore,
                avgPoints: team.avgPoints
            };
        });

        // Create card for each user team, sorted descending by totalScore
        Object.values(userTeams)
            .sort((a, b) => b.totalScore - a.totalScore)
            .forEach(team => {
                const card = createTeamCard(team);

                // Restore expanded state if it exists
                if (expandedStates[team.squadId]) {
                    card.classList.add('expanded');
                }

                tempContainer.appendChild(card);
            });

        // Replace the container's content with the new cards
        userTeamCardsContainer.innerHTML = tempContainer.innerHTML;

        // Re-setup swipe functionality after DOM updates
        //setupSwipeInteraction();
    }

    // Update the createTeamCard function to highlight changes in total score and average
    function createTeamCard(team) {
        const card = document.createElement('div');
        card.className = 'user-team-card';
        card.setAttribute('data-squad-id', team.squadId);

        // Create card header with username and total score
        const header = document.createElement('div');
        header.className = 'user-team-card-header';

        // Create total score span with highlighting if changed
        const totalScoreClass = team.previousTotalScore !== undefined ?
            (team.totalScore > team.previousTotalScore ? "total-score score-increased" :
                team.totalScore < team.previousTotalScore ? "total-score score-decreased" :
                    "total-score") : "total-score";

        header.innerHTML = `
    <h3 title="${team.username} - ${team.squadName}">${team.username}</h3>
    <span class="${totalScoreClass}">${Math.round(team.totalScore)}</span>
    `;
        card.appendChild(header);

        // Group players by position
        const playersByPosition = {};
        team.players.forEach(player => {
            if (!playersByPosition[player.position]) {
                playersByPosition[player.position] = [];
            }
            playersByPosition[player.position].push(player);
        });

        // Create a section for each position group
        const positionOrder = ['GK', 'DEF', 'WB', 'DM', 'AM', 'FW'];

        positionOrder.forEach(position => {
            if (playersByPosition[position] && playersByPosition[position].length > 0) {
                const positionGroup = document.createElement('div');
                positionGroup.className = 'position-group';

                // Add position label
                const positionLabel = document.createElement('span');
                positionLabel.className = 'position-label';
                positionLabel.textContent = position;
                positionGroup.appendChild(positionLabel);

                // Add each player in this position
                playersByPosition[position].forEach(player => {
                    const playerRow = document.createElement('div');
                    playerRow.className = 'player-row';

                    // Add appropriate classes based on player status
                    if (player.id === null) {
                        playerRow.classList.add('null-player');
                    } else if (player.id === -1) {
                        playerRow.classList.add('pending-player');
                    }

                    // Create player photo element with captain marker if needed
                    const photoContainer = document.createElement('div');
                    photoContainer.className = player.isCaptain ? 'captain-marker' : '';

                    const photo = document.createElement('img');
                    photo.className = 'player-photo';
                    // Use a default image if photo is missing (this helps prevent broken images)
                    if (player.photo) {
                        photo.src = `https://resources.premierleague.com/premierleague/photos/players/40x40/p${player.photo.slice(0, -3)}png`;
                    } else {
                        photo.src = 'https://resources.premierleague.com/premierleague/photos/players/40x40/p0.png';
                    }
                    photo.alt = player.webName || 'Player';
                    photoContainer.appendChild(photo);

                    // Create player name element
                    const name = document.createElement('div');
                    name.className = 'player-name';
                    name.textContent = player.webName || 'Unknown';
                    name.title = player.webName || 'Unknown';

                    // Create score element with highlighting if changed
                    const score = document.createElement('div');
                    score.className = 'player-score';
                    score.textContent = player.score || '0';

                    // Check if score has changed
                    if (player.previousScore !== undefined && player.previousScore !== player.score) {
                        score.classList.add('score-changed');
                        if (player.score > player.previousScore) {
                            score.classList.add('score-increased');
                        } else if (player.score < player.previousScore) {
                            score.classList.add('score-decreased');
                        }
                    }

                    // Add all elements to the player row
                    playerRow.appendChild(photoContainer);
                    playerRow.appendChild(name);
                    playerRow.appendChild(score);

                    positionGroup.appendChild(playerRow);
                });

                card.appendChild(positionGroup);
            }
        });

        // Add card footer with average points
        const footer = document.createElement('div');
        footer.className = 'user-team-card-footer';

        // Add avg points with highlighting if changed
        const avgClass = team.previousAvgPoints !== undefined ?
            (team.avgPoints > team.previousAvgPoints ? "avg-points-value score-increased" :
                team.avgPoints < team.previousAvgPoints ? "avg-points-value score-decreased" :
                    "avg-points-value") : "avg-points-value";

        footer.innerHTML = `
    <span class="avg-points-label">~ </span>
    <span class="${avgClass}">${team.avgPoints ? team.avgPoints.toFixed(2) : 'N/A'}</span>
    `;
        card.appendChild(footer);

        return card;
    }

    // Setup swipe functionality for mobile devices
    function setupSwipeInteraction() {
        const container = document.getElementById('userTeamCardsContainer');
        if (!container) return; // Guard clause in case container doesn't exist

        let startX, endX;
        let isScrolling = false;
        let reachedEnd = false;
        let reachedStart = false;

        container.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isScrolling = false;

            // Check if scrolled to the right end
            reachedEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 10;

            // Check if scrolled to the left end
            reachedStart = container.scrollLeft <= 10;
        });

        container.addEventListener('touchmove', (e) => {
            if (!startX) return;

            const currentX = e.touches[0].clientX;
            const diffX = startX - currentX;

            // If scrolling horizontally, prevent expanding/collapsing cards
            if (Math.abs(diffX) > 5) {
                isScrolling = true;
            }

            // If reached the right end and trying to scroll more right, expand cards
            if (reachedEnd && diffX > 0 && !isScrolling) {
                e.preventDefault();
                document.querySelectorAll('.user-team-card').forEach(card => {
                    card.classList.add('expanded');
                });
            }

            // If reached the left end and trying to scroll more left, collapse cards
            if (reachedStart && diffX < 0 && !isScrolling) {
                e.preventDefault();
                document.querySelectorAll('.user-team-card').forEach(card => {
                    card.classList.remove('expanded');
                });
            }
        });

        container.addEventListener('touchend', () => {
            startX = null;
        });

        // Add click handler to toggle expansion on desktop
        container.addEventListener('click', (e) => {
            const card = e.target.closest('.user-team-card');
            if (card) {
                // Toggle only the clicked card instead of all cards
                card.classList.toggle('expanded');
            }
        });
    }



    // Fetch and display rankings on page load
    //fetchAndDisplayRankings();
    //fetchAndDisplayRankings().then(() => {
        fetchAndCreateUserTeamCards();
    //});

    // Update rankings when gameweek changes
    //gameweekDropdown.addEventListener('change', fetchAndDisplayRankings);
    gameweekDropdown.addEventListener('change', fetchAndCreateUserTeamCards);

    window.addEventListener('beforeunload', () => {
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }
    });
});

