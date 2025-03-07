// js/main.js
import config from './config.js';



document.addEventListener('DOMContentLoaded', async function () {
    const username = localStorage.getItem('username');
    if (username) {
        document.getElementById('header').innerText = `Hello, ${username}`;
    }

    // Fetch and display leagues
   
});

