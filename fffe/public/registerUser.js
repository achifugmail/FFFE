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
        // Registration successful, now log in automatically
        const loginResponse = await fetch(`${config.backendUrl}/User/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        if (loginResponse.ok) {
            const data = await loginResponse.json();
            localStorage.setItem('username', username);
            localStorage.setItem('userId', data.userId);
            localStorage.setItem('token', data.token); // Store the JWT
            window.location.href = 'Team.html';
        } else {
            alert('Registration succeeded, but automatic login failed. Please log in manually.');
        }
    } else {
        alert('Registration failed. Please try again.');
    }
});
