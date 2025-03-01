document.addEventListener('DOMContentLoaded', async function () {
    // Fetch draft periods for dropdown
    let draftPeriods = [];
    try {
        const respDrafts = await fetch('https://localhost:44390/api/DraftPeriods', {
            credentials: 'include'
        });
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
            const respGameweeks = await fetch(`https://localhost:44390/api/Gameweeks/by-draft-period/${draftPeriodId}`, {
                credentials: 'include'
            });
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
            option.text = `Gameweek ${gameweek.number}`;
            gameweekDropdown.appendChild(option);
        });
    }

    // Initial population of gameweeks
    fetchAndPopulateGameweeks(filterDraftPeriodDropdown.value);

    // Update gameweeks when draft period changes
    filterDraftPeriodDropdown.addEventListener('change', function () {
        fetchAndPopulateGameweeks(this.value);
    });

    // Fetch and display squad info
    async function fetchAndDisplaySquadInfo(squadId) {
        try {
            const response = await fetch(`https://localhost:44390/api/UserSquads/${squadId}`, {
                credentials: 'include'
            });
            if (!response.ok) {
                console.error('Failed to fetch squad info:', response.status, response.statusText);
                return;
            }
            const squad = await response.json();
            const username = localStorage.getItem('username');
            const squadInfoDiv = document.getElementById('squadInfo');
            squadInfoDiv.innerHTML = `
            <h2>User: ${username}</h2>
            <p>Squad: ${squad.squadName}</p>
                
                <p>Draft Period: ${squad.draftPeriodId}</p>
            `;
        } catch (error) {
            console.error('Error fetching squad info:', error);
        }
    }

    // Fetch and display players in the current squad
    async function fetchAndDisplaySquadPlayers(squadId) {
        try {
            const response = await fetch(`https://localhost:44390/api/PlayerPositions/user-squad-players/${squadId}`, {
                credentials: 'include'
            });
            if (!response.ok) {
                console.error('Failed to fetch squad players:', response.status, response.statusText);
                return;
            }
            const squadPlayers = await response.json();
            const positions = await fetch('https://localhost:44390/api/PlayerPositions/positions', {
                credentials: 'include'
            }).then(res => res.json());

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
                    playerDiv.innerHTML = `
                        <input type="checkbox" class="player-checkbox" data-player-id="${player.id}">
                        <img src="https://resources.premierleague.com/premierleague/photos/players/40x40/p${player.photo.slice(0, -3)}png" alt="Player Photo" class="player-photo">
                        <span>${player.firstName} ${player.secondName}</span>
                        <button class="captain-button" data-player-id="${player.id}">c</button>
                    `;
                    playersDiv.appendChild(playerDiv);
                });

                playerGrid.appendChild(section);
            });

            // Add event listeners for player selection
            const checkboxes = document.querySelectorAll('.player-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.addEventListener('change', function () {
                    updatePlayerSelection();
                });
            });

            // Add event listeners for captain selection
            const captainButtons = document.querySelectorAll('.captain-button');
            captainButtons.forEach(button => {
                button.addEventListener('click', function () {
                    const playerId = button.getAttribute('data-player-id');
                    markAsCaptain(playerId);
                    selectPlayer(playerId);
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

    // Mark a player as captain
    function markAsCaptain(playerId) {
        const captainButtons = document.querySelectorAll('.captain-button');
        captainButtons.forEach(button => {
            const playerDiv = button.closest('.player-grid');
            if (button.getAttribute('data-player-id') === playerId) {
                playerDiv.classList.add('captain');
            } else {
                playerDiv.classList.remove('captain');
            }
        });
    }

    // Select a player
    function selectPlayer(playerId) {
        const checkboxes = document.querySelectorAll('.player-checkbox');
        checkboxes.forEach(checkbox => {
            if (checkbox.getAttribute('data-player-id') === playerId) {
                checkbox.checked = true;
            }
        });
        updatePlayerSelection();
    }

    // Fetch and display squad info and players in the current squad on page load
    const urlParams = new URLSearchParams(window.location.search);
    const squadId = urlParams.get('SquadId');

    fetchAndDisplaySquadInfo(squadId);
    fetchAndDisplaySquadPlayers(squadId);
});



