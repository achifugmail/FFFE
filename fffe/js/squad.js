// fffe/js/squad.js

document.addEventListener('DOMContentLoaded', async function () {
    // Extract the squad ID and league ID from the URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const squadId = urlParams.get('id');
    const leagueId = urlParams.get('leagueId');
    let draftPeriodId;
    let squadPlayers = [];

    // Fetch positions and create sections dynamically
    async function fetchAndCreateSections() {
        try {
            const response = await fetch('https://localhost:44390/api/PlayerPositions/positions', {
                credentials: 'include'
            });
            if (!response.ok) {
                console.error('Failed to fetch positions:', response.status, response.statusText);
                return;
            }
            const positions = await response.json();
            const playerGrid = document.getElementById('playerGrid');
            playerGrid.innerHTML = ''; // Clear existing sections

            positions.forEach(position => {
                const section = document.createElement('div');
                section.className = 'section';
                section.id = position.name;

                const header = document.createElement('h3');
                header.innerText = position.name;
                section.appendChild(header);

                // Grid for players in the squad
                const squadPlayersDiv = document.createElement('div');
                squadPlayersDiv.className = 'players';
                section.appendChild(squadPlayersDiv);

                // Add button
                const addButton = document.createElement('button');
                addButton.className = 'add-button';
                addButton.dataset.position = position.name;
                addButton.innerText = 'Add';
                section.appendChild(addButton);

                // Grid for available players
                const availablePlayersDiv = document.createElement('div');
                availablePlayersDiv.className = 'player-list';

                // Add the text box at the top of the available players list
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



    // Fetch squad details
    async function fetchSquadDetails() {
        try {
            const response = await fetch(`https://localhost:44390/api/UserSquads/${squadId}`, {
                credentials: 'include'
            });
            if (!response.ok) {
                console.error('Failed to fetch squad details:', response.status, response.statusText);
                return;
            }
            const squad = await response.json();
            draftPeriodId = squad.draftPeriodId; // Store the draftPeriodId

            // Fetch draft period details
            let draftPeriodName = '';
            try {
                const respDraft = await fetch(`https://localhost:44390/api/DraftPeriods/${draftPeriodId}`, {
                    credentials: 'include'
                });
                if (!respDraft.ok) {
                    console.error('Failed to fetch draft period details:', respDraft.status, respDraft.statusText);
                } else {
                    const draftPeriod = await respDraft.json();
                    draftPeriodName = draftPeriod.name || `Draft ${draftPeriod.id}`;
                }
            } catch (error) {
                console.error('Error fetching draft period details:', error);
            }

            document.getElementById('squadInfo').innerText =
                `ID: ${squad.id}, Name: ${squad.squadName}, User: ${squad.userId}, Draft Period: ${draftPeriodName}`;
        } catch (error) {
            console.error('Error fetching squad details:', error);
        }
    }

    // Function to fetch and display players in the current squad
    async function fetchAndDisplaySquadPlayers(squadId) {
        try {
            const response = await fetch(`https://localhost:44390/api/PlayerPositions/user-squad-players/${squadId}`, {
                credentials: 'include'
            });
            if (!response.ok) {
                console.error('Failed to fetch squad players:', response.status, response.statusText);
                return;
            }
            squadPlayers = await response.json();
            const positions = await fetch('https://localhost:44390/api/PlayerPositions/positions', {
                credentials: 'include'
            }).then(res => res.json());

            positions.forEach(position => {
                const section = document.getElementById(position.name);
                const playersDiv = section.querySelector('.players');
                playersDiv.innerHTML = ''; // Clear existing players
                const filteredPlayers = squadPlayers.filter(player => player.positionName === position.name);
                filteredPlayers.forEach(player => {
                    const playerDiv = document.createElement('div');
                    playerDiv.className = 'player-grid';
                    playerDiv.innerHTML = `
                            <img src="https://resources.premierleague.com/premierleague/photos/players/40x40/p${player.photo.slice(0, -3)}png" alt="Player Photo" class="player-photo">
                            <span>${player.firstName} ${player.secondName}</span>
                            <button class="remove-player-button" data-player-id="${player.id}" data-position="${position.name}">-</button>
                        `;
                    playersDiv.appendChild(playerDiv);
                });

                // Add empty rows if needed
                const currentRows = filteredPlayers.length;
                for (let i = currentRows; i < position.maxInSquad; i++) {
                    const row = document.createElement('div');
                    row.className = 'player-row';
                    row.innerText = 'Empty'; // Placeholder text
                    playersDiv.appendChild(row);
                }

                // Show the add button if there are empty rows
                const addButton = section.querySelector('.add-button');
                if (currentRows < position.maxInSquad) {
                    addButton.style.display = 'block';
                } else {
                    addButton.style.display = 'none';
                }
            });
        } catch (error) {
            console.error('Error fetching squad players:', error);
        }
    }

    // Function to fetch and display available players for a position
    async function fetchAndDisplayAvailablePlayers(position, leagueId, draftPeriodId) {
        try {
            const response = await fetch(`https://localhost:44390/api/PlayerPositions/available-players-with-positions/${leagueId}/${draftPeriodId}`, {
                credentials: 'include'
            });
            if (!response.ok) {
                console.error('Failed to fetch available players:', response.status, response.statusText);
                return;
            }
            const players = await response.json();
            const filteredPlayers = players.filter(player => player.positionName === position);
            const section = document.getElementById(position);
            const playerList = section.querySelector('.player-list');
            playerList.innerHTML = ''; // Clear existing list
            filteredPlayers.forEach(player => {
                const playerDiv = document.createElement('div');
                playerDiv.className = 'player-grid';
                const isPlayerInSquad = squadPlayers.some(p => p.id === player.id);
                playerDiv.innerHTML = `
                    <img src="https://resources.premierleague.com/premierleague/photos/players/40x40/p${player.photo.slice(0, -3)}png" alt="Player Photo" class="player-photo">
                    <span>${player.firstName} ${player.secondName}</span>
                    <button class="${isPlayerInSquad ? 'remove-player-button' : 'add-player-button'}" data-player-id="${player.id}" data-position="${position.name}">${isPlayerInSquad ? '-' : '+'}</button>
                `;
                playerList.appendChild(playerDiv);
            });
            playerList.style.display = 'block'; // Show the list
        } catch (error) {
            console.error('Error fetching available players:', error);
        }
    }


    // Function to add player to squad
    async function addPlayerToSquad(playerId, squadId, position) {
        const payload = {
            userSquadId: parseInt(squadId),
            playerId: parseInt(playerId)
        };

        try {
            const response = await fetch('https://localhost:44390/api/PlayerPositions/add-user-squad-player', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                console.error('Failed to add player to squad:', response.status, response.statusText);
                return;
            }

            // Update the current grid after adding the player
            await fetchAndDisplaySquadPlayers(squadId);

            // Update the list of available players
            await fetchAndDisplayAvailablePlayers(position, leagueId, draftPeriodId);

            // Hide the player list if there are no empty rows left
            const section = document.getElementById(position);
            const addButton = section.querySelector('.add-button');
            const playerList = section.querySelector('.player-list');
            const emptyRows = section.querySelectorAll('.player-row');
            if (emptyRows.length === 0) {
                playerList.style.display = 'none';
                addButton.style.display = 'none';
            }
        } catch (error) {
            console.error('Error adding player to squad:', error);
        }
    }

    // Function to remove player from squad
    async function removePlayerFromSquad(playerId, squadId, position) {
        const payload = {
            userSquadId: parseInt(squadId),
            playerId: parseInt(playerId)
        };

        try {
            const response = await fetch('https://localhost:44390/api/PlayerPositions/delete-user-squad-player', {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                console.error('Failed to remove player from squad:', response.status, response.statusText);
                return;
            }

            // Update the current grid after removing the player
            await fetchAndDisplaySquadPlayers(squadId);

            // Update the list of available players
            await fetchAndDisplayAvailablePlayers(position, leagueId, draftPeriodId);
        } catch (error) {
            console.error('Error removing player from squad:', error);
        }
    }



    // Add event listeners to "Add" buttons
    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('add-button')) {
            const position = event.target.getAttribute('data-position');
            fetchAndDisplayAvailablePlayers(position, leagueId, draftPeriodId);
        }
    });

    // Add event listeners to "+" and "-" buttons
    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('add-player-button')) {
            const playerId = event.target.getAttribute('data-player-id');
            const position = event.target.getAttribute('data-position');
            addPlayerToSquad(playerId, squadId, position);
        } else if (event.target.classList.contains('remove-player-button')) {
            const playerId = event.target.getAttribute('data-player-id');
            const position = event.target.getAttribute('data-position');
            removePlayerFromSquad(playerId, squadId, position);
        }
    });

    // Fetch and create sections on page load
    await fetchAndCreateSections();

    // Fetch and display squad details on page load
    await fetchSquadDetails();

    // Fetch and display players in the current squad on page load
    fetchAndDisplaySquadPlayers(squadId);
});
