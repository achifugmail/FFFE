import config from './config.js';
import { addAuthHeader } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    const currentUserId = localStorage.getItem('userId');

    async function fetchCurrentLeagues() {
        try {
            const response = await fetch(`${config.backendUrl}/Leagues/byUser/${currentUserId}`, addAuthHeader());
            if (!response.ok) {
                console.error('Failed to fetch leagues:', response.status, response.statusText);
                return;
            }
            const leagues = await response.json();
            const currentLeaguesList = document.getElementById('currentLeaguesList');
            currentLeaguesList.innerHTML = ''; // Clear existing list
            leagues.forEach(league => {
                const li = document.createElement('li');
                li.textContent = `${league.name} (Code: ${league.code})`;
                currentLeaguesList.appendChild(li);
            });
        } catch (error) {
            console.error('Error fetching leagues:', error);
        }
    }

    async function joinLeague() {
        const code = document.getElementById('joinLeagueCode').value.trim();
        const squadName = document.getElementById('squadName').value.trim();
        if (!code || !squadName) {
            alert('Please enter both league code and squad name');
            return;
        }

        const payload = {            
            LeagueCode: code,
            SquadName: squadName
        };

        try {
            const response = await fetch(`${config.backendUrl}/Leagues/join`, addAuthHeader({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }));

            if (!response.ok) {
                console.error('Failed to join league:', response.status, response.statusText);
                alert('Failed to join league');
            } else {
                alert('Joined league successfully!');
                fetchCurrentLeagues(); // Refresh the list of current leagues
            }
        } catch (error) {
            console.error('Error joining league:', error);
        }
    }

    async function createLeague() {
        const leagueName = document.getElementById('createLeagueName').value.trim();
        const squadName = document.getElementById('createSquadName').value.trim();
        if (!leagueName || !squadName) {
            alert('Please enter both league name and squad name');
            return;
        }

        const payload = {
            name: leagueName,            
        };

        try {
            const response = await fetch(`${config.backendUrl}/Leagues/create`, addAuthHeader({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }));

            if (!response.ok) {
                console.error('Failed to create league:', response.status, response.statusText);
                alert('Failed to create league');
            } else {
                const result = await response.json();
                const leagueCode = result.code;
                document.getElementById('newLeagueCode').textContent = `New League Code: ${leagueCode}`;
                

                // Join the newly created league
                const joinPayload = {
                    LeagueCode: leagueCode,
                    SquadName: squadName
                };

                const joinResponse = await fetch(`${config.backendUrl}/Leagues/join`, addAuthHeader({
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(joinPayload)
                }));

                if (!joinResponse.ok) {
                    console.error('Failed to join league:', joinResponse.status, joinResponse.statusText);
                    alert('Failed to join league');
                } else {
                    alert('League create and joined successfully!');
                    fetchCurrentLeagues(); // Refresh the list of current leagues
                }
            }
        } catch (error) {
            console.error('Error creating league:', error);
        }
    }


    document.getElementById('joinLeagueButton').addEventListener('click', joinLeague);
    document.getElementById('createLeagueButton').addEventListener('click', createLeague);

    fetchCurrentLeagues(); // Initial fetch of current leagues
});
