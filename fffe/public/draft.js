import { fetchLeagues, fetchDraftPeriods, fetchPositions } from './common.js';
import config from './config.js';
import { addAuthHeader } from './config.js';

let leagueId = localStorage.getItem('leagueId');
let draftPeriodId = null;
let draftCheckInterval = null;
let isDraftInProgress = false;
let positions = [];
let availablePlayers = [];
let currentUserId = localStorage.getItem('userId');

document.addEventListener('DOMContentLoaded', async function () {
    const leagueDropdown = document.getElementById('leagueDropdown');
    const draftPeriodDropdown = document.getElementById('draftPeriodDropdown');
    const availablePlayersContainer = document.getElementById('availablePlayersContainer');
    const filterInput = document.getElementById('filterInput');

    async function initializePage() {
        await fetchLeagues(leagueDropdown);
        await fetchDraftPeriods(draftPeriodDropdown);
        positions = await fetchPositions();

        if (leagueId) {
            leagueDropdown.value = leagueId;
        } else {
            leagueId = leagueDropdown.value;
            localStorage.setItem('leagueId', leagueId);
        }

        draftPeriodId = draftPeriodDropdown.value;
        await checkForActiveDraft();

        leagueDropdown.addEventListener('change', async function () {
            leagueId = this.value;
            localStorage.setItem('leagueId', leagueId);
            await checkForActiveDraft();
        });

        draftPeriodDropdown.addEventListener('change', async function () {
            draftPeriodId = this.value;
            await checkForActiveDraft();
        });

        filterInput.addEventListener('input', filterAvailablePlayers);
    }

    async function checkForActiveDraft() {
        try {
            const response = await fetch(`${config.backendUrl}/Leagues/${leagueId}`, addAuthHeader());
            if (!response.ok) throw new Error('Failed to fetch league details');

            const league = await response.json();
            const now = new Date();
            const draftStart = new Date(league.draftStartDate);
            const draftEnd = new Date(league.draftEndDate);

            isDraftInProgress = now >= draftStart && now <= draftEnd && league.nextDraftPeriodId == draftPeriodId;

            if (isDraftInProgress) {
                await handleActiveDraft(league);
            } else {
                disableAllControls();
            }
        } catch (error) {
            console.error('Error checking for active draft:', error);
        }
    }

    async function handleActiveDraft(league) {
        if (league.currentDraftUserId.toString() === currentUserId) {
            enableAllControls();
        } else {
            disableAllControls();
            if (!draftCheckInterval) {
                draftCheckInterval = setInterval(checkForActiveDraft, 5000);
            }
        }

        await fetchAvailablePlayers();
        displayAvailablePlayers();
    }

    async function fetchAvailablePlayers() {
        try {
            const response = await fetch(`${config.backendUrl}/PlayerPositions/available-players-with-positions/${leagueId}/${draftPeriodId}`, addAuthHeader());
            if (!response.ok) throw new Error('Failed to fetch available players');
            availablePlayers = await response.json();
        } catch (error) {
            console.error('Error fetching available players:', error);
        }
    }

    function displayAvailablePlayers() {
        availablePlayersContainer.innerHTML = '';

        positions.forEach(position => {
            const positionSection = document.createElement('div');
            positionSection.className = 'position-section';
            positionSection.innerHTML = `<h3>${position.name}</h3>`;

            const playersList = document.createElement('div');
            playersList.className = 'players-list';

            const positionPlayers = availablePlayers.filter(player => player.positionName === position.name);
            positionPlayers.forEach(player => {
                const playerDiv = document.createElement('div');
                playerDiv.className = 'player-item';
                playerDiv.innerHTML = `
                    <span>${player.webName} (${player.team})</span>
                    <button class="add-player-btn" data-player-id="${player.id}" data-position="${position.name}">+</button>
                `;

                playerDiv.querySelector('.add-player-btn').addEventListener('click', () => addPlayerToSquad(player.id));
                playersList.appendChild(playerDiv);
            });

            positionSection.appendChild(playersList);
            availablePlayersContainer.appendChild(positionSection);
        });
    }

    function filterAvailablePlayers() {
        const filterText = filterInput.value.toLowerCase();
        const filteredPlayers = availablePlayers.filter(player =>
            Object.values(player).some(value =>
                value && value.toString().toLowerCase().includes(filterText)
            )
        );

        availablePlayersContainer.innerHTML = '';
        positions.forEach(position => {
            const positionSection = document.createElement('div');
            positionSection.className = 'position-section';
            positionSection.innerHTML = `<h3>${position.name}</h3>`;

            const playersList = document.createElement('div');
            playersList.className = 'players-list';

            const positionPlayers = filteredPlayers.filter(player => player.positionName === position.name);
            positionPlayers.forEach(player => {
                const playerDiv = document.createElement('div');
                playerDiv.className = 'player-item';
                playerDiv.innerHTML = `
                    <span>${player.webName} (${player.team})</span>
                    <button class="add-player-btn" data-player-id="${player.id}" data-position="${position.name}">+</button>
                `;

                playerDiv.querySelector('.add-player-btn').addEventListener('click', () => addPlayerToSquad(player.id));
                playersList.appendChild(playerDiv);
            });

            positionSection.appendChild(playersList);
            availablePlayersContainer.appendChild(positionSection);
        });
    }

    async function addPlayerToSquad(playerId) {
        try {
            const payload = { userSquadId: leagueId, playerId };
            const response = await fetch(`${config.backendUrl}/PlayerPositions/add-user-squad-player`, addAuthHeader({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }));

            if (!response.ok) throw new Error('Failed to add player to squad');
            await fetchAvailablePlayers();
            displayAvailablePlayers();
        } catch (error) {
            console.error('Error adding player to squad:', error);
        }
    }

    function disableAllControls() {
        document.querySelectorAll('button, input').forEach(control => {
            control.disabled = true;
        });
    }

    function enableAllControls() {
        document.querySelectorAll('button, input').forEach(control => {
            control.disabled = false;
        });
    }

    await initializePage();
});
