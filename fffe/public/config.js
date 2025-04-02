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
        ? 'https://localhost:44390/api'
        //: 'https://ffbe-akdrgxb2fjd6fddh.eastus2-01.azurewebsites.net/api'
        : 'ffbe1-hjdthacef0hjc9ht.eastus2-01.azurewebsites.net'
};

function getToken() {
    return localStorage.getItem('token');
}

// Helper function to add the Authorization header
export function addAuthHeader(options = {}) {
    const token = getToken();
    if (!options.headers) {
        options.headers = {};
    }
    options.headers['Authorization'] = `Bearer ${token}`;
    return options;
}

export default config;