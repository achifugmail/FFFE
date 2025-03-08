const config = {
    //backendUrl: 'https://localhost:44390/api',
    backendUrl: 'https://ffbe-akdrgxb2fjd6fddh.eastus2-01.azurewebsites.net/api',
   
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
        credentials: 'include', // Include cookies in the request
        body: JSON.stringify({ username, password })
    });

    if (response.ok) {
        const data = await response.json();
        //alert('Login successful!');
        // Store the user's name in local storage
        localStorage.setItem('username', username);
        localStorage.setItem('userId', data.id);
        // Redirect to main.html upon successful login
        window.location.href = 'main.html';
    } else {
        alert('Login failed. Please check your username and password.');
    }
});

