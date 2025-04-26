import { setupPlayerPhotoInteractions } from './common.js';
import config from './config.js';
import { addAuthHeader } from './config.js';
import { fetchLeagues } from './common.js';
import { fetchDraftPeriods } from './common.js';

let previousPlayerScores = {};
let refreshInterval;
const REFRESH_INTERVAL = 25000; // 60 seconds

document.addEventListener('DOMContentLoaded', async function () {
    // Fetch leagues for dropdown
    let leagueId = localStorage.getItem('leagueId');
    const cardsToggle = document.getElementById('cardsToggle');
    let cardsExpanded = true; // Start with cards expanded
    const leagueDropdown = document.getElementById('leagueDropdown');

    const draftPeriodDropdown = document.getElementById('draftPeriodDropdown');
    
    // Fetch and populate gameweeks based on selected draft period
    const gameweekDropdown = document.getElementById('gameweekDropdown');
    async function fetchAndPopulateGameweeks(draftPeriodId) {
        let gameweeks = [];
        try {
            const respGameweeks = await fetch(`${config.backendUrl}/Gameweeks/by-draft-period/${draftPeriodId}`, addAuthHeader());
            if (respGameweeks.status === 401) {
                console.error('Authentication error: Unauthorized access (401)');
                // Redirect to the root site
                window.location.href = '/';
                return;
            }
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

    async function refreshUserTeamCards() {
        // Store the expanded state of each card
        const expandedStates = {};
        document.querySelectorAll('.user-team-card').forEach(card => {
            const squadId = card.getAttribute('data-squad-id');
            expandedStates[squadId] = card.classList.contains('expanded');
        });
        
        const gameweekId = gameweekDropdown.value;
        try {
            const response = await fetch(`${config.backendUrl}/UserTeamPlayers/playerGameweekStatsByGameweekAndLeague?gameweekId=${gameweekId}&leagueId=${leagueId}`, addAuthHeader());
            if (response.status === 401) {
                console.error('Authentication error: Unauthorized access (401)');
                // Redirect to the root site
                window.location.href = '/';
                return;
            }
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

    async function fetchAndCreateUserTeamCards() {
        const gameweekId = gameweekDropdown.value;
        try {
            const response = await fetch(`${config.backendUrl}/UserTeamPlayers/playerGameweekStatsByGameweekAndLeague?gameweekId=${gameweekId}&leagueId=${leagueId}`, addAuthHeader());
            if (response.status === 401) {
                console.error('Authentication error: Unauthorized access (401)');
                // Redirect to the root site
                window.location.href = '/';
                return;
            }
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
   
    function createUserTeamCards(playerStats, expandedStates = {}) {
    const userTeamCardsContainer = document.getElementById('userTeamCardsContainer');

    // Create a temporary container to build new cards
    const tempContainer = document.createElement('div');

    // Group players by username
        const userTeams = {};

        cardsExpanded = true;

        const toggleIcon = document.querySelector('#cardsToggle i');
        if (toggleIcon) {
            toggleIcon.className = 'fas fa-compress';
        }


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
        if (player.played === -1) {
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

                // Always add expanded class by default
                card.classList.add('expanded');

                // If we've previously saved a different state, use that instead
                if (expandedStates[team.squadId] === false) {
                    card.classList.remove('expanded');
                }

                tempContainer.appendChild(card);
            });

    // Replace the container's content with the new cards
    userTeamCardsContainer.innerHTML = tempContainer.innerHTML;

    setupPlayerPhotoInteractions();
    setupHeaderClickInteractions();
}
    function setupHeaderClickInteractions() {
        console.log('Setting up header click interactions...');

        // Get all team card headers
        const cardHeaders = document.querySelectorAll('.user-team-card-header');
        console.log(`Found ${cardHeaders.length} team card headers`);

        // Remove any existing event listeners to prevent duplication
        cardHeaders.forEach(header => {
            // Create a new copy of the header element to remove old event listeners
            const newHeader = header.cloneNode(true);
            header.parentNode.replaceChild(newHeader, header);
        });

        // Add click/tap event listeners to all team card headers
        document.querySelectorAll('.user-team-card-header').forEach(header => {
            header.style.cursor = 'pointer'; // Make it visually clear that headers are clickable

            header.addEventListener('click', (e) => {
                console.log('Header clicked');
                e.stopPropagation(); // Prevent event from bubbling to the card

                // Find the parent card and toggle its expanded state
                const card = header.closest('.user-team-card');
                if (card) {
                    card.classList.toggle('expanded');
                    console.log(`Card expanded state toggled: ${card.classList.contains('expanded')}`);
                }
            });
        });
    }

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
    <span class="${totalScoreClass}">${team.totalScore}</span>
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

                    // Store complete player data as a JSON string in a data attribute
                    playerRow.setAttribute('data-player', JSON.stringify(player));

                    // Add appropriate classes based on player status
                    if (player.id === null) {
                        playerRow.classList.add('null-player');
                    } else if (player.played === -1) {
                        playerRow.classList.add('pending-player');
                    }else if (player.played === 0) {
                            playerRow.classList.add('flashing-gray');
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

    async function initializePage() {
        if (!leagueId) {
            console.log('No leagueId found, waiting for league fetch');
            await fetchLeagues(leagueDropdown);
            leagueId = localStorage.getItem('leagueId');
        } else {
            // If leagueId exists, call fetchLeagues but don't wait
            console.log('Using existing leagueId:', leagueId);
            fetchLeagues(leagueDropdown); // Asynchronous call, don't await
        }
        
        await fetchDraftPeriods(draftPeriodDropdown);
        await fetchAndPopulateGameweeks(draftPeriodDropdown.value);

        fetchAndCreateUserTeamCards();

        // Update gameweeks when draft period changes
        draftPeriodDropdown.addEventListener('change', async function () {
            await fetchAndPopulateGameweeks(this.value);
            //fetchAndDisplaySquads();
        });

        if (cardsToggle.querySelector('i')) {
            cardsToggle.querySelector('i').className = 'fas fa-compress';
        }

        cardsToggle.addEventListener('mouseenter', function () {
            this.style.opacity = '1';
        });

        cardsToggle.addEventListener('mouseleave', function () {
            this.style.opacity = '0.5';
        });

        gameweekDropdown.addEventListener('change', fetchAndCreateUserTeamCards);

        leagueDropdown.addEventListener('change', async function () {
            leagueId = this.value;
            localStorage.setItem('leagueId', leagueId);
            fetchAndCreateUserTeamCards();
        });

        window.addEventListener('beforeunload', () => {
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        });


        cardsToggle.addEventListener('click', function () {
            const cards = document.querySelectorAll('.user-team-card');
            cardsExpanded = !cardsExpanded;

            // Update icon based on state
            const icon = this.querySelector('i');
            if (cardsExpanded) {
                icon.className = 'fas fa-compress'; // Compress icon when expanded
                cards.forEach(card => card.classList.add('expanded'));
            } else {
                icon.className = 'fas fa-expand'; // Expand icon when collapsed
                cards.forEach(card => card.classList.remove('expanded'));
            }
        });
    }

    initializePage();
});

