// js/settings.js
import config from './config.js';

document.addEventListener('DOMContentLoaded', async function () {
    // Check if user is admin by decoding the JWT token
    function isUserAdmin() {
        const token = localStorage.getItem('token');
        if (!token) {
            return false;
        }

        try {
            // Get the payload part of the token (second part)
            const payload = token.split('.')[1];
            // Decode base64
            const decodedPayload = JSON.parse(atob(payload));

            // Check if the role claim exists and is "Admin"
            // The claim name can be "role", "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
            // or "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role" depending on how it's encoded
            return decodedPayload.role === "Admin" ||
                decodedPayload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] === "Admin" ||
                decodedPayload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role"] === "Admin";
        } catch (error) {
            console.error('Error decoding token:', error);
            return false;
        }
    }

    // Hide admin-only menu items if user is not admin
    if (!isUserAdmin()) {
        // Select the menu items that should be hidden from non-admin users
        const adminOnlyItems = [
            'a[href="PlayerPositions.html"]',
            'a[href="Fixtures.html"]',
            'a[href="GameweekStats.html"]',
            'a[href = "resetPassword.html"]',
            'a[href="newUser.html"]'
        ];

        // Find and hide each of these items
        adminOnlyItems.forEach(selector => {
            const menuItem = document.querySelector(selector);
            if (menuItem) {
                // Hide the parent list item
                const listItem = menuItem.closest('li');
                if (listItem) {
                    listItem.style.display = 'none';
                }
            }
        });
    }
});

