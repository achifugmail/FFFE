import config from './config.js';

document.addEventListener('DOMContentLoaded', async function () {
    const currentUserId = localStorage.getItem('userId'); // Retrieve the current user ID from local storage

    // Function to fetch and display leagues for the current user
    async function fetchAndDisplayLeagues() {
        try {
            const response = await fetch(`${config.backendUrl}/Leagues/byUser/${currentUserId}`, {
                credentials: 'include'
            });
            if (!response.ok) {
                console.error('Failed to fetch leagues:', response.status, response.statusText);
                return;
            }
            const leagues = await response.json();
            const leagueDropdown = document.getElementById('leagueDropdown');
            leagueDropdown.innerHTML = ''; // Clear existing options
            leagues.forEach(league => {
                const option = document.createElement('option');
                option.value = league.id;
                option.text = league.name;
                leagueDropdown.appendChild(option);
            });

            // Set default value to the first league
            if (leagues.length > 0) {
                leagueDropdown.value = leagues[0].id;
                updateLeagueDetails(leagues[0].id);
            }

            // Update league details when the selected league changes
            leagueDropdown.addEventListener('change', function () {
                updateLeagueDetails(this.value);
            });
        } catch (error) {
            console.error('Error fetching leagues:', error);
        }
    }

    // Function to update league details based on the selected league
    async function updateLeagueDetails(leagueId) {
        // Fetch league details
        try {
            const response = await fetch(`${config.backendUrl}/Leagues/${leagueId}`, {
                credentials: 'include'
            });
            if (!response.ok) {
                console.error('Failed to fetch league details:', response.status, response.statusText);
                return;
            }
            const league = await response.json();
            document.getElementById('leagueName').innerText = `${league.name}`;

            
        } catch (error) {
            console.error('Error fetching league details:', error);
        }

        // Fetch and display existing squads
        fetchAndDisplaySquads(leagueId);
    }

    // Function to fetch and display existing squads
    async function fetchAndDisplaySquads(leagueId) {
        try {
            const respSquads = await fetch(`${config.backendUrl}/UserSquads/ByLeague/${leagueId}`, {
                credentials: 'include'
            });
            if (!respSquads.ok) {
                console.error('Failed to fetch squads:', respSquads.status, respSquads.statusText);
                return;
            }
            const squads = await respSquads.json();
            const squadTableHeader = document.getElementById('squadTableHeader');
            const squadTableRow = document.getElementById('squadTableRow');
            squadTableHeader.innerHTML = ''; // Clear existing headers
            squadTableRow.innerHTML = ''; // Clear existing row

            const selectedDraftPeriodId = document.getElementById('filterDraftPeriodDropdown').value;
            const filteredSquads = squads.filter(squad => squad.draftPeriodId == selectedDraftPeriodId);

            // Populate table headers with squad names and usernames
            filteredSquads.forEach(squad => {
                const th = document.createElement('th');
                const squadLink = document.createElement('a');
                const username = users.find(user => user.id === squad.userId)?.username || `User ${squad.userId}`;
                squadLink.href = `Squad.html?id=${squad.id}&leagueId=${leagueId}`;
                squadLink.innerText = `${squad.squadName} - ${username}`;
                th.appendChild(squadLink);
                squadTableHeader.appendChild(th);

                // Create iframe for each squad
                const td = document.createElement('td');
                const iframeContainer = document.createElement('div');
                iframeContainer.className = 'iframe-container';
                const iframe = document.createElement('iframe');
                iframe.src = `Squad.html?id=${squad.id}&leagueId=${leagueId}`;
                iframeContainer.appendChild(iframe);
                td.appendChild(iframeContainer);
                squadTableRow.appendChild(td);
            });
        } catch (error) {
            console.error('Error fetching squads:', error);
        }
    }

    // Fetch users for dropdown
    let users = [];
    try {
        const respUsers = await fetch(`${config.backendUrl}/User/all`, {
            credentials: 'include'
        });
        if (!respUsers.ok) {
            console.error('Failed to fetch users:', respUsers.status, respUsers.statusText);
        } else {
            users = await respUsers.json();
        }
    } catch (error) {
        console.error('Error fetching users:', error);
    }

    // Populate user dropdown using 'username' property
    /*
    const userDropdown = document.getElementById('userDropdown');
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.text = user.username || `User ${user.id}`;
        userDropdown.appendChild(option);
    });
    */
    // Fetch draft periods for dropdown
    let draftPeriods = [];
    try {
        const respDrafts = await fetch(`${config.backendUrl}/DraftPeriods`, {
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

    // Populate draft period dropdown
    /*
    const draftPeriodDropdown = document.getElementById('draftPeriodDropdown');
    draftPeriods.forEach(draft => {
        const option = document.createElement('option');
        option.value = draft.id;
        option.text = draft.name || `Draft ${draft.id}`;
        draftPeriodDropdown.appendChild(option);
    });
    */


    // Populate filter draft period dropdown and set default value
    const filterDraftPeriodDropdown = document.getElementById('filterDraftPeriodDropdown');
    draftPeriods.sort((a, b) => a.name.localeCompare(b.name)).forEach(draft => {
        const option = document.createElement('option');
        option.value = draft.id;
        option.text = draft.name || `Draft ${draft.id}`;
        filterDraftPeriodDropdown.appendChild(option);
    });
    filterDraftPeriodDropdown.value = draftPeriods[draftPeriods.length - 1].id;

    // Add event listener for draft period filter changes
    filterDraftPeriodDropdown.addEventListener('change', function () {
        const currentLeagueId = document.getElementById('leagueDropdown').value;
        fetchAndDisplaySquads(currentLeagueId);
    });

    // Fetch and display existing squads on page load
    fetchAndDisplayLeagues();

    /*
    // Handle Create Squad button click
    document.getElementById('createSquadButton').addEventListener('click', async function () {
        const userId = userDropdown.value;
        const draftPeriodId = draftPeriodDropdown.value;
        const squadName = document.getElementById('squadName').value.trim();
        const leagueId = document.getElementById('leagueDropdown').value;

        if (!userId || !leagueId || !draftPeriodId || !squadName) {
            alert('Please fill in all fields');
            return;
        }

        const createUrl = `${config.backendUrl}/UserSquads/Create`;

        const payload = {
            userId: parseInt(userId),
            leagueId: parseInt(leagueId),
            draftPeriodId: parseInt(draftPeriodId),
            squadName: squadName
        };

        try {
            const respCreate = await fetch(createUrl, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!respCreate.ok) {
                console.error('Failed to create squad:', respCreate.status, respCreate.statusText);
                alert('Failed to create squad');
            } else {
                alert('Squad created successfully!');
                fetchAndDisplaySquads(leagueId); // Update the list of existing squads
            }
        } catch (error) {
            console.error('Error creating squad:', error);
        }
    });

    // Collapsible section logic
    const collapsible = document.querySelector('.collapsible');
    const content = document.querySelector('.content');

    collapsible.addEventListener('click', function () {
        this.classList.toggle('active');
        if (content.style.display === 'block') {
            content.style.display = 'none';
        } else {
            content.style.display = 'block';
        }
    });

    */
});

