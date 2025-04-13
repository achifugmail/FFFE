import config from './config.js';
import { addAuthHeader } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    const currentUserId = localStorage.getItem('userId');

    // Keep track of which league is currently being edited
    let currentEditingLeagueId = null;

    async function fetchCurrentLeagues() {
        try {
            const response = await fetch(`${config.backendUrl}/Leagues/byUser`, addAuthHeader());
            if (!response.ok) {
                console.error('Failed to fetch leagues:', response.status, response.statusText);
                return;
            }
            const leagues = await response.json();
            const currentLeaguesList = document.getElementById('currentLeaguesList');
            currentLeaguesList.innerHTML = ''; // Clear existing list

            leagues.forEach(league => {
                const li = document.createElement('li');
                li.className = 'league-item';

                // Format dates for display
                const startDate = league.draftStartDate ? new Date(league.draftStartDate).toLocaleString() : 'Not set';
                const endDate = league.draftEndDate ? new Date(league.draftEndDate).toLocaleString() : 'Not set';

                // Create league info display
                const leagueInfo = document.createElement('div');
                leagueInfo.className = 'league-info';
                leagueInfo.innerHTML = `
                <span class="league-name">${league.name} (Code: ${league.code})</span>
                <div class="league-draft-info">
                    <div>Draft Start: <span class="draft-start">${startDate}</span></div>
                    <div>Draft End: <span class="draft-end">${endDate}</span></div>
                    <div>Draft Type: <span class="draft-type">${league.draftType || 'Not set'}</span></div>
                </div>
            `;
                li.appendChild(leagueInfo);

                // Add edit button if user is admin
                if (league.adminUserId == currentUserId) {
                    const editButton = document.createElement('button');
                    editButton.textContent = 'Edit';
                    editButton.className = 'edit-league-btn';

                    editButton.addEventListener('click', async () => {
                        // Toggle between display and edit mode
                        if (li.querySelector('.league-edit-container')) {
                            // If edit container exists, remove it
                            li.querySelector('.league-edit-container').remove();
                            leagueInfo.classList.remove('editing');
                            editButton.textContent = 'Edit';
                        } else {
                            // Add editing class
                            leagueInfo.classList.add('editing');
                            editButton.textContent = 'Cancel';

                            // Create edit container
                            const editContainer = document.createElement('div');
                            editContainer.className = 'league-edit-container';

                            // Add league draft settings form
                            const draftSettingsSection = document.createElement('div');
                            draftSettingsSection.className = 'section-container';

                            // Fetch draft periods for the draft settings dropdown
                            const draftPeriodsResponse = await fetch(`${config.backendUrl}/DraftPeriods`, addAuthHeader());
                            const draftPeriods = await draftPeriodsResponse.json();

                            draftSettingsSection.innerHTML = `
<h4 class="section-header">League Draft Settings</h4>
<form id="editLeagueDraftForm" class="draft-form">
    <div class="form-group">
        <label for="draftStartDate">Draft Start Date:</label>
        <input type="datetime-local" id="draftStartDate" 
            value="${toDateTimeLocal(league.draftStartDate)}" required>
    </div>
    <div class="form-group">
        <label for="draftEndDate">Draft End Date:</label>
        <input type="datetime-local" id="draftEndDate" 
            value="${toDateTimeLocal(league.draftEndDate)}" required>
    </div>
    <div class="form-group">
        <label for="draftType">Draft Type:</label>
        <select id="draftType" required>
            <option value="snake" ${league.draftType === 'snake' ? 'selected' : ''}>Snake</option>
            <option value="straight" ${league.draftType === 'straight' ? 'selected' : ''}>Straight</option>
        </select>
    </div>
    <div class="form-group">
        <label for="draftPeriodSelect">Draft Period:</label>
        <select id="draftPeriodSelect" required>
            <option value="">Select Draft Period</option>
            ${draftPeriods.map(period => `
                <option value="${period.id}" ${period.id == league.nextDraftPeriodId ? 'selected' : ''}>
                    ${period.name} (${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()})
                </option>
            `).join('')}
        </select>
    </div>
    <button type="submit" class="save-btn">Save Draft Settings</button>
</form>
`;

                            // Add submit handler for draft settings
                            draftSettingsSection.querySelector('#editLeagueDraftForm').addEventListener('submit', async (e) => {
                                e.preventDefault();
                                const payload = {
                                    draftType: e.target.querySelector('#draftType').value,
                                    nextDraftPeriodId: parseInt(e.target.querySelector('#draftPeriodSelect').value) || 0,
                                    draftStartDate: e.target.querySelector('#draftStartDate').value,
                                    draftEndDate: e.target.querySelector('#draftEndDate').value,
                                    currentDraftRound: 1,
                                    currentDraftUserId: 0
                                };

                                try {
                                    const response = await fetch(`${config.backendUrl}/Leagues/${league.id}/draft-settings`, addAuthHeader({
                                        method: 'PUT',
                                        headers: {
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify(payload)
                                    }));

                                    if (!response.ok) {
                                        throw new Error('Failed to update league draft settings');
                                    }

                                    alert('League draft settings updated successfully!');
                                    fetchCurrentLeagues(); // Refresh the list
                                } catch (error) {
                                    console.error('Error updating league draft settings:', error);
                                    alert('Failed to update league draft settings');
                                }
                            });

                            // Add change handler for draftPeriodSelect to update league members
                            draftSettingsSection.querySelector('#draftPeriodSelect').addEventListener('change', async (e) => {
                                const selectedPeriodId = e.target.value;
                                if (selectedPeriodId) {
                                    await updateUserSquadsList(league.id, selectedPeriodId);
                                }
                            });

                            // Create user squads section
                            const userSquadsSection = document.createElement('div');
                            userSquadsSection.id = 'userSquadsSection';
                            userSquadsSection.className = 'section-container';
                            userSquadsSection.innerHTML = `
            <h4 class="section-header">League Members</h4>
            <div class="user-squads-list"></div>
        `;

                            // Add all sections to edit container
                            editContainer.appendChild(draftSettingsSection);
                            editContainer.appendChild(userSquadsSection);

                            // Add the edit container after league info
                            leagueInfo.insertAdjacentElement('afterend', editContainer);

                            // Move the edit button to the end
                            li.appendChild(editButton);

                            // Load members if a draft period is already selected (for the case of league.nextDraftPeriodId)
                            const draftPeriodSelect = draftSettingsSection.querySelector('#draftPeriodSelect');
                            if (draftPeriodSelect.value) {
                                await updateUserSquadsList(league.id, draftPeriodSelect.value);
                            }
                        }
                    });
                    li.appendChild(editButton);
                }

                currentLeaguesList.appendChild(li);
            });
        } catch (error) {
            console.error('Error fetching leagues:', error);
        }
    }


    async function updateUserSquadsList(leagueId, draftPeriodId) {
        const userSquadsList = document.querySelector('.user-squads-list');
        userSquadsList.innerHTML = '<p>Loading members...</p>';

        try {
            const response = await fetch(
                `${config.backendUrl}/UserSquads/ByLeagueDraftPeriod/${leagueId}/${draftPeriodId}`,
                addAuthHeader()
            );

            if (!response.ok) {
                throw new Error('Failed to fetch league members');
            }

            const members = await response.json();

            if (members.length === 0) {
                userSquadsList.innerHTML = '<p>No members found for this period</p>';
                return;
            }

            // Create the members list with draft order dropdowns
            const table = document.createElement('table');
            table.className = 'members-table';
            table.innerHTML = `
            <thead>
                <tr>
                    <th>Squad Name</th>
                    <th>User ID</th>
                    <th>Draft Order</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${members.map((member, index) => `
                    <tr data-squad-id="${member.id}">
                        <td>${member.squadName}</td>
                        <td>${member.userId}</td>
                        <td>
                            <select class="draft-order-select" data-original-value="${member.draftOrder || ''}">
                                <option value="">Select order</option>
                                ${Array.from({ length: members.length }, (_, i) => i + 1).map(num => `
                                    <option value="${num}" ${member.draftOrder === num ? 'selected' : ''}>
                                        ${num}
                                    </option>
                                `).join('')}
                            </select>
                        </td>
                        <td>
                            <button class="delete-member-btn" data-id="${member.id}">Delete</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;

            userSquadsList.innerHTML = '';
            userSquadsList.appendChild(table);

            // Add event listeners for draft order changes
            const draftOrderSelects = table.querySelectorAll('.draft-order-select');
            draftOrderSelects.forEach(select => {
                select.addEventListener('change', async (e) => {
                    const newOrder = parseInt(e.target.value);
                    const squadId = e.target.closest('tr').dataset.squadId;
                    const originalValue = e.target.dataset.originalValue;

                    // Get all current selections
                    const currentSelections = new Map();
                    draftOrderSelects.forEach(s => {
                        if (s.value && s !== e.target) {
                            currentSelections.set(parseInt(s.value), s);
                        }
                    });

                    // Check if the new order is already selected
                    if (currentSelections.has(newOrder)) {
                        // Find the next available order
                        const takenOrders = Array.from(currentSelections.keys());
                        const allOrders = Array.from({ length: members.length }, (_, i) => i + 1);
                        const availableOrders = allOrders.filter(order =>
                            !takenOrders.includes(order) || order === parseInt(originalValue)
                        );

                        // Update the conflicting select to the next available order
                        const conflictingSelect = currentSelections.get(newOrder);
                        const nextAvailableOrder = availableOrders.find(order => order !== newOrder);
                        if (nextAvailableOrder) {
                            conflictingSelect.value = nextAvailableOrder;
                            // Update the backend for the changed squad
                            await updateDraftOrder(
                                conflictingSelect.closest('tr').dataset.squadId,
                                nextAvailableOrder
                            );
                        }
                    }

                    // Update the backend for the current squad
                    await updateDraftOrder(squadId, newOrder);
                    e.target.dataset.originalValue = newOrder;
                });
            });

            // Add event listeners for delete buttons
            document.querySelectorAll('.delete-member-btn').forEach(button => {
                button.addEventListener('click', async () => {
                    await deleteMember(button.getAttribute('data-id'), userSquadsList);
                });
            });

        } catch (error) {
            console.error('Error fetching league members:', error);
            userSquadsList.innerHTML = '<p>Error loading members</p>';
        }
    }

    // Helper function to update draft form
    async function updateDraftForm(leagueId, draftPeriodId) {
        const draftFormSection = document.getElementById('draftFormSection');
        draftFormSection.innerHTML = '<p>Loading draft information...</p>';

        try {
            const response = await fetch(
                `${config.backendUrl}/Drafts/byLeagueDraftPeriod/${leagueId}/${draftPeriodId}`,
                addAuthHeader()
            );

            if (response.status === 404) {
                draftFormSection.innerHTML = `
                <h4 class="section-header">Draft</h4>
                <p>No draft exists for this period.</p>
                <button id="createDraftBtn">Create Draft</button>
            `;

                document.getElementById('createDraftBtn').addEventListener('click', () => {
                    createNewDraft(leagueId, draftPeriodId, draftFormSection);
                });
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch draft');
            }

            const draft = await response.json();

            draftFormSection.innerHTML = `
            <h4 class="section-header">Draft Settings</h4>
            <form id="editDraftForm" class="draft-form">
                <div class="form-group">
                    <label for="draftStartDate">Start Date:</label>
                    <input type="datetime-local" id="draftStartDate" value="${toDateTimeLocal(draft.startDate)}" required>
                </div>
                <div class="form-group">
                    <label for="draftEndDate">End Date:</label>
                    <input type="datetime-local" id="draftEndDate" value="${toDateTimeLocal(draft.endDate)}" required>
                </div>
                <div class="form-group">
                    <label for="draftType">Draft Type:</label>
                    <select id="draftType" required>
                        <option value="snake" ${draft.draftType === 'snake' ? 'selected' : ''}>Snake</option>
                        <option value="straight" ${draft.draftType === 'straight' ? 'selected' : ''}>Straight</option>
                    </select>
                </div>
                <button type="submit">Save Changes</button>
            </form>
        `;

            // Add submit handler
            document.getElementById('editDraftForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                await updateDraft(draft.id);
            });

        } catch (error) {
            console.error('Error updating draft form:', error);
            draftFormSection.innerHTML = '<p>Error loading draft information</p>';
        }
    }

    async function updateDraftOrder(squadId, newOrder) {
        try {
            const response = await fetch(`${config.backendUrl}/UserSquads/${squadId}/draftOrder`, addAuthHeader({
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ draftOrder: newOrder })
            }));

            if (!response.ok) {
                throw new Error('Failed to update draft order');
            }
        } catch (error) {
            console.error('Error updating draft order:', error);
            alert('Failed to update draft order');
        }
    }

    // Helper function to format datetime-local
    function toDateTimeLocal(dateString) {
        if (!dateString) return '';
        return new Date(dateString).toISOString().slice(0, 16);
    }

    async function showEditSections(leagueId) {
        // Update the currently editing league
        currentEditingLeagueId = leagueId;

        // Check if edit sections already exist
        let draftOptionsSection = document.getElementById('draftOptionsSection');
        let leagueMembersSection = document.getElementById('leagueMembersSection');

        // If they don't exist, create them
        if (!draftOptionsSection) {
            draftOptionsSection = document.createElement('div');
            draftOptionsSection.id = 'draftOptionsSection';
            draftOptionsSection.className = 'edit-section';
            document.getElementById('currentLeaguesList').insertAdjacentElement('afterend', draftOptionsSection);
        }

        if (!leagueMembersSection) {
            leagueMembersSection = document.createElement('div');
            leagueMembersSection.id = 'leagueMembersSection';
            leagueMembersSection.className = 'edit-section';
            draftOptionsSection.insertAdjacentElement('afterend', leagueMembersSection);
        }

        // Clear previous content
        draftOptionsSection.innerHTML = '<h3>Draft Options</h3>';
        leagueMembersSection.innerHTML = '<h3>League Members</h3>';

        // Fetch and populate draft options
        await fetchDraftPeriods(draftOptionsSection);

        // Fetch and populate league members
        await fetchLeagueMembers(leagueMembersSection);
    }

    async function fetchDraftPeriods(container) {
        try {
            const response = await fetch(`${config.backendUrl}/DraftPeriods`, addAuthHeader());
            if (!response.ok) {
                console.error('Failed to fetch draft periods:', response.status, response.statusText);
                container.innerHTML += '<p>Failed to load draft periods</p>';
                return;
            }

            const draftPeriods = await response.json();

            // Create dropdown for draft periods
            const draftPeriodSelect = document.createElement('select');
            draftPeriodSelect.id = 'draftPeriodSelect';

            draftPeriods.forEach(period => {
                const option = document.createElement('option');
                option.value = period.id;
                option.textContent = `${period.name} (${new Date(period.startDate).toLocaleDateString()} - ${new Date(period.endDate).toLocaleDateString()})`;
                draftPeriodSelect.appendChild(option);
            });

            // Add event listener to fetch draft when selection changes
            draftPeriodSelect.addEventListener('change', () => {
                const leagueMembersSection = document.getElementById('leagueMembersSection');
                fetchDraft(currentEditingLeagueId, draftPeriodSelect.value, container);
                fetchLeagueMembers(leagueMembersSection); // Add this line to fetch league members
            });

            // Add dropdown to container
            const selectWrapper = document.createElement('div');
            selectWrapper.className = 'form-group';
            selectWrapper.innerHTML = '<label for="draftPeriodSelect">Select Draft Period:</label>';
            selectWrapper.appendChild(draftPeriodSelect);
            container.appendChild(selectWrapper);

            // Fetch draft for first draft period by default
            if (draftPeriods.length > 0) {
                fetchDraft(currentEditingLeagueId, draftPeriods[0].id, container);
            } else {
                container.innerHTML += '<p>No draft periods available</p>';
            }

        } catch (error) {
            console.error('Error fetching draft periods:', error);
            container.innerHTML += '<p>Error loading draft periods</p>';
        }
    }

    async function fetchDraft(leagueId, draftPeriodId, container) {
        try {
            const draftFormContainer = document.getElementById('draftFormContainer') || document.createElement('div');
            draftFormContainer.id = 'draftFormContainer';

            // Show loading indicator
            draftFormContainer.innerHTML = '<p>Loading draft information...</p>';

            // If not already in the DOM, append it
            if (!document.getElementById('draftFormContainer')) {
                container.appendChild(draftFormContainer);
            }

            const response = await fetch(`${config.backendUrl}/Drafts/byLeagueDraftPeriod/${leagueId}/${draftPeriodId}`, addAuthHeader());

            if (response.status === 404) {
                // No draft found for this combination
                draftFormContainer.innerHTML = `
                    <p>No draft exists for this league and draft period.</p>
                    <button id="createDraftBtn">Create Draft</button>
                `;

                document.getElementById('createDraftBtn').addEventListener('click', () => {
                    createNewDraft(leagueId, draftPeriodId, draftFormContainer);
                });

                return;
            }

            if (!response.ok) {
                console.error('Failed to fetch draft:', response.status, response.statusText);
                draftFormContainer.innerHTML = '<p>Failed to load draft information</p>';
                return;
            }

            const draft = await response.json();

            // Create form for editing draft attributes
            draftFormContainer.innerHTML = `
                <form id="editDraftForm">
                    <div class="form-group">
                        <label for="draftStartDate">Start Date:</label>
                        <input type="datetime-local" id="draftStartDate" required>
                    </div>
                    <div class="form-group">
                        <label for="draftEndDate">End Date:</label>
                        <input type="datetime-local" id="draftEndDate" required>
                    </div>
                    <div class="form-group">
                        <label for="draftType">Draft Type:</label>
                        <select id="draftType" required>
                            <option value="snake">snake</option>
                            <option value="straight">straight</option>
                        </select>
                    </div>
                    <button type="submit">Save Changes</button>
                </form>
            `;

            // Convert ISO dates to local datetime-local format
            const toLocalDateTimeFormat = (isoString) => {
                const date = new Date(isoString);
                return date.toISOString().slice(0, 16); // Format for datetime-local input
            };

            // Set form values
            document.getElementById('draftStartDate').value = toLocalDateTimeFormat(draft.startDate);
            document.getElementById('draftEndDate').value = toLocalDateTimeFormat(draft.endDate);
            document.getElementById('draftType').value = draft.draftType || 'Snake';

            // Add submit handler
            document.getElementById('editDraftForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                await updateDraft(draft.id);
            });

            // After fetching draft, also fetch draft orders to display members info
            fetchDraftOrders(draft.id);

        } catch (error) {
            console.error('Error fetching draft:', error);
            const draftFormContainer = document.getElementById('draftFormContainer') || container;
            draftFormContainer.innerHTML += '<p>Error loading draft information</p>';
        }
    }

    async function createNewDraft(leagueId, draftPeriodId, container) {
        // Show a form to create a new draft
        container.innerHTML = `
            <form id="createDraftForm">
                <div class="form-group">
                    <label for="newDraftStartDate">Start Date:</label>
                    <input type="datetime-local" id="newDraftStartDate" required>
                </div>
                <div class="form-group">
                    <label for="newDraftEndDate">End Date:</label>
                    <input type="datetime-local" id="newDraftEndDate" required>
                </div>
                <div class="form-group">
                    <label for="newDraftType">Draft Type:</label>
                    <select id="newDraftType" required>
                        <option value="Snake">Snake</option>
                        <option value="Straight">Straight</option>
                    </select>
                </div>
                <button type="submit">Create Draft</button>
            </form>
        `;

        // Set default dates (current time + 7 days)
        const now = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(now.getDate() + 7);

        document.getElementById('newDraftStartDate').value = now.toISOString().slice(0, 16);
        document.getElementById('newDraftEndDate').value = nextWeek.toISOString().slice(0, 16);

        // Handle form submission
        document.getElementById('createDraftForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const payload = {
                leagueId: parseInt(leagueId),
                draftPeriodId: parseInt(draftPeriodId),
                startDate: document.getElementById('newDraftStartDate').value,
                endDate: document.getElementById('newDraftEndDate').value,
                draftType: document.getElementById('newDraftType').value
            };

            try {
                const response = await fetch(`${config.backendUrl}/Drafts/create`, addAuthHeader({
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                }));

                if (!response.ok) {
                    console.error('Failed to create draft:', response.status, response.statusText);
                    alert('Failed to create draft');
                    return;
                }

                //const createdDraft = await response.json();
                alert('Draft created successfully!');

                // Refresh the draft options section
                fetchDraft(leagueId, draftPeriodId, container.parentNode);

            } catch (error) {
                console.error('Error creating draft:', error);
                alert('Error creating draft');
            }
        });
    }

    async function updateDraft(draftId) {
        const payload = {
            id: draftId,
            startDate: document.getElementById('draftStartDate').value,
            endDate: document.getElementById('draftEndDate').value,
            draftType: document.getElementById('draftType').value
        };

        try {
            const response = await fetch(`${config.backendUrl}/Drafts/${draftId}`, addAuthHeader({
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }));

            if (!response.ok) {
                console.error('Failed to update draft:', response.status, response.statusText);
                alert('Failed to update draft');
                return;
            }

            alert('Draft updated successfully!');

        } catch (error) {
            console.error('Error updating draft:', error);
            alert('Error updating draft');
        }
    }

    async function fetchLeagueMembers(container) {
        try {
            const existingTable = container.querySelector('.members-table');
            if (existingTable) {
                existingTable.remove();
            }

            const draftPeriodSelect = document.getElementById('draftPeriodSelect');
            if (!draftPeriodSelect) {
                container.innerHTML += '<p>Please select a draft period first</p>';
                return;
            }
            const selectedDraftPeriodId = draftPeriodSelect.value;

            const response = await fetch(
                `${config.backendUrl}/UserSquads/ByLeagueDraftPeriod/${currentEditingLeagueId}/${selectedDraftPeriodId}`,
                addAuthHeader()
            );

            if (!response.ok) {
                console.error('Failed to fetch league members:', response.status, response.statusText);
                container.innerHTML += '<p>Failed to load league members</p>';
                return;
            }

            const data = await response.json();
            const members = Array.isArray(data) ? data : [data];

            // Create a table to display members
            const table = document.createElement('table');
            table.className = 'members-table';
            table.innerHTML = `
            <thead>
                <tr>
                    <th>User ID</th>
                    <th>Squad Name</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="membersTableBody">
            </tbody>
        `;

            const tableBody = table.querySelector('#membersTableBody');

            if (members.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = '<td colspan="3">No members found</td>';
                tableBody.appendChild(row);
            } else {
                members.forEach(member => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                    <td>${member.userId}</td>
                    <td>${member.squadName}</td>
                    <td>
                        <button class="delete-member-btn" data-id="${member.id}">Delete</button>
                    </td>
                `;
                    tableBody.appendChild(row);
                });
            }

            container.appendChild(table);

            // Add event listeners for delete buttons
            document.querySelectorAll('.delete-member-btn').forEach(button => {
                button.addEventListener('click', async () => {
                    await deleteMember(button.getAttribute('data-id'), container);
                });
            });

        } catch (error) {
            console.error('Error fetching league members:', error);
            container.innerHTML += '<p>Error loading league members</p>';
        }
    }

    async function deleteMember(squadId, container) {
        if (!confirm('Are you sure you want to remove this member from the league?')) {
            return;
        }

        try {
            const response = await fetch(`${config.backendUrl}/UserSquads/${squadId}`, addAuthHeader({
                method: 'DELETE'
            }));

            if (!response.ok) {
                console.error('Failed to delete member:', response.status, response.statusText);
                alert('Failed to delete member');
                return;
            }

            alert('Member removed successfully!');

            // Clear the container's content except for the header
            const header = container.querySelector('h3');
            container.innerHTML = '';
            container.appendChild(header);

            // Refresh the members list
            await fetchLeagueMembers(container);

        } catch (error) {
            console.error('Error deleting member:', error);
            alert('Error deleting member');
        }
    }

    async function fetchDraftOrders(draftId) {
        try {
            // Make sure we have a container for draft orders
            let leagueMembersSection = document.getElementById('leagueMembersSection');

            if (!leagueMembersSection) {
                console.error('League members section not found');
                return;
            }

            const response = await fetch(`${config.backendUrl}/DraftOrders/byDraft/${draftId}`, addAuthHeader());

            if (!response.ok) {
                console.error('Failed to fetch draft orders:', response.status, response.statusText);
                const draftOrdersContainer = document.createElement('div');
                draftOrdersContainer.id = 'draftOrdersContainer';
                draftOrdersContainer.innerHTML = '<p>Failed to load draft orders</p>';
                leagueMembersSection.appendChild(draftOrdersContainer);
                return;
            }

            const draftOrders = await response.json();

            // Create container for draft orders if it doesn't exist
            let draftOrdersContainer = document.getElementById('draftOrdersContainer');
            if (!draftOrdersContainer) {
                draftOrdersContainer = document.createElement('div');
                draftOrdersContainer.id = 'draftOrdersContainer';
                leagueMembersSection.appendChild(draftOrdersContainer);
            }

            draftOrdersContainer.innerHTML = '<h4>Draft Order</h4>';

            // Create table for draft orders
            const table = document.createElement('table');
            table.className = 'draft-orders-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Team Name</th>
                        <th>Pick Number</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="draftOrdersTableBody">
                </tbody>
            `;

            const tableBody = table.querySelector('#draftOrdersTableBody');

            draftOrders.forEach(order => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${order.username}</td>
                    <td>${order.teamName}</td>
                    <td>${order.pickNumber}</td>
                    <td><button class="delete-order-btn" data-id="${order.draftOrderId}">Delete</button></td>
                `;
                tableBody.appendChild(row);
            });

            draftOrdersContainer.appendChild(table);

            // Add event listeners for delete buttons
            document.querySelectorAll('.delete-order-btn').forEach(button => {
                button.addEventListener('click', () => {
                    deleteDraftOrder(button.getAttribute('data-id'), draftId);
                });
            });

        } catch (error) {
            console.error('Error fetching draft orders:', error);
            const draftOrdersContainer = document.getElementById('draftOrdersContainer') ||
                document.getElementById('leagueMembersSection');
            draftOrdersContainer.innerHTML += '<p>Error loading draft orders</p>';
        }
    }

    async function deleteDraftOrder(draftOrderId, draftId) {
        if (!confirm('Are you sure you want to delete this draft order?')) {
            return;
        }

        try {
            const response = await fetch(`${config.backendUrl}/DraftOrders/${draftOrderId}`, addAuthHeader({
                method: 'DELETE'
            }));

            if (!response.ok) {
                console.error('Failed to delete draft order:', response.status, response.statusText);
                alert('Failed to delete draft order');
                return;
            }

            alert('Draft order deleted successfully!');
            // Refresh the draft orders list
            fetchDraftOrders(draftId);

        } catch (error) {
            console.error('Error deleting draft order:', error);
            alert('Error deleting draft order');
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

