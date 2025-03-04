document.addEventListener('DOMContentLoaded', async function () {
    const saveButton = document.getElementById('saveButton');
    const playerTableBody = document.querySelector('#playerTable tbody');
    const tableHeaders = document.querySelectorAll('#playerTable th');
    let positions = [];
    let players = [];
    let initialPlayerPositions = {};
    let sortOrder = 1; // 1 for ascending, -1 for descending

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
        playerTableBody.innerHTML = ''; // Clear existing rows

        players.forEach(player => {
            const row = document.createElement('tr');

            row.innerHTML = `
                <td><img src="https://resources.premierleague.com/premierleague/photos/players/40x40/p${player.photo.slice(0, -3)}png" alt="Player Photo" class="player-photo"></td>
                <td>${player.firstName}</td>
                <td>${player.secondName}</td>
                <td>
                    <select class="position-select" data-player-id="${player.id}">
                        <option value="" ${!player.positionName ? 'selected' : ''}></option>
                        ${positions.map(position => `<option value="${position.name}" ${position.name === player.positionName ? 'selected' : ''}>${position.name}</option>`).join('')}
                    </select>
                </td>
                <td>${player.starts}</td>
                <td>${player.minutes}</td>
                <td>${player.goalsScored}</td>
                <td>${player.assists}</td>
                <td>${player.cleanSheets}</td>
            `;

            playerTableBody.appendChild(row);
        });
    }

    // Filter the table based on search inputs
    function filterTable() {
        const searchFirstName = document.getElementById('searchFirstName').value.toLowerCase();
        const searchSecondName = document.getElementById('searchSecondName').value.toLowerCase();
        const searchPosition = document.getElementById('searchPosition').value.toLowerCase();

        const filteredPlayers = players.filter(player => {
            return (
                player.firstName.toLowerCase().includes(searchFirstName) &&
                player.secondName.toLowerCase().includes(searchSecondName) &&
                (player.positionName ? player.positionName.toLowerCase().includes(searchPosition) : false)
            );
        });

        playerTableBody.innerHTML = ''; // Clear existing rows

        filteredPlayers.forEach(player => {
            const row = document.createElement('tr');

            row.innerHTML = `
                <td><img src="https://resources.premierleague.com/premierleague/photos/players/40x40/p${player.photo.slice(0, -3)}png" alt="Player Photo" class="player-photo"></td>
                <td>${player.firstName}</td>
                <td>${player.secondName}</td>
                <td>
                    <select class="position-select" data-player-id="${player.id}">
                        ${positions.map(position => `<option value="${position.name}" ${position.name === player.positionName ? 'selected' : ''}>${position.name}</option>`).join('')}
                    </select>
                </td>
                <td>${player.starts}</td>
                <td>${player.minutes}</td>
                <td>${player.goalsScored}</td>
                <td>${player.assists}</td>
                <td>${player.cleanSheets}</td>
            `;

            playerTableBody.appendChild(row);
        });
    }

    // Sort the table based on the specified column
    function sortTable(column) {
        players.sort((a, b) => {
            let aValue = a[column];
            let bValue = b[column];

            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
            }
            if (typeof bValue === 'string') {
                bValue = bValue.toLowerCase();
            }

            if (aValue === null) return 1 * sortOrder;
            if (bValue === null) return -1 * sortOrder;

            if (aValue < bValue) {
                return -1 * sortOrder;
            }
            if (aValue > bValue) {
                return 1 * sortOrder;
            }
            return 0;
        });

        sortOrder *= -1; // Toggle sort order
        populateTable();
    }

    // Save modified rows
    async function saveAllChanges() {
        console.log('Save button clicked'); // Add this line to check if the function is called
        const modifiedRows = document.querySelectorAll('.position-select');
        for (const select of modifiedRows) {
            const playerId = parseInt(select.getAttribute('data-player-id'), 10); // Convert playerId to integer
            const newPositionName = select.value;
            const newPositionId = positions.find(position => position.name === newPositionName)?.id;
            if (!newPositionId) {
                console.log('Skipping save for player ID:', playerId, 'due to blank position');
                continue;
            }

            const player = players.find(p => p.id === playerId);
            const plPlayerCode = player.code; // Use the code property for plPlayerCode

            const initialPosition = positions.find(position => position.name === initialPlayerPositions[playerId]);

            const initialPositionId = initialPosition ? initialPosition.id : -1;

            // Only call the API if the position has changed
            if (newPositionId !== initialPositionId) {
                console.log('Saving changes for player ID:', playerId, 'with position ID:', newPositionId); // Log the data being sent
                try {
                    const response = await fetch('https://localhost:44390/api/PlayerPositions/upsert', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        credentials: 'include', // Include cookies in the request
                        body: JSON.stringify({ plPlayerCode: plPlayerCode, positionId: newPositionId })
                    });
                    if (!response.ok) {
                        console.error('Failed to save changes for player ID:', playerId, response.status, response.statusText);
                        alert('Failed to save changes for player ID: ' + playerId);
                    }
                } catch (error) {
                    console.error('Error saving changes for player ID:', playerId, error);
                }
            }
        }
        alert('Changes saved successfully!');
    }

    // Initialize the page
    async function init() {
        await fetchPositions();
        await fetchPlayers();
        console.log('Positions:', positions); // Log positions for debugging
        populateTable();
    }

    saveButton.addEventListener('click', saveAllChanges);

    document.getElementById('searchFirstName').addEventListener('input', filterTable);
    document.getElementById('searchSecondName').addEventListener('input', filterTable);
    document.getElementById('searchPosition').addEventListener('input', filterTable);

    tableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.getAttribute('data-sort');
            sortTable(column);
        });
    });

    init();
});
