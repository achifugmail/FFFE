import { setupPlayerPhotoInteractions } from './common.js';
import config from './config.js';
import { addAuthHeader } from './config.js';
import { fetchLeagues } from './common.js';
import { fetchDraftPeriods } from './common.js';
import { fetchPositions } from './common.js';

let draftPeriodStartDate = null;
let outPlayerId = null;
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
    const viewToggleButton = document.getElementById('viewToggleButton');

    let transfersLoaded = false;

    let allPlayers = [];
    let otherUsersSquadPlayers = [];
    let viewMode = 'squad'; // 'squad' or 'all'

    // Add this function to fetch all players (both available and from other users)
    async function fetchAllPlayers() {
        try {
            // Fetch available players
            const availableResponse = await fetch(`${config.backendUrl}/PlayerPositions/available-players-with-positions/${leagueId}/${draftPeriodId}`, addAuthHeader());

            // Fetch players in users' squads
            const usersSquadResponse = await fetch(`${config.backendUrl}/PlayerPositions/league-user-squad-players/${leagueId}`, addAuthHeader());

            if (!availableResponse.ok || !usersSquadResponse.ok) {
                console.error('Failed to fetch all players:',
                    availableResponse.status, availableResponse.statusText,
                    usersSquadResponse.status, usersSquadResponse.statusText);
                return;
            }

            // Process the responses
            const availablePlayers = await availableResponse.json();
            const usersSquadPlayers = await usersSquadResponse.json();

            // Store all players
            allPlayers = availablePlayers;

            // Filter other users' squad players (excluding current user's players)
            otherUsersSquadPlayers = usersSquadPlayers.filter(player =>
                player.userId.toString() !== currentUserId);

            // Add other users' players to allPlayers (if they're not already included)
            otherUsersSquadPlayers.forEach(player => {
                if (!allPlayers.some(p => p.id === player.id)) {
                    allPlayers.push(player);
                }
            });

            if (viewToggleButton) {
                viewToggleButton.disabled = false;
                viewToggleButton.style.opacity = 1;                
                viewToggleButton.classList.remove('disabled-during-fetch');
            }
        } catch (error) {
            console.error('Error fetching all players:', error);
        }
    }

    function displayAllPlayersView() {
        // Hide the regular squad view
        const teamLayout = document.querySelector('.team-layout');
        teamLayout.style.display = viewMode === 'squad' ? 'grid' : 'none';

        // Show or hide the all players view
        let allPlayersContainer = document.getElementById('allPlayersContainer');

        if (!allPlayersContainer && viewMode === 'all') {
            // Create the container if it doesn't exist
            allPlayersContainer = document.createElement('div');
            allPlayersContainer.id = 'allPlayersContainer';
            allPlayersContainer.className = 'container';
            teamLayout.parentNode.insertBefore(allPlayersContainer, teamLayout.nextSibling);

            // Create position sections
            positions.forEach(position => {
                const section = document.createElement('div');
                // Change the class to match the squad view
                section.className = 'section position-section';
                section.id = `all-${position.name}`;
                // Add data-position attribute for the decorative label
                section.setAttribute('data-position', position.name);

                // Container for players
                const playersContainer = document.createElement('div');
                playersContainer.className = 'players'; // Changed from 'all-players-list' to 'players'
                section.appendChild(playersContainer);

                allPlayersContainer.appendChild(section);
            });
        }

        if (allPlayersContainer) {
            allPlayersContainer.style.display = viewMode === 'all' ? 'block' : 'none';
        }

        if (viewMode === 'all') {
            // Populate the sections with players
            positions.forEach(position => {
                const section = document.getElementById(`all-${position.name}`);
                const playersContainer = section.querySelector('.players'); // Changed from '.all-players-list' to '.players'

                // Clear existing content
                playersContainer.innerHTML = '';

                // Filter players by position
                let positionPlayers = allPlayers.filter(player => player.positionName === position.name);

                // Sort players by points in descending order
                positionPlayers.sort((a, b) => {
                    // Handle null or undefined points
                    const pointsA = a.points || 0;
                    const pointsB = b.points || 0;
                    return pointsB - pointsA; // Descending order
                });

                // Add players to the section
                positionPlayers.forEach(player => {
                    const playerDiv = createPlayerDivForAllView(player, otherUsersSquadPlayers.some(p => p.id === player.id));
                    playersContainer.appendChild(playerDiv);
                });

                // Add empty player rows if needed (similar to the squad view)
                const totalPlayersInSection = positionPlayers.length;
                // Find the corresponding position to get maxInSquad
                const positionObj = positions.find(p => p.name === position.name);
                if (positionObj && positionObj.maxInSquad) {
                    for (let i = totalPlayersInSection; i < positionObj.maxInSquad; i++) {
                        const emptyRow = document.createElement('div');
                        emptyRow.className = 'player-row';
                        emptyRow.innerText = 'Empty';
                        playersContainer.appendChild(emptyRow);
                    }
                }
            });

            // Call setupPlayerPhotoInteractions to add click handlers to all player photos and names
            setupPlayerPhotoInteractions();
        }
    }

    function createPlayerDivForAllView(player, isInOtherSquad = false) {
        const playerDiv = document.createElement('div');
        playerDiv.className = `player-grid ${isInOtherSquad ? 'player-in-other-squad' : ''}`;
        playerDiv.setAttribute('data-player', JSON.stringify(player));

        // Format the player's score for display
        const playerScore = player.points || 0;
        let formattedScore;
        if (Number.isInteger(playerScore)) {
            formattedScore = playerScore.toString();
        } else {
            formattedScore = playerScore.toFixed(1);
        }

        // Check if the score has a decimal point and add appropriate class
        const hasDecimal = formattedScore.includes(".");
        const scoreClass = hasDecimal ? "player-score decimal" : "player-score";

        // Add squad information if player is in another user's squad
        const squadInfo = isInOtherSquad ?
            `<div class="player-squad-info">${player.squadName || 'Unknown Squad'}</div>` : '';

        // Add plus button for initiating transfers (will handle click events separately)
        const addButton = `<button class="transfer-player-button" data-player-id="${player.id}" data-position="${player.positionName}">+</button>`;

        playerDiv.innerHTML = `
        ${addButton}
        <img src="https://resources.premierleague.com/premierleague/photos/players/40x40/p${player.photo.slice(0, -3)}png" alt="Player Photo" class="player-photo">
        <span class="player-name-long">${player.webName}</span>
        ${squadInfo}
        ${getPlayerStatusIcon(player)}
        <span class="${scoreClass}">${formattedScore}</span>
        ${getPlayerFormIndicator(player)}        
    `;

        return playerDiv;
    }

    async function showTransferOptions(playerId, positionName, isInOtherSquad) {
        // Find the target player from allPlayers array
        const targetPlayer = allPlayers.find(p => p.id === parseInt(playerId));
        if (!targetPlayer) {
            console.error('Player not found:', playerId);
            return;
        }

        // Create a modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'transfer-overlay';
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });

        // Create the transfer modal
        const modal = document.createElement('div');
        modal.className = 'transfer-modal';

        // Create header with player info
        const header = document.createElement('div');
        header.className = 'transfer-modal-header';
        header.innerHTML = `
        <img src="https://resources.premierleague.com/premierleague/photos/players/40x40/p${targetPlayer.photo.slice(0, -3)}png" 
            alt="${targetPlayer.webName}" class="player-photo">
        <h3>${targetPlayer.webName}</h3>
        <span>${positionName}</span>
        <button class="close-modal-btn">&times;</button>
    `;

        // Close button functionality
        header.querySelector('.close-modal-btn').addEventListener('click', () => {
            overlay.remove();
        });

        // Create the content area
        const content = document.createElement('div');
        content.className = 'transfer-modal-content';

        // Set initial loading state
        content.innerHTML = '<div class="loading">Loading your squad players...</div>';

        // Add components to the page
        modal.appendChild(header);
        modal.appendChild(content);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        try {
            // Filter current user's squad players by position
            const myPositionPlayers = squadPlayers.filter(p => p.positionName === positionName);

            if (myPositionPlayers.length === 0) {
                content.innerHTML = '<div class="no-players">You have no players in this position available to swap.</div>';
                return;
            }

            // Determine if this is a direct add or a swap
            if (isInOtherSquad) {
                // This is a swap - show the player selection UI
                content.innerHTML = `
                <p>Select one of your players to swap out:</p>
                <div class="swap-players-list"></div>
                <div class="transfer-modal-buttons">
                    <button class="cancel-transfer-btn">Cancel</button>
                </div>
            `;

                const playersList = content.querySelector('.swap-players-list');

                // Add each of the user's players as options
                myPositionPlayers.forEach(player => {
                    const playerOption = document.createElement('div');
                    playerOption.className = 'swap-player-option';
                    playerOption.setAttribute('data-player-id', player.id);

                    playerOption.innerHTML = `
                    <img src="https://resources.premierleague.com/premierleague/photos/players/40x40/p${player.photo.slice(0, -3)}png" 
                         alt="${player.webName}" class="player-photo">
                    <span class="player-name">${player.webName}</span>
                    <span class="player-score">${player.points || 0}</span>
                `;

                    // Add click event to select this player for swap
                    playerOption.addEventListener('click', () => {
                        // Confirm the swap
                        confirmTransfer(player, targetPlayer, true);
                        overlay.remove();
                    });

                    playersList.appendChild(playerOption);
                });

                // Add cancel button functionality
                content.querySelector('.cancel-transfer-btn').addEventListener('click', () => {
                    overlay.remove();
                });
            } else {
                // This is a direct add - show confirmation UI
                content.innerHTML = `
                <p>Add this player to your squad?</p>
                <div class="transfer-modal-buttons">
                    <button class="confirm-transfer-btn">Add Player</button>
                    <button class="cancel-transfer-btn">Cancel</button>
                </div>
            `;

                // Add confirm button functionality
                content.querySelector('.confirm-transfer-btn').addEventListener('click', () => {
                    // If no position is full, add directly
                    if (myPositionPlayers.length < getMaxSquadPlayersForPosition(positionName)) {
                        // Direct add
                        addPlayerToSquad(playerId, squadId, positionName);
                        overlay.remove();
                    } else {
                        // Need to select a player to replace
                        content.innerHTML = `
                        <p>Your squad is full for this position. Select a player to replace:</p>
                        <div class="swap-players-list"></div>
                        <div class="transfer-modal-buttons">
                            <button class="cancel-transfer-btn">Cancel</button>
                        </div>
                    `;

                        const playersList = content.querySelector('.swap-players-list');

                        // Add each of the user's players as options
                        myPositionPlayers.forEach(player => {
                            const playerOption = document.createElement('div');
                            playerOption.className = 'swap-player-option';
                            playerOption.setAttribute('data-player-id', player.id);

                            playerOption.innerHTML = `
                            <img src="https://resources.premierleague.com/premierleague/photos/players/40x40/p${player.photo.slice(0, -3)}png" 
                                 alt="${player.webName}" class="player-photo">
                            <span class="player-name">${player.webName}</span>
                            <span class="player-score">${player.points || 0}</span>
                        `;

                            // Add click event to select this player to replace
                            playerOption.addEventListener('click', () => {
                                // Set outPlayerId and perform swap
                                outPlayerId = player.id;
                                addPlayerToSquad(playerId, squadId, positionName);
                                overlay.remove();
                            });

                            playersList.appendChild(playerOption);
                        });

                        // Add cancel button functionality
                        content.querySelector('.cancel-transfer-btn').addEventListener('click', () => {
                            overlay.remove();
                        });
                    }
                });

                // Add cancel button functionality
                content.querySelector('.cancel-transfer-btn').addEventListener('click', () => {
                    overlay.remove();
                });
            }
        } catch (error) {
            console.error('Error showing transfer options:', error);
            content.innerHTML = `<div class="error">Error: ${error.message}</div>`;
        }
    }

    // Helper function to get max players allowed for a position
    function getMaxSquadPlayersForPosition(positionName) {
        const position = positions.find(p => p.name === positionName);
        return position ? position.maxInSquad : 1;
    }

    // Function to confirm transfers and handle API calls
    async function confirmTransfer(playerOut, playerIn, isSwap) {
        if (isSwap) {
            try {
                // Prepare swap request payload
                const payload = {
                    fromUserSquadId: squadId,
                    toUserSquadId: playerIn.squadId,
                    playerInId: playerIn.id,
                    playerOutId: playerOut.id
                };

                // Display loading/progress indicator
                const progressIndicator = document.createElement('div');
                progressIndicator.className = 'transfer-progress';
                progressIndicator.innerHTML = '<div class="spinner"></div><p>Sending swap proposal...</p>';
                document.body.appendChild(progressIndicator);

                // Send the swap request
                const response = await fetch(`${config.backendUrl}/Transfers/propose-swap`, addAuthHeader({
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                }));

                // Remove the progress indicator
                progressIndicator.remove();

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || 'Failed to propose swap');
                }

                // Display success message
                alert('Swap proposal sent successfully!');

                // Refresh pending transfers to show the new proposal
                await fetchAndDisplayPendingTransfers();

            } catch (error) {
                console.error('Error proposing swap:', error);
                alert(`Error proposing swap: ${error.message}`);
            }
        } else {
            // For direct adds, we use the existing addPlayerToSquad function
            // This is handled in the showTransferOptions function
        }
    }

    function setupViewToggleButton() {
        const viewToggleButton = document.getElementById('viewToggleButton');
        if (!viewToggleButton) {
            console.error('viewToggleButton not found in HTML');
            return;
        }

        viewToggleButton.title = 'Toggle between squad view and all players view';
        viewToggleButton.addEventListener('click', function () {
            viewMode = viewMode === 'squad' ? 'all' : 'squad';

            // Update button icon based on current view
            const icon = this.querySelector('i');
            // When in squad view, show the outward arrow (to go to all players)
            // When in all players view, show the inward arrow (to go back to squad)
            icon.className = viewMode === 'squad' ?
                'fa-solid fa-arrow-right-to-bracket' :
                'fa-solid fa-arrow-right-from-bracket';

            // If switching to 'all' view, fetch all players if not already loaded
            if (viewMode === 'all' && allPlayers.length === 0) {
                fetchAllPlayers();
            }
            displayAllPlayersView();
        });
    }
    
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
        try {
            // First fetch the pending transfers data
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

            // Check if there are any pending transfers before creating container
            if (transfersToMe.length === 0 && transfersFromMe.length === 0) {
                // No pending transfers - remove the container if it exists
                const existingContainer = document.getElementById('pendingTransfersContainer');
                if (existingContainer) {
                    existingContainer.remove();
                }
                return;
            }

            // Only create container if there are pending transfers
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
            let actionText = action === 'accept' ? 'accepted' :
                action === 'reject' ? 'rejected' : 'cancelled';
            alert(`Transfer ${actionText} successfully!`);

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

        if (squadId) {
            await fetchAndCreateSections();
            //await fetchSquadDetails();
            await fetchAndDisplaySquadPlayers(squadId, leagueId);
            await fetchAndDisplayTransfers(squadId);
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
            const playerGrid = document.getElementById('playerGrid');
            playerGrid.innerHTML = '';

            positions.forEach(position => {
                const section = document.createElement('div');
                // Change from 'section' class to 'section position-section'
                section.className = 'section position-section';
                section.id = position.name;
                // Add data-position attribute for the decorative label
                section.setAttribute('data-position', position.name);

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
                    <img src="https://resources.premierleague.com/premierleague/photos/players/40x40/p${player.photo.slice(0, -3)}png" alt="Player Photo" class="player-photo">
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
                playerDiv.setAttribute('data-player', JSON.stringify(player));

                playerDiv.innerHTML = `
                <button class="${isPlayerInSquad ? 'remove-player-button' : 'add-player-button'}" data-player-id="${player.id}" data-position="${position.name}">${isPlayerInSquad ? '-' : '+'}</button>
                <img src="https://resources.premierleague.com/premierleague/photos/players/40x40/p${player.photo.slice(0, -3)}png" alt="Player Photo" class="player-photo">
                <span class="player-name">${player.webName}</span>
                ${getPlayerStatusIcon(player)}
                ${getPlayerFormIndicator(player)}
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

    document.addEventListener('click', async function (event) {
        if (event.target.classList.contains('add-button')) {
            const position = event.target.getAttribute('data-position');
            await fetchAndDisplayAvailablePlayers(position, leagueId, draftPeriodId);
        }
    });

    // Add event listener for transfer buttons in all players view
    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('transfer-player-button')) {
            const playerId = event.target.getAttribute('data-player-id');
            const position = event.target.getAttribute('data-position');
            const playerDiv = event.target.closest('.player-grid');
            const isInOtherSquad = playerDiv.classList.contains('player-in-other-squad');

            showTransferOptions(playerId, position, isInOtherSquad);
        }
    });

    async function initializePage() {
        // Existing code remains the same

        if (!leagueId) {
            console.log('No leagueId found, waiting for league fetch');
            await fetchLeagues(leagueDropdown);
        }
        else {
            fetchLeagues(leagueDropdown);
        }
        
        if (viewToggleButton) {
            viewToggleButton.disabled = true;
            viewToggleButton.style.opacity = 0.5;
            viewToggleButton.classList.add('disabled-during-fetch');
        }

        await fetchDraftPeriods(draftPeriodDropdown);
        const selectedOption = draftPeriodDropdown.options[draftPeriodDropdown.selectedIndex];
        draftPeriodStartDate = new Date(selectedOption.getAttribute('data-start-date')).toUTCString();
        draftPeriodId = draftPeriodDropdown.value;
        positions = await fetchPositions();
        await updateSquadId();
        // Add this line to check for active draft after setting draft period ID
        await fetchAndDisplayPendingTransfers();
        await checkForActiveDraft();

        // Add the view toggle button
        setupViewToggleButton();
        fetchAllPlayers();

        leagueDropdown.addEventListener('change', async function () {
            leagueId = this.value;
            localStorage.setItem('leagueId', leagueId);

            await updateSquadId();
            fetchAndDisplayPendingTransfers();
            await checkForActiveDraft();

            // Reset view to squad when league changes
            viewMode = 'squad';
            displayAllPlayersView();
            document.getElementById('viewToggleButton').querySelector('i').className = 'fa-solid fa-arrow-right-from-bracket';

            // Clear cached data
            allPlayers = [];
            otherUsersSquadPlayers = [];
        });

        draftPeriodDropdown.addEventListener('change', async function () {
            draftPeriodId = this.value;
            const selectedOption = this.options[this.selectedIndex];
            draftPeriodStartDate = new Date(selectedOption.getAttribute('data-start-date')).toUTCString();
            outPlayerId = null;
            await updateSquadId();
            // Add this line to check for active draft when draft period changes
            await fetchAndDisplayPendingTransfers();
            await checkForActiveDraft();

            // Reset view to squad when draft period changes
            viewMode = 'squad';
            displayAllPlayersView();
            document.getElementById('viewToggleButton').querySelector('i').className = 'fa-solid fa-arrow-right-from-bracket';

            // Clear cached data
            allPlayers = [];
            otherUsersSquadPlayers = [];
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
