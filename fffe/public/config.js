// js/config.js
/*
const config = {
    backendUrl: 'https://localhost:44390/api',
    //backendUrl: 'https://ffbe-akdrgxb2fjd6fddh.eastus2-01.azurewebsites.net/api',
    runtime: 'Azure' // or 'Local'
};
*/

const isDevelopment = window.location.hostname === 'localhost';
const isTest = window.location.hostname === 'test.divizia.net';

const config = {
    backendUrl: isDevelopment
        ? 'https://localhost:44390/api2'
        //: 'https://ffbe-akdrgxb2fjd6fddh.eastus2-01.azurewebsites.net/api'
        //: 'https://ffbe1-hjdthacef0hjc9ht.eastus2-01.azurewebsites.net/api2'
        : isTest ? 'https://ffbe1test-cmdch8dgcscmd0e6.eastus2-01.azurewebsites.net/api2'
            : 'https://ffbe1-hjdthacef0hjc9ht.eastus2-01.azurewebsites.net/api2'
};

const host = window.location.hostname;
const root = document.documentElement;

if (host === 'localhost') {
    root.style.setProperty('--primary-color', 'orange'); 
    root.style.setProperty('--navigation-color', 'indigo');
} else if (host.includes('test') || host.includes('staging')) {
    root.style.setProperty('--primary-color', 'pink');
    root.style.setProperty('--navigation-color', 'lightteal');
} else {
    // production
}


function getToken() {
    return localStorage.getItem('token');
}

// Helper function to add the Authorization header
export function addAuthHeader(options = {}) {
    const token = getToken();
    if (!token) {
        console.error('No authentication token found when adding auth header');
        // Instead of redirecting here (which could cause redirect loops),
        // let the calling code handle the 401 response
    }

    const headers = options.headers || {};
    headers['Authorization'] = `Bearer ${token}`;

    return {
        ...options,
        headers
    };
}

export default config;