import { setupPlayerPhotoInteractions } from './common.js';
import config from './config.js';
import { addAuthHeader } from './config.js';
import { fetchLeagues } from './common.js';
import { fetchDraftPeriods } from './common.js';
import { fetchPositions } from './common.js';

let draftPeriodStartDate = null;
let isDraftInProgress = false;
let draftCheckInterval = null;
let currentLeague = null;
let positions = null;

document.addEventListener('DOMContentLoaded', async function () {

    let draftPeriodId;
    let squadId;  // Remove the URL parameter assignment
    let squadPlayers = [];
    const currentUserId = localStorage.getItem('userId');
    let draftPeriodDropdown = document.getElementById('draftPeriodDropdown');
    const leagueDropdown = document.getElementById('leagueDropdown');
    let leagueId = localStorage.getItem('leagueId');

    let allPlayers = [];
    let otherUsersSquadPlayers = [];
    let viewMode = 'all'; // 'squad' or 'all'

    // Add this function to fetch all players (both available and from other users)
    async function fetchAllPlayers() {
        try {
            // Fetch only available players
            const availableResponse = await fetch(`${config.backendUrl}/PlayerPositions/available-players-with-positions/${leagueId}/${draftPeriodId}`, addAuthHeader());

            if (!availableResponse.ok) {
                console.error('Failed to fetch available players:',
                    availableResponse.status, availableResponse.statusText);
                return;
            }

            // Store available players only
            allPlayers = await availableResponse.json();
            otherUsersSquadPlayers = []; // Clear this since we don't need it anymore

        } catch (error) {
            console.error('Error fetching available players:', error);
        }
    }

    function displayAllPlayersView() {

        // Get the existing container
        const allPlayersContainer = document.getElementById('allPlayersContainer');
        if (!allPlayersContainer) {
            console.error('allPlayersContainer not found in HTML');
            return;
        }

        // Show or hide the container based on view mode
        allPlayersContainer.style.display = viewMode === 'all' ? 'block' : 'none';

        if (viewMode === 'all') {
            // Clear existing sections but keep the search box
            const searchBox = document.getElementById('playerSearchBox');
            searchBox.placeholder = 'Search players...';           
            searchBox.addEventListener('input', filterPlayers);


            allPlayersContainer.innerHTML = '';
            if (searchBox) {
                allPlayersContainer.appendChild(searchBox);
            }

            // Populate the sections with players
            positions.forEach(position => {
                const sectionId = `all-${position.name}`;
                let section = document.createElement('div');
                section.className = 'section position-section-draft';
                section.id = sectionId;
                section.setAttribute('data-position', position.name);

                // Container for players
                const playersContainer = document.createElement('div');
                playersContainer.className = 'players';
                section.appendChild(playersContainer);

                // Add players to the section
                let positionPlayers = allPlayers.filter(player => player.positionName === position.name);

                // Sort players by points in descending order
                positionPlayers.sort((a, b) => {
                    const pointsA = a.points || 0;
                    const pointsB = b.points || 0;
                    return pointsB - pointsA;
                });

                positionPlayers.forEach(player => {
                    const playerDiv = createPlayerDivForAllView(player);
                    playersContainer.appendChild(playerDiv);
                });

                allPlayersContainer.appendChild(section);
            });

            // Call setupPlayerPhotoInteractions to add click handlers
            setupPlayerPhotoInteractions();
        }
    }

    function filterPlayers() {
        const searchText = document.getElementById('playerSearchBox').value.toLowerCase();

        // Normalize the search text to remove diacritical marks
        const normalizedSearchText = searchText.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        // Filter players based on the normalized search text
        const filteredPlayers = allPlayers.filter(player => {
            const fieldsToSearch = [
                player.firstName,
                player.secondName,
                player.webName,
                player.positionName,
                player.teamName
            ];

            // Normalize each field and check if it includes the search text
            return fieldsToSearch.some(field =>
                field && field.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(normalizedSearchText)
            );
        });

        // Update the displayed players
        positions.forEach(position => {
            const sectionId = `all-${position.name}`;
            const section = document.getElementById(sectionId);
            const playersContainer = section.querySelector('.players');

            // Clear existing content
            playersContainer.innerHTML = '';

            // Filter players by position
            let positionPlayers = filteredPlayers.filter(player => player.positionName === position.name);

            // Sort players by points in descending order
            positionPlayers.sort((a, b) => {
                const pointsA = a.points || 0;
                const pointsB = b.points || 0;
                return pointsB - pointsA;
            });

            // Add players to the section
            positionPlayers.forEach(player => {
                const playerDiv = createPlayerDivForAllView(player);
                playersContainer.appendChild(playerDiv);
            });

            // Hide or show section based on whether there are players
            section.style.display = positionPlayers.length > 0 ? 'block' : 'none';
        });

        // Call setupPlayerPhotoInteractions to reapply click handlers
        setupPlayerPhotoInteractions();
    }

    function createPlayerDivForAllView(player) {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-grid-for-draft';  // Removed isInOtherSquad class
        playerDiv.setAttribute('data-player', JSON.stringify(player));

        // Format score and other player info as before...

        // Remove squad info - players shown are always available
        playerDiv.innerHTML = `
        <button class="add-player-button" data-player-id="${player.id}" data-position="${player.positionName}">+</button>
        <img src="${config.premierLeagueImageUrl}${player.photo.slice(0, -3)}png" alt="Player Photo" class="player-photo">
        <span class="player-name">${player.webName}</span>
        ${getPlayerStatusIcon(player)}
    `;
        return playerDiv;
    }

    /* this version shows all squads
    async function fetchAndCreateUserTeamCards() {
        try {
            // Fetch squad details
            const response = await fetch(`${config.backendUrl}/UserSquads/ByLeague/${leagueId}`, addAuthHeader());

            if (!response.ok) {
                console.error('Failed to fetch league squad players:', response.status, response.statusText);
                return;
            }

            const squads = await response.json();

            // Fetch player details for the league
            const playersResponse = await fetch(`${config.backendUrl}/PlayerPositions/league-user-squad-players/${leagueId}`, addAuthHeader());
            if (!playersResponse.ok) {
                console.error('Failed to fetch league squad players:', playersResponse.status, playersResponse.statusText);
                return;
            }

            const players = await playersResponse.json();

            // Create user team cards
            createUserTeamCards(players, squads);

            // Create drafted players list
            createDraftedPlayersList(players);
        } catch (error) {
            console.error('Error fetching league squad players:', error);
        }
    }*/

    /*this version shows current player's squad*/
    let squads = []; // Global variable to store squads

    async function fetchAndCreateUserTeamCards() {
        try {
            console.log('Current User ID:', currentUserId); // Log the current user ID

            // Fetch squad details
            const response = await fetch(`${config.backendUrl}/UserSquads/ByLeague/${leagueId}`, addAuthHeader());

            if (!response.ok) {
                console.error('Failed to fetch league squad players:', response.status, response.statusText);
                return;
            }

            squads = await response.json(); // Store squads globally
            console.log('All Squads:', squads); // Log all squads

            // Fetch player details for the league
            const playersResponse = await fetch(`${config.backendUrl}/PlayerPositions/league-user-squad-players/${leagueId}`, addAuthHeader());
            if (!playersResponse.ok) {
                console.error('Failed to fetch league squad players:', playersResponse.status, playersResponse.statusText);
                return;
            }

            const players = await playersResponse.json();

            // Filter players to only include the current user's squad
            const currentUserSquad = squads.find(squad => {
                console.log('Comparing squad userId:', squad.userId, 'with currentUserId:', currentUserId);
                return squad.userId.toString() === currentUserId.toString(); // Convert both to strings for comparison
            });

            if (!currentUserSquad) {
                console.warn('No squad found for the current user.');
                console.log('Available squad user IDs:', squads.map(s => s.userId));
                return;
            }

            console.log('Found current user squad:', currentUserSquad);

            const currentUserPlayers = players.filter(player => player.squadId === currentUserSquad.id);
            console.log('Current user players:', currentUserPlayers);

            // Create user team cards for the current user's squad
            createUserTeamCards(currentUserPlayers, [currentUserSquad]);

            // Ensure the container is visible
            const userTeamCardsContainer = document.getElementById('userTeamCardsContainer');
            userTeamCardsContainer.style.display = 'flex';

            createDraftedPlayersList(players);
        } catch (error) {
            console.error('Error fetching league squad players:', error);
        }
    }

    function createDraftedPlayersList(players) {
        const draftedPlayersContainer = document.getElementById('draftedPlayersContainer');
        if (!draftedPlayersContainer) return;

        // Clear the container
        draftedPlayersContainer.innerHTML = '';

        // Sort players by draftId in descending order
        const sortedPlayers = players.sort((a, b) => b.draftId - a.draftId);

        // Create player elements
        sortedPlayers.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'drafted-player';

            playerDiv.innerHTML = `
            <span class="squad-name">${player.squadName}</span>
            <img src="${config.premierLeagueImageUrl}${player.photo.slice(0, -3)}png" 
                 alt="${player.webName}" class="player-photo">
            <span class="player-name">${player.webName}</span>
            
        `;

            draftedPlayersContainer.appendChild(playerDiv);
        });
    }

    function createUserTeamCards(players, squads) {
        const userTeamCardsContainer = document.getElementById('userTeamCardsContainer');
        if (!userTeamCardsContainer) return;

        // Clear the container
        userTeamCardsContainer.innerHTML = '';

        // Group players by squadId
        const userTeams = {};

        players.forEach(player => {
            if (!userTeams[player.squadId]) {
                const squad = squads.find(s => s.id === player.squadId);
                userTeams[player.squadId] = {
                    username: squad?.squadName || `Squad ${player.squadId}`,
                    squadName: player.squadName || `Squad ${player.squadId}`,
                    squadId: player.squadId,
                    totalPoints: 0,
                    playerCount: 0,
                    players: []
                };
            }

            userTeams[player.squadId].players.push({
                ...player,
                webName: player.webName || player.displayName || 'Unknown',
                position: player.positionName,
                teamName: player.teamName,
                score: player.points || 0
            });

            userTeams[player.squadId].playerCount += 1;
            userTeams[player.squadId].totalPoints += (player.points || 0);
        });

        // Create cards for each team
        Object.values(userTeams).forEach(team => {
            const card = createTeamCard(team);
            userTeamCardsContainer.appendChild(card);
        });

        // Setup player photo interactions
        setupPlayerPhotoInteractions();
    }

    function createTeamCard(team) {
        const card = document.createElement('div');
        card.className = 'user-team-card expanded'; // Always expanded in draft view
        card.setAttribute('data-squad-id', team.squadId);

        // Create card header with just username and total points
        const header = document.createElement('div');
        header.className = 'user-team-card-header2';
        header.innerHTML = `
        <div class="header-top">
            <h3 title="${team.username}">${team.username}</h3>
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

                const positionLabel = document.createElement('span');
                positionLabel.className = 'position-label';
                positionLabel.textContent = position;
                positionGroup.appendChild(positionLabel);

                playersByPosition[position].forEach(player => {
                    const playerRow = document.createElement('div');
                    playerRow.className = 'player-row';
                    playerRow.setAttribute('data-player', JSON.stringify(player));

                    playerRow.innerHTML = `
                    <img src="${config.premierLeagueImageUrl}${player.photo.slice(0, -3)}png" 
                         alt="${player.webName}" class="player-photo">
                    <div class="player-name">${player.webName}</div>
                `;

                    positionGroup.appendChild(playerRow);
                });

                card.appendChild(positionGroup);
            }
        });

        return card;
    }

    let previousDraftRound = null;
    let previousDraftUserId = null;

    async function checkForActiveDraft() {
        if (!leagueId || !draftPeriodId) return false;

        try {
            const response = await fetch(`${config.backendUrl}/Leagues/${leagueId}`, addAuthHeader());

            if (!response.ok) {
                console.error('Failed to fetch league details:', response.status, response.statusText);
                return false;
            }

            const league = await response.json();
            currentLeague = league;

            const now = new Date();
            const draftStart = new Date(league.draftStartDate);
            const draftEnd = new Date(league.draftEndDate);

            // Check if there is an active draft
            isDraftInProgress = (
                now >= draftStart &&
                now <= draftEnd &&
                league.nextDraftPeriodId == draftPeriodId
            );

            // Check if currentDraftRound or currentDraftUserId has changed
            if (
                league.currentDraftRound !== previousDraftRound ||
                league.currentDraftUserId !== previousDraftUserId
            ) {
                console.log('Draft state has changed:');
                console.log(`Previous Round: ${previousDraftRound}, Current Round: ${league.currentDraftRound}`);
                console.log(`Previous User ID: ${previousDraftUserId}, Current User ID: ${league.currentDraftUserId}`);

                // Update the previous values
                previousDraftRound = league.currentDraftRound;
                previousDraftUserId = league.currentDraftUserId;

                // Call fetchAndCreateUserTeamCards to update the UI
                await fetchAndCreateUserTeamCards();
            }

            // Update UI based on draft status
            updateUIForDraft(league);

            return isDraftInProgress;
        } catch (error) {
            console.error('Error checking for active draft:', error);
            return false;
        }
    }

    function updateUIForDraft(league) {
        const draftMessageContainer = document.getElementById('draftMessageContainer') || createDraftMessageContainer();

        if (!isDraftInProgress) {
            // No active draft
            draftMessageContainer.style.display = 'none';
            enableAllButtons();
            if (draftCheckInterval) {
                clearInterval(draftCheckInterval);
                draftCheckInterval = null;
            }
            return;
        }

        // There is an active draft
        draftMessageContainer.style.display = 'block';

        // Look up the squad name for the currentDraftUserId
        const currentDraftSquad = squads.find(squad => squad.userId.toString() === league.currentDraftUserId.toString());
        const squadName = currentDraftSquad ? currentDraftSquad.squadName : `User ID: ${league.currentDraftUserId}`;

        if (league.currentDraftUserId.toString() === currentUserId) {
            // Current user's turn in the draft
            draftMessageContainer.innerHTML = `
            <div class="draft-message your-turn">
                <div class="your-turn-inline">
                    <p>It's your turn to draft!</p>
                </div>
            </div>
        `;
            enableAllButtons();
        } else {
            // Waiting for another user - display squad name
            draftMessageContainer.innerHTML = `
            <div class="draft-message waiting">
                <div class="draft-message-inline">                    
                    <p>Waiting for squad: ${squadName}</p>
                    <div class="loader"></div>
                </div>
            </div>
        `;
            disableAllButtons();

            // Set up polling for draft status changes
            if (!draftCheckInterval) {
                draftCheckInterval = setInterval(checkForActiveDraft, 5000);
            }
        }
    }

    // Create a container for draft messages if it doesn't exist
    function createDraftMessageContainer() {
        // Check if container already exists
        const existingContainer = document.getElementById('draftMessageContainer');
        if (existingContainer) {
            return existingContainer;
        }

        const container = document.createElement('div');
        container.id = 'draftMessageContainer';
        container.className = 'draft-message-container';

        // Find the team-layout element
        const teamLayout = document.querySelector('.team-layout');

        // Insert the container before the team layout
        if (teamLayout) {
            teamLayout.parentNode.insertBefore(container, teamLayout);
        } else {
            // Fallback if team-layout is not found
            const draftContainer = document.getElementById('draftContainer');
            if (draftContainer) {
                draftContainer.parentNode.insertBefore(container, draftContainer);
            }
        }
        return container;
    }

    function disableAllButtons() {
        const buttons = document.querySelectorAll('button:not(.confirm-draft-btn)');
        buttons.forEach(button => {
            button.disabled = true;
            button.classList.add('disabled-during-draft');
        });
    }

    function enableAllButtons() {
        const buttons = document.querySelectorAll('button.disabled-during-draft');
        buttons.forEach(button => {
            button.disabled = false;
            button.classList.remove('disabled-during-draft');
        });
    }

    // Function to advance the draft
    async function advanceDraft() {
        if (!currentLeague || !leagueId) return;

        try {
            const response = await fetch(`${config.backendUrl}/Leagues/${leagueId}/advance-draft`, addAuthHeader({
                method: 'POST'
            }));

            if (!response.ok) {
                console.error('Failed to advance draft:', response.status, response.statusText);
                alert('Failed to advance draft. Please try again.');
                return;
            }

            // Refresh league information to get updated draft data
            await checkForActiveDraft();

        } catch (error) {
            console.error('Error advancing draft:', error);
            alert('An error occurred while advancing the draft.');
        }
    }

    async function updateSquadId() {
        // Check URL parameters first
        const urlParams = new URLSearchParams(window.location.search);
        const urlSquadId = urlParams.get('id');

        if (urlSquadId) {
            squadId = urlSquadId;
        } else {
            // If no URL parameter, fetch from API
            squadId = await fetchSquadId();
        }
1    }

    async function fetchSquadId() {
        try {
            const response = await fetch(`${config.backendUrl}/UserSquads/ByLeagueDraftPeriodAndUser/${leagueId}/${draftPeriodId}`, addAuthHeader());

            if (!response.ok) {
                console.error('Failed to fetch squad ID:', response.status, response.statusText);
                return null;
            }
            const squad = await response.json();
            return squad.id;
        } catch (error) {
            console.error('Error fetching squad ID:', error);
            return null;
        }
    }

    async function fetchAndCreateSections() {
        try {
            const playerGrid = document.getElementById('playerGrid');
            playerGrid.innerHTML = '';

            // Set initial display style based on viewMode
            const teamLayout = document.querySelector('.team-layout');
            if (teamLayout) {
                teamLayout.style.display = viewMode === 'squad' ? 'grid' : 'none';
            }

            positions.forEach(position => {
                const section = document.createElement('div');
                section.className = 'section position-section';
                section.id = position.name;
                section.setAttribute('data-position', position.name);

                // Create sections but don't make them visible initially if we're in 'all' view
                if (viewMode === 'squad') {
                    section.style.display = 'block';
                } else {
                    section.style.display = 'none';
                }

                const squadPlayersDiv = document.createElement('div');
                squadPlayersDiv.className = 'players';
                section.appendChild(squadPlayersDiv);

                const addButton = document.createElement('button');
                addButton.className = 'add-button';
                addButton.dataset.position = position.name;
                addButton.innerText = 'Add';
                section.appendChild(addButton);

                const availablePlayersDiv = document.createElement('div');
                availablePlayersDiv.className = 'player-list';

                const textBox = document.createElement('input');
                textBox.type = 'text';
                textBox.placeholder = 'Search players...';
                availablePlayersDiv.appendChild(textBox);

                section.appendChild(availablePlayersDiv);
                playerGrid.appendChild(section);
            });
        } catch (error) {
            console.error('Error fetching positions:', error);
        }
    }

/*
    function getPlayerFormIndicator(player) {
        if (!player.form && player.form !== 0) return '';

        const form = parseFloat(player.form);
        let formClass;

        if (form < 3) {
            formClass = 'form-poor';
        } else if (form >= 3 && form < 4) {
            formClass = 'form-good';
        } else if (form >= 4 && form < 6) {
            formClass = 'form-very-good';
        } else {
            formClass = 'form-extraordinary';
        }

        return `<div class="player-form ${formClass}" title="Form: ${form}"><i class="player-form-icon fas"></i></div>`;
    }
    */
    // Also add this function for status icons (it might be useful too)
    function getPlayerStatusIcon(player) {
        if (!player.status) return '';

        switch (player.status.toLowerCase()) {
            case 'i':
                return `<div class="player-status status-injured" title="Injured"><i class="fas fa-medkit"></i></div>`;
            case 'd':
                return `<div class="player-status status-warning" title="Doubtful"><i class="fas fa-exclamation-triangle"></i></div>`;
            case 's':
                return `<div class="player-status status-suspended" title="Suspended"><i class="fas fa-ban"></i></div>`;
            case 'u':
                return `<div class="player-status status-unavailable" title="Unavailable"><i class="fas fa-times-circle"></i></div>`;
            default:
                return '';
        }
    }

    /*
    async function fetchAndDisplaySquadPlayers(squadId) {
        try {
            const response = await fetch(`${config.backendUrl}/PlayerPositions/user-squad-players/${squadId}`, addAuthHeader());

            if (!response.ok) {
                console.error('Failed to fetch squad players:', response.status, response.statusText);
                return;
            }
            squadPlayers = await response.json();

            // Find the maximum TotalScore in the squad for color scaling
            const maxScore = Math.max(...squadPlayers.map(player => player.points || 0));

            positions.forEach(position => {
                const section = document.getElementById(position.name);
                const playersDiv = section.querySelector('.players');
                const playerList = section.querySelector('.player-list');
                playersDiv.innerHTML = '';
                const filteredPlayers = squadPlayers.filter(player => player.positionName === position.name);
                filteredPlayers.forEach(player => {
                    // Get the score for this player (default to 0 if undefined)
                    const playerScore = player.points || 0;

                    // Format the score to display decimal only if needed
                    let formattedScore;
                    if (Number.isInteger(playerScore)) {
                        // If it's a whole number, don't show decimal
                        formattedScore = playerScore.toString();
                    } else {
                        // If it has a decimal, format to one decimal place
                        formattedScore = playerScore.toFixed(1);
                    }

                    // Check if the score has a decimal point and add appropriate class
                    const hasDecimal = formattedScore.includes(".");
                    const scoreClass = hasDecimal ? "player-score decimal" : "player-score";

                    // Calculate color based on the score (from red to green)
                    const colorPercent = maxScore > 0 ? (playerScore / maxScore) * 100 : 0;
                    const scoreColor = getScoreColor(colorPercent);

                    const playerDiv = document.createElement('div');
                    playerDiv.className = 'player-grid';
                    playerDiv.setAttribute('data-player', JSON.stringify(player));

                    playerDiv.innerHTML = `
                    <button class="remove-player-button" data-player-id="${player.id}" data-position="${position.name}">-</button>
                    <img src="${config.premierLeagueImageUrl}${player.photo.slice(0, -3)}png" alt="Player Photo" class="player-photo">
                <span class="player-name-long">${player.webName}</span>
                ${getPlayerStatusIcon(player)}
                <span class="${scoreClass}" style="color: ${scoreColor};">${formattedScore}</span>                                        
                ${getPlayerFormIndicator(player)}
                
            `;
                    playersDiv.appendChild(playerDiv);
                });

                const currentRows = filteredPlayers.length;
                for (let i = currentRows; i < position.maxInSquad; i++) {
                    const row = document.createElement('div');
                    row.className = 'player-row';
                    row.innerText = 'Empty';
                    playersDiv.appendChild(row);
                }

                const addButton = section.querySelector('.add-button');
                if (currentRows < position.maxInSquad) {
                    addButton.style.display = 'block';
                    playerList.style.display = 'none'; // Hide initially, will show when Add is clicked
                } else {
                    addButton.style.display = 'none';
                    playerList.style.display = 'none'; // Hide available players when position is filled
                }
            });

            // Call setupPlayerPhotoInteractions to add click handlers to all player photos and names
            setupPlayerPhotoInteractions();
        } catch (error) {
            console.error('Error fetching squad players:', error);
        }
    }
    
    // Helper function to calculate color based on score percentage
    function getScoreColor(percentage) {
        // Convert percentage to a value between 0 and 120
        // 0% = red (hue 0)
        // 50% = yellow (hue 60)
        // 100% = green (hue 120)
        const hue = Math.min(percentage * 1.2, 120);
        return `hsl(${hue}, 80%, 45%)`;
    }
*/
    async function fetchAndDisplayAvailablePlayers(position, leagueId, draftPeriodId) {
        try {
            const response = await fetch(`${config.backendUrl}/PlayerPositions/available-players-with-positions/${leagueId}/${draftPeriodId}`, addAuthHeader());

            if (!response.ok) {
                console.error('Failed to fetch available players:', response.status, response.statusText);
                return;
            }
            const players = await response.json();
            const filteredPlayers = players.filter(player => player.positionName === position);
            const section = document.getElementById(position);
            const playerList = section.querySelector('.player-list');
            const addButton = section.querySelector('.add-button');
            playerList.innerHTML = '';
            filteredPlayers.forEach(player => {
                const playerDiv = document.createElement('div');
                playerDiv.className = 'player-grid-for-draft';
                const isPlayerInSquad = squadPlayers.some(p => p.id === player.id);
                playerDiv.setAttribute('data-player', JSON.stringify(player));

                playerDiv.innerHTML = `
                <button class="${isPlayerInSquad ? 'remove-player-button' : 'add-player-button'}" data-player-id="${player.id}" data-position="${position.name}">${isPlayerInSquad ? '-' : '+'}</button>
                <img src="${config.premierLeagueImageUrl}${player.photo.slice(0, -3)}png" alt="Player Photo" class="player-photo">
                <span class="player-name">${player.webName}</span>
                ${getPlayerStatusIcon(player)}

            `;
                playerList.appendChild(playerDiv);
            });
            playerList.style.display = 'block';
            addButton.style.display = 'none'; // Hide the Add button

            // Call setupPlayerPhotoInteractions to add click handlers to all player photos and names
            setupPlayerPhotoInteractions();

            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (error) {
            console.error('Error fetching available players:', error);
        }
    }

    async function addPlayerToSquad(playerId, squadId, position) {
        const payload = {
            userSquadId: parseInt(squadId),
            playerId: parseInt(playerId)
        };

        try {
            const response = await fetch(`${config.backendUrl}/PlayerPositions/add-user-squad-player`, addAuthHeader({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }));

            if (!response.ok) {
                const errorText = await response.text();
                alert(`Failed to add player: ${errorText}`);
                return false;  // Return false on failure
            }

            // Refresh all data after successful add
            await fetchAllPlayers();
            displayAllPlayersView();
            return true;  // Return true on success

        } catch (error) {
            console.error('Error adding player to squad:', error);
            alert('Error adding player to squad. Please try again.');
            return false;  // Return false on error
        }
    }

    document.addEventListener('click', async function (event) {
        // Get common attributes
        const playerId = event.target.getAttribute('data-player-id');
        const position = event.target.getAttribute('data-position');

        // Handle add player button (+ button)
        if (event.target.classList.contains('add-player-button')) {
            const playerDiv = event.target.closest('.player-grid-for-draft');
            const player = JSON.parse(playerDiv.getAttribute('data-player'));

            // Create confirmation dialog
            const overlay = document.createElement('div');
            overlay.className = 'transfer-overlay';

            const modal = document.createElement('div');
            modal.className = 'transfer-modal';

            modal.innerHTML = `
            <div class="transfer-modal-header">
                <img src="${config.premierLeagueImageUrl}${player.photo.slice(0, -3)}png" 
                     alt="${player.webName}" class="player-photo">
                <h3>${player.webName}</h3>
                <span>${position}</span>
                <button class="close-modal-btn">&times;</button>
            </div>
            <div class="transfer-modal-content">
                <p>Are you sure this is your pick?</p>
                <div class="transfer-modal-buttons">
                    <button class="confirm-transfer-btn">OK</button>
                    <button class="cancel-transfer-btn">Cancel</button>
                </div>
            </div>
        `;

            // Add event listeners for modal
            modal.querySelector('.close-modal-btn').addEventListener('click', () => overlay.remove());
            modal.querySelector('.cancel-transfer-btn').addEventListener('click', () => overlay.remove());
            modal.querySelector('.confirm-transfer-btn').addEventListener('click', async () => {
                // Disable all buttons immediately
                document.querySelectorAll('button').forEach(btn => btn.disabled = true);

                overlay.remove();
                const success = await addPlayerToSquad(playerId, squadId, position);
                if (success) {
                    await advanceDraft();
                }
                else {
                    document.querySelectorAll('button').forEach(btn => btn.disabled = false);
                }
            });

            overlay.appendChild(modal);
            document.body.appendChild(overlay);
        }

        // Handle add button (section add button)
        else if (event.target.classList.contains('add-button')) {
            if (!leagueId) {
                console.error('League ID is not set');
                return;
            }
            await fetchAndDisplayAvailablePlayers(position, leagueId, draftPeriodId);

            // Scroll the section to the top of the page
            const section = document.getElementById(position);
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Handle remove player button pending
        else if (event.target.classList.contains('remove-player-button-pending')) {
            if (outPlayerId) {
                if (outPlayerId === playerId) {
                    // Cancel the pending transfer
                    outPlayerId = null;
                    const section = document.getElementById(position);
                    section.classList.remove('pending-swap');
                    const addButton = section.querySelector('.add-button');
                    const playerList = section.querySelector('.player-list');
                    addButton.style.display = 'none';
                    playerList.style.display = 'none';

                    // Remove pending class from the button
                    event.target.classList.remove('remove-player-button-pending');
                    event.target.classList.add('remove-player-button');
                    return;
                }
                alert('A player swap is pending. Please complete the swap before removing another player.');
                return;
            }
        }
    }); 

    document.addEventListener('click', async function (event) {
        if (event.target.classList.contains('add-button')) {
            const position = event.target.getAttribute('data-position');
            await fetchAndDisplayAvailablePlayers(position, leagueId, draftPeriodId);
        }
    });

    async function initializePage() {
        if (!leagueId) {
            console.log('No leagueId found, waiting for league fetch');
            await fetchLeagues(leagueDropdown);
        }
        else {
            fetchLeagues(leagueDropdown);
        }

        await fetchDraftPeriods(draftPeriodDropdown);
        const selectedOption = draftPeriodDropdown.options[draftPeriodDropdown.selectedIndex];
        draftPeriodStartDate = new Date(selectedOption.getAttribute('data-start-date')).toUTCString();
        draftPeriodId = draftPeriodDropdown.value;
        positions = await fetchPositions();

        // Hide team layout immediately
        const teamLayout = document.querySelector('.team-layout');
        if (teamLayout) {
            teamLayout.style.display = 'none';
        }

        await updateSquadId();
        await checkForActiveDraft();

        // Fetch all players and display the all players view
        await fetchAllPlayers();

        displayAllPlayersView();

        //await fetchAndCreateUserTeamCards();

        // Add event listeners for dropdowns
        leagueDropdown.addEventListener('change', async function () {
            leagueId = this.value;
            localStorage.setItem('leagueId', leagueId);

            await updateSquadId();
            await checkForActiveDraft();

            // Clear cached data first
            allPlayers = [];
            otherUsersSquadPlayers = [];

            // Fetch new data before displaying 
            await fetchAllPlayers();
            displayAllPlayersView();

            await fetchAndCreateUserTeamCards();
        });

        draftPeriodDropdown.addEventListener('change', async function () {
            draftPeriodId = this.value;
            const selectedOption = this.options[this.selectedIndex];
            draftPeriodStartDate = new Date(selectedOption.getAttribute('data-start-date')).toUTCString();

            await updateSquadId();
            await checkForActiveDraft();

            // Clear cached data first
            allPlayers = [];
            otherUsersSquadPlayers = [];

            // Fetch new data before displaying
            await fetchAllPlayers();
            displayAllPlayersView();

            await fetchAndCreateUserTeamCards();
        });

        const userTeamCardsContainer = document.getElementById('userTeamCardsContainer');
        const toggleButton = document.getElementById('userTeamCardsContainerToggle');

        // Hide the container on page load
        //userTeamCardsContainer.style.display = 'none';

        // Add click event to the floating action button
        toggleButton.addEventListener('click', function () {
            if (userTeamCardsContainer.style.display === 'none') {
                userTeamCardsContainer.style.display = 'flex'; // Show the container
            } else {
                userTeamCardsContainer.style.display = 'none'; // Hide the container
            }
        });
    }

    await initializePage();

    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('add-button')) {
            const position = event.target.getAttribute('data-position');
            if (!leagueId) {
                console.error('League ID is not set');
                return;
            }
            fetchAndDisplayAvailablePlayers(position, leagueId, draftPeriodId);
        }
    });
});
