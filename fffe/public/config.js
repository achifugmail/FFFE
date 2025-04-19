// js/config.js
/*
const config = {
    backendUrl: 'https://localhost:44390/api',
    //backendUrl: 'https://ffbe-akdrgxb2fjd6fddh.eastus2-01.azurewebsites.net/api',
    runtime: 'Azure' // or 'Local'
};
*/

const isDevelopment = window.location.hostname === 'localhost';

const config = {
    backendUrl: isDevelopment
        ? 'https://localhost:44390/api2'
        //: 'https://ffbe-akdrgxb2fjd6fddh.eastus2-01.azurewebsites.net/api'
        : 'https://ffbe1-hjdthacef0hjc9ht.eastus2-01.azurewebsites.net/api2'
};

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