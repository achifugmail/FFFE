// js/main.js
import config from './config.js';

document.getElementById('loginForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    const response = await fetch(`${config.backendUrl}/User/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies in the request
        body: JSON.stringify({ username, password })
    });

    if (response.ok) {
        const data = await response.json();
        //alert('Login successful!');
        // Store the user's name in local storage
        localStorage.setItem('username', username);
        // Redirect to main.html upon successful login
        window.location.href = 'main.html';
    } else {
        alert('Login failed. Please check your username and password.');
    }
});

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
