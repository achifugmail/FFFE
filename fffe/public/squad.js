
import config from './config.js';
import { addAuthHeader } from './config.js';
let draftPeriodStartDate = null;
let outPlayerId = null;

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

    // Modify the checkAndHandleUrlSquadId function to also handle leagueId:
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
                // Convert local time to GMT
                draftPeriodStartDate = new Date(lastDraftPeriod.startDate).toUTCString();
                await updateSquadId();
            }

            draftPeriodDropdown.addEventListener('change', async function () {
                draftPeriodId = this.value;
                const selectedOption = this.options[this.selectedIndex];
                draftPeriodStartDate = new Date(selectedOption.getAttribute('data-start-date')).toUTCString();
                outPlayerId = null; // Reset outPlayerId when changing draft period
                await updateSquadId();
            });
        } catch (error) {
            console.error('Error fetching draft periods:', error);
        }
    }

    async function fetchLeagues() {
        try {
            const response = await fetch(`${config.backendUrl}/Leagues/byUser/${currentUserId}`, addAuthHeader());
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
            }

            leagueDropdown.addEventListener('change', async function () {
                leagueId = this.value;
                await updateSquadId();
            });
        } catch (error) {
            console.error('Error fetching leagues:', error);
        }
    }

    async function fetchSquadId() {
        try {
            const response = await fetch(`${config.backendUrl}/UserSquads/ByLeagueDraftPeriodAndUser/${leagueId}/${draftPeriodId}/${currentUserId}`, addAuthHeader());

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
            /*
            let draftPeriodName = '';
            try {
                const respDraft = await fetch(`${config.backendUrl}/DraftPeriods/${draftPeriodId}`, addAuthHeader());

                if (!respDraft.ok) {
                    console.error('Failed to fetch draft period details:', respDraft.status, respDraft.statusText);
                } else {
                    const draftPeriod = await respDraft.json();
                    draftPeriodName = draftPeriod.name || `Draft ${draftPeriod.id}`;
                }
            } catch (error) {
                console.error('Error fetching draft period details:', error);
            }*/
            /*
            document.getElementById('squadInfo').innerText =
                `${squad.userId}`;
            */
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

    async function fetchAndDisplaySquadPlayers(squadId, leagueId) {
        try {
            const response = await fetch(`${config.backendUrl}/PlayerPositions/user-squad-players/${squadId}`, addAuthHeader());

            if (!response.ok) {
                console.error('Failed to fetch squad players:', response.status, response.statusText);
                return;
            }
            squadPlayers = await response.json();
            const positions = await fetch(`${config.backendUrl}/PlayerPositions/positions`, addAuthHeader()).then(res => res.json());

            positions.forEach(position => {
                const section = document.getElementById(position.name);
                const playersDiv = section.querySelector('.players');
                const playerList = section.querySelector('.player-list'); // Add this line
                playersDiv.innerHTML = '';
                const filteredPlayers = squadPlayers.filter(player => player.positionName === position.name);
                filteredPlayers.forEach(player => {
                    const playerDiv = document.createElement('div');
                    playerDiv.className = 'player-grid';
                    playerDiv.innerHTML = `
                        <img src="https://resources.premierleague.com/premierleague/photos/players/40x40/p${player.photo.slice(0, -3)}png" alt="Player Photo" class="player-photo">
                        <span class="player-name">${player.webName}</span>
                        <button class="remove-player-button" data-player-id="${player.id}" data-position="${position.name}">-</button>
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
        } catch (error) {
            console.error('Error fetching squad players:', error);
        }
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
            playerList.innerHTML = '';
            filteredPlayers.forEach(player => {
                const playerDiv = document.createElement('div');
                playerDiv.className = 'player-grid';
                const isPlayerInSquad = squadPlayers.some(p => p.id === player.id);
                playerDiv.innerHTML = `
                    <img src="https://resources.premierleague.com/premierleague/photos/players/40x40/p${player.photo.slice(0, -3)}png" alt="Player Photo" class="player-photo">
                    <span class="player-name">${player.webName}</span>
                    <button class="${isPlayerInSquad ? 'remove-player-button' : 'add-player-button'}" data-player-id="${player.id}" data-position="${position.name}">${isPlayerInSquad ? '-' : '+'}</button>
                `;
                playerList.appendChild(playerDiv);
            });
            playerList.style.display = 'block';
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

                return `
                <div class="transfer-item">
                    <div class="transfer-date">${date}</div>
                    <div class="transfer-player">
                        <img src="https://resources.premierleague.com/premierleague/photos/players/40x40/p${transfer.playerIn.photo.slice(0, -3)}png" 
                             alt="${transfer.playerIn.webName}" 
                             class="player-photo">
                        <span>${transfer.playerIn.webName}</span>
                    </div>
                    <div class="transfer-arrow">←</div>
                    <div class="transfer-player">
                        <img src="https://resources.premierleague.com/premierleague/photos/players/40x40/p${transfer.playerOut.photo.slice(0, -3)}png" 
                             alt="${transfer.playerOut.webName}" 
                             class="player-photo">
                        <span>${transfer.playerOut.webName}</span>
                    </div>
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
        }
    });

    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('add-player-button')) {
            const playerId = event.target.getAttribute('data-player-id');
            const position = event.target.getAttribute('data-position');
            addPlayerToSquad(playerId, squadId, position);
        } else if (event.target.classList.contains('remove-player-button')) {
            // Check if a swap is already pending
            if (outPlayerId) {
                alert('A player swap is pending. Please complete the swap before removing another player.');
                return;
            }

            const playerId = event.target.getAttribute('data-player-id');
            const position = event.target.getAttribute('data-position');
            removePlayerFromSquad(playerId, squadId, position);
        }
    });

    if (!checkAndHandleUrlSquadId()) {
        await fetchLeagues();
    }

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
