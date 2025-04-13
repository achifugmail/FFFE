import config from './config.js';
import { addAuthHeader } from './config.js';

document.addEventListener('DOMContentLoaded', async function () {
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const userSelect = document.getElementById('userSelect');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const togglePasswordIcons = document.querySelectorAll('.toggle-password');

    // Check if current user is admin, if not redirect to home
    //await checkAdminAccess();

    // Fetch users and populate dropdown
    await fetchUsers();

    // Toggle password visibility
    togglePasswordIcons.forEach(icon => {
        icon.addEventListener('click', function () {
            const targetId = this.getAttribute('data-target');
            const targetInput = document.getElementById(targetId);

            if (targetInput.type === 'password') {
                targetInput.type = 'text';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            } else {
                targetInput.type = 'password';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            }
        });
    });

    // Form submission handler
    resetPasswordForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        // Clear previous messages
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';

        const selectedUserId = userSelect.value;
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Validate inputs
        if (!selectedUserId) {
            showError('Please select a user');
            return;
        }

        if (newPassword.length < 8) {
            showError('New password must be at least 8 characters long');
            return;
        }

        if (newPassword !== confirmPassword) {
            showError('New passwords do not match');
            return;
        }

        try {
            // Use admin password reset endpoint
            const response = await fetch(`${config.backendUrl}/User/admin-reset-password`, addAuthHeader({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: parseInt(selectedUserId),
                    newPassword: newPassword
                })
            }));

            if (response.ok) {
                showSuccess('Password reset successfully!');
                resetPasswordForm.reset();
                // Re-populate the user dropdown
                await fetchUsers();
            } else {
                const errorData = await response.json();
                showError(errorData.message || 'Failed to reset password. Please try again.');
            }
        } catch (error) {
            console.error('Error resetting password:', error);
            showError('An error occurred while resetting the password. Please try again later.');
        }
    });

    async function checkAdminAccess() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = '/';
                return;
            }

            // Decode the JWT token
            function parseJwt(token) {
                try {
                    const base64Url = token.split('.')[1];
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
                        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                    }).join(''));

                    return JSON.parse(jsonPayload);
                } catch (e) {
                    return null;
                }
            }

            const decoded = parseJwt(token);

            // Check for admin role
            const role = decoded?.role ||
                decoded?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
                decoded?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role'];

            if (role !== 'Admin') {
                // Not admin, redirect to home
                alert('Access denied. Admin privileges required.');
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Error checking admin access:', error);
            window.location.href = '/';
        }
    }

    async function fetchUsers() {
        try {
            const response = await fetch(`${config.backendUrl}/Users/GetAll`, addAuthHeader());

            if (!response.ok) {
                console.error('Failed to fetch users:', response.status, response.statusText);
                return;
            }

            const users = await response.json();

            // Clear dropdown except first option
            while (userSelect.options.length > 1) {
                userSelect.remove(1);
            }

            // Sort users alphabetically by username
            users.sort((a, b) => a.username.localeCompare(b.username));

            // Add users to dropdown
            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.username;
                if (user.teamName) {
                    option.textContent += ` (${user.teamName})`;
                }
                userSelect.appendChild(option);
            });

        } catch (error) {
            console.error('Error fetching users:', error);
            showError('Failed to load users. Please refresh the page.');
        }
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
    }

    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
    }
});
