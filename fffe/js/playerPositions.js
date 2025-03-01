// js/playerPositions.js
document.addEventListener('DOMContentLoaded', async function () {
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

    // Initialize JS Grid with player data
    function initializeGrid() {
        $("#jsGrid").jsGrid({
            width: "100%",
            height: "auto",
            inserting: false,
            editing: true,
            sorting: true,
            paging: true,
            filtering: true,
            autoload: true,
            data: players,

            fields: [
                {
                    name: "photo",
                    title: "Photo",
                    type: "text",
                    width: 50,
                    editing: false,
                    itemTemplate: function (value) {
                        return `<img src="https://resources.premierleague.com/premierleague/photos/players/40x40/p${value.slice(0, -3)}png" alt="Player Photo" class="player-photo">`;
                    }
                },
                { name: "firstName", title: "First Name", type: "text", width: 100, editing: false },
                { name: "secondName", title: "Second Name", type: "text", width: 100, editing: false },
                {
                    name: "positionName",
                    title: "Position",
                    type: "select",
                    items: positions,
                    valueField: "name",
                    textField: "name",
                    width: 100,
                    // Custom editor to automatically trigger the update on change
                    editTemplate: function (value, item) {
                        const $edit = jsGrid.fields.select.prototype.editTemplate.call(this, value, item);
                        $edit.on("change", () => {
                            item.positionName = $edit.val();
                            $("#jsGrid").jsGrid("updateItem", item, item);
                        });
                        return $edit;
                    }
                },
                { name: "starts", title: "Starts", type: "number", width: 50, editing: false },
                { name: "minutes", title: "Minutes", type: "number", width: 50, editing: false },
                { name: "goalsScored", title: "Goals Scored", type: "number", width: 50, editing: false },
                { name: "assists", title: "Assists", type: "number", width: 50, editing: false },
                { name: "cleanSheets", title: "Clean Sheets", type: "number", width: 50, editing: false },
                { type: "control" }
            ]
        });
    }




    // Save modified rows
    async function saveAllChanges() {
        const modifiedRows = $("#jsGrid").jsGrid("option", "data");
        for (const player of modifiedRows) {
            const newPositionId = positions.find(position => position.name === player.positionName)?.id;
            if (!newPositionId) {
                console.log('Skipping save for player code:', player.code, 'due to blank position');
                continue;
            }

            const initialPosition = positions.find(position => position.name === initialPlayerPositions[player]);

            const initialPositionId = initialPosition ? initialPosition.id : -1;
                        
            // Only call the API if the position has changed
            if (newPositionId !== initialPositionId) {
                console.log('Saving changes for player code:', player.code, 'with position ID:', newPositionId); // Log the data being sent
                try {
                    const response = await fetch('https://localhost:44390/api/PlayerPositions/upsert', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        credentials: 'include', // Include cookies in the request
                        body: JSON.stringify({ plPlayerCode: player.code, positionId: newPositionId })
                    });
                    if (!response.ok) {
                        console.error('Failed to save changes for player code:', player.code, response.status, response.statusText);
                        alert('Failed to save changes for player code: ' + player.code);
                    }
                } catch (error) {
                    console.error('Error saving changes for player code:', player.code, error);
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
        initializeGrid();
    }

    saveButton.addEventListener('click', saveAllChanges);

    init();
});
