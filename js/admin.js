/**
 * Volunteer with NTeer - Admin Dashboard Logic
 */

const AdminDashboard = {
    init() {
        Auth.checkSession();
        if (!Auth.currentUser || Auth.currentUser.role !== 'admin') {
            window.location.href = 'index.html';
            return;
        }

        // Set UI text
        document.getElementById('display-name').textContent = Auth.currentUser.fullname;

        // Bind UI events
        this.bindEvents();

        // Initial Data Load
        this.loadOverview();
    },

    bindEvents() {
        // Logout
        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            Auth.logout();
        });

        // Navigation
        document.querySelectorAll('.nav-item a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();

                // Update active state
                document.querySelectorAll('.nav-item a').forEach(l => l.classList.remove('active'));
                e.currentTarget.classList.add('active');

                // Switch View
                const targetView = e.currentTarget.getAttribute('data-view');
                this.switchView(targetView);
            });
        });
    },

    switchView(viewName) {
        // Hide all views
        document.querySelectorAll('.view-section').forEach(section => {
            section.style.display = 'none';
        });

        // Show target view
        document.getElementById(`view-${viewName}`).style.display = 'block';

        // Load data corresponding to the view
        switch (viewName) {
            case 'overview':
                this.loadOverview();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'sites':
                this.loadSites();
                break;
            case 'reviews':
                this.loadReviews();
                break;
        }
    },

    // --- Overview View ---
    loadOverview() {
        const users = Store.getUsers();
        const sites = Store.getSites();
        const reviews = Store.getReviews();

        document.getElementById('stat-users').textContent = users.length;
        document.getElementById('stat-sites').textContent = sites.length;
        document.getElementById('stat-reviews').textContent = reviews.length;
    },

    // --- Users View ---
    loadUsers() {
        const tbody = document.getElementById('users-table-body');
        const users = Store.getUsers();

        tbody.innerHTML = '';

        users.forEach(user => {
            const tr = document.createElement('tr');
            const isSelf = user.id === Auth.currentUser.id;

            let statusBadge = '';
            let approveBtn = '';

            if (user.role === 'supervisor') {
                if (user.status === 'pending') {
                    statusBadge = '<span style="color: #856404; background: #fff3cd; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">Pending</span>';
                    approveBtn = `<button class="action-btn" title="Approve Supervisor" onclick="AdminDashboard.approveUser('${user.id}')" style="color: green; margin-right: 5px;"><i class="ph ph-check-circle"></i></button>`;
                } else {
                    statusBadge = '<span style="color: #155724; background: #d4edda; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">Approved</span>';
                }
            } else {
                statusBadge = '<span style="color: var(--color-gray-500); font-size: 0.8rem;">Active</span>';
            }

            tr.innerHTML = `
                <td><strong>${user.fullname}</strong> ${isSelf ? '(You)' : ''}</td>
                <td>@${user.username}</td>
                <td><span class="role-badge ${user.role}">${user.role}</span></td>
                <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                <td>${statusBadge}</td>
                <td>
                    ${approveBtn}
                    ${!isSelf ? `
                    <button class="action-btn btn-delete" title="Delete User" onclick="AdminDashboard.deleteUser('${user.id}')">
                        <i class="ph ph-trash"></i>
                    </button>
                    ` : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    approveUser(userId) {
        let users = Store.getUsers();
        const index = users.findIndex(u => u.id === userId);
        if (index !== -1) {
            users[index].status = 'approved';
            Store.saveUsers(users);
            this.loadUsers();
        }
    },

    deleteUser(userId) {
        if (confirm('Are you sure you want to delete this user? Their sites and reviews will also be deleted.')) {
            let users = Store.getUsers();
            users = users.filter(u => u.id !== userId);
            Store.saveUsers(users);

            // Clean up sites created by this user if they are a supervisor
            let sites = Store.getSites();
            sites = sites.filter(s => s.supervisorId !== userId);
            Store.saveSites(sites);

            // Clean up reviews created by this user
            let reviews = Store.getReviews();
            reviews = reviews.filter(r => r.volunteerId !== userId);
            Store.saveReviews(reviews);

            this.loadUsers();
            this.loadOverview(); // Update counts
        }
    },

    // --- Sites View ---
    loadSites() {
        const tbody = document.getElementById('sites-table-body');
        const sites = Store.getSites();
        const users = Store.getUsers();

        tbody.innerHTML = '';

        if (sites.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--color-gray-500); padding: 2rem;">No sites found.</td></tr>`;
            return;
        }

        sites.forEach(site => {
            const tr = document.createElement('tr');
            const supervisor = users.find(u => u.id === site.supervisorId);
            const supervisorDisplay = supervisor ? supervisor.fullname : 'Unknown User';

            const capClass = site.currentVolunteers >= site.maxCapacity ? 'text-red' : 'text-blue';
            const statusBadge = site.status === 'approved'
                ? '<span style="color: #155724; background: #d4edda; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">Approved</span>'
                : '<span style="color: #856404; background: #fff3cd; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">Pending</span>';

            const approveBtn = site.status === 'pending'
                ? `<button class="action-btn" title="Approve Site" onclick="AdminDashboard.approveSite('${site.id}')" style="color: green; margin-right: 5px;"><i class="ph ph-check-circle"></i></button>`
                : '';

            tr.innerHTML = `
                <td><strong>${site.name}</strong></td>
                <td>${statusBadge}</td>
                <td>${supervisorDisplay}</td>
                <td><span class="${capClass}">${site.currentVolunteers}</span> / ${site.maxCapacity}</td>
                <td>${new Date(site.createdAt).toLocaleDateString()}</td>
                <td>
                    ${approveBtn}
                    <button class="action-btn btn-delete" title="Delete Site" onclick="AdminDashboard.deleteSite('${site.id}')">
                        <i class="ph ph-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    deleteSite(siteId) {
        if (confirm('Are you sure you want to delete this site via global admin override?')) {
            let sites = Store.getSites();
            sites = sites.filter(s => s.id !== siteId);
            Store.saveSites(sites);

            let reviews = Store.getReviews();
            reviews = reviews.filter(r => r.siteId !== siteId);
            Store.saveReviews(reviews);

            this.loadSites();
            this.loadOverview();
        }
    },

    approveSite(siteId) {
        let sites = Store.getSites();
        const index = sites.findIndex(s => s.id === siteId);
        if (index !== -1) {
            sites[index].status = 'approved';
            Store.saveSites(sites);
            this.loadSites();
        }
    },

    // --- Reviews View ---
    loadReviews() {
        const container = document.getElementById('reviews-container');
        const reviews = Store.getReviews();
        const sites = Store.getSites();

        container.innerHTML = '';

        if (reviews.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding: 4rem; background: var(--color-white); border-radius: 12px; border: 1px solid var(--color-gray-200);">
                    <i class="ph ph-star" style="font-size: 3rem; color: var(--color-gray-200); margin-bottom: 1rem;"></i>
                    <p style="color: var(--color-gray-500);">No reviews have been posted yet.</p>
                </div>
            `;
            return;
        }

        // Sort newest first
        reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        reviews.forEach(review => {
            const site = sites.find(s => s.id === review.siteId);
            const siteName = site ? site.name : 'Unknown/Deleted Site';
            const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);

            const card = document.createElement('div');
            card.className = 'review-card';
            card.innerHTML = `
                <div style="flex: 1;">
                    <div style="margin-bottom: 0.5rem;">
                        <span style="font-weight: 600;">${review.volunteerName}</span>
                        <span style="color: var(--color-gray-500); font-size: 0.9rem; margin: 0 0.5rem;">on</span>
                        <span style="font-weight: 600;">${siteName}</span>
                    </div>
                    <div style="color: #ffbd2e; font-weight: 800; margin-bottom: 0.5rem; font-size: 1.1rem;">${stars}</div>
                    <p style="color: var(--color-gray-800);">${review.comment}</p>
                    <div style="font-size: 0.8rem; color: var(--color-gray-500); margin-top: 1rem;">
                        Posted ${new Date(review.createdAt).toLocaleString()}
                    </div>
                </div>
                <div>
                    <button class="btn-outline" style="color: var(--color-red); border-color: rgba(255,51,51,0.3);" onclick="AdminDashboard.deleteReview('${review.id}')">
                        <i class="ph ph-trash"></i> Remove
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    },

    deleteReview(reviewId) {
        if (confirm('Are you sure you want to remove this review for moderation reasons?')) {
            let reviews = Store.getReviews();
            reviews = reviews.filter(r => r.id !== reviewId);
            Store.saveReviews(reviews);

            this.loadReviews();
            this.loadOverview();
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    AdminDashboard.init();
});
