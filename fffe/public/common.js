import config from './config.js';
import { addAuthHeader } from './config.js';

export async function fetchLeagues(leagueDropdown) {
    try {
        let leagueId = localStorage.getItem('leagueId');

        const response = await fetch(`${config.backendUrl}/Leagues/byUser`, addAuthHeader());
        if (response.status === 401) {
            console.error('Authentication error: Unauthorized access (401)');
            // Redirect to the root site
            window.location.href = '/';
            return;
        }
        if (response.status === 404) {
            // Redirect to LeagueAdmin.html if no leagues are found
            window.location.href = 'LeagueAdmin.html';
            return;
        }
        if (!response.ok) {
            console.error('Failed to fetch leagues:', response.status, response.statusText);
            return;
        }
        const leagues = await response.json();
                
        leagueDropdown.innerHTML = '';
        leagues.forEach(league => {
            const option = document.createElement('option');
            option.value = league.id;
            option.text = league.name;
            leagueDropdown.appendChild(option);
        });

        if (leagues.length > 0) {
            leagueDropdown.value = leagues[0].id;
            if (!leagueId) {
                leagueId = leagues[0].id;
                localStorage.setItem('leagueId', leagueId);
                console.log(`LeagueId not found in localStorage. Using first league from API: ${leagueId}`);
            } else {
                // If leagueId exists, set the dropdown to that value
                leagueDropdown.value = leagueId;
            }
        }        
    } catch (error) {
        console.error('Error fetching leagues:', error);
    }
}

export async function fetchDraftPeriods(draftPeriodDropdown) {
    try {
        const response = await fetch(`${config.backendUrl}/DraftPeriods`, addAuthHeader());
        if (response.status === 401) {
            console.error('Authentication error: Unauthorized access (401)');
            window.location.href = '/';
            return;
        }
        if (!response.ok) {
            console.error('Failed to fetch draft periods:', response.status, response.statusText);
            return;
        }
        const draftPeriods = await response.json();

        [draftPeriodDropdown].forEach(dropdown => {
            if (!dropdown) return;

            dropdown.innerHTML = '';
            draftPeriods.forEach(period => {
                const option = document.createElement('option');
                option.value = period.id;
                option.text = period.name || `Draft ${period.id}`;
                option.setAttribute('data-start-date', period.startDate);
                option.setAttribute('data-end-date', period.endDate);
                dropdown.appendChild(option);
            });
        });

        if (draftPeriods.length > 0 && draftPeriodDropdown) {
            const now = new Date();
            let selectedPeriod = null;

            // Find the period where startDate <= now <= endDate
            for (const period of draftPeriods) {
                const start = new Date(period.startDate);
                const end = new Date(period.endDate);
                if (start <= now && now <= end) {
                    selectedPeriod = period;
                    break;
                }
            }

            // If none found, select the one with the latest endDate
            if (!selectedPeriod) {
                selectedPeriod = draftPeriods.reduce((latest, period) => {
                    return new Date(period.endDate) > new Date(latest.endDate) ? period : latest;
                }, draftPeriods[0]);
            }

            draftPeriodDropdown.value = selectedPeriod.id;
        }
    } catch (error) {
        console.error('Error fetching draft periods:', error);
    }
}

const positionsCache = { positions: null };

export async function fetchPositions() {
    if (positionsCache.positions) {
        console.log('Using cached positions data');
        return positionsCache.positions;
    }

    console.log('Fetching positions data');
    try {
        const response = await fetch(`${config.backendUrl}/PlayerPositions/positions`, addAuthHeader());
        if (!response.ok) {
            console.error('Failed to fetch positions:', response.status, response.statusText);
            return null;
        }
        const positions = await response.json();
        positionsCache.positions = positions; // Cache the positions for future use
        return positions;
    } catch (error) {
        console.error('Error fetching positions:', error);
        return null;
    }
}

export function createPlayerCard(player) {
    const playerCardContainer = document.createElement('div');
    playerCardContainer.className = 'player-detail-card';

    const cardHeader = document.createElement('div');
    cardHeader.className = 'player-card-header';

    const photo = document.createElement('img');
    photo.className = 'player-card-photo';
    photo.src = player.photo
        ? `https://resources.premierleague.com/premierleague25/photos/players/40x40/${player.photo.slice(0, -3)}png`
        : 'https://resources.premierleague.com/premierleague25/photos/players/40x40/0.png';
    photo.alt = player.webName || 'Player';

    const nameScoreContainer = document.createElement('div');
    nameScoreContainer.className = 'player-card-name-score';

    const name = document.createElement('h3');
    name.textContent = player.webName || 'Unknown';

    const positionItem = document.createElement('div');
    positionItem.className = 'player-card-position';
    positionItem.textContent = player.position || player.positionName || 'N/A';

    const score = document.createElement('div');
    score.className = 'player-card-score';
    score.textContent = player.score || player.points || '0';

    nameScoreContainer.appendChild(name);
    nameScoreContainer.appendChild(positionItem);
    nameScoreContainer.appendChild(score);

    const closeButton = document.createElement('button');
    closeButton.className = 'player-card-close';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        playerCardContainer.remove();
        document.getElementById('player-card-overlay').remove();
    });

    cardHeader.appendChild(photo);
    cardHeader.appendChild(nameScoreContainer);
    cardHeader.appendChild(closeButton);

    const statsContainer = document.createElement('div');
    statsContainer.className = 'player-card-stats';

    if (!player.position) player.position = player.positionName;

    if (player.position === 'GK') {
        const goalsConcededItem = document.createElement('div');
        goalsConcededItem.className = 'player-stat-item';

        const goalsConcededIcon = document.createElement('i');
        goalsConcededIcon.className = 'fa fa-futbol stat-icon';
        goalsConcededIcon.style.color = '#f9a825';

        goalsConcededItem.appendChild(goalsConcededIcon);
        goalsConcededItem.appendChild(document.createTextNode(` ${player.goalsConceded || '0'}`));
        statsContainer.appendChild(goalsConcededItem);

        const savesItem = document.createElement('div');
        savesItem.className = 'player-stat-item';

        const savesIcon = document.createElement('i');
        savesIcon.className = 'fa fa-hand-paper stat-icon';

        savesItem.appendChild(savesIcon);
        savesItem.appendChild(document.createTextNode(` ${player.saves || '0'}`));
        statsContainer.appendChild(savesItem);
    }

    const statItems = [
        { iconClass: 'fa fa-futbol', value: player.goalsScored || '0', label: '' },
        { iconClass: 'fa fa-hands-helping', value: player.assists || '0', label: '' }, 
        { iconClass: 'fa fa-shield-alt', value: player.cleanSheets || '0', label: '' },
        { iconClass: 'fa fa-clock', value: player.minutesPlayed || player.minutes || '0', label: '' },
        { iconClass: 'fa fa-square yellow-card', value: player.yellowCards || '0', label: '' },
        { iconClass: 'fa fa-square red-card', value: player.redCards || '0', label: '' },
    ];

    statItems.forEach((item) => {
        const statItem = document.createElement('div');
        statItem.className = 'player-stat-item';

        const iconElement = document.createElement('i');
        iconElement.className = `${item.iconClass} stat-icon`;

        statItem.appendChild(iconElement);
        statItem.appendChild(document.createTextNode(` ${item.value} ${item.label}`));

        statsContainer.appendChild(statItem);
    });

    playerCardContainer.appendChild(cardHeader);
    playerCardContainer.appendChild(statsContainer);

    return playerCardContainer;
}

export function setupPlayerPhotoInteractions() {
    // Get all player photos
    const playerPhotos = document.querySelectorAll('.player-photo');
    console.log(`Found ${playerPhotos.length} player photos`);

    // Remove any existing event listeners to prevent duplication
    playerPhotos.forEach(photo => {
        const newPhoto = photo.cloneNode(true);
        photo.parentNode.replaceChild(newPhoto, photo);
    });

    // Add click/tap event listeners to all player photos
    document.querySelectorAll('.player-photo').forEach(photo => {
        photo.addEventListener('click', (e) => handlePlayerCardClick(e, photo));
        photo.style.cursor = 'pointer'; // Make it visually clear that photos are clickable
    });

    // Get all player name labels
    const playerNames = document.querySelectorAll('.player-name, .player-name-long');
    console.log(`Found ${playerNames.length} player names`);

    // Add click/tap event listeners to all player names
    playerNames.forEach(playerName => {
        playerName.addEventListener('click', (e) => handlePlayerCardClick(e, playerName));
        playerName.style.cursor = 'pointer'; // Make it visually clear that names are clickable
    });
}


function handlePlayerCardClick(event, element) {
    console.log('Player element clicked');
    event.stopPropagation();

    console.log('Creating player card');
    // Check for the closest element with either 'player-row' or 'player-grid' class
    const playerElement = element.closest('.player-row, .player-grid');

    if (!playerElement) {
        console.error('No valid player element found');
        return;
    }

    // Get the full player data from the data attribute
    let player;
    try {
        player = JSON.parse(playerElement.getAttribute('data-player'));
        console.log('Retrieved player data:', player);
    } catch (error) {
        console.error('Error parsing player data:', error);
        // Fallback to simplified player object if JSON parsing fails
        const playerName = playerElement.querySelector('.player-name').textContent;
        const playerScore = playerElement.querySelector('.player-score-narrow')?.textContent || '0';
        const position = playerElement.closest('.position-group')?.querySelector('.position-label')?.textContent || 'Unknown';

        player = {
            webName: playerName,
            score: playerScore,
            position: position,
            photo: element.src.split('p')[1]?.split('.')[0] + '.jpg',
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
}
