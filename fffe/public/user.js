import config from './config.js';
import { addAuthHeader } from './config.js';

document.addEventListener('DOMContentLoaded', function () {
    const passwordForm = document.getElementById('passwordForm');
    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const togglePasswordIcons = document.querySelectorAll('.toggle-password');

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
    passwordForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        // Clear previous messages
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';

        const currentPassword = currentPasswordInput.value;
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Validate inputs
        if (newPassword.length < 8) {
            showError('New password must be at least 8 characters long');
            return;
        }

        if (newPassword !== confirmPassword) {
            showError('New passwords do not match');
            return;
        }

        try {
            const response = await fetch(`${config.backendUrl}/User/change-password`, addAuthHeader({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPassword: currentPassword,
                    newPassword: newPassword
                })
            }));

            if (response.ok) {
                showSuccess('Password changed successfully!');
                passwordForm.reset();
            } else {
                const errorData = await response.json();
                showError(errorData.message || 'Failed to change password. Please check your current password and try again.');
            }
        } catch (error) {
            console.error('Error changing password:', error);
            showError('An error occurred while changing your password. Please try again later.');
        }
    });

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
