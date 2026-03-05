/**
 * Volunteer with NTeer - Volunteer Interactive Map Dashboard
 */

const VolunteerDashboard = {
    map: null,
    userMarker: null,
    userLocation: null, // { lat, lng }
    settingLocationMode: false,

    init() {
        Auth.checkSession();
        if (!Auth.currentUser || Auth.currentUser.role !== 'volunteer') {
            window.location.href = 'index.html';
            return;
        }

        // Set UI text
        document.getElementById('display-name').textContent = Auth.currentUser.fullname;
        document.getElementById('sidebar-name').textContent = Auth.currentUser.fullname;

        // Initialize Map
        this.initMap();

        // Bind UI events
        this.bindEvents();
    },

    initMap() {
        // Initialize Leaflet Map (Default center: Nairobi, Kenya)
        this.map = L.map('interactive-map').setView([-1.286389, 36.817223], 13);

        // Add Map Tiles (Light theme to match aesthetics)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors © CARTO'
        }).addTo(this.map);

        this.plotApprovedSites();

        // Map Click Event for setting user location
        this.map.on('click', (e) => {
            if (this.settingLocationMode) {
                this.setUserLocation(e.latlng.lat, e.latlng.lng);
            }
        });
    },

    // Calculate distance between two points in km using Haversine formula
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of the earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return d.toFixed(1);
    },

    setUserLocation(lat, lng) {
        this.userLocation = { lat, lng };
        document.getElementById('user-lat').value = lat;
        document.getElementById('user-lng').value = lng;

        if (this.userMarker) {
            this.userMarker.setLatLng([lat, lng]);
        } else {
            // User Icon Outline
            const userIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color:#3b82f6; width:22px; height:22px; border-radius:50%; border:3px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.8); display: flex; align-items: center; justify-content: center;"><i class="ph ph-user" style="color: white; font-size: 12px;"></i></div>`,
                iconSize: [22, 22],
                iconAnchor: [11, 11]
            });
            this.userMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(this.map);
            this.userMarker.bindPopup("<b>Your Location</b>").openPopup();
        }

        document.getElementById('btn-set-location').innerHTML = `<i class="ph ph-crosshair"></i> Update Location`;
        document.getElementById('location-status').style.display = 'block';

        this.settingLocationMode = false;
        this.map.getContainer().style.cursor = ''; // Reset cursor

        // Re-plot sites to show updated distances
        this.plotApprovedSites();
    },

    getSupervisorName(id) {
        const users = Store.getUsers();
        const supervisor = users.find(u => u.id === id);
        return supervisor ? supervisor.fullname : 'Unknown Supervisor';
    },

    plotApprovedSites() {
        // Clear existing markers (excluding the user location if it exists)
        this.map.eachLayer((layer) => {
            if (layer instanceof L.Marker && layer !== this.userMarker) {
                this.map.removeLayer(layer);
            }
        });

        const sites = Store.getSites().filter(s => s.status === 'approved' && s.lat && s.lng);

        if (sites.length === 0) return;

        const bounds = [];
        if (this.userLocation) {
            bounds.push([this.userLocation.lat, this.userLocation.lng]);
        }

        sites.forEach(site => {
            const isFull = site.currentVolunteers >= site.maxCapacity;
            const statusClass = isFull ? 'red' : 'green';
            const statusText = isFull ? 'Capacity Full' : 'Available Slots';

            let distanceHtml = '';
            if (this.userLocation) {
                const distance = this.calculateDistance(this.userLocation.lat, this.userLocation.lng, site.lat, site.lng);
                distanceHtml = `<div style="margin-top: 5px; font-weight: 600; color: #3b82f6;"><i class="ph ph-navigation-arrow"></i> ${distance} km away</div>`;
            }

            // Build Popup Content
            const popupContent = `
                <div>
                    <div class="popup-title">${site.name}</div>
                    <div class="popup-meta">Led by ${this.getSupervisorName(site.supervisorId)}</div>
                    <div class="indicator ${statusClass}">${statusText}</div>
                    ${distanceHtml}
                    <br>
                    <button class="btn-view-site" onclick="VolunteerDashboard.openSiteDetail('${site.id}')">View Details / Add Review</button>
                </div>
            `;

            // Custom colored marker based on capacity (Red vs Green)
            const markerColor = isFull ? '#ef4444' : '#27c93f';
            const customIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color:${markerColor}; width:20px; height:20px; border-radius:50%; border:3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            const marker = L.marker([site.lat, site.lng], { icon: customIcon }).addTo(this.map);
            marker.bindPopup(popupContent);
            bounds.push([site.lat, site.lng]);
        });

        // Fit map to markers
        if (bounds.length > 0) {
            this.map.fitBounds(bounds, { padding: [50, 50] });
        }
    },

    bindEvents() {
        // Location Search Interaction
        document.getElementById('btn-search-location').addEventListener('click', async (e) => {
            e.preventDefault();
            const query = document.getElementById('location-search').value.trim();
            if (!query) return;

            const btn = document.getElementById('btn-search-location');
            btn.innerHTML = `<i class="ph ph-spinner" style="animation: spin 1s linear infinite;"></i>`;

            try {
                // Use OpenStreetMap Nominatim for free geocoding
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`);
                const data = await res.json();

                if (data && data.length > 0) {
                    const lat = parseFloat(data[0].lat);
                    const lon = parseFloat(data[0].lon);
                    this.setUserLocation(lat, lon);
                    this.map.setView([lat, lon], 14); // Zoom into the searched location
                } else {
                    alert('Location not found. Try adding "Nairobi" or a more specific area.');
                }
            } catch (err) {
                console.error(err);
                alert('Error fetching location.');
            } finally {
                btn.innerHTML = `<i class="ph ph-magnifying-glass"></i>`;
            }
        });

        // Set Location map interaction
        document.getElementById('btn-set-location').addEventListener('click', () => {
            this.settingLocationMode = true;
            this.map.getContainer().style.cursor = 'crosshair';
            alert("Click anywhere on the map to drop a pin for your location.");
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            Auth.logout();
        });

        // Modal Close Setup
        document.getElementById('modal-close').addEventListener('click', () => {
            document.getElementById('site-modal').classList.remove('active');
        });

        document.getElementById('site-modal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('site-modal')) {
                document.getElementById('site-modal').classList.remove('active');
            }
        });

        // Review Submit Setup
        document.getElementById('review-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitReview();
        });
    },

    openSiteDetail(siteId) {
        const sites = Store.getSites();
        const site = sites.find(s => s.id === siteId);

        if (!site) return;

        const isFull = site.currentVolunteers >= site.maxCapacity;
        const capPercent = (site.currentVolunteers / site.maxCapacity) * 100;
        const statusClass = isFull ? 'red' : 'green';
        const statusText = isFull ? 'Capacity Full' : 'Slots Available';

        // Populate Modal Info
        document.getElementById('modal-site-title').textContent = site.name;
        document.getElementById('modal-site-meta').textContent = `Supervised by ${this.getSupervisorName(site.supervisorId)}`;
        document.getElementById('modal-site-desc').textContent = site.description;

        // Capacity Bar UI
        const bar = document.getElementById('modal-capacity-bar');
        bar.className = `capacity-bar ${statusClass}`;
        bar.style.width = `${Math.min(capPercent, 100)}%`;

        document.getElementById('modal-capacity-text').innerHTML = `<span class="text-${statusClass}">${site.currentVolunteers}</span> / ${site.maxCapacity} volunteers`;

        const statusEl = document.getElementById('modal-capacity-status');
        statusEl.className = `indicator ${statusClass}`;
        statusEl.textContent = statusText;

        // Reset form and set Context
        document.getElementById('review-form').reset();
        document.getElementById('review-site-id').value = site.id;

        // Render Reviews
        this.renderReviews(site.id);

        // Close leaflet popup and open UI modal
        this.map.closePopup();
        document.getElementById('site-modal').classList.add('active');
    },

    renderReviews(siteId) {
        const container = document.getElementById('reviews-container');
        const reviews = Store.getReviews().filter(r => r.siteId === siteId);

        if (reviews.length === 0) {
            container.innerHTML = `<p style="color: var(--color-gray-500); font-style: italic;">No reviews yet. Be the first to share your experience!</p>`;
            return;
        }

        reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        container.innerHTML = reviews.map(rev => {
            const stars = '★'.repeat(rev.rating) + '☆'.repeat(5 - rev.rating);
            return `
                <div class="review-card">
                    <div class="review-header">
                        <span class="reviewer-name">${rev.volunteerName}</span>
                        <span class="review-rating">${stars}</span>
                    </div>
                    <p style="font-size: 0.9rem; margin-bottom: 0.5rem;">${rev.comment}</p>
                    <span style="font-size: 0.75rem; color: var(--color-gray-500);">${new Date(rev.createdAt).toLocaleString()}</span>
                </div>
            `;
        }).join('');
    },

    submitReview() {
        const siteId = document.getElementById('review-site-id').value;
        const rating = parseInt(document.getElementById('review-rating').value, 10);
        const comment = document.getElementById('review-comment').value.trim();

        if (!comment) return;

        const newReview = {
            id: 'review-' + Date.now(),
            siteId: siteId,
            volunteerId: Auth.currentUser.id,
            volunteerName: Auth.currentUser.fullname,
            rating: rating,
            comment: comment,
            createdAt: new Date().toISOString()
        };

        const reviews = Store.getReviews();
        reviews.push(newReview);
        Store.saveReviews(reviews);

        // Reset form and rerender
        document.getElementById('review-form').reset();
        this.renderReviews(siteId);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    VolunteerDashboard.init();
});
// Expose specific functions globally so they can be called by leaflet popup inline HTML
window.VolunteerDashboard = VolunteerDashboard;
