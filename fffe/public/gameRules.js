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

                const descCell = document.createElement('td');
                descCell.textContent = rule.longDescription;

                const pointsCell = document.createElement('td');
                pointsCell.textContent = rule.points;

                row.appendChild(descCell);
                row.appendChild(pointsCell);
                scoringRulesTable.appendChild(row);
            });
        } catch (error) {
            console.error('Error fetching scoring rules:', error);
            const scoringRulesTable = document.getElementById('scoringRulesTable').getElementsByTagName('tbody')[0];
            const errorRow = document.createElement('tr');
            const errorCell = document.createElement('td');
            errorCell.colSpan = 2;
            errorCell.textContent = 'Failed to load scoring rules. Please try refreshing the page.';
            errorCell.style.color = 'red';
            errorRow.appendChild(errorCell);
            scoringRulesTable.appendChild(errorRow);
        }
    }

    // Populate scoring rules table
    await fetchAndDisplayScoringRules();
});
