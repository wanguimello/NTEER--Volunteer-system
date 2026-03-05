/**
 * Volunteer with NTeer - Authentication Logic
 */

const Auth = {
    // Current logged in user
    currentUser: null,

    init() {
        this.checkSession();
        this.createDefaultAdmin();
        this.bindEvents();
    },

    // Check if a user is currently logged in via localStorage session
    checkSession() {
        const session = localStorage.getItem('sessionUser');
        if (session) {
            this.currentUser = JSON.parse(session);
        }
    },

    // Save the active user session
    setSession(user) {
        this.currentUser = user;
        localStorage.setItem('sessionUser', JSON.stringify(user));
    },

    // Log out user
    logout() {
        this.currentUser = null;
        localStorage.removeItem('sessionUser');
        window.location.href = 'index.html';
    },

    // Hardcode a default admin account if it doesn't exist
    createDefaultAdmin() {
        let users = Store.getUsers();
        let adminExists = users.some(u => u.username === 'admin');
        if (!adminExists) {
            users.push({
                id: 'admin-0',
                fullname: 'System Administrator',
                username: 'admin',
                password: 'adminpassword', // Simple simulation, no hash for assignment
                role: 'admin',
                createdAt: new Date().toISOString()
            });
            Store.saveUsers(users);
        }
    },

    // Handle Registration
    register(fullname, username, password, role) {
        let users = Store.getUsers();

        // Check if username exists
        if (users.some(u => u.username === username)) {
            return { success: false, message: 'Username already exists.' };
        }

        // Create new user
        const newUser = {
            id: 'user-' + Date.now().toString(),
            fullname,
            username,
            password,
            role,
            status: role === 'supervisor' ? 'pending' : 'approved',
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        Store.saveUsers(users);

        if (role === 'supervisor') {
            return { success: false, message: 'Account created. Pending Administrator approval.' };
        } else {
            // Auto login
            this.setSession(newUser);
            return { success: true, user: newUser };
        }
    },

    login(username, password) {
        let users = Store.getUsers();
        const user = users.find(u => u.username === username && u.password === password);

        if (user) {
            if (user.role === 'supervisor' && user.status === 'pending') {
                return { success: false, message: 'Account pending Administrator approval.' };
            }
            this.setSession(user);
            return { success: true, user: user };
        }

        return { success: false, message: 'Invalid username or password.' };
    },

    // Redirect user to their respective dashboard
    redirectToDashboard(role) {
        switch (role) {
            case 'admin':
                window.location.href = 'admin.html';
                break;
            case 'supervisor':
                window.location.href = 'supervisor.html';
                break;
            case 'volunteer':
                window.location.href = 'volunteer.html';
                break;
            default:
                window.location.href = 'index.html';
        }
    },

    // Bind event listeners for login and registration forms
    bindEvents() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const username = document.getElementById('username').value.trim();
                const password = document.getElementById('password').value;
                const errorEl = document.getElementById('login-error');

                const result = this.login(username, password);
                if (result.success) {
                    errorEl.style.display = 'none';
                    this.redirectToDashboard(result.user.role);
                } else {
                    errorEl.innerText = result.message;
                    errorEl.style.display = 'block';
                }
            });
        }

        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const fullname = document.getElementById('fullname').value.trim();
                const username = document.getElementById('username').value.trim();
                const password = document.getElementById('password').value;
                const role = document.getElementById('role').value;
                const errorEl = document.getElementById('register-error');

                const result = this.register(fullname, username, password, role);
                if (result.success) {
                    errorEl.style.display = 'none';
                    this.redirectToDashboard(result.user.role);
                } else {
                    errorEl.innerText = result.message;
                    errorEl.style.display = 'block';
                }
            });
        }
    }
};

// Initialize Authenticaton logic when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
});
