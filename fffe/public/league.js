import config from './config.js';
import { addAuthHeader } from './config.js';

document.addEventListener('DOMContentLoaded', async function () {
    const currentUserId = localStorage.getItem('userId'); // Retrieve the current user ID from local storage

    let previousPlayerScores = {};
    let previousTeamStats = {};
    let cardsExpanded = true;
    const startColor = { r: 255, g: 255, b: 255 }; // #cfcfcf
    const endColor = { r: 0, g: 128, b: 0 }; // #008000

    function getScoreColor(pointsPerMinute, maxPointsPerMinute) {
        if (maxPointsPerMinute === 0) return '#000000'; // Black if max points per minute is 0 (to avoid division by zero)

        // Cap the color at 90% of the maximum
        const cappedMax = maxPointsPerMinute * 1;
        const percentage = Math.min(Math.max((pointsPerMinute / cappedMax) * 100, 0), 100);

        // Define the start and end colors


        const r = Math.round(startColor.r + (endColor.r - startColor.r) * (percentage / 100));
        const g = Math.round(startColor.g + (endColor.g - startColor.g) * (percentage / 100));
        const b = Math.round(startColor.b + (endColor.b - startColor.b) * (percentage / 100));

        const pastelFactor = 0.2;
        const shadedR = Math.round(r + (255 - r) * pastelFactor);
        const shadedG = Math.round(g + (255 - g) * pastelFactor);
        const shadedB = Math.round(b + (255 - b) * pastelFactor);

        //return `rgb(${shadedR}, ${shadedG}, ${shadedB})`;
        //return `rgb(${shadedR}, ${shadedG}, ${shadedB})`;
        return `rgb(${shadedR}, ${shadedG}, ${shadedB})`;
    }

    function drawPieSliceIcon(minutes, maxMinutes, points, maxPointsPerMinute, border = false) {
        // Create icon element
        const pointsPerMinute = points / minutes;
        const color = getScoreColor(pointsPerMinute, maxPointsPerMinute);

        const icon = document.createElement('img');
        //icon.className = 'player-icon';

        // Create the canvas and draw the pie chart
        const canvas = document.createElement('canvas');
        canvas.width = 18;
        canvas.height = 18;
        const ctx = canvas.getContext('2d');

        // Calculate the fill percentage
        const fillPercentage = minutes / maxMinutes;

        // Draw the background circle
        ctx.beginPath();
        ctx.arc(8, 8, 8, 0, 2 * Math.PI);
        ctx.fillStyle = '#e0e0e0';
        ctx.fill();

        // Draw the pie slice
        ctx.beginPath();
        ctx.moveTo(8, 8);
        ctx.arc(8, 8, 8, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * fillPercentage);
        ctx.lineTo(8, 8);
        ctx.fillStyle = color;
        ctx.fill();

        // Add border around the filled area if requested
        if (border) {
            
            ctx.moveTo(8, 8);
            ctx.beginPath();
            ctx.arc(8, 8, 8, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * fillPercentage);
            //ctx.lineTo(8, 8);
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Set the icon properties
        icon.src = canvas.toDataURL();
        icon.style.marginLeft = '10px';
        icon.style.filter = 'drop-shadow(1px 1px 1px lightgrey)';

        return icon;
    }

    function createIconLegend() {
        const legendContainer = document.getElementById('iconLegendContainer');
        if (!legendContainer) return;

        // Clear any existing content
        legendContainer.innerHTML = '';
        legendContainer.className = 'icon-legend-container';

        // Function to create a legend set
        function createLegendSet(icons, label) {
            const container = document.createElement('div');
            container.className = 'legend-set';

            // Create container for icons
            const iconsContainer = document.createElement('div');
            iconsContainer.className = 'legend-icons';

            // Add icons
            icons.forEach((icon, index) => {
                icon.className = 'legend-icon';
                iconsContainer.appendChild(icon);
            });

            // Create arrow
            const arrow = document.createElement('div');
            arrow.className = 'legend-arrow';
            arrow.innerHTML = `
            <svg width="100" height="10" viewBox="0 0 100 10">
                <line x1="10" y1="5" x2="95" y2="5" stroke="#aaa" stroke-width="1.5"/>
                <path d="M95 5 l-4 -4 v8 z" fill="#aaa"/>
            </svg>
        `;
            arrow.style.filter = 'drop-shadow(1px 1px 1px lightgrey)';

            // Create label
            const text = document.createElement('span');
            text.className = 'legend-text';
            text.textContent = label;
            

            container.appendChild(iconsContainer);
            container.appendChild(arrow);
            container.appendChild(text);

            return container;
        }

        // Create first set (points per minute)
        const ppmIcons = [
            drawPieSliceIcon(2, 3, 2, 3),
            drawPieSliceIcon(2, 3, 4, 3),
            drawPieSliceIcon(2, 3, 6, 3)
        ];
        const ppmSet = createLegendSet(ppmIcons, ' points per minute');

        // Create second set (minutes played)
        const minutesIcons = [
            drawPieSliceIcon(1, 3, 1, 1),
            drawPieSliceIcon(2, 3, 2, 1),
            drawPieSliceIcon(3, 3, 3, 1)
        ];
        const minutesSet = createLegendSet(minutesIcons, 'minutes played');

        // Add both sets to the container
        legendContainer.appendChild(ppmSet);
        legendContainer.appendChild(minutesSet);
    }

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
            const rankingsResponse = await fetch(`${config.backendUrl}/UserTeams/${leagueId}`, addAuthHeader());
            const rankings = await rankingsResponse.json();
            const processedRankings = processRankings(rankings);

            // Calculate global maximum values
            calculateGlobalMaxValues(players);

            createUserTeamCards(players, processedRankings);
            createIconLegend();
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
                //const user = users.find(u => u.id === player.userId);
                const username = player.squadName;

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
        <span class="${totalPointsClass}">${team.totalPoints}</span>
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

                    const maxPointsPerMinute = maxPointsPerMinuteByPosition[player.position];
                    const icon = drawPieSliceIcon(player.minutes, maxMinutes, player.points, maxPointsPerMinute);

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

                //changed to If isZoomed to remove the intermediate click that zooms the picture before displaying the player card. Change back to revert to the tap-tap behavior
                if (isZoomed) {
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

        // Get current user ID from localStorage
        const currentUserId = localStorage.getItem('userId');

        // Add swap button if player is not in current user's squad
        if (player.userId !== parseInt(currentUserId)) {
            const swapButton = document.createElement('button');
            swapButton.className = 'swap-player-btn';
            swapButton.textContent = 'Propose Swap';
            swapButton.addEventListener('click', () => initiateSwap(player, playerCardContainer));
            nameScoreContainer.appendChild(swapButton);
        }

        const name = document.createElement('h3');
        name.textContent = player.webName || 'Unknown';

        // Add position
        const positionItem = document.createElement('div');
        positionItem.className = 'player-card-position';
        positionItem.textContent = player.positionName || 'N/A';

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

        // Create swap players container (initially hidden)
        const swapPlayersContainer = document.createElement('div');
        swapPlayersContainer.className = 'swap-players-container';
        swapPlayersContainer.style.display = 'none';

        // Assemble the card
        playerCardContainer.appendChild(cardHeader);
        playerCardContainer.appendChild(statsContainer);
        playerCardContainer.appendChild(swapPlayersContainer);

        return playerCardContainer;
    }

    async function initiateSwap(targetPlayer, playerCardContainer) {
        const currentUserId = localStorage.getItem('userId');
        const leagueId = document.getElementById('leagueDropdown').value;

        // Find the swap players container
        const swapPlayersContainer = playerCardContainer.querySelector('.swap-players-container');

        // Show loading state
        swapPlayersContainer.style.display = 'block';
        swapPlayersContainer.innerHTML = '<div class="loading-spinner">Loading your players...</div>';

        try {
            // Instead of making a new API call, filter current players from the page
            // Get all player data from the DOM
            const myPlayers = [];
            const playerRows = document.querySelectorAll('.player-row');

            playerRows.forEach(row => {
                try {
                    const playerData = JSON.parse(row.getAttribute('data-player'));
                    // Only include players belonging to the current user
                    if (playerData && playerData.userId == currentUserId) {
                        myPlayers.push(playerData);
                    }
                } catch (error) {
                    console.error('Error parsing player data:', error);
                }
            });

            // Filter players by the same position
            const samePositionPlayers = myPlayers.filter(p => p.positionName === targetPlayer.positionName);

            if (samePositionPlayers.length === 0) {
                swapPlayersContainer.innerHTML = '<div class="no-players-message">You don\'t have any players in this position to swap.</div>';
                return;
            }

            // Create header for swap section
            swapPlayersContainer.innerHTML = `
            <h4>Select one of your players to swap:</h4>
            <div class="swap-players-list"></div>
        `;

            const swapPlayersList = swapPlayersContainer.querySelector('.swap-players-list');

            // Add each of the user's players as options
            samePositionPlayers.forEach(player => {
                const playerOption = document.createElement('div');
                playerOption.className = 'swap-player-option';

                playerOption.innerHTML = `
                <img src="https://resources.premierleague.com/premierleague/photos/players/40x40/p${player.photo ? player.photo.slice(0, -3) : '0'}png" 
                     alt="${player.webName}" class="player-photo">
                <span class="player-name">${player.webName}</span>
                <span class="player-score">${player.points || 0}</span>
            `;

                // Add click event to select this player for swap
                playerOption.addEventListener('click', () => confirmSwap(player, targetPlayer));

                swapPlayersList.appendChild(playerOption);
            });

            // Add cancel button
            const cancelButton = document.createElement('button');
            cancelButton.className = 'cancel-swap-btn';
            cancelButton.textContent = 'Cancel';
            cancelButton.addEventListener('click', () => {
                swapPlayersContainer.style.display = 'none';
            });

            swapPlayersContainer.appendChild(cancelButton);

        } catch (error) {
            console.error('Error finding your players:', error);
            swapPlayersContainer.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
        }
    }


    function confirmSwap(playerOut, playerIn) {
        // Create confirmation dialog
        const confirmation = confirm(`Are you sure you want to request a trade of ${playerOut.webName} for ${playerIn.webName}?`);

        if (confirmation) {
            // User confirmed, send the swap request
            proposeSwap(playerOut, playerIn);
        } else {
            // User cancelled, just hide the swap container
            const swapPlayersContainer = document.querySelector('.swap-players-container');
            if (swapPlayersContainer) {
                swapPlayersContainer.style.display = 'none';
            }
        }
    }

    async function proposeSwap(playerOut, playerIn) {
        try {
            // Prepare swap request payload
            const payload = {
                fromUserSquadId: playerOut.squadId,
                toUserSquadId: playerIn.squadId,
                playerInId: playerIn.id,
                playerOutId: playerOut.id
            };

            // Send the swap request
            const response = await fetch(`${config.backendUrl}/Transfers/propose-swap`, addAuthHeader({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }));

            if (!response.ok) {
                throw new Error('Failed to propose swap');
            }

            // Display success message and close the card
            alert('Swap proposal sent successfully!');
            document.querySelector('.player-detail-card')?.remove();
            document.getElementById('player-card-overlay')?.remove();

        } catch (error) {
            console.error('Error proposing swap:', error);
            alert(`Error proposing swap: ${error.message}`);
        }
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
            const response = await fetch(`${config.backendUrl}/Leagues/byUser`, addAuthHeader());
            if (response.status === 401) {
                console.error('Authentication error: Unauthorized access (401)');
                // Redirect to the root site
                window.location.href = '/';
                return;
            }
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
                fetchAndDisplayRankings(leagues[0].id);
            }

            // Update league details when the selected league changes
            leagueDropdown.addEventListener('change', function () {
                fetchAndDisplayRankings(this.value);
                clearSquadTable();
            });
        } catch (error) {
            console.error('Error fetching leagues:', error);
        }
    }
    function clearSquadTable() {
        const squadTableHeader = document.getElementById('squadTableHeader');
        const squadTableRow = document.getElementById('squadTableRow');
        squadTableHeader.innerHTML = ''; // Clear existing headers
        squadTableRow.innerHTML = ''; // Clear existing row
    }
        
    async function fetchAndDisplayRankings(leagueId) {
        try {
            const response = await fetch(`${config.backendUrl}/UserTeams/${leagueId}`, addAuthHeader());
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
    let maxPointsPerMinuteByPosition = {};

    function calculateGlobalMaxValues(players) {
        maxPointsPerMinuteByPosition = {};

        players.forEach(player => {
            if (player.minutes > maxMinutes) {
                maxMinutes = player.minutes;
            }
            const pointsPerMinute = player.points / player.minutes;
            if (!maxPointsPerMinuteByPosition[player.positionName]) {
                maxPointsPerMinuteByPosition[player.positionName] = 0;
            }
            if (pointsPerMinute > maxPointsPerMinuteByPosition[player.positionName]) {
                maxPointsPerMinuteByPosition[player.positionName] = pointsPerMinute;
            }
        });
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
                    //prizePointsPool += 75;
                    // Get 25 from second place
                    //prizePointsPool += 25;
                    // Get 50 from each middle position
                    prizePointsPool = 50 * (teamsCount - 1);
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
                        stats.prizePoints -= (75 + (50 * (tiedCount - 1))) / tiedCount;
                    } else if (isSecond) {
                        stats.prizePoints -= (25 + (50 * (tiedCount - 1))) / tiedCount;
                    } else {
                        stats.prizePoints -= 50;
                    }
                });

                currentPosition += tiedCount;
            });
        });

        return Object.values(userStats);
    }

    // Fetch users for dropdown
       

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
