import config from './config.js';
import { addAuthHeader } from './config.js';

document.addEventListener('DOMContentLoaded', async function () {
    const currentUserId = localStorage.getItem('userId'); // Retrieve the current user ID from local storage
    let currentLeagueId; // Track current league ID

    let previousPlayerScores = {};
    let previousTeamStats = {};
    let cardsExpanded = true;

    // Function to fetch and display all squad players in the league
    async function fetchAndCreateUserTeamCards() {
        const leagueId = document.getElementById('leagueDropdown').value;
        if (!leagueId) return;

        try {
            // Call the new endpoint
            const response = await fetch(`${config.backendUrl}/PlayerPositions/league-user-squad-players/${leagueId}`, addAuthHeader());

            if (!response.ok) {
                console.error('Failed to fetch league squad players:', response.status, response.statusText);
                return;
            }

            const players = await response.json();
            const rankingsResponse = await fetch(`${config.backendUrl}/Teams/league/${leagueId}/userteams`, addAuthHeader());
            const rankings = await rankingsResponse.json();
            const processedRankings = processRankings(rankings);

            // Calculate global maximum values
            calculateGlobalMaxValues(players);

            createUserTeamCards(players, processedRankings);
        } catch (error) {
            console.error('Error fetching league squad players:', error);
        }
    }


    // Function to process player stats and create user team cards
    function createUserTeamCards(players, rankings, expandedStates = {}) {
        const userTeamCardsContainer = document.getElementById('userTeamCardsContainer');
        if (!userTeamCardsContainer) return;

        // Create a temporary container to build new cards
        const tempContainer = document.createElement('div');

        // Group players by squadId
        const userTeams = {};

        players.forEach(player => {
            // Create a unique key for each player to track if needed
            const playerKey = `${player.squadId}-${player.webName}-${player.positionName}`;

            // Store current score/points for comparison if needed
            const playerScore = player.points || 0;
            if (!previousPlayerScores[playerKey]) {
                previousPlayerScores[playerKey] = playerScore;
            }

            if (!userTeams[player.squadId]) {
                // Find the user by userId
                const user = users.find(u => u.id === player.userId);
                const username = user ? user.username : 'User';

                // Find the ranking for the squad
                const ranking = rankings.find(r => r.userId === player.userId);

                userTeams[player.squadId] = {
                    username: username,
                    squadName: player.squadName || `Squad ${player.squadId}`,
                    squadId: player.squadId,
                    totalScore: 0,
                    totalPoints: ranking ? ranking.totalPoints : 0,
                    firstPlaces: ranking ? ranking.firstPlaces : 0,
                    secondPlaces: ranking ? ranking.secondPlaces : 0,
                    lastPlaces: ranking ? ranking.lastPlaces : 0,
                    prizePoints: ranking ? ranking.prizePoints : 0,
                    playerCount: 0,
                    playersRemaining: 0,
                    players: []
                };
            }

            // Add player to the user's team
            userTeams[player.squadId].players.push({
                ...player,
                previousScore: previousPlayerScores[playerKey],
                webName: player.webName || player.displayName || 'Unknown',
                position: player.positionName,
                score: playerScore
            });

            // Count players and update total score
            userTeams[player.squadId].playerCount += 1;
            userTeams[player.squadId].totalScore += playerScore;

            // Update previous score for next comparison
            previousPlayerScores[playerKey] = playerScore;
        });

        // Calculate average points for each team
        Object.values(userTeams).forEach(team => {
            team.avgPoints = team.totalScore / team.playerCount;

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

        // Create card for each user team, sorted by totalPoints descending
        Object.values(userTeams)
            .sort((a, b) => b.totalPoints - a.totalPoints)
            .forEach(team => {
                const card = createTeamCard(team);

                // Apply expanded state
                if (cardsExpanded || expandedStates[team.squadId]) {
                    card.classList.add('expanded');
                }

                tempContainer.appendChild(card);
            });

        // Replace the container's content with the new cards
        userTeamCardsContainer.innerHTML = tempContainer.innerHTML;

        // Setup player photo interactions
        setupPlayerPhotoInteractions();

        // Setup header click interactions
        setupHeaderClickInteractions();
    }

    // Function to create a team card
    // Helper function to calculate color based on score (red to green gradient)
    function getScoreColor(score, maxScore) {
        if (maxScore === 0) return '#000000'; // Black if max score is 0 (to avoid division by zero)

        // Calculate percentage (0 to 100)
        const percentage = Math.min(Math.max((score / maxScore) * 100, 0), 100);

        // Calculate RGB values:
        // Red decreases as score increases
        const r = Math.round(255 - (percentage * 2.55));

        // Green increases as score increases, but capped to a softer value (180 instead of 255)
        // This makes the green less bright at maximum value
        const g = Math.round(percentage * 1.8); // Using 1.8 instead of 2.55 caps green at 180

        // Add a tiny bit of blue to soften the color further
        const b = 20;

        return `rgb(${r}, ${g}, ${b})`;
    }

    // Update the createTeamCard function
    function createTeamCard(team) {
        const card = document.createElement('div');
        card.className = 'user-team-card';
        card.setAttribute('data-squad-id', team.squadId);

        // Create card header with username, total points, and ranking icons
        const header = document.createElement('div');
        header.className = 'user-team-card-header2';

        // Create total points span with highlighting if changed
        const totalPointsClass = "total-score";

        header.innerHTML = `
    <div class="header-top league-header">
        <h3 title="${team.username} - ${team.squadName}">${team.username}</h3>
        <span class="${totalPointsClass}">${Math.round(team.totalPoints)}</span>
    </div>
    <div class="ranking-icons">
        <div class="ranking-icon">
            <i class="fas fa-medal gold-medal" title="First Places"></i>
            <span>${team.firstPlaces}</span>
        </div>
        <div class="ranking-icon">
            <i class="fas fa-medal silver-medal" title="Second Places"></i>
            <span>${team.secondPlaces}</span>
        </div>
        <div class="ranking-icon">
            <i class="fas fa-poop brown-icon" title="Last Places"></i>
            <span>${team.lastPlaces}</span>
        </div>
        <div class="ranking-icon">
            <i class="fas fa-money-bill-wave green-icon" title="Prize Points"></i>
            <span>${team.prizePoints}</span>
        </div>
    </div>
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

                    // Create player photo element with captain marker if needed
                    const photoContainer = document.createElement('div');
                    photoContainer.className = player.isCaptain ? 'captain-marker' : '';

                    const photo = document.createElement('img');
                    photo.className = 'player-photo';
                    // Use a default image if photo is missing
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

                    // Calculate points per minute and color
                    const pointsPerMinute = player.points / player.minutes;
                    const color = getScoreColor(pointsPerMinute, maxPointsPerMinute);

                    // Create icon element
                    const icon = document.createElement('img');
                    icon.className = 'player-icon';
                    icon.src = drawPieSliceIcon(player.minutes, maxMinutes, color);

                    // Add all elements to the player row
                    playerRow.appendChild(photoContainer);
                    playerRow.appendChild(name);
                    playerRow.appendChild(icon);

                    positionGroup.appendChild(playerRow);
                });

                card.appendChild(positionGroup);
            }
        });

        // Add card footer with total score
        const footer = document.createElement('div');
        footer.className = 'user-team-card-footer';

        // Add total score with highlighting if changed
        const totalScoreClass = "total-score";

        footer.innerHTML = `
        <span class="${totalScoreClass}">${team.totalScore ? Math.round(team.totalScore) : 'N/A'}</span>
    `;
        card.appendChild(footer);

        return card;
    }

    // Function for player photo interactions (zoom and player card)
    function setupPlayerPhotoInteractions() {
        // Get all player photos
        const playerPhotos = document.querySelectorAll('.player-photo');

        // Remove any existing event listeners to prevent duplication
        playerPhotos.forEach(photo => {
            const newPhoto = photo.cloneNode(true);
            photo.parentNode.replaceChild(newPhoto, photo);
        });

        // Add click/tap event listeners to all player photos
        document.querySelectorAll('.player-photo').forEach(photo => {
            let isZoomed = false;
            let outsideClickHandler = null;

            photo.addEventListener('click', (e) => {
                e.stopPropagation();

                if (!isZoomed) {
                    // First click: zoom the photo
                    photo.style.transform = 'scale(1.4)';
                    photo.style.zIndex = '100';
                    isZoomed = true;

                    // Add click outside listener to revert zoom
                    outsideClickHandler = (event) => {
                        if (event.target !== photo) {
                            photo.style.transform = '';
                            photo.style.zIndex = '';
                            isZoomed = false;
                            document.removeEventListener('click', outsideClickHandler);
                            outsideClickHandler = null;
                        }
                    };

                    // Delay adding the outside click handler
                    setTimeout(() => {
                        document.addEventListener('click', outsideClickHandler);
                    }, 10);
                } else {
                    // Second click: show player card
                    // First remove the outside click handler
                    if (outsideClickHandler) {
                        document.removeEventListener('click', outsideClickHandler);
                        outsideClickHandler = null;
                    }

                    const playerRow = photo.closest('.player-row');

                    // Get the full player data from the data attribute
                    let player;
                    try {
                        player = JSON.parse(playerRow.getAttribute('data-player'));
                        console.log('Player data:', player);
                    } catch (error) {
                        console.error('Error parsing player data:', error);
                        return;
                    }

                    // Create overlay to darken the background
                    const overlay = document.createElement('div');
                    overlay.id = 'player-card-overlay';
                    overlay.className = 'player-card-overlay';
                    overlay.addEventListener('click', () => {
                        overlay.remove();
                        document.querySelector('.player-detail-card')?.remove();
                    });

                    // Create player card
                    const playerCard = createPlayerCard(player);

                    // Add the overlay and card to the document
                    document.body.appendChild(overlay);
                    document.body.appendChild(playerCard);

                    // Position the card in the center of the screen
                    playerCard.style.position = 'fixed';
                    playerCard.style.top = '50%';
                    playerCard.style.left = '50%';
                    playerCard.style.transform = 'translate(-50%, -50%)';
                    playerCard.style.zIndex = '1001';

                    // Reset photo zoom
                    photo.style.transform = '';
                    photo.style.zIndex = '';
                    isZoomed = false;
                }
            });

            // Make it visually clear that photos are clickable
            photo.style.cursor = 'pointer';
        });
    }

    function createPlayerCard(player) {
        // Create container for player card
        const playerCardContainer = document.createElement('div');
        playerCardContainer.className = 'player-detail-card';

        // Create header section with photo, name, score and close button
        const cardHeader = document.createElement('div');
        cardHeader.className = 'player-card-header';

        // Add player photo
        const photo = document.createElement('img');
        photo.className = 'player-card-photo';
        if (player.photo) {
            photo.src = `https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.photo.slice(0, -3)}png`;
        } else {
            photo.src = 'https://resources.premierleague.com/premierleague/photos/players/110x140/p0.png';
        }
        photo.alt = player.webName || 'Player';

        // Add player name, position, and score
        const nameScoreContainer = document.createElement('div');
        nameScoreContainer.className = 'player-card-name-score';

        const name = document.createElement('h3');
        name.textContent = player.webName || 'Unknown';

        // Add position
        const positionItem = document.createElement('div');
        positionItem.className = 'player-card-position';
        positionItem.textContent = player.position || 'N/A';

        const score = document.createElement('div');
        score.className = 'player-card-score';
        score.textContent = player.score || '0';

        nameScoreContainer.appendChild(name);
        nameScoreContainer.appendChild(positionItem);
        nameScoreContainer.appendChild(score);

        // Add close button
        const closeButton = document.createElement('button');
        closeButton.className = 'player-card-close';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            playerCardContainer.remove();
            document.getElementById('player-card-overlay').remove();
        });

        // Append elements to card header
        cardHeader.appendChild(photo);
        cardHeader.appendChild(nameScoreContainer);
        cardHeader.appendChild(closeButton);

        // Create stats container with grid layout for stats
        const statsContainer = document.createElement('div');
        statsContainer.className = 'player-card-stats';

        // Add relevant player statistics
        const statItems = [];

        // Add goals scored
        statItems.push({
            iconType: 'fa',
            iconClass: 'fa fa-futbol',
            value: player.goalsScored || '0',
            label: 'Goals'
        });

        // Add assists
        statItems.push({
            iconType: 'fa',
            iconClass: 'fa fa-hands-helping',
            value: player.assists || '0',
            label: 'Assists'
        });

        // Add minutes played
        statItems.push({
            iconType: 'fa',
            iconClass: 'fa fa-clock',
            value: player.minutes || '0',
            label: 'Minutes'
        });

        // Create each stat item
        statItems.forEach(item => {
            const statItem = document.createElement('div');
            statItem.className = 'player-stat-item';

            // Create icon
            const iconElement = document.createElement('i');
            iconElement.className = `${item.iconClass} stat-icon`;

            statItem.appendChild(iconElement);
            statItem.appendChild(document.createTextNode(` ${item.value} ${item.label}`));

            statsContainer.appendChild(statItem);
        });

        // Assemble the card
        playerCardContainer.appendChild(cardHeader);
        playerCardContainer.appendChild(statsContainer);

        return playerCardContainer;
    }

    // Function to handle header click interactions
    function setupHeaderClickInteractions() {
        // Get all team card headers
        const cardHeaders = document.querySelectorAll('.user-team-card-header2');

        // Remove any existing event listeners to prevent duplication
        cardHeaders.forEach(header => {
            const newHeader = header.cloneNode(true);
            header.parentNode.replaceChild(newHeader, header);
        });

        // Add click/tap event listeners to all team card headers
        document.querySelectorAll('.user-team-card-header2').forEach(header => {
            header.style.cursor = 'pointer'; // Make it visually clear that headers are clickable

            header.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event from bubbling to the card

                // Find the parent card and toggle its expanded state
                const card = header.closest('.user-team-card');
                if (card) {
                    card.classList.toggle('expanded');
                }
            });
        });
    }

    // Setup the toggle button functionality
    function setupCardsToggle() {
        const cardsToggle = document.getElementById('cardsToggle');
        if (!cardsToggle) return;

        // Set the initial button icon
        if (cardsToggle.querySelector('i')) {
            cardsToggle.querySelector('i').className = 'fas fa-compress';
        }

        cardsToggle.addEventListener('mouseenter', function () {
            this.style.opacity = '1';
        });

        cardsToggle.addEventListener('mouseleave', function () {
            this.style.opacity = '0.5';
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
                //updateLeagueDetails(leagues[0].id);
            }

            // Update league details when the selected league changes
            leagueDropdown.addEventListener('change', function () {
                currentLeagueId = this.value;
                fetchAndDisplayRankings(this.value);
                //updateLeagueDetails(this.value);

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

        // Adjust iframe height based on content
        iframe.addEventListener('load', function () {
            function adjustIframeHeight() {
                const contentHeight = iframe.contentWindow.document.body.scrollHeight;
                if (iframe.style.height !== contentHeight + 'px') {
                    iframe.style.height = contentHeight + 'px';
                    setTimeout(adjustIframeHeight, 1000); // Check again after 100ms
                }
            }
            adjustIframeHeight();
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
            const rankings = processRankings(userTeams);
            //displayRankings(rankings);

            // Fetch squad details to have them ready when user clicks on a row
            fetchSquadDetails(leagueId, rankings);
        } catch (error) {
            console.error('Error fetching rankings:', error);
        }
    }

    // Store squad details for quick access when user clicks
    let squadsMap = {};

    let maxMinutes = 0;
    let maxPointsPerMinute = 0;

    function calculateGlobalMaxValues(players) {
        players.forEach(player => {
            if (player.minutes > maxMinutes) {
                maxMinutes = player.minutes;
            }
            const pointsPerMinute = player.points / player.minutes;
            if (pointsPerMinute > maxPointsPerMinute) {
                maxPointsPerMinute = pointsPerMinute;
            }
        });
    }

    function drawPieSliceIcon(minutes, maxMinutes, color) {
        const canvas = document.createElement('canvas');
        canvas.width = 24;
        canvas.height = 24;
        const ctx = canvas.getContext('2d');

        // Calculate the fill percentage
        const fillPercentage = minutes / maxMinutes;

        // Draw the background circle
        ctx.beginPath();
        ctx.arc(12, 12, 12, 0, 2 * Math.PI);
        ctx.fillStyle = '#e0e0e0';
        ctx.fill();

        // Draw the pie slice
        ctx.beginPath();
        ctx.moveTo(12, 12);
        ctx.arc(12, 12, 12, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * fillPercentage);
        ctx.lineTo(12, 12);
        ctx.fillStyle = color;
        ctx.fill();

        return canvas.toDataURL();
    }


    // Fetch squad details for the rankings
    async function fetchSquadDetails(leagueId, rankings) {
        try {
            const respSquads = await fetch(`${config.backendUrl}/UserSquads/ByLeague/${leagueId}`, addAuthHeader());

            if (!respSquads.ok) {
                console.error('Failed to fetch squads:', respSquads.status, respSquads.statusText);
                return;
            }

            const squads = await respSquads.json();
            //const selectedDraftPeriodId = document.getElementById('filterDraftPeriodDropdown').value;
            //const filteredSquads = squads.filter(squad => squad.draftPeriodId == selectedDraftPeriodId);

            // Create a map of user IDs to squad details
            squadsMap = {};
            squads.forEach(squad => {
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
                    // Get 25 from second place
                    prizePointsPool += 25;
                    // Get 50 from each middle position
                    prizePointsPool += 50 * (teamsCount - tiedCount - (isLast ? 0 : 2));
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
                    } else if (isSecond) {
                        stats.prizePoints -= 25 / tiedCount;
                    } else {
                        stats.prizePoints -= 50 / tiedCount;
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
            row.style.cursor = 'pointer';
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
    /*
    let draftPeriods = [];
    try {
        const respDrafts = await fetch(`${config.backendUrl}/DraftPeriods`, addAuthHeader());
        if (respDrafts.status === 401) {
            console.error('Authentication error: Unauthorized access (401)');
            // Redirect to the root site
            window.location.href = '/';
            return;
        }
        if (!respDrafts.ok) {
            console.error('Failed to fetch draft periods:', respDrafts.status, respDrafts.statusText);
        } else {
            draftPeriods = await respDrafts.json();
        }
    } catch (error) {
        console.error('Error fetching draft periods:', error);
    }
    */
    // Populate filter draft period dropdown and set default value
    /*
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
    */
    setupCardsToggle();

    // Fetch and display existing leagues on page load
    await fetchAndDisplayLeagues();

    // After leagues are loaded, set up the change event listener
    const leagueDropdown = document.getElementById('leagueDropdown');
    if (leagueDropdown) {
        leagueDropdown.addEventListener('change', fetchAndCreateUserTeamCards);

        // Now that we know leagues are loaded, we can safely check and use the value
        if (leagueDropdown.value) {
            // Initial fetch for the selected league
            fetchAndCreateUserTeamCards();
        }
    }

});
