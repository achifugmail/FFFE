const isDevelopment = window.location.hostname === 'localhost';
const isTest = window.location.hostname === 'test.divizia.net';

const config = {
    backendUrl: isDevelopment
        ? 'https://localhost:44390/api2'
        //: 'https://ffbe-akdrgxb2fjd6fddh.eastus2-01.azurewebsites.net/api'
        //: 'https://ffbe1-hjdthacef0hjc9ht.eastus2-01.azurewebsites.net/api2'
        : isTest ? 'https://ffbe1test-cmdch8dgcscmd0e6.eastus2-01.azurewebsites.net'
            : 'https://ffbe1-hjdthacef0hjc9ht.eastus2-01.azurewebsites.net'
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
        window.location.href = 'Team.html';
    } else {
        alert('Login failed. Please check your username and password.');
    }
});