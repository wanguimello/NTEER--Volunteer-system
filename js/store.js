/**
 * Volunteer with NTeer - Data Store Simulation
 * Uses LocalStorage to persist data for Users, Sites, and Reviews
 */

const Store = {
    init() {
        if (!localStorage.getItem('users')) {
            localStorage.setItem('users', JSON.stringify([]));
        }
        if (!localStorage.getItem('sites')) {
            localStorage.setItem('sites', JSON.stringify([]));
        }
        if (!localStorage.getItem('reviews')) {
            localStorage.setItem('reviews', JSON.stringify([]));
        }
    },

    // Generic getters
    getUsers() {
        return JSON.parse(localStorage.getItem('users')) || [];
    },
    getSites() {
        return JSON.parse(localStorage.getItem('sites')) || [];
    },
    getReviews() {
        return JSON.parse(localStorage.getItem('reviews')) || [];
    },

    // Generic setters
    saveUsers(users) {
        localStorage.setItem('users', JSON.stringify(users));
    },
    saveSites(sites) {
        localStorage.setItem('sites', JSON.stringify(sites));
    },
    saveReviews(reviews) {
        localStorage.setItem('reviews', JSON.stringify(reviews));
    }
};

// Initialize the store when the script loads
Store.init();
