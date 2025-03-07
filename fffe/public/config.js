// js/config.js
const config = {
    //backendUrl: 'https://localhost:44390/api',
     backendUrl: 'https://ffbe-akdrgxb2fjd6fddh.eastus2-01.azurewebsites.net/api',
    runtime: 'Azure' // or 'Local'
};

/*
const isDevelopment = window.location.hostname === 'localhost';

const config = {
    backendUrl: isDevelopment
        ? 'https://localhost:44390/api'
        : 'https://ffbe-akdrgxb2fjd6fddh.eastus2-01.azurewebsites.net/api'
};
*/

export default config;