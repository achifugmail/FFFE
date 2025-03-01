document.addEventListener('DOMContentLoaded', async function () {
    // Extract the league ID from the URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const leagueId = urlParams.get('id');

    // Function to fetch and display existing squads
    async function fetchAndDisplaySquads(users) {
        try {
            const respSquads = await fetch(`https://localhost:44390/api/UserSquads/ByLeague/${leagueId}`, {
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

    // Fetch league details
    try {
        const response = await fetch(`https://localhost:44390/api/Leagues/${leagueId}`, {
            credentials: 'include'
        });
        if (!response.ok) {
            console.error('Failed to fetch league details:', response.status, response.statusText);
            return;
        }
        const league = await response.json();
        document.getElementById('leagueInfo').innerText =
            `ID: ${league.id}, Name: ${league.name}, Code: ${league.code}`;
    } catch (error) {
        console.error('Error fetching league details:', error);
    }

    // Fetch users for dropdown
    let users = [];
    try {
        const respUsers = await fetch('https://localhost:44390/api/User/all', {
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
    const userDropdown = document.getElementById('userDropdown');
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.text = user.username || `User ${user.id}`;
        userDropdown.appendChild(option);
    });

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

    // Populate draft period dropdown
    const draftPeriodDropdown = document.getElementById('draftPeriodDropdown');
    draftPeriods.forEach(draft => {
        const option = document.createElement('option');
        option.value = draft.id;
        option.text = draft.name || `Draft ${draft.id}`;
        draftPeriodDropdown.appendChild(option);
    });

    // Populate filter draft period dropdown and set default value
    const filterDraftPeriodDropdown = document.getElementById('filterDraftPeriodDropdown');
    draftPeriods.sort((a, b) => a.name.localeCompare(b.name)).forEach(draft => {
        const option = document.createElement('option');
        option.value = draft.id;
        option.text = draft.name || `Draft ${draft.id}`;
        filterDraftPeriodDropdown.appendChild(option);
    });
    filterDraftPeriodDropdown.value = draftPeriods[draftPeriods.length - 1].id;

    // Fetch and display existing squads on page load
    fetchAndDisplaySquads(users);

    // Update squads when filter draft period changes
    filterDraftPeriodDropdown.addEventListener('change', () => fetchAndDisplaySquads(users));

    // Handle Create Squad button click
    document.getElementById('createSquadButton').addEventListener('click', async function () {
        const userId = userDropdown.value;
        const draftPeriodId = draftPeriodDropdown.value;
        const squadName = document.getElementById('squadName').value.trim();

        if (!userId || !leagueId || !draftPeriodId || !squadName) {
            alert('Please fill in all fields');
            return;
        }

        const createUrl = 'https://localhost:44390/api/UserSquads/Create';

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
                fetchAndDisplaySquads(users); // Update the list of existing squads
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
});
