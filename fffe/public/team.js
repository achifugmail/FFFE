import config from './config.js';
import { addAuthHeader } from './config.js';

document.addEventListener('DOMContentLoaded', async function () {
    // Fetch draft periods for dropdown
    let draftPeriods = [];
    try {
        const respDrafts = await fetch(`${config.backendUrl}/DraftPeriods`, addAuthHeader());

        if (!respDrafts.ok) {
            console.error('Failed to fetch draft periods:', respDrafts.status, respDrafts.statusText);
        } else {
            draftPeriods = await respDrafts.json();
        }
    } catch (error) {
        console.error('Error fetching draft periods:', error);
    }

    // Populate filter draft period dropdown and set default value
    const filterDraftPeriodDropdown = document.getElementById('filterDraftPeriodDropdown');
    draftPeriods.sort((a, b) => a.name.localeCompare(b.name)).forEach(draft => {
        const option = document.createElement('option');
        option.value = draft.id;
        option.text = draft.name || `Draft ${draft.id}`;
        filterDraftPeriodDropdown.appendChild(option);
    });
    filterDraftPeriodDropdown.value = draftPeriods[draftPeriods.length - 1].id;

    // Fetch and populate gameweeks based on selected draft period
    const gameweekDropdown = document.getElementById('gameweekDropdown');
    async function fetchAndPopulateGameweeks(draftPeriodId) {
        let gameweeks = [];
        try {
            const respGameweeks = await fetch(`${config.backendUrl}/Gameweeks/by-draft-period/${draftPeriodId}`, addAuthHeader());

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

        // Set default value to the first gameweek by start date that has a start date after the current date and time
        const now = new Date();
        const futureGameweeks = gameweeks.filter(gameweek => new Date(gameweek.startDate) > now);
        if (futureGameweeks.length > 0) {
            gameweekDropdown.value = futureGameweeks[0].id;
        } else if (gameweeks.length > 0) {
            gameweekDropdown.value = gameweeks[0].id;
        }
    }

    // Initial population of gameweeks
    await fetchAndPopulateGameweeks(filterDraftPeriodDropdown.value);

    // Update gameweeks when draft period changes
    filterDraftPeriodDropdown.addEventListener('change', async function () {
        await fetchAndPopulateGameweeks(this.value);
        fetchAndDisplaySquadPlayers(squadId);
        updateTeamScoreLink();
    });

    gameweekDropdown.addEventListener('change', function () {
        fetchAndDisplaySquadPlayers(squadId);
        updateTeamScoreLink();
    });

    // Fetch and display squad info
    async function fetchAndDisplaySquadInfo(squadId) {
        try {
            const response = await fetch(`${config.backendUrl}/UserSquads/${squadId}`, addAuthHeader());

            if (!response.ok) {
                console.error('Failed to fetch squad info:', response.status, response.statusText);
                return;
            }
            const squad = await response.json();
            const username = localStorage.getItem('username');
            const squadInfoDiv = document.getElementById('squadInfo');
            squadInfoDiv.innerHTML = `
                <div style="display: flex; gap: 20px; align-items: center;">
                    <h2 style="margin: 0;">Squad: ${squad.squadName}</h2>
                    <span>User: ${username}</span>
                    <span>Draft Period: ${squad.draftPeriodId}</span>
                </div>
            `;
        } catch (error) {
            console.error('Error fetching squad info:', error);
        }
    }

    // Fetch and display players in the current squad
    async function fetchAndDisplaySquadPlayers(squadId) {
        try {
            const gameweekId = document.getElementById('gameweekDropdown').value;
            const response = await fetch(`${config.backendUrl}/PlayerPositions/user-squad-players/${squadId}`, addAuthHeader());

            if (!response.ok) {
                console.error('Failed to fetch squad players:', response.status, response.statusText);
                return;
            }
            const squadPlayers = await response.json();
            const positions = await fetch(`${config.backendUrl}/PlayerPositions/positions`, addAuthHeader()).then(res => res.json());

            const playerGrid = document.getElementById('playerGrid');
            playerGrid.innerHTML = ''; // Clear existing sections

            positions.forEach(position => {
                const section = document.createElement('div');
                section.className = 'section';
                section.id = position.name;

                const header = document.createElement('h3');
                header.innerText = position.name;
                section.appendChild(header);

                const playersDiv = document.createElement('div');
                playersDiv.className = 'players';
                section.appendChild(playersDiv);

                const filteredPlayers = squadPlayers.filter(player => player.positionName === position.name);
                filteredPlayers.forEach(player => {
                    const playerDiv = document.createElement('div');
                    playerDiv.className = 'player-grid';
                    // Replace this part in the fetchAndDisplaySquadPlayers function where the playerDiv is created
                    playerDiv.innerHTML = `
    <input type="checkbox" class="player-checkbox" data-player-id="${player.id}">
    <button class="captain-button" data-player-id="${player.id}"><i class="fas fa-crown"></i></button>
    <img src="https://resources.premierleague.com/premierleague/photos/players/40x40/p${player.photo.slice(0, -3)}png" alt="Player Photo" class="player-photo">
    <span class="player-name">${player.webName}</span>
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
                            markAsCaptain(player.playerId);
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
                    //selectPlayer(playerId, true); // Pass true to indicate user interaction
                });
            });
        } catch (error) {
            console.error('Error fetching squad players:', error);
        }
    }

    // Update player selection highlighting
    function updatePlayerSelection() {
        const checkboxes = document.querySelectorAll('.player-checkbox');
        checkboxes.forEach(checkbox => {
            const playerDiv = checkbox.closest('.player-grid');
            if (checkbox.checked) {
                playerDiv.classList.add('selected');
            } else {
                playerDiv.classList.remove('selected');
            }
        });
    }

    // // Mark a player as captain
    async function markAsCaptain(playerId) {
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

        // Call the API to update the captain
        const squadId = new URLSearchParams(window.location.search).get('SquadId');
        const gameweekId = document.getElementById('gameweekDropdown').value;
        try {
            const response = await fetch(`${config.backendUrl}/UserTeamPlayers/updateCaptainByGameweekAndSquad`, addAuthHeader({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ gameweekId: gameweekId, userSquadId: squadId, playerId: playerId })
            }));
            if (!response.ok) {
                console.error('Failed to update captain:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Error updating captain:', error);
        }
    }

    // Select a player
    
    async function selectPlayer(playerId, isUserInteraction) {
        const checkbox = document.querySelector(`.player-checkbox[data-player-id="${playerId}"]`);
        const playerDiv = checkbox?.closest('.player-grid');

        // Call the API to add the player to the team only if it's a user interaction
        if (isUserInteraction) {
            const squadId = new URLSearchParams(window.location.search).get('SquadId');
            const gameweekId = document.getElementById('gameweekDropdown').value;
            try {
                const response = await fetch(`${config.backendUrl}/UserTeamPlayers/AddByGameweekAndSquad`, addAuthHeader({
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ gameweekId: gameweekId, userSquadId: squadId, playerId: playerId })
                }));

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

        const squadId = new URLSearchParams(window.location.search).get('SquadId');
        const gameweekId = document.getElementById('gameweekDropdown').value;
        try {
            const response = await fetch(`${config.backendUrl}/UserTeamPlayers/DeleteByGameweekAndSquad`, addAuthHeader({
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ gameweekId: gameweekId, userSquadId: squadId, playerId: playerId })
            }));

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
        }
    }

    // Update the team score link
    function updateTeamScoreLink() {
        const draftPeriodId = filterDraftPeriodDropdown.value;
        const gameweekId = gameweekDropdown.value;
        const squadId = new URLSearchParams(window.location.search).get('SquadId');
        const teamScoreLink = document.getElementById('teamScoreLink');
        teamScoreLink.href = `TeamScore.html?draftPeriodId=${draftPeriodId}&gameweekId=${gameweekId}&squadId=${squadId}`;
    }

    // Fetch and display squad info and players in the current squad on page load
    const urlParams = new URLSearchParams(window.location.search);
    const squadId = urlParams.get('SquadId');

    await fetchAndDisplaySquadInfo(squadId);
    await fetchAndDisplaySquadPlayers(squadId);

    // Initial link update
    updateTeamScoreLink();
});
