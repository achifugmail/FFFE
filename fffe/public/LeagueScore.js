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
        } catch (error) {
            console.error('Error fetching player gameweek stats:', error);
        }
    }

    // Function to process player stats and create user team cards
    function createUserTeamCards(playerStats) {
        const userTeamCardsContainer = document.getElementById('userTeamCardsContainer');
        userTeamCardsContainer.innerHTML = ''; // Clear existing cards

        // Group players by username
        const userTeams = {};

        playerStats.forEach(player => {
            if (!userTeams[player.username]) {
                userTeams[player.username] = {
                    username: player.username,
                    squadName: player.squadName,
                    squadId: player.squadId,
                    totalScore: 0,
                    players: []
                };
            }

            // Add player to the user's team
            userTeams[player.username].players.push(player);

            // Add to total score (with captain bonus if applicable)
            userTeams[player.username].totalScore += player.isCaptain ? player.score * 1.5 : player.score;
        });

        // Create card for each user team
        Object.values(userTeams).forEach(team => {
            const card = createTeamCard(team);
            userTeamCardsContainer.appendChild(card);
        });

        // Add swipe functionality for mobile
        setupSwipeInteraction();
    }

    // Function to create a card for a user team
    function createTeamCard(team) {
        const card = document.createElement('div');
        card.className = 'user-team-card';
        card.setAttribute('data-squad-id', team.squadId);

        // Create card header with username and total score
        const header = document.createElement('div');
        header.className = 'user-team-card-header';
        header.innerHTML = `
        <h3 title="${team.username} - ${team.squadName}">${team.username}</h3>
        <span class="total-score">${Math.round(team.totalScore)}</span>
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

                    // Create score element
                    const score = document.createElement('div');
                    score.className = 'player-score';
                    score.textContent = player.score || '0';

                    // Add all elements to the player row
                    playerRow.appendChild(photoContainer);
                    playerRow.appendChild(name);
                    playerRow.appendChild(score);

                    positionGroup.appendChild(playerRow);
                });

                card.appendChild(positionGroup);
            }
        });

        return card;
    }

    // Setup swipe functionality for mobile devices
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
    fetchAndDisplayRankings().then(() => {
        fetchAndCreateUserTeamCards();
    });

    // Update rankings when gameweek changes
    gameweekDropdown.addEventListener('change', fetchAndDisplayRankings);
    gameweekDropdown.addEventListener('change', fetchAndCreateUserTeamCards);
});

