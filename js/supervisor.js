/**
 * Volunteer with NTeer - Supervisor Dashboard Logic (Single Site Restriction)
 */

const SupervisorDashboard = {
    map: null,
    marker: null,

    init() {
        Auth.checkSession();
        if (!Auth.currentUser || Auth.currentUser.role !== 'supervisor') {
            window.location.href = 'index.html';
            return;
        }

        // Set UI text
        document.getElementById('display-name').textContent = Auth.currentUser.fullname;

        // Initialize Map
        this.initMap();

        // Bind UI events
        this.bindEvents();

        // Load the supervisor's single site (if it exists)
        this.loadSite();
    },

    initMap() {
        // Default center (Nairobi, Kenya)
        this.map = L.map('map-picker').setView([-1.286389, 36.817223], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(this.map);

        // Map click event to set pin
        this.map.on('click', (e) => {
            const { lat, lng } = e.latlng;
            this.setMarker(lat, lng);
        });
    },

    setMarker(lat, lng) {
        if (this.marker) {
            this.marker.setLatLng([lat, lng]);
        } else {
            this.marker = L.marker([lat, lng]).addTo(this.map);
        }
        this.map.setView([lat, lng], this.map.getZoom());

        document.getElementById('site-lat').value = lat;
        document.getElementById('site-lng').value = lng;
    },

    bindEvents() {
        // Logout
        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            Auth.logout();
        });

        // Form Submit
        document.getElementById('site-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSite();
        });
    },

    loadSite() {
        const sites = Store.getSites();
        // A supervisor can only have ONE site
        const mySite = sites.find(s => s.supervisorId === Auth.currentUser.id);

        if (mySite) {
            // Populate form
            document.getElementById('site-id').value = mySite.id;
            document.getElementById('site-name').value = mySite.name;
            document.getElementById('site-desc').value = mySite.description;
            document.getElementById('site-max').value = mySite.maxCapacity;
            document.getElementById('site-current').value = mySite.currentVolunteers;

            // Show Status
            const statusEl = document.getElementById('site-status');
            const badgeText = document.getElementById('status-badge-text');
            statusEl.style.display = 'block';

            if (mySite.status === 'approved') {
                badgeText.className = 'status-badge approved';
                badgeText.textContent = 'Approved by Admin';
            } else {
                badgeText.className = 'status-badge pending';
                badgeText.textContent = 'Pending Admin Approval';
            }

            // Set Location
            if (mySite.lat && mySite.lng) {
                this.setMarker(mySite.lat, mySite.lng);
            }
        }
    },

    saveSite() {
        const siteId = document.getElementById('site-id').value;
        const name = document.getElementById('site-name').value.trim();
        const description = document.getElementById('site-desc').value.trim();
        const maxCapacity = parseInt(document.getElementById('site-max').value, 10);
        let currentVolunteers = parseInt(document.getElementById('site-current').value, 10) || 0;

        const lat = document.getElementById('site-lat').value;
        const lng = document.getElementById('site-lng').value;

        if (!lat || !lng) {
            alert('Please click on the map to set a location pin for your site.');
            return;
        }

        if (currentVolunteers > maxCapacity) {
            alert('Current volunteers cannot exceed site limit.');
            return;
        }

        let sites = Store.getSites();

        if (siteId) {
            // Update existing single site
            const index = sites.findIndex(s => s.id === siteId);
            if (index !== -1) {
                sites[index].name = name;
                sites[index].description = description;
                sites[index].maxCapacity = maxCapacity;
                sites[index].currentVolunteers = currentVolunteers;
                sites[index].lat = parseFloat(lat);
                sites[index].lng = parseFloat(lng);
                sites[index].updatedAt = new Date().toISOString();
                // If they change fundamental details, might want to reset to 'pending'. 
                // However, I'll keep it simple: retain current status.
            }
        } else {
            // Create New Single Site
            const newSite = {
                id: 'site-' + Date.now(),
                supervisorId: Auth.currentUser.id,
                name,
                description,
                maxCapacity,
                currentVolunteers: currentVolunteers,
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                status: 'pending', // Requires admin verification
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            sites.push(newSite);
            document.getElementById('site-id').value = newSite.id;
        }

        Store.saveSites(sites);

        // Reload to show pending status
        this.loadSite();
        alert('Site configuration saved successfully!');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    SupervisorDashboard.init();
});
