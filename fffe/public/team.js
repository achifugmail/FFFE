import { setupPlayerPhotoInteractions } from './common.js';
import { fetchLeagues } from './common.js';
import { fetchDraftPeriods } from './common.js';
import { fetchPositions } from './common.js';
import { addAuthHeader } from './config.js';
import config from './config.js';

document.addEventListener('DOMContentLoaded', async function () {
    // Fetch draft periods for dropdown
    let leagueId = localStorage.getItem('leagueId');
    let currentView = 'list';    
    const squadPlayersCache = new Map();
       
    let draftPeriodId;
    let draftPeriodDropdown = document.getElementById('filterDraftPeriodDropdown');    
    let squadId;  // Remove the URL parameter assignment

    const filterDraftPeriodDropdown = document.getElementById('filterDraftPeriodDropdown');
    const leagueDropdown = document.getElementById('leagueDropdown');

    // Fetch and populate gameweeks based on selected draft period
    const gameweekDropdown = document.getElementById('gameweekDropdown');
    const gameweekCaption = document.getElementById('gameweekCaption');
    const gameweekLeftArrow = document.getElementById('gameweekLeftArrow');
    const gameweekRightArrow = document.getElementById('gameweekRightArrow');
    const fixturesToggle = document.getElementById('fixturesToggle');
    const teamLayout = document.querySelector('.team-layout');

    // Function to update the gameweek caption and dropdown value
    async function updateGameweek(newIndex) {
        const options = Array.from(gameweekDropdown.options);
        if (newIndex >= 0 && newIndex < options.length) {
            gameweekDropdown.selectedIndex = newIndex;
            gameweekCaption.textContent = options[newIndex].text; // Update the caption
            fetchAndDisplayFixtures(options[newIndex].value); // Fetch fixtures for the new gameweek
            await fetchAndDisplaySquadPlayers(squadId); // Fetch squad players for the new gameweek

            // Check if the selected gameweek is in the past
            const selectedOption = gameweekDropdown.options[gameweekDropdown.selectedIndex];
            const gwStartDate = new Date(selectedOption.dataset.startdate + 'Z');
            const now = new Date();

            if (gwStartDate < now) {
                // Switch to pitch view
                setView('pitch');
            } else {
                // Switch to list view
                setView('list');
            }
        }
    }

    // 1) In fetchAndPopulateGameweeks, add data-startdate to each option
    async function fetchAndPopulateGameweeks(draftPeriodId) {
        let gameweeks = [];
        try {
            const respGameweeks = await fetch(`${config.backendUrl}/Gameweeks/by-draft-period/${draftPeriodId}`, addAuthHeader());
            if (respGameweeks.status === 401) {
                console.error('Authentication error: Unauthorized access (401)');
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

        // Sort all gameweeks by their "number"
        gameweeks.sort((a, b) => a.number - b.number);

        // Populate dropdown with all gameweeks, adding data-startdate
        gameweeks.forEach(gw => {
            const option = document.createElement('option');
            option.value = gw.id;
            option.text = String(gw.number);
            option.dataset.startdate = gw.startDate; // Store startDate
            gameweekDropdown.appendChild(option);
        });

        // Decide default selection: most recent past gameweek if any, else first
        const now = new Date();
        const pastGws = gameweeks.filter(gw => new Date(gw.startDate + 'Z') <= now);
        if (pastGws.length > 0) {
            const defaultGw = pastGws[pastGws.length - 1];
            gameweekDropdown.value = defaultGw.id;
            gameweekCaption.textContent = String(defaultGw.number);
        } else if (gameweeks.length > 0) {
            gameweekDropdown.value = gameweeks[0].id;
            gameweekCaption.textContent = String(gameweeks[0].number);
        }
        setView('pitch');
    }

    async function fetchAndDisplayFixtures(gameweekId) {
        try {
            const response = await fetch(`${config.backendUrl}/fixtures/gameweek/${gameweekId}`, addAuthHeader());
            if (response.status === 401) {
                console.error('Authentication error: Unauthorized access (401)');
                window.location.href = '/';
                return;
            }
            if (!response.ok) {
                console.error('Failed to fetch fixtures:', response.status, response.statusText);
                return;
            }

            const fixtures = await response.json();
            const fixturesContainer = document.getElementById('fixturesContainer');
            fixturesContainer.innerHTML = '';

            // Group fixtures by date
            const fixturesByDate = {};
            fixtures.forEach(fixture => {
                // Convert UTC to local date
                const localDate = new Date(fixture.date + 'Z');
                const dateKey = localDate.toLocaleDateString();
                if (!fixturesByDate[dateKey]) {
                    fixturesByDate[dateKey] = [];
                }
                fixturesByDate[dateKey].push({
                    ...fixture,
                    localKickoff: localDate
                });
            });

            // Sort the date groups by date
            const sortedDates = Object.keys(fixturesByDate).sort((a, b) => new Date(a) - new Date(b));

            // Create a container for each date group
            sortedDates.forEach(date => {
                const dateFixtures = fixturesByDate[date];
                const dateGroup = document.createElement('div');
                dateGroup.className = 'fixtures-date-group';

                // Add date header
                const dateHeader = document.createElement('div');
                dateHeader.className = 'fixtures-date-header';
                const firstFixture = dateFixtures[0].localKickoff;
                dateHeader.textContent = firstFixture.toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                });
                dateGroup.appendChild(dateHeader);

                // Create fixtures table for this date
                const table = document.createElement('table');
                table.className = 'fixtures-table';

                dateFixtures.forEach(fixture => {
                    const row = document.createElement('tr');

                    const matchCell = document.createElement('td');
                    matchCell.className = 'match-cell';
                    matchCell.innerHTML = `
        <div class="match-container">
            <div class="kickoff-time">${fixture.localKickoff.toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</div>
            <div class="match-details">
                <div class="team-cell home-team-cell">
                    <img src="https://resources.premierleague.com/premierleague/badges/70/t${fixture.homeTeam.code}.png" class="team-logo" alt="${fixture.homeTeam.name}">
                    <span class="team-short-name">${fixture.homeTeam.shortName}</span>
                </div>
                <div class="vs-cell">-</div>
                <div class="team-cell away-team-cell">
                    <span class="team-short-name">${fixture.awayTeam.shortName}</span>
                    <img src="https://resources.premierleague.com/premierleague/badges/70/t${fixture.awayTeam.code}.png" class="team-logo" alt="${fixture.awayTeam.name}">
                </div>
            </div>
        </div>
    `;

                    row.appendChild(matchCell);
                    table.appendChild(row);
                });

                dateGroup.appendChild(table);
                fixturesContainer.appendChild(dateGroup);
            });

        } catch (error) {
            console.error('Error fetching fixtures:', error);
        }
    }

    function changeGameweek(gameweekDropdown) {
        fetchAndDisplaySquadPlayers(squadId);
        fetchAndDisplayFixtures(gameweekDropdown.value);

        // Check if the selected gameweek is in the past
        const selectedOption = gameweekDropdown.options[gameweekDropdown.selectedIndex];
        const gwStartDate = new Date(selectedOption.dataset.startdate + 'Z');
        const now = new Date();

        if (gwStartDate < now) {
            // Switch to pitch view
            setView('pitch');
        } else {
            // Switch to list view
            setView('list');
        }
    }

    gameweekDropdown.addEventListener('change', function () {
        updateGameweek(this.value);
    });

    async function fetchSquadId() {
        try {
            const response = await fetch(`${config.backendUrl}/UserSquads/ByLeagueDraftPeriodAndUser/${leagueId}/${draftPeriodId}`, addAuthHeader());
            if (response.status === 401) {
                console.error('Authentication error: Unauthorized access (401)');
                // Redirect to the root site
                window.location.href = '/';
                return;
            }
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

    // Function to generate player status icon HTML
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

    // Fetch and display players in the current squad
    async function fetchAndDisplaySquadPlayers(squadId) {
        try {
            const gameweekId = document.getElementById('gameweekDropdown').value;

            // Check if we already have the data for this squad in cache
            let squadPlayers;
            if (squadPlayersCache.has(squadId)) {
                console.log(`Using cached squad players for squad ID: ${squadId}`);
                squadPlayers = squadPlayersCache.get(squadId);
            } else {
                // Only fetch from API if not in cache
                console.log(`Fetching squad players for squad ID: ${squadId}`);
                const response = await fetch(`${config.backendUrl}/PlayerPositions/user-squad-players/${squadId}`, addAuthHeader());
                if (response.status === 401) {
                    console.error('Authentication error: Unauthorized access (401)');
                    // Redirect to the root site
                    window.location.href = '/';
                    return;
                }
                if (!response.ok) {
                    console.error('Failed to fetch squad players:', response.status, response.statusText);
                    return;
                }
                squadPlayers = await response.json();

                // Store in cache for future use
                squadPlayersCache.set(squadId, squadPlayers);
            }

            let positions = await fetchPositions();
            
            const playerGrid = document.getElementById('playerGrid');
            playerGrid.innerHTML = ''; // Clear existing sections

            positions.forEach(position => {
                const section = document.createElement('div');
                section.className = 'section position-section';
                section.id = position.name;
                section.setAttribute('data-position', position.name);

                const playersDiv = document.createElement('div');
                playersDiv.className = 'players';
                section.appendChild(playersDiv);

                const filteredPlayers = squadPlayers.filter(player => player.positionName === position.name);
                filteredPlayers.forEach(player => {
                    const playerDiv = document.createElement('div');
                    playerDiv.className = 'player-grid';
                    playerDiv.setAttribute('data-player', JSON.stringify(player));
                    playerDiv.innerHTML = `
<input type="checkbox" class="player-checkbox" data-player-id="${player.id}">
<button class="captain-button" data-player-id="${player.id}"><i class="fas fa-crown"></i></button>
<img src="https://resources.premierleague.com/premierleague/photos/players/40x40/p${player.photo.slice(0, -3)}png" alt="Player Photo" class="player-photo">
<span class="player-name-long">${player.webName}</span>
${getPlayerStatusIcon(player)}
${getPlayerFormIndicator(player)}
`;
                    playersDiv.appendChild(playerDiv);
                });

                playerGrid.appendChild(section);
            });

            // Fetch and select players for the current gameweek
            try {
                const gameweekPlayersResponse = await fetch(`${config.backendUrl}/UserTeamPlayers/byUserSquadAndGameweek?userSquadId=${squadId}&gameweekId=${gameweekId}`, addAuthHeader());

                if (gameweekPlayersResponse.ok) {
                    const gameweekPlayers = await gameweekPlayersResponse.json();
                    gameweekPlayers.forEach(player => {
                        selectPlayer(player.playerId, false); // Pass false to indicate initial loading
                        if (player.isCaptain) {
                            markCaptainVisually(player.playerId);
                        }
                    });
                } else {
                    console.error('Failed to fetch gameweek players:', gameweekPlayersResponse.status, gameweekPlayersResponse.statusText);
                }
            } catch (error) {
                console.error('Error fetching gameweek players:', error);
            }

            // Add event listeners for player selection
            const checkboxes = document.querySelectorAll('.player-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.addEventListener('change', function () {
                    const playerId = checkbox.getAttribute('data-player-id');
                    if (checkbox.checked) {
                        selectPlayer(playerId, true); // Pass true to indicate user interaction
                    } else {
                        deselectPlayer(playerId);
                    }
                });
            });

            // Add event listeners for captain selection
            const captainButtons = document.querySelectorAll('.captain-button');
            captainButtons.forEach(button => {
                button.addEventListener('click', function () {
                    const playerId = button.getAttribute('data-player-id');
                    markAsCaptain(playerId);
                });
            });

            if (document.body.classList.contains('pitch-view-active')) {
                renderPitchView();
            }

            setupPlayerPhotoInteractions();

        } catch (error) {
            console.error('Error fetching squad players:', error);
        }
    }

    // Add a function to clear the cache when needed (e.g., after transfers)
    function clearSquadPlayersCache(squadId) {
        if (squadId) {
            squadPlayersCache.delete(squadId);
        } else {
            squadPlayersCache.clear(); // Clear entire cache if no squadId specified
        }
    }

    async function fetchAndDisplayPendingTransfers() {
        if (!leagueId) return;

        try {
            // Get the existing container
            const pendingTransfersContainer = document.getElementById('pendingTransfersContainer');

            // Clear existing content except the header
            const header = pendingTransfersContainer.querySelector('.pending-transfers-header');
            pendingTransfersContainer.innerHTML = '';
            pendingTransfersContainer.appendChild(header);

            // Fetch transfers to me
            const responseTo = await fetch(`${config.backendUrl}/Transfers/pending/to-me/${leagueId}`, addAuthHeader());

            // Fetch transfers from me
            const responseFrom = await fetch(`${config.backendUrl}/Transfers/pending/from-me/${leagueId}`, addAuthHeader());

            if (!responseTo.ok || !responseFrom.ok) {
                console.error('Failed to fetch pending transfers');
                pendingTransfersContainer.style.display = 'none';
                return;
            }

            const transfersToMe = await responseTo.json();
            const transfersFromMe = await responseFrom.json();

            // Only display the container if there are any pending transfers
            if (transfersToMe.length === 0 && transfersFromMe.length === 0) {
                pendingTransfersContainer.style.display = 'none';
                return;
            }

            // Show the container since we have transfers to display
            pendingTransfersContainer.style.display = 'block';

            // Display transfers to me first
            if (transfersToMe.length > 0) {
                transfersToMe.forEach(transfer => {
                    const transferItem = createTransferItem(transfer, true);
                    pendingTransfersContainer.appendChild(transferItem);
                });
            }

            // Display transfers from me
            if (transfersFromMe.length > 0) {
                transfersFromMe.forEach(transfer => {
                    const transferItem = createTransferItem(transfer, false);
                    pendingTransfersContainer.appendChild(transferItem);
                });
            }

            // Make sure there's enough space for the content
            pendingTransfersContainer.style.minHeight = '75px';
            pendingTransfersContainer.style.overflow = 'visible';

        } catch (error) {
            console.error('Error fetching pending transfers:', error);
            document.getElementById('pendingTransfersContainer').style.display = 'none';
        }
    }

    // Function to create a transfer item
    function createTransferItem(transfer, isToMe) {
        const item = document.createElement('div');
        item.className = `pending-transfer-item ${isToMe ? 'pending-transfer-to-me' : 'pending-transfer-from-me'}`;

        // Create player in element
        const playerInEl = document.createElement('div');
        playerInEl.className = 'pending-transfer-player';
        playerInEl.innerHTML = `
        <img src="https://resources.premierleague.com/premierleague/photos/players/40x40/p${transfer.playerIn.photo ? transfer.playerIn.photo.slice(0, -3) : '0'}png" 
             alt="${transfer.playerIn.webName}" class="player-photo">
        <div>
            <span class="player-name">${transfer.playerIn.webName}</span>
            <div class="pending-transfer-squad">${transfer.fromUserSquad.squadName}</div>
        </div>
    `;

        // Create arrow element
        const arrowEl = document.createElement('div');
        arrowEl.className = 'pending-transfer-arrow';
        arrowEl.innerHTML = '<i class="fas fa-exchange-alt"></i>';

        // Create player out element
        const playerOutEl = document.createElement('div');
        playerOutEl.className = 'pending-transfer-player';
        playerOutEl.innerHTML = `
        <img src="https://resources.premierleague.com/premierleague/photos/players/40x40/p${transfer.playerOut.photo ? transfer.playerOut.photo.slice(0, -3) : '0'}png" 
             alt="${transfer.playerOut.webName}" class="player-photo">
        <div>
            <span class="player-name">${transfer.playerOut.webName}</span>
            <div class="pending-transfer-squad">${transfer.userSquad.squadName}</div>
        </div>
    `;

        // Add elements to item
        item.appendChild(playerInEl);
        item.appendChild(arrowEl);
        item.appendChild(playerOutEl);

        // Add buttons based on whether the transfer is to me or from me
        const buttonsEl = document.createElement('div');
        buttonsEl.className = 'pending-transfer-buttons';

        if (isToMe) {
            // Add accept/reject buttons if the transfer is to me
            const acceptBtn = document.createElement('button');
            acceptBtn.className = 'accept-transfer-btn';
            acceptBtn.textContent = 'Accept';
            acceptBtn.addEventListener('click', () => handleTransferAction(transfer.id, 'accept'));

            const rejectBtn = document.createElement('button');
            rejectBtn.className = 'reject-transfer-btn';
            rejectBtn.textContent = 'Reject';
            rejectBtn.addEventListener('click', () => handleTransferAction(transfer.id, 'reject'));

            buttonsEl.appendChild(acceptBtn);
            buttonsEl.appendChild(rejectBtn);
        } else {
            // Add cancel button if the transfer is from me
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'cancel-transfer-btn';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.addEventListener('click', () => handleTransferAction(transfer.id, 'cancel'));

            buttonsEl.appendChild(cancelBtn);
        }

        // Add buttons to the player element
        item.appendChild(buttonsEl);

        return item;
    }

    // Function to handle accept/reject/cancel actions
    async function handleTransferAction(transferId, action) {
        try {
            const response = await fetch(`${config.backendUrl}/Transfers/${transferId}/${action}`, addAuthHeader({
                method: 'POST'
            }));

            if (!response.ok) {
                throw new Error(`Failed to ${action} transfer`);
            }

            // Refresh transfers display
            await fetchAndDisplayPendingTransfers();

            // If accepted, clear cache and reload team data
            if (action === 'accept') {
                clearSquadPlayersCache(squadId); // Clear cache for this squad
                await fetchAndDisplaySquadPlayers(squadId);
            }

            // Show success message
            let actionText = action === 'accept' ? 'accepted' :
                action === 'reject' ? 'rejected' : 'cancelled';
            alert(`Transfer ${actionText} successfully!`);

        } catch (error) {
            console.error(`Error ${action}ing transfer:`, error);
            alert(`Failed to ${action} transfer. Please try again.`);
        }
    }


    // Function to visually mark a player as captain without making API calls
    function markCaptainVisually(playerId) {
        // First, remove captain status from any existing captain
        const existingCaptain = document.querySelector('.player-grid.captain');
        if (existingCaptain) {
            existingCaptain.classList.remove('captain');
        }

        // Then mark the new captain
        const button = document.querySelector(`.captain-button[data-player-id="${playerId}"]`);
        if (button) {
            const playerDiv = button.closest('.player-grid');
            playerDiv.classList.add('captain');
        }
    }

    function disableAllControls() {
        const controls = document.querySelectorAll('button, input, select, textarea, a');
        controls.forEach(control => {
            control.disabled = true;
            control.classList.add('disabled'); // Optional: Add a class for styling
        });
    }

    function enableAllControls() {
        const controls = document.querySelectorAll('button, input, select, textarea, a');
        controls.forEach(control => {
            control.disabled = false;
            control.classList.remove('disabled'); // Optional: Remove the class for styling
        });
    }

    // Mark a player as captain (with API call)
    async function markAsCaptain(playerId) {
        // Check if the player is selected (checkbox is checked)
        const checkbox = document.querySelector(`.player-checkbox[data-player-id="${playerId}"]`);
        if (!checkbox?.checked) {
            return;
        }

        // Store the current captain element before making any changes
        const previousCaptain = document.querySelector('.player-grid.captain');

        // Update the UI first
        markCaptainVisually(playerId);

        // Call the API to update the captain
        const gameweekId = document.getElementById('gameweekDropdown').value;
        try {

            disableAllControls(); 
            const response = await fetch(`${config.backendUrl}/UserTeamPlayers/updateCaptainByGameweekAndSquad`, addAuthHeader({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ gameweekId: gameweekId, userSquadId: squadId, playerId: playerId })
            }));

            if (!response.ok) {
                // If API call fails, revert the UI changes by restoring the previous captain (if any)
                const currentCaptain = document.querySelector(`.captain-button[data-player-id="${playerId}"]`)?.closest('.player-grid');
                if (currentCaptain) {
                    currentCaptain.classList.remove('captain');
                }

                if (previousCaptain) {
                    previousCaptain.classList.add('captain');
                }

                // Try to get the error message from the response
                let errorText;
                try {
                    errorText = await response.text();
                } catch (e) {
                    errorText = response.statusText;
                }

                // Display error message
                alert(`Failed to set captain: ${errorText}`);
                console.error('Failed to update captain:', response.status, response.statusText);
            }
        } catch (error) {
            // If an exception occurs, also revert the UI changes
            const currentCaptain = document.querySelector(`.captain-button[data-player-id="${playerId}"]`)?.closest('.player-grid');
            if (currentCaptain) {
                currentCaptain.classList.remove('captain');
            }

            if (previousCaptain) {
                previousCaptain.classList.add('captain');
            }

            // Display generic error message
            alert('Error setting captain. Please try again later.');
            console.error('Error updating captain:', error);
        } finally {
            enableAllControls(); // Re-enable all controls
        }
    }

    async function selectPlayer(playerId, isUserInteraction) {
        const checkbox = document.querySelector(`.player-checkbox[data-player-id="${playerId}"]`);
        const playerDiv = checkbox?.closest('.player-grid');

        // Call the API to add the player to the team only if it's a user interaction
        if (isUserInteraction) {

            const gameweekId = document.getElementById('gameweekDropdown').value;
            try {
                disableAllControls();
                const response = await fetch(`${config.backendUrl}/UserTeamPlayers/AddByGameweekAndSquad`, addAuthHeader({
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ gameweekId: gameweekId, userSquadId: squadId, playerId: playerId })
                }));
                if (response.status === 401) {
                    console.error('Authentication error: Unauthorized access (401)');
                    // Redirect to the root site
                    window.location.href = '/';
                    return;
                }
                if (response.status === 400) { // BadRequest
                    // Get the error message from the response
                    const errorMessage = await response.text();
                    alert(errorMessage);

                    // Revert the checkbox state
                    if (checkbox) {
                        checkbox.checked = false;
                        playerDiv?.classList.remove('selected');
                    }
                    return;
                }

                if (!response.ok) {
                    console.error('Failed to add player to team:', response.status, response.statusText);
                    // Revert the checkbox state
                    if (checkbox) {
                        checkbox.checked = false;
                        playerDiv?.classList.remove('selected');
                    }
                    return;
                }

                // Only update UI if the API call was successful
                if (checkbox) {
                    checkbox.checked = true;
                    playerDiv?.classList.add('selected');
                }
            } catch (error) {
                console.error('Error adding player to team:', error);
                // Revert the checkbox state
                if (checkbox) {
                    checkbox.checked = false;
                    playerDiv?.classList.remove('selected');
                }
            } finally {
                enableAllControls(); // Re-enable all controls
            }
        } else {
            // For non-user interactions, just update the UI
            if (checkbox) {
                checkbox.checked = true;
                playerDiv?.classList.add('selected');
            }
        }
    }

    // Deselect a player
    async function deselectPlayer(playerId) {
        const checkbox = document.querySelector(`.player-checkbox[data-player-id="${playerId}"]`);
        const playerDiv = checkbox?.closest('.player-grid');

        const gameweekId = document.getElementById('gameweekDropdown').value;
        try {
            disableAllControls(); 
            const response = await fetch(`${config.backendUrl}/UserTeamPlayers/DeleteByGameweekAndSquad`, addAuthHeader({
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ gameweekId: gameweekId, userSquadId: squadId, playerId: playerId })
            }));
            if (response.status === 401) {
                console.error('Authentication error: Unauthorized access (401)');
                // Redirect to the root site
                window.location.href = '/';
                return;
            }
            if (response.status === 400) { // BadRequest
                // Get the error message from the response
                const errorMessage = await response.text();
                alert(errorMessage);

                // Revert the checkbox state
                if (checkbox) {
                    checkbox.checked = true;
                    playerDiv?.classList.add('selected');
                }
                return;
            }

            if (!response.ok) {
                console.error('Failed to remove player from team:', response.status, response.statusText);
                // Revert the checkbox state
                if (checkbox) {
                    checkbox.checked = true;
                    playerDiv?.classList.add('selected');
                }
                return;
            }

            // Only update UI if the API call was successful
            if (checkbox) {
                checkbox.checked = false;
                playerDiv?.classList.remove('selected');
            }
        } catch (error) {
            console.error('Error removing player from team:', error);
            // Revert the checkbox state
            if (checkbox) {
                checkbox.checked = true;
                playerDiv?.classList.add('selected');
            }
        } finally {
            enableAllControls(); // Re-enable all controls
        }
    }

    function setView(newView) {
        const listView = document.getElementById('playerGrid');
        const pitchView = document.getElementById('pitchView');
        const viewToggleBtn = document.getElementById('viewToggleBtn');

        if (newView === 'pitch') {
            // Switch to pitch view
            listView.classList.add('hidden');
            pitchView.classList.add('active');
            if (viewToggleBtn) {
                viewToggleBtn.innerHTML = '<i class="fas fa-th-list"></i>';
                viewToggleBtn.setAttribute('title', 'Switch to List View');
            }
            currentView = 'pitch';
            document.body.classList.add('pitch-view-active');
            renderPitchView();
        } else {
            // Switch to list view
            listView.classList.remove('hidden');
            pitchView.classList.remove('active');
            if (viewToggleBtn) {
                viewToggleBtn.innerHTML = '<i class="fas fa-futbol"></i>';
                viewToggleBtn.setAttribute('title', 'Switch to Pitch View');
            }
            currentView = 'list';
            document.body.classList.remove('pitch-view-active');
        }
    }

    function setupViewToggle() {
        // Remove any old toggle container if it exists
        const oldToggleContainer = document.querySelector('.view-toggle-container');
        if (oldToggleContainer) {
            oldToggleContainer.remove();
        }

        // Create the button if it doesn't already exist
        let viewToggleBtn = document.getElementById('viewToggleBtn');
        if (!viewToggleBtn) {
            viewToggleBtn = document.createElement('button');
            viewToggleBtn.className = 'view-toggle-round-btn';
            viewToggleBtn.id = 'viewToggleBtn';
            viewToggleBtn.innerHTML = '<i class="fas fa-futbol"></i>'; // Football icon to start in list view
            viewToggleBtn.setAttribute('title', 'Switch to Pitch View');
            viewToggleBtn.setAttribute('aria-label', 'Switch View');
            document.body.appendChild(viewToggleBtn);
        }

        // Click event to switch between pitch <--> list
        viewToggleBtn.addEventListener('click', function () {
            setView(currentView === 'list' ? 'pitch' : 'list');
        });
    }

    function renderPitchView() {
        console.log("Rendering vertical pitch view..."); // Debug log

        const pitchContainer = document.querySelector('.pitch-view-container');
        if (!pitchContainer) {
            console.error('Pitch view container not found');
            return;
        }

        const existingNoPlayersMsg = pitchContainer.querySelector('.no-players-message');
        if (existingNoPlayersMsg) {
            existingNoPlayersMsg.remove();
        }

        // Clear any existing players
        const existingPlayers = pitchContainer.querySelectorAll('.pitch-player');
        existingPlayers.forEach(player => player.remove());

        // Get all selected checkboxes
        const checkboxes = document.querySelectorAll('.player-checkbox:checked');
        console.log(`Found ${checkboxes.length} selected players`); // Debug log

        if (checkboxes.length === 0) {
            // Add a message if no players are selected
            const noPlayersMsg = document.createElement('div');
            noPlayersMsg.className = 'no-players-message';
            noPlayersMsg.textContent = 'No players selected. Please select players in the list view.';
            noPlayersMsg.style.position = 'absolute';
            noPlayersMsg.style.top = '50%';
            noPlayersMsg.style.left = '50%';
            noPlayersMsg.style.transform = 'translate(-50%, -50%)';
            noPlayersMsg.style.color = 'white';
            noPlayersMsg.style.background = 'rgba(0,0,0,0.7)';
            noPlayersMsg.style.padding = '10px 20px';
            noPlayersMsg.style.borderRadius = '5px';
            pitchContainer.appendChild(noPlayersMsg);
            return;
        }

        // Get players by position
        const playersByPosition = {
            'GK': [], 'DEF': [], 'WB': [], 'DM': [], 'MID': [], 'AM': [], 'FW': []
        };

        // Collect all players by position
        checkboxes.forEach(checkbox => {
            const playerId = checkbox.getAttribute('data-player-id');
            const playerDiv = checkbox.closest('.player-grid');

            if (!playerDiv) {
                console.error(`Player div not found for checkbox with ID: ${playerId}`);
                return;
            }

            // Extract player information
            const playerNameElement = playerDiv.querySelector('.player-name-long');
            if (!playerNameElement) {
                console.error(`Player name element not found for player ID: ${playerId}`);
                return;
            }

            const playerName = playerNameElement.textContent;
            const photoImg = playerDiv.querySelector('.player-photo');

            // Extract photo ID
            let photoIdPart = '0'; // Default value
            if (photoImg && photoImg.src) {
                // Get the filename part of the URL
                const urlParts = photoImg.src.split('/');
                const filename = urlParts[urlParts.length - 1];

                // Extract the ID part (remove the 'p' prefix and the 'png' suffix)
                if (filename.startsWith('p') && filename.endsWith('png')) {
                    photoIdPart = filename.slice(1, -3); // Remove 'p' and 'png'
                }
            }

            // Determine if player is captain
            const isCaptain = playerDiv.classList.contains('captain');

            // Get the position by finding the parent section
            const positionSection = playerDiv.closest('.position-section');
            if (!positionSection) {
                console.error(`Position section not found for player: ${playerName}`);
                return;
            }

            const position = positionSection.id;

            // Skip if not a valid position
            if (!playersByPosition.hasOwnProperty(position)) {
                console.warn(`Unknown position '${position}' for player: ${playerName}`);
                return;
            }

            // Add to position array
            playersByPosition[position].push({
                id: playerId,
                name: playerName,
                photoId: photoIdPart,
                isCaptain: isCaptain,
                position: position
            });
        });

        // Position players on the pitch
        // First, handle GK (Goalkeeper)
        positionPlayers(playersByPosition['GK'], 10, pitchContainer);

        // Special handling for DEF and WB together on same line
        const defPlayers = [...playersByPosition['DEF']];
        const wbPlayers = [...playersByPosition['WB']];

        // Combine DEF and WB, placing WBs at the edges
        const defensiveLine = [];

        // Add first WB to the left if available
        if (wbPlayers.length > 0) {
            const leftWB = wbPlayers.shift();
            leftWB.position = 'WB';  // Ensure proper position class
            defensiveLine.push(leftWB);
        }

        // Add all DEF players in the middle
        defPlayers.forEach(defender => {
            defender.position = 'DEF';  // Ensure proper position class
            defensiveLine.push(defender);
        });

        // Add last WB to the right if available
        if (wbPlayers.length > 0) {
            const rightWB = wbPlayers.shift();
            rightWB.position = 'WB';  // Ensure proper position class
            defensiveLine.push(rightWB);
        }

        // Position the combined defensive line
        positionPlayers(defensiveLine, 25, pitchContainer, 120);  // Use wider spread (90%)

        // Handle remaining positions normally with increased spacing
        positionPlayers(playersByPosition['DM'], 45, pitchContainer, 120);
        positionPlayers(playersByPosition['MID'], 55, pitchContainer, 120);
        positionPlayers(playersByPosition['AM'], 65, pitchContainer, 120);
        positionPlayers(playersByPosition['FW'], 80, pitchContainer, 120);
    }

    // Helper function to position players horizontally with customizable spread
    function positionPlayers(players, topPercentage, container, spreadPercentage = 80) {
        const count = players.length;

        players.forEach((player, index) => {
            // Create player element
            const playerElement = document.createElement('div');
            playerElement.className = `pitch-player ${player.position} pos-${index + 1}`;

            // Calculate horizontal position (centered, with spread if multiple players)
            let leftPos = 50; // center by default
            if (count > 1) {
                // Distribute players horizontally with specified spread
                const step = spreadPercentage / (count + 1);
                leftPos = (100 - spreadPercentage) / 2 + ((index + 1) * step);
            }

            // Set positioning
            playerElement.style.top = `${topPercentage}%`;
            playerElement.style.left = `${leftPos}%`;

            // Add captain class if player is captain
            if (player.isCaptain) {
                playerElement.classList.add('captain');
            }

            // Create inner elements with correctly formatted photo URL
            playerElement.innerHTML = `
            <div class="pitch-player-inner">
                <img src="https://resources.premierleague.com/premierleague/photos/players/40x40/p${player.photoId}png" 
                     alt="${player.name}" class="pitch-player-photo">
                <div class="pitch-player-name">${player.name}</div>
            </div>
        `;

            // Add to pitch
            container.appendChild(playerElement);
            console.log(`Added player to pitch: ${player.name} (${player.position}) at position ${leftPos}%`); // Debug log
        });
    }

    // Event listener for the up arrow (previous gameweek)
    gameweekLeftArrow.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering the button click
        const currentIndex = gameweekDropdown.selectedIndex;
        updateGameweek(currentIndex - 1); // Move to the previous gameweek
    });

    // Event listener for the right arrow (next gameweek)
    gameweekRightArrow.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering the button click
        const currentIndex = gameweekDropdown.selectedIndex;
        updateGameweek(currentIndex + 1); // Move to the next gameweek
    });


    fixturesToggle.addEventListener('click', function () {
        teamLayout.classList.toggle('fixtures-open');

        // Change the icon based on state
        const icon = this.querySelector('i');
        if (teamLayout.classList.contains('fixtures-open')) {
            icon.className = 'fas fa-times'; // X icon when open
        } else {
            icon.className = 'fas fa-calendar-alt'; // Calendar icon when closed
        }
    });

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
        draftPeriodId = draftPeriodDropdown.value;
        fetchAndDisplayPendingTransfers();
        await fetchAndPopulateGameweeks(draftPeriodId);
        fetchAndDisplayFixtures(gameweekDropdown.value);        
        squadId = await fetchSquadId();
        await fetchAndDisplaySquadPlayers(squadId);
        setupViewToggle();

        filterDraftPeriodDropdown.addEventListener('change', async function () {
            draftPeriodId = this.value;
            await fetchAndPopulateGameweeks(this.value);

            fetchAndDisplayPendingTransfers();
            fetchAndDisplayFixtures(gameweekDropdown.value);
            squadId = await fetchSquadId();
            await fetchAndDisplaySquadPlayers(squadId);
        });

        leagueDropdown.addEventListener('change', async function () {
            leagueId = this.value;

            localStorage.setItem('leagueId', leagueId);
            // Also fetch draft periods when league changes
            fetchAndDisplayPendingTransfers();
            //await fetchDraftPeriods(draftPeriodDropdown);
            fetchAndDisplayFixtures(gameweekDropdown.value);
            squadId = await fetchSquadId();
            await fetchAndDisplaySquadPlayers(squadId);
        });
        // Initial check for screen width
        //checkScreenWidth();
    }
    await initializePage();

    // Check screen width on page load to determine initial state
    function checkScreenWidth() {
        if (window.innerWidth >= 1200) {
            // On larger screens, start with fixtures visible
            teamLayout.classList.remove('fixtures-open');
            fixturesToggle.style.display = 'none';
        } else {
            // On smaller screens, start with fixtures hidden only if not already shown by fixturesToggle
            if (!teamLayout.classList.contains('fixtures-open')) {
                teamLayout.classList.remove('fixtures-open');
            }
            fixturesToggle.style.display = 'flex';
        }
    }

    // Initial check and setup
    //checkScreenWidth();

    // Re-check when window is resized
    //window.addEventListener('resize', checkScreenWidth);
});
