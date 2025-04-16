import config from './config.js';
import { addAuthHeader } from './config.js';

let previousPlayerScores = {};
let refreshInterval;
const REFRESH_INTERVAL = 30000; // 60 seconds

document.addEventListener('DOMContentLoaded', async function () {
    // Fetch leagues for dropdown
    const currentUserId = localStorage.getItem('userId');
    let leagues = [];
    try {
        const respLeagues = await fetch(`${config.backendUrl}/Leagues/byUser`, addAuthHeader());
        if (respLeagues.status === 401) {
            console.error('Authentication error: Unauthorized access (401)');
            // Redirect to the root site
            window.location.href = '/';
            return;
        }
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
        const leagueId = leagueDropdown.value;
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
        const leagueId = leagueDropdown.value;
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

    /*
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

        // NEW: Call setupPlayerPhotoInteractions after updating the DOM
        setupPlayerPhotoInteractions();

        // Re-setup swipe functionality after DOM updates
        //setupSwipeInteraction();
    }
*/
    function createPlayerCard(player) {
        // Create container for player card with specified dimensions
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

        // Add position with CSS class
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

        // Append elements to card header in the desired order
        cardHeader.appendChild(photo);
        cardHeader.appendChild(nameScoreContainer);
        cardHeader.appendChild(closeButton);

        // Create stats container with grid layout for 2 columns
        const statsContainer = document.createElement('div');
        statsContainer.className = 'player-card-stats';

        // Add goalkeeper-specific stats
        if (player.position === 'GK') {
            // Goals conceded (GK only)
            const goalsConceededItem = document.createElement('div');
            goalsConceededItem.className = 'player-stat-item';

            const goalsConceededIcon = document.createElement('i');
            goalsConceededIcon.className = 'fa fa-futbol stat-icon';
            goalsConceededIcon.style.color = '#f9a825'; // Yellow color for goals conceded

            goalsConceededItem.appendChild(goalsConceededIcon);
            goalsConceededItem.appendChild(document.createTextNode(` ${player.goalsConceded || '0'}`));
            statsContainer.appendChild(goalsConceededItem);

            // Saves (GK only)
            const savesItem = document.createElement('div');
            savesItem.className = 'player-stat-item';

            const savesIcon = document.createElement('i');
            savesIcon.className = 'fa fa-hand-paper stat-icon';

            savesItem.appendChild(savesIcon);
            savesItem.appendChild(document.createTextNode(` ${player.saves || '0'}`));
            statsContainer.appendChild(savesItem);
        }

        // Create an array to hold only the relevant stat items for this player position
        const statItems = [];

        // Add goals scored for all positions
        statItems.push({
            iconType: 'fa',
            iconClass: 'fa fa-futbol',
            value: player.goalsScored || '0',
            label: ''
        });

        // Add assists for all positions with the custom SVG icon
        statItems.push({
            iconType: 'svg',
            svgContent: '<svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 14 14"><ellipse cx="7" cy="7" rx="7" ry="7" fill="transparent"></ellipse><g id="ic_assist" transform="translate(0 0)"><path id="Path_88" fill="currentColor" fill-rule="evenodd" d="M12.608 5.7c-.175.1-.377.209-.6.337-.156.09-.322.188-.493.3-.806.524-6.651 4.113-7.836 4.793s-3.035.929-3.565.016 1.029-1.952 1.948-3.055C3.11 6.833 4.48 5.461 4.48 5.461c-.088-.426.332-.712.494-.805a.607.607 0 0 1 .06-.03c-.117-.5.631-.929.631-.929l1.147-2.518a.231.231 0 0 1 .094-.105.236.236 0 0 1 .208-.013l1.024.424c.673.283-.769 1.89-.465 1.962a1.67 1.67 0 0 0 1.043-.273 2.826 2.826 0 0 0 .735-.614c.48-.56-.03-1.38.249-1.543.1-.054.287-.034.642.095 1.393.535 2.192 2.211 2.776 3.254.402.709.121.973-.51 1.334zm-8.018.693a.085.085 0 0 0-.075.022l-.631.62a.079.079 0 0 0 .04.135l3.227.669a.09.09 0 0 0 .058-.009l.981-.563a.081.081 0 0 0-.02-.15zm5.558-.418l-4.407-.844a.089.089 0 0 0-.075.023l-.628.618a.081.081 0 0 0 .041.137l3.99.807a.089.089 0 0 0 .058-.009l1.041-.581a.082.082 0 0 0-.02-.151zM3.807 12.1a.083.083 0 0 1-.039.1l-.734.422a.082.082 0 0 1-.1-.016l-.546-.579a.083.083 0 0 1-.016-.063 5.312 5.312 0 0 0 1.3-.462zm1.668-.92a.083.083 0 0 1-.039.1l-.736.42a.082.082 0 0 1-.1-.016l-.41-.484c.3-.177.693-.415 1.15-.691zm5.687-3.4a.084.084 0 0 1-.039.1l-.735.422a.082.082 0 0 1-.1-.016l-.488-.5c.441-.27.839-.516 1.158-.716zM12.5 6.132c.1-.052.184-.1.268-.154L12.9 5.9l.222.754a.084.084 0 0 1-.039.1l-.734.422a.082.082 0 0 1-.1-.016L11.7 6.6c.144-.093.294-.182.466-.281.118-.068.224-.129.334-.187z"></path></g></svg>',
            value: player.assists || '0',
            label: '',
            margin: '5px',
            color: '#555'
        });

        // Add clean sheets only for defensive positions (GK, DEF, WB, DM)
        const defensivePositions = ['GK', 'DEF', 'WB', 'DM'];
        if (defensivePositions.includes(player.position)) {
            statItems.push({
                iconType: 'fa',
                iconClass: 'fa fa-shield-alt',
                value: player.cleanSheets || '0',
                label: ''
            });
        }

        // Add minutes played for all positions
        statItems.push({
            iconType: 'fa',
            iconClass: 'fa fa-clock',
            value: player.minutesPlayed || '0',
            label: ''
        });

        // Add cards for all positions
        statItems.push({
            iconType: 'fa',
            iconClass: 'fa fa-square yellow-card',
            value: player.yellowCards || '0',
            label: ''
        });

        statItems.push({
            iconType: 'fa',
            iconClass: 'fa fa-square red-card',
            value: player.redCards || '0',
            label: ''
        });

        // Add own goals for all positions with red football icon
        statItems.push({
            iconType: 'fa',
            iconClass: 'fa fa-futbol',
            value: player.ownGoals || '0',
            label: '',
            color: '#d32f2f'
        });

        // Create each stat item - they'll naturally flow into the grid layout
        statItems.forEach(item => {
            const statItem = document.createElement('div');
            statItem.className = 'player-stat-item';

            // Create icon based on the type (Font Awesome or SVG)
            let iconElement;

            if (item.iconType === 'svg') {
                // Create a span to hold the SVG
                iconElement = document.createElement('span');
                iconElement.className = 'stat-icon';
                iconElement.innerHTML = item.svgContent;

                // Apply margin if specified
                if (item.margin) {
                    iconElement.style.marginLeft = item.margin;
                    iconElement.style.marginRight = '18px';
                }

                // Style the SVG
                const svgElement = iconElement.querySelector('svg');
                if (svgElement) {
                    svgElement.style.verticalAlign = 'middle';
                    // Set the fill color directly to #555 instead of using currentColor
                    svgElement.querySelector('path').setAttribute('fill', '#555');
                }
            } else {
                // Create Font Awesome icon
                iconElement = document.createElement('i');
                iconElement.className = `${item.iconClass} stat-icon`;

                // Add colors for specific icons
                if (item.iconClass.includes('yellow-card')) {
                    iconElement.style.color = '#f9a825'; // Yellow color for yellow cards
                } else if (item.iconClass.includes('red-card')) {
                    iconElement.style.color = '#d32f2f'; // Red color for red cards
                } else if (item.color) {
                    iconElement.style.color = item.color; // Custom color if specified
                }
            }

            statItem.appendChild(iconElement);
            statItem.appendChild(document.createTextNode(` ${item.value} ${item.label}`));

            statsContainer.appendChild(statItem);
        });

        // Assemble the card
        playerCardContainer.appendChild(cardHeader);
        playerCardContainer.appendChild(statsContainer);

        return playerCardContainer;
    }


    // Handle player photo zoom and card display
    // Modify the createUserTeamCards function to call setupPlayerPhotoInteractions
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

    // Setup the player photo interactions
    setupPlayerPhotoInteractions();
    
    // Setup the header click interactions
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

    // Update the setupPlayerPhotoInteractions function for debugging
    function setupPlayerPhotoInteractions() {
        console.log('Setting up player photo interactions...');

        // Get all player photos
        const playerPhotos = document.querySelectorAll('.player-photo');
        console.log(`Found ${playerPhotos.length} player photos`);

        // Remove any existing event listeners to prevent duplication
        playerPhotos.forEach(photo => {
            // Create a new copy of the photo element to remove old event listeners
            const newPhoto = photo.cloneNode(true);
            photo.parentNode.replaceChild(newPhoto, photo);
        });

        // Add click/tap event listeners to all player photos
        document.querySelectorAll('.player-photo').forEach(photo => {
            let isZoomed = false;

            photo.addEventListener('click', (e) => {
                console.log('Photo clicked');
                e.stopPropagation();

                if (isZoomed) {
                    console.log('Zooming photo');
                    // First click: zoom the photo by 20%
                    photo.style.transform = 'scale(1.4)';
                    photo.style.zIndex = '100';
                    isZoomed = true;

                    // Add click outside listener to revert zoom
                    const handleOutsideClick = (event) => {
                        if (event.target !== photo) {
                            console.log('Outside click detected, reverting zoom');
                            photo.style.transform = '';
                            photo.style.zIndex = '';
                            isZoomed = false;
                            document.removeEventListener('click', handleOutsideClick);
                        }
                    };

                    // Delay adding the outside click handler to prevent immediate triggering
                    setTimeout(() => {
                        document.addEventListener('click', handleOutsideClick);
                    }, 10);

                } else {
                    console.log('Creating player card');
                    // Second click: show player card
                    const playerRow = photo.closest('.player-row');

                    // Get the full player data from the data attribute
                    let player;
                    try {
                        player = JSON.parse(playerRow.getAttribute('data-player'));
                        console.log('Retrieved player data:', player);
                    } catch (error) {
                        console.error('Error parsing player data:', error);
                        // Fallback to simplified player object if JSON parsing fails
                        const playerName = playerRow.querySelector('.player-name').textContent;
                        const playerScore = playerRow.querySelector('.player-score').textContent;
                        const position = playerRow.closest('.position-group').querySelector('.position-label').textContent;

                        player = {
                            webName: playerName,
                            score: playerScore,
                            position: position,
                            photo: photo.src.split('p')[1]?.split('.')[0] + '.jpg',
                            goalsScored: 0,
                            assists: 0,
                            cleanSheets: 0,
                            minutesPlayed: 0,
                            yellowCards: 0,
                            redCards: 0,
                            ownGoals: 0,
                            goalsConceded: 0,
                            saves: 0
                        };
                    }

                    // Create overlay to darken the background
                    const overlay = document.createElement('div');
                    overlay.id = 'player-card-overlay';
                    overlay.className = 'player-card-overlay';
                    overlay.addEventListener('click', () => {
                        console.log('Overlay clicked, removing card');
                        overlay.remove();
                        document.querySelector('.player-detail-card')?.remove();
                    });

                    // Create and position the player card
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

    const cardsToggle = document.getElementById('cardsToggle');
    let cardsExpanded = true; // Start with cards expanded

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
});

