document.addEventListener('DOMContentLoaded', async function () {
    // Extract the league ID from the URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const leagueId = urlParams.get('id');

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
        document.getElementById('leagueName').innerText = league.name;
    } catch (error) {
        console.error('Error fetching league details:', error);
    }

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
    draftPeriods.sort((a, b) => a.name.localeCompare(b.name)).forEach(draft => {
        const option = document.createElement('option');
        option.value = draft.id;
        option.text = draft.name || `Draft ${draft.id}`;
        draftPeriodDropdown.appendChild(option);
    });

    // Set default value to the last draft period alphabetically
    if (draftPeriods.length > 0) {
        draftPeriodDropdown.value = draftPeriods[draftPeriods.length - 1].id;
    }

    // Fetch and populate gameweeks based on selected draft period
    const gameweekDropdown = document.getElementById('gameweekDropdown');
    const scoreToggle = document.getElementById('scoreToggle');
    const scoreLabel = document.getElementById('scoreLabel');
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

        // Set default value to the last gameweek by start date that has a start date before the current date and time
        const now = new Date();
        const pastGameweeks = gameweeks.filter(gameweek => new Date(gameweek.startDate) < now);
        if (pastGameweeks.length > 0) {
            gameweekDropdown.value = pastGameweeks[pastGameweeks.length - 1].id;
        }

        // Set default value for score toggle
        const selectedGameweek = gameweeks.find(gameweek => gameweek.id == gameweekDropdown.value);
        if (selectedGameweek && new Date(selectedGameweek.endDate) > now) {
            scoreToggle.checked = true;
            scoreLabel.innerText = 'Live scores';
        } else {
            scoreToggle.checked = false;
            scoreLabel.innerText = 'Final scores';
        }
    }

    // Initial population of gameweeks
    await fetchAndPopulateGameweeks(draftPeriodDropdown.value);

    // Update gameweeks when draft period changes
    draftPeriodDropdown.addEventListener('change', async function () {
        await fetchAndPopulateGameweeks(this.value);
        fetchAndDisplaySquads();
    });

    gameweekDropdown.addEventListener('change', fetchAndDisplaySquads);
    scoreToggle.addEventListener('change', function () {
        scoreLabel.innerText = scoreToggle.checked ? 'Live scores' : 'Final scores';
        fetchAndDisplaySquads();
    });

    // Function to fetch and display existing squads
    async function fetchAndDisplaySquads() {
        try {
            const respSquads = await fetch(`https://localhost:44390/api/UserSquads/ByLeague/${leagueId}`, {
                credentials: 'include'
            });
            if (!respSquads.ok) {
                console.error('Failed to fetch squads:', respSquads.status, respSquads.statusText);
                return;
            }
            const squads = await respSquads.json();
            const squadTableRow = document.getElementById('squadTableRow');
            squadTableRow.innerHTML = ''; // Clear existing row

            const selectedDraftPeriodId = draftPeriodDropdown.value;
            const selectedGameweekId = gameweekDropdown.value;
            const score = scoreToggle.checked ? 'live' : 'final';
            const filteredSquads = squads.filter(squad => squad.draftPeriodId == selectedDraftPeriodId);

            // Create iframe for each squad
            filteredSquads.forEach(squad => {
                const iframeContainer = document.createElement('div');
                iframeContainer.className = 'iframe-container';
                const iframe = document.createElement('iframe');
                iframe.src = `TeamScore.html?squadId=${squad.id}&draftPeriodId=${selectedDraftPeriodId}&gameweekId=${selectedGameweekId}&score=${score}`;
                iframeContainer.appendChild(iframe);
                squadTableRow.appendChild(iframeContainer);
            });
        } catch (error) {
            console.error('Error fetching squads:', error);
        }
    }

    // Fetch and display existing squads on page load
    fetchAndDisplaySquads();
});
