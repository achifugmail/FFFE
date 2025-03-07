import config from './config.js';

document.getElementById('registerForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;
    const email = document.getElementById('registerEmail').value;

    const response = await fetch(`${config.backendUrl}/User/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password, email })
    });

    if (response.ok) {
        const data = await response.json();
        alert('Registration successful!');
        // Handle successful registration, e.g., redirect to login page
    } else {
        alert('Registration failed. Please try again.');
    }
});
