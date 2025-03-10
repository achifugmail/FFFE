const isDevelopment = window.location.hostname === 'localhost';

const config = {
    backendUrl: isDevelopment
        ? 'https://localhost:44390/api'
        : 'https://ffbe-akdrgxb2fjd6fddh.eastus2-01.azurewebsites.net/api'
};

document.getElementById('loginForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    const response = await fetch(`${config.backendUrl}/User/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    });

    if (response.ok) {
        const data = await response.json();
        localStorage.setItem('username', username);
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('token', data.token); // Store the JWT
        window.location.href = 'main.html';
    } else {
        alert('Login failed. Please check your username and password.');
    }
});