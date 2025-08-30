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
let positions = null; // Make positions globally accessible within this module

document.addEventListener('DOMContentLoaded', async function () {

    let draftPeriodId;
    let squadId;
    const currentUserId = localStorage.getItem('userId');
    let draftPeriodDropdown = document.getElementById('draftPeriodDropdown');
    const leagueDropdown = document.getElementById('leagueDropdown');
    let leagueId = localStorage.getItem('leagueId');

    let allPlayers = []; // Stores available players

    let currentPositionFilter = 'ALL';
    let currentSortOption = 'name_asc'; // Default sort option

    const playerSearchBox = document.getElementById('playerSearchBox');
    const sortPlayerOptions = document.getElementById('sortPlayerOptions');
    const playerFiltersContainer = document.getElementById('playerFilters');


    async function fetchAllPlayers() { // Fetches only AVAILABLE players
        try {
            if (!leagueId || !draftPeriodId) {
                console.warn("League ID or Draft Period ID missing for fetchAllPlayers");
                allPlayers = [];
                return;
            }
            const availableResponse = await fetch(`${config.backendUrl}/PlayerPositions/available-players-with-positions/${leagueId}/${draftPeriodId}`, addAuthHeader());
            if (!availableResponse.ok) {
                console.error('Failed to fetch available players:', availableResponse.status, availableResponse.statusText);
                allPlayers = []; // Ensure it's an empty array on failure
                return;
            }
            allPlayers = await availableResponse.json();
        } catch (error) {
            console.error('Error fetching available players:', error);
            allPlayers = []; // Ensure it's an empty array on error
        }
    }

    function displayAllPlayersView() {
        const allPlayersContainer = document.getElementById('allPlayersContainer');
        if (!allPlayersContainer) {
            console.error('allPlayersContainer not found in HTML');
            return;
        }

        allPlayersContainer.innerHTML = ''; // Clear previous content

        // Filter and sort players before displaying
        const processedPlayers = getProcessedPlayers();

        if (!positions) {
            console.warn("Positions not loaded yet for displayAllPlayersView");
            return;
        }

        positions.forEach(position => {
            const positionPlayers = processedPlayers.filter(player => player.positionName === position.name);

            if (currentPositionFilter !== 'ALL' && position.name !== currentPositionFilter) {
                return; // Skip if not matching the active position filter (unless filter is ALL)
            }

            if (positionPlayers.length > 0 || currentPositionFilter === 'ALL' || currentPositionFilter === position.name) {
                const sectionHeader = document.createElement('div');
                sectionHeader.className = 'section-header';
                sectionHeader.textContent = position.name;
                allPlayersContainer.appendChild(sectionHeader);

                const playersContainerElement = document.createElement('div');
                playersContainerElement.className = 'players';

                positionPlayers.forEach(player => {
                    const playerDiv = createPlayerDivForAllView(player);
                    playersContainerElement.appendChild(playerDiv);
                });
                allPlayersContainer.appendChild(playersContainerElement);
            }
        });
        setupPlayerPhotoInteractions();
    }

    function getProcessedPlayers() {
        const searchText = playerSearchBox.value.toLowerCase();
        const normalizedSearchText = searchText.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        let filtered = allPlayers.filter(player => {
            if (currentPositionFilter !== 'ALL' && player.positionName !== currentPositionFilter) {
                return false;
            }
            if (normalizedSearchText) {
                const fieldsToSearch = [
                    player.firstName,
                    player.secondName,
                    player.webName,
                    player.positionName,
                    player.teamName
                ];
                return fieldsToSearch.some(field =>
                    field && field.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(normalizedSearchText)
                );
            }
            return true;
        });

        // Apply sorting
        filtered.sort((a, b) => {
            const nameA = (a.webName || '').toLowerCase(); // Ensure webName exists
            const nameB = (b.webName || '').toLowerCase(); // Ensure webName exists

            switch (currentSortOption) {
                case 'name_asc':
                    return nameA.localeCompare(nameB);
                case 'name_desc':
                    return nameB.localeCompare(nameA);
                default: // Default to name_asc if an unexpected sort option is encountered
                    return nameA.localeCompare(nameB);
            }
        });
        return filtered;
    }


    function filterAndSortAndUpdateView() {
        displayAllPlayersView();
    }


    function createPlayerDivForAllView(player) {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-grid-for-draft';
        playerDiv.setAttribute('data-player', JSON.stringify(player));

        // Points display removed

        playerDiv.innerHTML = `
            <img src="${config.premierLeagueImageUrl}${player.photo.slice(0, -3)}png" alt="${player.webName}" class="player-photo">
            <span class="player-name">${player.webName}</span>
            ${getPlayerStatusIcon(player)}
            <button class="add-player-button" data-player-id="${player.id}" data-position="${player.positionName}">+</button>
        `; // Button text is "+"
        return playerDiv;
    }

    let allLeagueSquads = [];

    async function fetchAndCreateUserTeamCards() {
        try {
            if (!leagueId) {
                console.warn("League ID missing for fetchAndCreateUserTeamCards");
                return;
            }
            const squadsResponse = await fetch(`${config.backendUrl}/UserSquads/ByLeague/${leagueId}`, addAuthHeader());
            if (!squadsResponse.ok) {
                console.error('Failed to fetch league squads:', squadsResponse.status, squadsResponse.statusText);
                return;
            }
            allLeagueSquads = await squadsResponse.json();

            const draftedPlayersResponse = await fetch(`${config.backendUrl}/PlayerPositions/league-user-squad-players/${leagueId}`, addAuthHeader());
            if (!draftedPlayersResponse.ok) {
                console.error('Failed to fetch all league drafted players:', draftedPlayersResponse.status, draftedPlayersResponse.statusText);
                return;
            }
            const allDraftedPlayers = await draftedPlayersResponse.json();
            createDraftedPlayersList(allDraftedPlayers);

            const currentUserSquadData = allLeagueSquads.find(s => s.userId && currentUserId && s.userId.toString() === currentUserId.toString());

            const mySquadHeader = document.getElementById('mySquadHeader');
            if (mySquadHeader) {
                mySquadHeader.textContent = currentUserSquadData ? `My Squad: ${currentUserSquadData.squadName}` : "My Squad";
            }

            if (!currentUserSquadData) {
                console.warn('No squad found for the current user to display in "My Squad".');
                const userTeamCardsContainer = document.getElementById('userTeamCardsContainer');
                if (userTeamCardsContainer) userTeamCardsContainer.innerHTML = '<p>Your squad will appear here once you draft players.</p>';
                return;
            }

            const currentUserPlayers = allDraftedPlayers.filter(player => player.squadId === currentUserSquadData.id);
            createUserTeamCards(currentUserPlayers, [currentUserSquadData]);

        } catch (error) {
            console.error('Error in fetchAndCreateUserTeamCards:', error);
        }
    }

    function createDraftedPlayersList(allDraftedPlayers) {
        const draftLogContent = document.getElementById('draftLogContent');
        if (!draftLogContent) {
            console.error("draftLogContent element not found");
            return;
        }
        draftLogContent.innerHTML = '';

        const sortedPlayers = allDraftedPlayers.sort((a, b) => (b.draftId || 0) - (a.draftId || 0));

        sortedPlayers.forEach((player, index) => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'draft-log-item';

            const pickNumberDisplay = player.draftId || (sortedPlayers.length - index);

            playerDiv.innerHTML = `
                <img src="${config.premierLeagueImageUrl}${player.photo.slice(0, -3)}png" alt="${player.webName}" class="player-photo">
                <span class="pick-number">${pickNumberDisplay}.</span>
                <span class="player-name">${player.webName}</span>
                <span class="drafting-team" title="${player.squadName}">${player.squadName}</span>
                <span class="player-position">${player.positionShortName || player.positionName}</span>
            `;
            draftLogContent.appendChild(playerDiv);
        });
    }


    function createUserTeamCards(playersForSquad, squadDetailsArray) {
        const userTeamCardsContainer = document.getElementById('userTeamCardsContainer');
        if (!userTeamCardsContainer) return;
        userTeamCardsContainer.innerHTML = '';

        if (!squadDetailsArray || squadDetailsArray.length === 0) {
            userTeamCardsContainer.innerHTML = "<p>No squad data to display.</p>";
            return;
        }
        const squadDetail = squadDetailsArray[0];

        const team = {
            username: squadDetail.squadName || `Squad ${squadDetail.id}`,
            squadId: squadDetail.id,
            players: playersForSquad.map(p => ({
                ...p,
                webName: p.webName || p.displayName || 'Unknown',
                position: p.positionName,
            }))
        };
        const card = createTeamCard(team);
        userTeamCardsContainer.appendChild(card);
        setupPlayerPhotoInteractions();
    }

    function createTeamCard(team) {
        const card = document.createElement('div');
        card.className = 'user-team-card expanded';
        card.setAttribute('data-squad-id', team.squadId);

        if (!positions) {
            console.error("Positions data is not available for createTeamCard.");
            card.innerHTML = "<p>Error: Position data missing.</p>";
            return card;
        }

        const positionOrderFromGlobal = positions.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map(p => p.name);

        positionOrderFromGlobal.forEach(positionName => {
            const positionInfo = positions.find(p => p.name === positionName);
            if (!positionInfo) return;

            const maxInSquadForPos = positionInfo.maxInSquad || 0;
            const playersInPosition = team.players.filter(player => player.position === positionName);

            const positionGroup = document.createElement('div');
            positionGroup.className = 'position-group';

            const positionHeader = document.createElement('div');
            positionHeader.className = 'position-header';

            const positionLabel = document.createElement('span');
            positionLabel.className = 'position-label';
            positionLabel.textContent = positionName;
            positionHeader.appendChild(positionLabel);

            const positionCount = document.createElement('span');
            positionCount.className = 'position-count';
            positionCount.textContent = `(${playersInPosition.length}/${maxInSquadForPos})`;
            positionHeader.appendChild(positionCount);

            positionGroup.appendChild(positionHeader);


            playersInPosition.forEach(player => {
                const playerRow = document.createElement('div');
                playerRow.className = 'player-row';
                playerRow.setAttribute('data-player', JSON.stringify(player));
                playerRow.innerHTML = `
                    <img src="${config.premierLeagueImageUrl}${player.photo.slice(0, -3)}png" 
                         alt="${player.webName}" class="player-photo">
                    <div class="player-name">${player.webName}</div>
                    ${getPlayerStatusIcon(player)}
                `;
                positionGroup.appendChild(playerRow);
            });

            for (let i = playersInPosition.length; i < maxInSquadForPos; i++) {
                const emptySlotRow = document.createElement('div');
                emptySlotRow.className = 'player-row empty-slot';
                emptySlotRow.textContent = 'Empty';
                positionGroup.appendChild(emptySlotRow);
            }
            card.appendChild(positionGroup);
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

            isDraftInProgress = (now >= draftStart && now <= draftEnd && league.nextDraftPeriodId == draftPeriodId);

            if (league.currentDraftRound !== previousDraftRound || league.currentDraftUserId !== previousDraftUserId) {
                console.log('Draft state has changed. Refreshing UI elements.');
                previousDraftRound = league.currentDraftRound;
                previousDraftUserId = league.currentDraftUserId;

                // Critical refreshes when draft state changes
                await fetchAllPlayers(); // New set of available players
                filterAndSortAndUpdateView(); // Update available players display
                await fetchAndCreateUserTeamCards(); // Refresh Draft Log and My Squad
            }
            updateUIForDraft(league); // Update timer/message display
            return isDraftInProgress;
        } catch (error) {
            console.error('Error checking for active draft:', error);
            return false;
        }
    }

    function updateUIForDraft(league) {
        const currentPickInfoContainer = document.getElementById('currentPickInfoContainer');
        if (!currentPickInfoContainer) {
            console.error("currentPickInfoContainer not found"); return;
        }

        if (!isDraftInProgress) {
            currentPickInfoContainer.innerHTML = '<p>No active draft for this period.</p>';
            enableAllButtons();
            if (draftCheckInterval) {
                clearInterval(draftCheckInterval);
                draftCheckInterval = null;
            }
            return;
        }
        // Ensure allLeagueSquads is populated before trying to find squad name
        const currentDraftSquad = allLeagueSquads && allLeagueSquads.length > 0 && league.currentDraftUserId ?
            allLeagueSquads.find(s => s.userId && s.userId.toString() === league.currentDraftUserId.toString()) : null;
        const squadName = currentDraftSquad ? currentDraftSquad.squadName : `User ID: ${league.currentDraftUserId || 'N/A'}`;
        const roundInfo = league.currentDraftRound ? `Round ${league.currentDraftRound}` : 'Draft Starting';

        const pickDisplay = `${roundInfo}`;

        if (league.currentDraftUserId && currentUserId && league.currentDraftUserId.toString() === currentUserId.toString()) {
            currentPickInfoContainer.innerHTML = `
                <div class="your-turn-message">It's YOUR turn to draft!</div>
                <div class="draft-round-info">${pickDisplay}</div>`;
            enableAllButtons();
        } else {
            currentPickInfoContainer.innerHTML = `
                <div class="waiting-message">Waiting for: <strong>${squadName}</strong> <div class="loader"></div></div>
                <div class="draft-round-info">${pickDisplay}</div>`;
            disableAllButtons();
            if (!draftCheckInterval) {
                draftCheckInterval = setInterval(checkForActiveDraft, 7000);
            }
        }
    }

    function disableAllButtons() {
        const buttons = document.querySelectorAll('button.add-player-button');
        buttons.forEach(button => {
            button.disabled = true;
            button.classList.add('disabled-during-draft');
        });
    }

    function enableAllButtons() {
        const buttons = document.querySelectorAll('button.add-player-button.disabled-during-draft');
        buttons.forEach(button => {
            button.disabled = false;
            button.classList.remove('disabled-during-draft');
        });
    }

    async function advanceDraft() {
        if (!currentLeague || !leagueId) return;
        try {
            const response = await fetch(`${config.backendUrl}/Leagues/${leagueId}/advance-draft`, addAuthHeader({ method: 'POST' }));
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Failed to advance draft:', response.status, errorText);
                alert(`Failed to advance draft: ${errorText}. Please try again.`);
                return;
            }
            await checkForActiveDraft(); // Force immediate refresh after advancing
        } catch (error) {
            console.error('Error advancing draft:', error);
            alert('An error occurred while advancing the draft.');
        }
    }

    async function updateSquadId() {
        const urlParams = new URLSearchParams(window.location.search);
        const urlSquadId = urlParams.get('id');
        if (urlSquadId) {
            squadId = urlSquadId;
        } else {
            try {
                if (!leagueId || !draftPeriodId || !currentUserId) {
                    console.warn("Cannot fetch squad ID: missing leagueId, draftPeriodId, or currentUserId.");
                    squadId = null;
                    return;
                }
                const response = await fetch(`${config.backendUrl}/UserSquads/ByLeagueDraftPeriodAndUser/${leagueId}/${draftPeriodId}`, addAuthHeader());
                if (!response.ok) {
                    console.error('Failed to fetch squad ID for current user:', response.status, response.statusText);
                    squadId = null;
                    return;
                }
                const squad = await response.json();
                squadId = squad.id;
            } catch (error) {
                console.error('Error fetching squad ID:', error);
                squadId = null;
            }
        }
    }

    function getPlayerStatusIcon(player) {
        if (!player.status) return '';
        switch (player.status.toLowerCase()) {
            case 'i': return `<div class="player-status status-injured" title="Injured"><i class="fas fa-medkit"></i></div>`;
            case 'd': return `<div class="player-status status-warning" title="Doubtful"><i class="fas fa-exclamation-triangle"></i></div>`;
            case 's': return `<div class="player-status status-suspended" title="Suspended"><i class="fas fa-ban"></i></div>`;
            case 'u': return `<div class="player-status status-unavailable" title="Unavailable"><i class="fas fa-times-circle"></i></div>`;
            default: return '';
        }
    }

    async function addPlayerToSquad(playerId, targetSquadId, position) {
        if (!targetSquadId) {
            alert("Error: Your squad ID is not identified. Cannot draft player.");
            return false;
        }
        const payload = {
            userSquadId: parseInt(targetSquadId),
            playerId: parseInt(playerId)
        };
        try {
            const response = await fetch(`${config.backendUrl}/PlayerPositions/add-user-squad-player`, addAuthHeader({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }));
            if (!response.ok) {
                const errorText = await response.text();
                alert(`Failed to add player: ${errorText}`);
                return false;
            }
            // After successfully adding, the advanceDraft will trigger checkForActiveDraft,
            // which in turn refreshes all necessary data.
            return true;
        } catch (error) {
            console.error('Error adding player to squad:', error);
            alert('Error adding player to squad. Please try again.');
            return false;
        }
    }

    document.addEventListener('click', async function (event) {
        if (event.target.classList.contains('add-player-button')) {
            const playerDiv = event.target.closest('.player-grid-for-draft');
            if (!playerDiv) return;
            const player = JSON.parse(playerDiv.getAttribute('data-player'));
            const playerId = player.id;
            const position = player.positionName;

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
                    <button class="close-modal-btn">×</button>
                </div>
                <div class="transfer-modal-content">
                    <p>Are you sure you want to draft ${player.webName}?</p>
                    <div class="transfer-modal-buttons">
                        <button class="confirm-draft-btn">Confirm Draft</button>
                        <button class="cancel-draft-btn">Cancel</button>
                    </div>
                </div>`;

            modal.querySelector('.close-modal-btn').addEventListener('click', () => overlay.remove());
            modal.querySelector('.cancel-draft-btn').addEventListener('click', () => overlay.remove());
            modal.querySelector('.confirm-draft-btn').addEventListener('click', async () => {
                overlay.remove();
                if (!squadId) {
                    await updateSquadId();
                    if (!squadId) {
                        alert("Could not identify your squad. Please refresh and try again.");
                        return;
                    }
                }
                const success = await addPlayerToSquad(playerId, squadId, position);
                if (success) {
                    await advanceDraft();
                }
            });
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
        }
        else if (event.target.matches('.player-filters .filter-button')) {
            playerFiltersContainer.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            currentPositionFilter = event.target.dataset.positionFilter;
            filterAndSortAndUpdateView();
        }
    });

    if (sortPlayerOptions) {
        sortPlayerOptions.addEventListener('change', function () {
            currentSortOption = this.value;
            filterAndSortAndUpdateView();
        });
    }
    if (playerSearchBox) {
        playerSearchBox.addEventListener('input', filterAndSortAndUpdateView);
    }


    async function initializePage() {
        positions = await fetchPositions();

        if (positions && playerFiltersContainer) {
            playerFiltersContainer.innerHTML = '<button data-position-filter="ALL" class="filter-button active">ALL</button>'; // Reset and add ALL
            positions.forEach(pos => {
                const button = document.createElement('button');
                button.className = 'filter-button';
                button.dataset.positionFilter = pos.name;
                button.textContent = pos.name;
                playerFiltersContainer.appendChild(button);
            });
        }

        if (!leagueId) {
            console.log('No leagueId found, fetching leagues for dropdown.');
            await fetchLeagues(leagueDropdown, true);
            leagueId = leagueDropdown.value;
            if (leagueId) localStorage.setItem('leagueId', leagueId);
            else console.error("Failed to set leagueId after fetching leagues.");
        } else {
            await fetchLeagues(leagueDropdown);
        }

        await fetchDraftPeriods(draftPeriodDropdown);
        if (draftPeriodDropdown.options.length > 0) {
            draftPeriodDropdown.selectedIndex = 0; // Select the first draft period by default
            const selectedOption = draftPeriodDropdown.options[draftPeriodDropdown.selectedIndex];
            draftPeriodStartDate = new Date(selectedOption.getAttribute('data-start-date')).toUTCString();
            draftPeriodId = draftPeriodDropdown.value;
        } else {
            console.error("No draft periods available.");
            currentPickInfoContainer.innerHTML = "<p>No draft periods configured for this league.</p>";
            return;
        }

        currentSortOption = sortPlayerOptions.value; // Initialize from dropdown

        await updateSquadId();

        // Initial data fetches - order matters for dependencies
        await fetchAllPlayers(); // Get available players first
        await fetchAndCreateUserTeamCards(); // Then get all squads and drafted players for log/my squad (depends on allLeagueSquads being set)

        filterAndSortAndUpdateView(); // Display available players
        await checkForActiveDraft(); // Check draft status (depends on allLeagueSquads for names)


        leagueDropdown.addEventListener('change', async function () {
            leagueId = this.value;
            localStorage.setItem('leagueId', leagueId);
            allPlayers = [];
            allLeagueSquads = [];
            await updateSquadId();
            await fetchAllPlayers();
            await fetchAndCreateUserTeamCards(); // Fetch squads and drafted players
            filterAndSortAndUpdateView();
            await checkForActiveDraft();
        });

        draftPeriodDropdown.addEventListener('change', async function () {
            draftPeriodId = this.value;
            const selectedOption = this.options[this.selectedIndex];
            draftPeriodStartDate = new Date(selectedOption.getAttribute('data-start-date')).toUTCString();
            allPlayers = [];
            allLeagueSquads = [];
            await updateSquadId();
            await fetchAllPlayers();
            await fetchAndCreateUserTeamCards(); // Fetch squads and drafted players
            filterAndSortAndUpdateView();
            await checkForActiveDraft();
        });
    }

    await initializePage();
});