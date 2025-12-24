import config from './config.js';
import { addAuthHeader } from './config.js';

document.addEventListener('DOMContentLoaded', async function () {
    async function fetchAndDisplayScoringRules() {
        try {
            const response = await fetch(`${config.backendUrl}/ScoringRules/getScoringRules`, addAuthHeader());

            if (!response.ok) {
                console.error('Failed to fetch scoring rules:', response.status, response.statusText);
                return;
            }

            const scoringRules = await response.json();
            const scoringRulesTable = document.getElementById('scoringRulesTable').getElementsByTagName('tbody')[0];
            scoringRulesTable.innerHTML = ''; // Clear existing table

            scoringRules.forEach(rule => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${rule.longDescription}</td>
                    <td>${rule.points}</td>
                `;
                scoringRulesTable.appendChild(row);
            });
        } catch (error) {
            console.error('Error fetching scoring rules:', error);
        }
    }

    // Populate scoring rules table
    await fetchAndDisplayScoringRules();
});
