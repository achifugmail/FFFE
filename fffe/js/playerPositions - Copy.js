// js/playerPositions.js
document.addEventListener('DOMContentLoaded', async function () {
    const playerTableBody = document.getElementById('playerTable').querySelector('tbody');
    const saveButton = document.getElementById('saveButton');
    let positions = [];
    let players = [];
    let initialPlayerPositions = {};

    // Fetch positions
    async function fetchPositions() {
        try {
            const response = await fetch('https://localhost:44390/api/PlayerPositions/positions', {
                credentials: 'include', // Include cookies in the request
            });
            if (!response.ok) {
                const errorResponse = await response.json();
                console.error('Failed to fetch positions:', response.status, response.statusText, errorResponse);
                return;
            }
            positions = await response.json();
        } catch (error) {
            console.error('Error fetching positions:', error);
        }
    }

    // Fetch players with positions
    async function fetchPlayers() {
        try {
            const response = await fetch('https://localhost:44390/api/PlayerPositions/players-with-positions', {
                credentials: 'include', // Include cookies in the request
            });
            if (!response.ok) {
                console.error('Failed to fetch players:', response.status, response.statusText);
                return;
            }
            players = await response.json();
        } catch (error) {
            console.error('Error fetching players:', error);
        }
    }

    // Populate the table with player data
    function populateTable() {
        playerTableBody.innerHTML = '';
        players.forEach(player => {
            const photoUrl = `https://resources.premierleague.com/premierleague/photos/players/40x40/p${player.photo.slice(0, -3)}png`;
            const row = document.createElement('tr');
            row.innerHTML = `
            <td><img src="${photoUrl}" alt="Player Photo" class="player-photo"></td>
            <td>${player.firstName}</td>
            <td>${player.secondName}</td>
            <td>
                <select class="positionSelect" data-player-code="${player.code}">
                    <option value="">Select Position</option>
                    ${positions.map(position => `
                        <option value="${position.id}" ${position.name === player.positionName ? 'selected' : ''}>
                            ${position.name}
                        </option>
                    `).join('')}
                </select>
            </td>
            <td>${player.starts}</td>
            <td>${player.minutes}</td>
            <td>${player.goalsScored}</td>
            <td>${player.assists}</td>
            <td>${player.cleanSheets}</td>
        `;
            playerTableBody.appendChild(row);

            // Store the initial position for each player
            initialPlayerPositions[player.code] = player.positionName;
        });
    }

    // Save modified rows
    async function saveChanges() {
        const modifiedRows = document.querySelectorAll('.positionSelect');
        for (const select of modifiedRows) {
            const playerCode = select.getAttribute('data-player-code');
            const newPositionId = select.value;
            if (newPositionId === "") {
                console.log('Skipping save for player code:', playerCode, 'due to blank position');
                continue;
            }
            const initialPosition = positions.find(position => position.name === initialPlayerPositions[playerCode]);

            const initialPositionId = initialPosition ? initialPosition.id : -1;

            // Only call the API if the position has changed
            if (newPositionId !== initialPositionId.toString()) {
                console.log('Saving changes for player code:', playerCode, 'with position ID:', newPositionId); // Log the data being sent
                try {
                    const response = await fetch('https://localhost:44390/api/PlayerPositions/upsert', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        credentials: 'include', // Include cookies in the request
                        body: JSON.stringify({ plPlayerCode: playerCode, positionId: newPositionId })
                    });
                    if (!response.ok) {
                        console.error('Failed to save changes for player code:', playerCode, response.status, response.statusText);
                        alert('Failed to save changes for player code: ' + playerCode);
                    }
                } catch (error) {
                    console.error('Error saving changes for player code:', playerCode, error);
                }
            }
        }
        alert('Changes saved successfully!');
    }

    // Initialize the page
    async function init() {
        await fetchPositions();
        await fetchPlayers();
        populateTable();
    }

    saveButton.addEventListener('click', saveChanges);

    init();
});
