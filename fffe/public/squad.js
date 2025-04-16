import config from './config.js';
import { addAuthHeader } from './config.js';
let draftPeriodStartDate = null;
let outPlayerId = null;
let isDraftInProgress = false;
let draftCheckInterval = null;
let currentLeague = null;


document.addEventListener('DOMContentLoaded', async function () {
    let leagueId;
    let draftPeriodId;
    let squadId;  // Remove the URL parameter assignment
    let squadPlayers = [];
    const currentUserId = localStorage.getItem('userId');

    // Add this near the top of your DOMContentLoaded function, after the variable declarations
    const urlParams = new URLSearchParams(window.location.search);
    const urlLeagueId = urlParams.get('leagueId');
    if (urlLeagueId) {
        leagueId = urlLeagueId;
    }

    let transfersLoaded = false;

    // Later in the code, add the event listener for the toggle button
    document.getElementById('transfersToggle').addEventListener('click', function () {
        const teamLayout = document.querySelector('.team-layout');
        teamLayout.classList.toggle('transfers-open');

        // Change the icon based on state
        const icon = this.querySelector('i');
        if (teamLayout.classList.contains('transfers-open')) {
            icon.className = 'fas fa-times'; // X icon when open

            // Load transfers only if they haven't been loaded yet
            if (!transfersLoaded && squadId) {
                fetchAndDisplayTransfers(squadId);
                transfersLoaded = true;
            }
        } else {
            icon.className = 'fas fa-exchange-alt'; // Exchange icon when closed
        }
    });

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

            // Update UI based on draft status
            updateUIForDraft(league);

            return isDraftInProgress;
        } catch (error) {
            console.error('Error checking for active draft:', error);
            return false;
        }
    }

    // Function to update the UI based on draft status
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

        if (league.currentDraftUserId.toString() === currentUserId) {
            // Current user's turn in the draft
            draftMessageContainer.innerHTML = `
    <div class="draft-message your-turn">
        <div class="your-turn-inline">
            <h3>It's your turn to draft!</h3>
            <p>Make your selection and confirm when ready.</p>
            <button id="confirmDraftSelectionBtn" class="confirm-draft-btn">Ready</button>
        </div>
    </div>
`;
            enableAllButtons();

            // Add event listener to the confirm button
            document.getElementById('confirmDraftSelectionBtn').addEventListener('click', advanceDraft);
        } else {
            // Waiting for another user - horizontally aligned elements
            draftMessageContainer.innerHTML = `
            <div class="draft-message waiting">
                <div class="draft-message-inline">
                    <h3>Draft in progress</h3>
                    <p>Waiting for player ID: ${league.currentDraftUserId}</p>
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

    async function fetchAndDisplayPendingTransfers() {
        const leagueId = document.getElementById('leagueDropdown').value;
        if (!leagueId) return;

        try {
            // Create container for pending transfers if it doesn't exist
            let pendingTransfersContainer = document.getElementById('pendingTransfersContainer');
            if (!pendingTransfersContainer) {
                pendingTransfersContainer = document.createElement('div');
                pendingTransfersContainer.id = 'pendingTransfersContainer';
                pendingTransfersContainer.className = 'pending-transfers-container';

                // Insert after dropdown container and before team layout
                const dropdownContainer = document.querySelector('.dropdown-container');
                const teamLayout = document.querySelector('.team-layout');
                dropdownContainer.parentNode.insertBefore(pendingTransfersContainer, teamLayout);
            }

            // Clear the container
            pendingTransfersContainer.innerHTML = '';

            // Fetch transfers to me
            const responseTo = await fetch(`${config.backendUrl}/Transfers/pending/to-me/${leagueId}`, addAuthHeader());

            // Fetch transfers from me
            const responseFrom = await fetch(`${config.backendUrl}/Transfers/pending/from-me/${leagueId}`, addAuthHeader());

            if (!responseTo.ok || !responseFrom.ok) {
                console.error('Failed to fetch pending transfers');
                return;
            }

            const transfersToMe = await responseTo.json();
            const transfersFromMe = await responseFrom.json();

            // Only show container if there are any pending transfers
            if (transfersToMe.length === 0 && transfersFromMe.length === 0) {
                pendingTransfersContainer.style.display = 'none';
                return;
            }

            pendingTransfersContainer.style.display = 'block';

            // Create header
            const header = document.createElement('div');
            header.className = 'pending-transfers-header';
            header.textContent = 'Pending Transfers';
            pendingTransfersContainer.appendChild(header);

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

        } catch (error) {
            console.error('Error fetching pending transfers:', error);
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

        // Add accept/reject buttons if the transfer is to me
        if (isToMe) {
            const buttonsEl = document.createElement('div');
            buttonsEl.className = 'pending-transfer-buttons';

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

            // Add buttons below player out
            playerOutEl.appendChild(buttonsEl);
        }

        return item;
    }

    // Function to handle accept/reject actions
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

            // If accepted, reload squad data to reflect changes
            if (action === 'accept') {
                await fetchAndDisplaySquadPlayers(squadId, leagueId);
            }

            // Show success message
            alert(`Transfer ${action === 'accept' ? 'accepted' : 'rejected'} successfully!`);

        } catch (error) {
            console.error(`Error ${action}ing transfer:`, error);
            alert(`Failed to ${action} transfer. Please try again.`);
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
            const playerGrid = document.getElementById('playerGrid');
            if (playerGrid) {
                playerGrid.parentNode.insertBefore(container, playerGrid);
            }
        }

        return container;
    }

    // Function to disable all buttons in the page
    function disableAllButtons() {
        const buttons = document.querySelectorAll('button:not(.confirm-draft-btn)');
        buttons.forEach(button => {
            button.disabled = true;
            button.classList.add('disabled-during-draft');
        });
    }

    // Function to enable all buttons in the page
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

    
    function checkAndHandleUrlSquadId() {
        const urlParams = new URLSearchParams(window.location.search);
        const urlSquadId = urlParams.get('id');
        const urlLeagueId = urlParams.get('leagueId');

        if (urlSquadId) {
            // Hide both dropdowns if URL has squadId
            const leagueDropdown = document.getElementById('leagueDropdown');
            const draftPeriodDropdown = document.getElementById('draftPeriodDropdown');
            if (leagueDropdown) leagueDropdown.style.display = 'none';
            if (draftPeriodDropdown) draftPeriodDropdown.style.display = 'none';

            // Set both squadId and leagueId
            squadId = urlSquadId;
            if (urlLeagueId) {
                leagueId = urlLeagueId;
            }

            fetchAndCreateSections();
            fetchSquadDetails();
            fetchAndDisplaySquadPlayers(squadId, leagueId);
            fetchAndDisplayTransfers(squadId);
            return true;
        }
        return false;
    }

    //if (window.self !== window.top) {
    //    document.getElementById('header').style.display = 'none';
    //}

    
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

        if (squadId) {
            await fetchAndCreateSections();
            await fetchSquadDetails();
            await fetchAndDisplaySquadPlayers(squadId, leagueId);
            await fetchAndDisplayTransfers(squadId);
        }
    }


    async function fetchDraftPeriods() {
        try {
            const response = await fetch(`${config.backendUrl}/DraftPeriods`, addAuthHeader());

            if (!response.ok) {
                console.error('Failed to fetch draft periods:', response.status, response.statusText);
                return;
            }
            const draftPeriods = await response.json();
            const draftPeriodDropdown = document.getElementById('draftPeriodDropdown');
            draftPeriodDropdown.innerHTML = '';

            draftPeriods.forEach(period => {
                const option = document.createElement('option');
                option.value = period.id;
                option.text = period.name || `Draft ${period.id}`;
                option.setAttribute('data-start-date', period.startDate);
                draftPeriodDropdown.appendChild(option);
            });

            if (draftPeriods.length > 0) {
                const lastDraftPeriod = draftPeriods[draftPeriods.length - 1];
                draftPeriodDropdown.value = lastDraftPeriod.id;
                draftPeriodId = lastDraftPeriod.id;
                draftPeriodStartDate = new Date(lastDraftPeriod.startDate).toUTCString();
                await updateSquadId();
                // Add this line to check for active draft after setting draft period ID
                await fetchAndDisplayPendingTransfers();
                await checkForActiveDraft();
            }

            draftPeriodDropdown.addEventListener('change', async function () {
                draftPeriodId = this.value;
                const selectedOption = this.options[this.selectedIndex];
                draftPeriodStartDate = new Date(selectedOption.getAttribute('data-start-date')).toUTCString();
                outPlayerId = null;
                await updateSquadId();
                // Add this line to check for active draft when draft period changes
                await fetchAndDisplayPendingTransfers();
                await checkForActiveDraft();
            });
        } catch (error) {
            console.error('Error fetching draft periods:', error);
        }
    }

    async function fetchLeagues() {
        try {
            const response = await fetch(`${config.backendUrl}/Leagues/byUser`, addAuthHeader());
            if (response.status === 401) {
                console.error('Authentication error: Unauthorized access (401)');
                window.location.href = '/';
                return;
            }
            if (!response.ok) {
                console.error('Failed to fetch leagues:', response.status, response.statusText);
                return;
            }
            const leagues = await response.json();
            const leagueDropdown = document.getElementById('leagueDropdown');
            leagueDropdown.innerHTML = '';
            leagues.forEach(league => {
                const option = document.createElement('option');
                option.value = league.id;
                option.text = league.name;
                leagueDropdown.appendChild(option);
            });

            if (leagues.length > 0) {
                leagueDropdown.value = leagues[0].id;
                leagueId = leagues[0].id;
                await fetchDraftPeriods();
                // Add this line to check for active draft after setting league ID
                await checkForActiveDraft();
            }

            leagueDropdown.addEventListener('change', async function () {
                leagueId = this.value;
                await updateSquadId();
                // Add this line to check for active draft when league changes
                fetchAndDisplayPendingTransfers();
                await checkForActiveDraft();
            });
        } catch (error) {
            console.error('Error fetching leagues:', error);
        }
    }

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
            const response = await fetch(`${config.backendUrl}/PlayerPositions/positions`, addAuthHeader());

            if (!response.ok) {
                console.error('Failed to fetch positions:', response.status, response.statusText);
                return;
            }
            const positions = await response.json();
            const playerGrid = document.getElementById('playerGrid');
            playerGrid.innerHTML = '';

            positions.forEach(position => {
                const section = document.createElement('div');
                // Change from 'section' class to 'section position-section'
                section.className = 'section position-section';
                section.id = position.name;
                // Add data-position attribute for the decorative label
                section.setAttribute('data-position', position.name);

                // No need for h3 header anymore since position-section uses a ::before pseudo-element
                // Remove this line:
                // const header = document.createElement('h3');
                // header.innerText = position.name;
                // section.appendChild(header);

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



    async function fetchSquadDetails() {
        try {
            const response = await fetch(`${config.backendUrl}/UserSquads/${squadId}`, addAuthHeader());

            if (!response.ok) {
                console.error('Failed to fetch squad details:', response.status, response.statusText);
                return;
            }
            const squad = await response.json();
            draftPeriodId = squad.draftPeriodId;
            
            if (currentUserId !== squad.userId.toString()) {
                document.body.classList.add('hide-buttons');
            }

            // Update draft period dropdown if it exists
            const draftPeriodDropdown = document.getElementById('draftPeriodDropdown');
            if (draftPeriodDropdown) {
                draftPeriodDropdown.value = draftPeriodId;
            }
        } catch (error) {
            console.error('Error fetching squad details:', error);
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

    async function fetchAndDisplaySquadPlayers(squadId, leagueId) {
        try {
            const response = await fetch(`${config.backendUrl}/PlayerPositions/user-squad-players/${squadId}`, addAuthHeader());

            if (!response.ok) {
                console.error('Failed to fetch squad players:', response.status, response.statusText);
                return;
            }
            squadPlayers = await response.json();

            // Find the maximum TotalScore in the squad for color scaling
            const maxScore = Math.max(...squadPlayers.map(player => player.points || 0));

            const positions = await fetch(`${config.backendUrl}/PlayerPositions/positions`, addAuthHeader()).then(res => res.json());

            positions.forEach(position => {
                const section = document.getElementById(position.name);
                const playersDiv = section.querySelector('.players');
                const playerList = section.querySelector('.player-list');
                playersDiv.innerHTML = '';
                const filteredPlayers = squadPlayers.filter(player => player.positionName === position.name);
                filteredPlayers.forEach(player => {
                    // Get the score for this player (default to 0 if undefined)
                    const playerScore = player.points || 0;

                    // Calculate color based on the score (from red to green)
                    const colorPercent = maxScore > 0 ? (playerScore / maxScore) * 100 : 0;
                    const scoreColor = getScoreColor(colorPercent);

                    const playerDiv = document.createElement('div');
                    playerDiv.className = 'player-grid';
                    
                    playerDiv.innerHTML = `
                    <img src="https://resources.premierleague.com/premierleague/photos/players/40x40/p${player.photo.slice(0, -3)}png" alt="Player Photo" class="player-photo">
                    <span class="player-name">${player.webName}</span>
                    <span class="player-score" style="color: ${scoreColor};">${playerScore}</span>
                    ${getPlayerFormIndicator(player)}
                    ${getPlayerStatusIcon(player)}
                    <button class="remove-player-button" data-player-id="${player.id}" data-position="${position.name}">-</button>
                `;/*
                    playerDiv.innerHTML = `
                    <img src="https://resources.premierleague.com/premierleague/photos/players/40x40/p${player.photo.slice(0, -3)}png" alt="Player Photo" class="player-photo">
                    <span class="player-name">${player.webName}</span>
                    <span class="player-total-score" style="color: ${scoreColor};">${playerScore}</span>
                    ${getPlayerFormIndicator(player)}
                    ${getPlayerStatusIcon(player)}
                    <button class="remove-player-button" data-player-id="${player.id}" data-position="${position.name}"><i class="fas fa-trash-alt"></i></button>
                `;*/
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

    document.addEventListener('click', async function (event) {
        if (event.target.classList.contains('add-button')) {
            const position = event.target.getAttribute('data-position');
            await fetchAndDisplayAvailablePlayers(position, leagueId, draftPeriodId);

            // Scroll the section to the top of the page
            
        }
    });

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
                playerDiv.className = 'player-grid';
                const isPlayerInSquad = squadPlayers.some(p => p.id === player.id);

                playerDiv.innerHTML = `
            <img src="https://resources.premierleague.com/premierleague/photos/players/40x40/p${player.photo.slice(0, -3)}png" alt="Player Photo" class="player-photo">
            <span class="player-name">${player.webName}</span>
            ${getPlayerFormIndicator(player)}
            ${getPlayerStatusIcon(player)}
            <button class="${isPlayerInSquad ? 'remove-player-button' : 'add-player-button'}" data-player-id="${player.id}" data-position="${position.name}">${isPlayerInSquad ? '-' : '+'}</button>
        `;
                playerList.appendChild(playerDiv);
            });
            playerList.style.display = 'block';
            addButton.style.display = 'none'; // Hide the Add button

            
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (error) {
            console.error('Error fetching available players:', error);
        }
    }


    async function addPlayerToSquad(playerId, squadId, position) {
        const now = new Date();
        const draftStart = new Date(draftPeriodStartDate);

        if (now > draftStart && outPlayerId) {
            // After draft has started and we have an outPlayerId, use the swap endpoint
            const payload = {
                squadId: parseInt(squadId),
                outPlayerId: parseInt(outPlayerId),
                inPlayerId: parseInt(playerId)
            };

            try {
                const response = await fetch(`${config.backendUrl}/UserSquads/Transfer`, addAuthHeader({
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                }));

                if (response.status === 400) {
                    const errorMessage = await response.text();
                    alert(`Failed to swap player in squad: ${errorMessage}`);
                    //return;
                } else

                if (!response.ok) {
                    console.error('Failed to swap player in squad:', response.status, response.statusText);
                    //return;
                }

                // Reset outPlayerId after successful swap
                outPlayerId = null;
                // Remove pending-swap class from all sections
                document.querySelectorAll('.section').forEach(section => {
                    section.classList.remove('pending-swap');
                });

            } catch (error) {
                console.error('Error swapping player in squad:', error);
                return;
            }
        } else {
            // Before draft start date or no outPlayerId, proceed with normal addition
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
                    console.error('Failed to add player to squad:', response.status, response.statusText);
                    return;
                }
            } catch (error) {
                console.error('Error adding player to squad:', error);
                return;
            }
        }

        // Refresh the display after either operation
        await fetchAndDisplaySquadPlayers(squadId, leagueId);
        await fetchAndDisplayAvailablePlayers(position, leagueId, draftPeriodId);
    }



    async function removePlayerFromSquad(playerId, squadId, position) {
        // Check if a swap is already pending
        if (outPlayerId) {
            alert('A player swap is pending. Please complete the swap before removing another player.');
            return;
        }

        const now = new Date();
        const draftStart = new Date(draftPeriodStartDate);

        if (now > draftStart) {
            // After draft has started, store the removed player's ID
            outPlayerId = playerId;

            // Get section elements
            const section = document.getElementById(position);
            const addButton = section.querySelector('.add-button');
            const playerList = section.querySelector('.player-list');

            // Show the Add button and available players list
            addButton.style.display = 'block';
            playerList.style.display = 'block';

            // Mark section as pending swap
            section.classList.add('pending-swap');

            // Fetch available players immediately to populate the list
            await fetchAndDisplayAvailablePlayers(position, leagueId, draftPeriodId);

            return;
        }

        // Pre-draft period behavior remains the same
        const payload = {
            userSquadId: parseInt(squadId),
            playerId: parseInt(playerId)
        };

        try {
            const response = await fetch(`${config.backendUrl}/PlayerPositions/delete-user-squad-player`, addAuthHeader({
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }));

            if (!response.ok) {
                console.error('Failed to remove player from squad:', response.status, response.statusText);
                return;
            }

            await fetchAndDisplaySquadPlayers(squadId, leagueId);
            await fetchAndDisplayAvailablePlayers(position, leagueId, draftPeriodId);

            const section = document.getElementById(position);
            const addButton = section.querySelector('.add-button');
            addButton.style.display = 'block';
        } catch (error) {
            console.error('Error removing player from squad:', error);
        }
    }

    async function fetchAndDisplayTransfers(squadId) {
        try {
            const response = await fetch(`${config.backendUrl}/PlayerPositions/squad-transfers/${squadId}`, addAuthHeader());

            if (!response.ok) {
                console.error('Failed to fetch transfers:', response.status, response.statusText);
                return;
            }

            const transfers = await response.json();
            const transfersList = document.getElementById('transfersList');

            if (transfers.length === 0) {
                transfersList.innerHTML = '<div class="no-transfers">No transfers made yet</div>';
                return;
            }

            transfersList.innerHTML = transfers.map(transfer => {
                const date = new Date(transfer.transferDate).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                // Add a CSS class based on the transfer type
                const transferTypeClass = transfer.type ?
                    `transfer-type-${transfer.type.toLowerCase()}` :
                    'transfer-type-standard';

                // Add an icon based on the transfer type
                const transferTypeIcon = transfer.type === 'Swap' ?
                    '<i class="fas fa-sync-alt transfer-type-icon" title="Swap Transfer"></i>' :
                    '<i class="fas fa-arrow-right transfer-type-icon" title="Standard Transfer"></i>';

                // Add status badge if available
                const statusBadge = transfer.status ?
                    `<span class="transfer-status transfer-status-${transfer.status.toLowerCase()}">${transfer.status}</span>` :
                    '';

                return `
            <div class="transfer-item ${transferTypeClass}">
                <div class="transfer-date">
                    ${date} 
                    ${transferTypeIcon}
                    ${statusBadge}
                </div>
                <div class="transfer-player">
                    <img src="https://resources.premierleague.com/premierleague/photos/players/40x40/p${transfer.playerIn.photo.slice(0, -3)}png" 
                         alt="${transfer.playerIn.webName}" 
                         class="player-photo">
                    <span class="player-name">${transfer.playerIn.webName}</span>
                </div>
                <div class="transfer-arrow">←</div>
                <div class="transfer-player">
                    <img src="https://resources.premierleague.com/premierleague/photos/players/40x40/p${transfer.playerOut.photo.slice(0, -3)}png" 
                         alt="${transfer.playerOut.webName}" 
                         class="player-photo">
                    <span class="player-name">${transfer.playerOut.webName}</span>
                </div>
                ${transfer.fromSquad || transfer.toSquad ?
                        `<div class="transfer-squads">
                        ${transfer.fromSquad ? `<span class="from-squad">From: ${transfer.fromSquad}</span>` : ''}
                        ${transfer.toSquad ? `<span class="to-squad">To: ${transfer.toSquad}</span>` : ''}
                    </div>` :
                        ''}
            </div>
        `;
            }).join('');

        } catch (error) {
            console.error('Error fetching transfers:', error);
        }
    }

    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('add-button')) {
            const position = event.target.getAttribute('data-position');
            fetchAndDisplayAvailablePlayers(position, leagueId, draftPeriodId);

            // Scroll the section to the top of the page
            const section = document.getElementById(position);
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });

    document.addEventListener('click', function (event) {
        const playerId = event.target.getAttribute('data-player-id');
        const position = event.target.getAttribute('data-position');

        if (event.target.classList.contains('add-player-button')) {
            addPlayerToSquad(playerId, squadId, position);
        } else if (event.target.classList.contains('remove-player-button')) {
            // Check if a swap is already pending
            if (outPlayerId) {                
                alert('A player swap is pending. Please complete the swap before removing another player.');
                return;
            } 
            event.target.classList.remove('remove-player-button');
            event.target.classList.add('remove-player-button-pending');
            removePlayerFromSquad(playerId, squadId, position);
        } else if (event.target.classList.contains('remove-player-button-pending')) {
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

    //if (!checkAndHandleUrlSquadId()) {
    await fetchLeagues();
    //}

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

    if (leagueId && draftPeriodId) {
        checkForActiveDraft();
    }
});
