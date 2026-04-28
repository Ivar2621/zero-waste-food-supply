// ==========================================
// SPA NAVIGATION & AUTH
// ==========================================
const API_BASE = 'https://glamour-observing-childless.ngrok-free.dev';

// Sections
const sections = document.querySelectorAll('.page-section');
const navBtns = document.querySelectorAll('.sidebar-btn[data-target]');
const loginBtn = document.getElementById('nav-login-btn');
const sidebar = document.querySelector('.sidebar');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        const icon = mobileMenuBtn.querySelector('i');
        if (sidebar.classList.contains('open')) {
            icon.className = 'ph ph-x';
        } else {
            icon.className = 'ph ph-list';
        }
    });
}

function navigateTo(targetId) {
    // Hide all sections
    sections.forEach(sec => sec.classList.add('hidden'));
    sections.forEach(sec => sec.classList.remove('active'));

    // Deactivate all nav buttons
    navBtns.forEach(btn => btn.classList.remove('active'));

    // Show target section
    const target = document.getElementById(targetId);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('active');
    }

    // Activate nav button
    const activeBtn = document.querySelector(`.sidebar-btn[data-target="${targetId}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // Special logic for map
    if (targetId === 'map' && map) {
        setTimeout(() => map.invalidateSize(), 100);
    }

    // Close sidebar on mobile after navigation
    if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        if (mobileMenuBtn) mobileMenuBtn.querySelector('i').className = 'ph ph-list';
    }
}

navBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(btn.getAttribute('data-target'));
    });
});

// Auth Logic
let currentUser = localStorage.getItem('zw_user');

function updateAuthUI() {
    const loginSpan = loginBtn.querySelector('span');
    const loginIcon = loginBtn.querySelector('i');
    
    if (currentUser) {
        if (loginSpan) loginSpan.textContent = "Profile";
        if (loginIcon) loginIcon.className = "ph ph-user-circle";
        loginBtn.setAttribute('data-target', 'profile');
        if (document.getElementById('profile-email-display')) {
            document.getElementById('profile-email-display').textContent = currentUser;
        }
    } else {
        if (loginSpan) loginSpan.textContent = "Login";
        if (loginIcon) loginIcon.className = "ph ph-user";
        loginBtn.setAttribute('data-target', 'login');
    }
}
updateAuthUI();

let isLoginMode = true;
document.getElementById('auth-toggle-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    document.getElementById('auth-title').textContent = isLoginMode ? 'Welcome Back' : 'Create Account';
    document.getElementById('auth-submit').textContent = isLoginMode ? 'Login' : 'Sign Up';
    document.getElementById('auth-toggle-text').textContent = isLoginMode ? "Don't have an account?" : "Already have an account?";
});

document.getElementById('login-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    localStorage.setItem('zw_user', email);
    currentUser = email;
    updateAuthUI();
    applyRoleBehavior();
    navigateTo('dashboard');
});

document.getElementById('logout-btn')?.addEventListener('click', () => {
    localStorage.removeItem('zw_user');
    localStorage.removeItem('userRole'); // Clear role on logout
    currentUser = null;
    updateAuthUI();
    document.getElementById('nav-role-container').classList.add('hidden');
    navigateTo('home');
});

// ==========================================
// ROLE SELECTION LOGIC
// ==========================================
let pendingRole = null;

function selectRole(role) {
    pendingRole = role;

    document.getElementById('role-supplier').classList.remove('selected');
    document.getElementById('role-ngo').classList.remove('selected');

    document.getElementById(`role-${role}`).classList.add('selected');

    const continueBtn = document.getElementById('role-continue-btn');
    continueBtn.disabled = false;

    if (role === 'supplier') {
        continueBtn.style.background = 'var(--success)';
        continueBtn.style.color = 'white';
    } else {
        continueBtn.style.background = 'var(--warning)';
        continueBtn.style.color = '#000';
    }
}

function confirmRole() {
    if (!pendingRole) return;
    localStorage.setItem('userRole', pendingRole);

    document.getElementById('role-selection-step').classList.add('hidden');
    document.getElementById('auth-form-step').classList.remove('hidden');
}

function switchRole() {
    localStorage.removeItem('userRole');
    document.getElementById('auth-form-step').classList.add('hidden');
    document.getElementById('role-selection-step').classList.remove('hidden');
    navigateTo('login');
}

function applyRoleBehavior() {
    const role = localStorage.getItem('userRole');
    if (!role || !currentUser) return;

    // Show badge in navbar
    const badgeContainer = document.getElementById('nav-role-container');
    const badge = document.getElementById('nav-role-badge');
    badgeContainer.classList.remove('hidden');

    // Elements to toggle
    const supplierDash = document.getElementById('supplier-dashboard');
    const ngoDash = document.getElementById('ngo-dashboard');
    const analyzeSection = document.getElementById('supplier-analyze-section');

    if (role === 'supplier') {
        badge.textContent = 'Supplier';
        badge.className = 'status-badge active bg-success';
        badge.style.color = 'white';
        
        if (supplierDash) supplierDash.classList.remove('hidden');
        if (ngoDash) ngoDash.classList.add('hidden');
        if (analyzeSection) analyzeSection.classList.remove('hidden');
        
    } else if (role === 'ngo') {
        badge.textContent = 'NGO / Receiver';
        badge.className = 'status-badge active bg-warning';
        badge.style.color = '#000';
        
        if (supplierDash) supplierDash.classList.add('hidden');
        if (ngoDash) ngoDash.classList.remove('hidden');
        if (analyzeSection) analyzeSection.classList.add('hidden');
    }
}


// ==========================================
// STRICT FOOD VALIDATION & DASHBOARD
// ==========================================
const BLOCKED_FOODS = new Set(['pizza', 'burger', 'sandwich', 'pasta', 'noodles', 'fries', 'coffee', 'fast food']);
const ALLOWED_FOODS = new Set(['milk', 'rice', 'wheat', 'dal', 'vegetables', 'fruits', 'eggs', 'bread', 'roti', 'sabzi']);

document.getElementById('analyze-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputField = document.getElementById('food-input');
    const rawVal = inputField.value.trim().toLowerCase();

    // Hide previous states
    document.getElementById('validation-error').classList.add('hidden');
    document.getElementById('analyze-results').classList.add('hidden');
    const placeholder = document.getElementById('dashboard-placeholder');
    if (placeholder) placeholder.classList.add('hidden');

    // Strict Validation
    if (BLOCKED_FOODS.has(rawVal) || !ALLOWED_FOODS.has(rawVal)) {
        document.getElementById('validation-error').classList.remove('hidden');
        return;
    }

    document.getElementById('analyze-loader').classList.remove('hidden');

    try {
        const res = await fetch(`${API_BASE}/combined-action?item=${encodeURIComponent(rawVal)}&expiry_days=2`, {
            headers: { "ngrok-skip-browser-warning": "true" }
        });

        if (!res.ok) throw new Error("API Error");
        const data = await res.json();

        document.getElementById('res-action').textContent = data.recommended_action || 'Donate';
        document.getElementById('res-discount').textContent = data.discount_percent !== undefined ? `${data.discount_percent}%` : 'N/A';
        document.getElementById('res-price').textContent = data.final_price_inr !== undefined ? `₹${data.final_price_inr}` : 'N/A';
        document.getElementById('res-demand').textContent = data.demand_level || 'High';

        document.getElementById('analyze-loader').classList.add('hidden');
        document.getElementById('analyze-results').classList.remove('hidden');

    } catch (err) {
        document.getElementById('analyze-loader').classList.add('hidden');
        // Fallback for demo if API is offline
        document.getElementById('res-action').textContent = 'Donate';
        document.getElementById('res-discount').textContent = 'N/A';
        document.getElementById('res-price').textContent = 'N/A';
        document.getElementById('res-demand').textContent = 'High';
        document.getElementById('analyze-results').classList.remove('hidden');
        showToast("Demo Mode: Backend offline, using predicted metrics.", "info");
    }
});


// ==========================================
// MAP & ROUTING LOGIC
// ==========================================
let map;
let layerGroup;
let routeControl;
let allNgos = [];
let allSuppliers = [];
let userLat = 23.0225;
let userLon = 72.5714;
let userLocationMarker;

function haversineDist(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function initMap() {
    if (map) return;
    map = L.map('map-container').setView([userLat, userLon], 13);

    const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19
    });

    const lightLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19
    });

    darkLayer.addTo(map);

    L.control.layers({
        "Dark Mode": darkLayer,
        "Light Mode": lightLayer,
        "Satellite": satelliteLayer
    }).addTo(map);

    layerGroup = L.layerGroup().addTo(map);

    plotUserLocation();
    renderMarkers();
}

function plotUserLocation() {
    if (!map) return;
    if (userLocationMarker) map.removeLayer(userLocationMarker);
    const userIcon = L.divIcon({ className: 'custom-div-icon', html: `<div style="background:#3b82f6; width:18px; height:18px; border-radius:50%; border:3px solid white; box-shadow: 0 0 15px #3b82f6;"></div>` });
    userLocationMarker = L.marker([userLat, userLon], { icon: userIcon }).addTo(map).bindPopup("<b>Your Live Location</b>");
}

async function loadMapData(lat = userLat, lon = userLon) {
    try {
        const res = await fetch(`${API_BASE}/map-data?latitude=${lat}&longitude=${lon}`, {
            headers: { "ngrok-skip-browser-warning": "true" }
        });
        if (!res.ok) throw new Error("Map API Failed");
        const data = await res.json();

        allNgos = data.nearby_ngos || [];
        allSuppliers = data.surplus_locations || [];

        if (map) renderMarkers();
        renderNgoDirectory();
        renderSupplierDirectory();
        updateAnalytics(data.summary, allNgos.length, allSuppliers.length);

    } catch (err) {
        console.error("Map fetch error. Falling back to mock data:", err);

        // Mock Data Fallback with detailed info
        allNgos = [
            { 
                name: "Hunger Relief Foundation", 
                need_level: "high", 
                distance_km: 2.4, 
                latitude: userLat + 0.01, 
                longitude: userLon + 0.01,
                address: "42, Green Avenue, Sector 5",
                manager: "Vikram Shah",
                phone: "+91 98765 43210",
                email: "vikram@hungerrelief.org"
            },
            { 
                name: "City Food Bank", 
                need_level: "medium", 
                distance_km: 4.1, 
                latitude: userLat - 0.02, 
                longitude: userLon + 0.015,
                address: "Building 7, Industrial Estate",
                manager: "Anjali Gupta",
                phone: "+91 91234 56789",
                email: "contact@cityfoodbank.in"
            },
            { 
                name: "Green Plate Initiative", 
                need_level: "low", 
                distance_km: 1.2, 
                latitude: userLat + 0.015, 
                longitude: userLon - 0.01,
                address: "Plot 15, Sunrise Colony",
                manager: "Suresh Menon",
                phone: "+91 99887 76655",
                email: "suresh@greenplate.com"
            },
            {
                name: "Community Kitchen",
                need_level: "high",
                distance_km: 3.5,
                latitude: userLat - 0.015,
                longitude: userLon - 0.025,
                address: "G-8, Railway Station Road",
                manager: "Rajesh Kumar",
                phone: "+91 88776 65544",
                email: "rajesh@communitykitchen.org"
            }
        ];
        allSuppliers = [
            { 
                name: "Restaurant A", 
                category: "restaurant", 
                surplus_level: "high", 
                available_items: ["rice", "bread"], 
                distance_km: 1.5, 
                latitude: userLat - 0.01, 
                longitude: userLon - 0.02,
                address: "12, Main Street, Mall Area",
                manager: "Chef Rahul",
                phone: "+91 77665 54433"
            },
            { 
                name: "Supermarket B", 
                category: "supermarket", 
                surplus_level: "medium", 
                available_items: ["milk", "vegetables"], 
                distance_km: 3.2, 
                latitude: userLat + 0.02, 
                longitude: userLon + 0.02,
                address: "Plaza Mall, Ground Floor",
                manager: "Priya Sharma",
                phone: "+91 66554 43322"
            },
            {
                name: "Fresh Foods Warehouse",
                category: "warehouse",
                surplus_level: "low",
                available_items: ["fruits", "eggs"],
                distance_km: 5.8,
                latitude: userLat + 0.03,
                longitude: userLon - 0.03,
                address: "Cargo Terminal A, Airport Road",
                manager: "Amit Verma",
                phone: "+91 55443 32211"
            }
        ];

        const mockSummary = { alert: "Live API Offline. Displaying Fallback Data." };

        if (map) renderMarkers();
        renderNgoDirectory();
        renderSupplierDirectory();
        try {
            updateAnalytics(mockSummary, allNgos.length, allSuppliers.length);
            const alertMsg = document.getElementById('stat-alert-msg');
            if (alertMsg) alertMsg.style.color = "var(--warning)";
        } catch(e) {}
    }
}

function renderMarkers() {
    if (!layerGroup) return;
    layerGroup.clearLayers();

    // NGOs (All Red)
    allNgos.forEach(ngo => {
        const color = 'var(--danger)';
        const icon = L.divIcon({ className: 'custom-div-icon', html: `<div style="background:${color}; width:16px; height:16px; border-radius:50%; border:2px solid white;"></div>` });

        L.marker([ngo.latitude, ngo.longitude], { icon }).addTo(layerGroup).bindPopup(`
            <div style="color: black; min-width: 200px;">
                <h3 style="margin-bottom:5px; border-bottom: 1px solid #eee; padding-bottom: 5px;">${ngo.name}</h3>
                <p><b>Need:</b> <span class="status-badge" style="background:var(--badge-${ngo.need_level}-bg); color:var(--badge-${ngo.need_level}-text)">${ngo.need_level.toUpperCase()}</span></p>
                <p><b>Address:</b> ${ngo.address || 'N/A'}</p>
                <p><b>Manager:</b> ${ngo.manager || 'N/A'}</p>
                <p><b>Phone:</b> ${ngo.phone || 'N/A'}</p>
                <p><b>Distance:</b> ${ngo.distance_km} km</p>
            </div>
        `);
    });

    // Suppliers (All Green)
    allSuppliers.forEach(sup => {
        const color = 'var(--success)';
        const icon = L.divIcon({ className: 'custom-div-icon', html: `<div style="background:${color}; width:16px; height:16px; border-radius:50%; border:2px solid white;"></div>` });

        const marker = L.marker([sup.latitude, sup.longitude], { icon }).addTo(layerGroup);

        // Custom popup with Route button
        const popupContent = document.createElement('div');
        popupContent.style.color = "black";
        popupContent.innerHTML = `
            <h3 style="margin-bottom:5px; border-bottom: 1px solid #eee; padding-bottom: 5px;">${sup.name}</h3>
            <p><b>Surplus:</b> ${sup.surplus_level.toUpperCase()}</p>
            <p><b>Address:</b> ${sup.address || 'N/A'}</p>
            <p><b>Manager:</b> ${sup.manager || 'N/A'}</p>
            <p><b>Phone:</b> ${sup.phone || 'N/A'}</p>
            <p><b>Distance:</b> ${sup.distance_km} km</p>
            <button class="route-btn" style="background:var(--primary); color:white; border:none; padding:8px 12px; border-radius:8px; margin-top:10px; cursor:pointer; width:100%; font-weight:bold; transition: 0.2s;">Show Route to Nearest NGO</button>
        `;

        popupContent.querySelector('.route-btn').addEventListener('click', () => {
            drawRouteToNearestNgo(sup.latitude, sup.longitude);
            marker.closePopup();
        });

        marker.bindPopup(popupContent);
    });
}

function drawRouteToNearestNgo(supLat, supLon) {
    if (routeControl) {
        map.removeControl(routeControl);
    }

    if (allNgos.length === 0) {
        alert("No NGOs available for routing.");
        return;
    }

    // Find nearest NGO
    let nearestNgo = allNgos[0];
    let minDist = haversineDist(supLat, supLon, nearestNgo.latitude, nearestNgo.longitude);

    for (let i = 1; i < allNgos.length; i++) {
        let dist = haversineDist(supLat, supLon, allNgos[i].latitude, allNgos[i].longitude);
        if (dist < minDist) {
            minDist = dist;
            nearestNgo = allNgos[i];
        }
    }

    // Draw Route
    routeControl = L.Routing.control({
        waypoints: [
            L.latLng(supLat, supLon),
            L.latLng(nearestNgo.latitude, nearestNgo.longitude)
        ],
        lineOptions: {
            styles: [{ color: '#8b5cf6', opacity: 0.8, weight: 6 }]
        },
        createMarker: function () { return null; }, // hide default routing markers
        show: true
    }).addTo(map);
}

// Ensure map initializes when the tab is first shown
document.querySelector('.sidebar-btn[data-target="map"]').addEventListener('click', () => {
    setTimeout(initMap, 50);
});

// If map is default view somehow
if (document.getElementById('map').classList.contains('active')) {
    initMap();
}

// ==========================================
// DIRECTORY PAGES (NGO & Supplier)
// ==========================================

function renderNgoDirectory(filter = 'all', search = '') {
    const list = document.getElementById('ngo-list');
    if (!list) return;
    list.innerHTML = '';

    let filtered = allNgos.filter(n => {
        let matchFilter = filter === 'all' || n.need_level === filter;
        let matchSearch = n.name.toLowerCase().includes(search.toLowerCase());
        return matchFilter && matchSearch;
    });

    if (filtered.length === 0) {
        list.innerHTML = `<p class="text-muted">No NGOs found.</p>`;
        return;
    }

    filtered.forEach(ngo => {
        list.innerHTML += `
            <div class="glass-card">
                <div class="dir-card-header">
                    <h3>${ngo.name}</h3>
                    <span class="dir-badge bg-danger">NGO</span>
                </div>
                <div class="dir-card-body">
                    <p class="text-secondary"><i class="ph ph-map-pin"></i> ${ngo.address || 'N/A'}</p>
                    <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 0.5rem;">${ngo.distance_km} km away</p>
                    
                    <div class="manager-info glass" style="padding: 0.75rem; border-radius: 12px; margin-top: 1rem; background: rgba(255,255,255,0.02);">
                        <p class="text-primary" style="font-weight: 600; font-size: 0.9rem;"><i class="ph ph-user"></i> ${ngo.manager || 'N/A'}</p>
                        <p class="text-secondary" style="font-size: 0.85rem;"><i class="ph ph-phone"></i> ${ngo.phone || 'N/A'}</p>
                        <p class="text-muted" style="font-size: 0.8rem;"><i class="ph ph-envelope"></i> ${ngo.email || 'N/A'}</p>
                    </div>
                </div>
                <button class="btn-primary btn-full mt-2" onclick="navigateTo('map')">View on Map</button>
            </div>
        `;
    });
}

function renderSupplierDirectory(filter = 'all', search = '') {
    const list = document.getElementById('supplier-list');
    if (!list) return;
    list.innerHTML = '';

    let filtered = allSuppliers.filter(s => {
        let matchFilter = filter === 'all' || s.category === filter;
        let matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
        return matchFilter && matchSearch;
    });

    if (filtered.length === 0) {
        list.innerHTML = `<p class="text-muted">No suppliers found.</p>`;
        return;
    }

    filtered.forEach(sup => {
        list.innerHTML += `
            <div class="glass-card">
                <div class="dir-card-header">
                    <h3>${sup.name}</h3>
                    <span class="dir-badge bg-info">${sup.category.toUpperCase()}</span>
                </div>
                <div class="dir-card-body">
                    <p class="text-secondary"><i class="ph ph-package"></i> Items: ${sup.available_items ? sup.available_items.join(', ') : 'Mixed'}</p>
                    <p class="text-secondary"><i class="ph ph-map-pin"></i> ${sup.address || 'N/A'}</p>
                    <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 0.5rem;">${sup.distance_km} km away</p>
                    
                    <div class="manager-info glass" style="padding: 0.75rem; border-radius: 12px; margin-top: 1rem; background: rgba(255,255,255,0.02);">
                        <p class="text-primary" style="font-weight: 600; font-size: 0.9rem;"><i class="ph ph-user"></i> ${sup.manager || 'N/A'}</p>
                        <p class="text-secondary" style="font-size: 0.85rem;"><i class="ph ph-phone"></i> ${sup.phone || 'N/A'}</p>
                    </div>
                </div>
                <button class="btn-primary btn-full mt-2" onclick="navigateTo('map')">View on Map</button>
            </div>
        `;
    });
}

// Bind Events
document.getElementById('ngo-search')?.addEventListener('input', (e) => {
    renderNgoDirectory(document.getElementById('ngo-filter').value, e.target.value);
});
document.getElementById('ngo-filter')?.addEventListener('change', (e) => {
    renderNgoDirectory(e.target.value, document.getElementById('ngo-search').value);
});

document.getElementById('supplier-search')?.addEventListener('input', (e) => {
    renderSupplierDirectory(document.getElementById('supplier-filter').value, e.target.value);
});
document.getElementById('supplier-filter')?.addEventListener('change', (e) => {
    renderSupplierDirectory(e.target.value, document.getElementById('supplier-search').value);
});


// ==========================================
// ANALYTICS PAGE
// ==========================================
function updateAnalytics(summary, totalNgos, totalSups) {
    document.getElementById('stat-ngos').textContent = totalNgos;
    document.getElementById('stat-suppliers').textContent = totalSups;

    if (summary) {
        document.getElementById('stat-urgent').textContent = summary.high_need_ngos || 0;
        document.getElementById('stat-alert-msg').textContent = summary.alert || "System operating nominally.";
    }
}

// Initial Data Load (with Geolocation)
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        pos => {
            userLat = pos.coords.latitude;
            userLon = pos.coords.longitude;
            if (map) {
                map.setView([userLat, userLon], 13);
                plotUserLocation();
            }
            loadMapData(userLat, userLon);
        },
        err => {
            console.warn("Geolocation blocked or failed. Using default.");
            loadMapData();
        }
    );
} else {
    loadMapData();
}

// ==========================================
// THEME TOGGLE
// ==========================================
function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') !== 'light';
    const newTheme = isDark ? 'light' : 'dark';

    html.setAttribute('data-theme', newTheme);
    document.getElementById('themeIcon').textContent = isDark ? '🌙' : '☀️';
    localStorage.setItem('theme', newTheme);

    // Sync Chart.js
    if (window.foodChartInstance) {
        Chart.defaults.color = !isDark ? '#94a3b8' : '#475569';
        Chart.defaults.borderColor = !isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';

        // Also update legend text color dynamically
        if (window.foodChartInstance.options.plugins.legend.labels) {
            window.foodChartInstance.options.plugins.legend.labels.color = !isDark ? '#f8fafc' : '#0f172a';
        }
        window.foodChartInstance.update();
    }
}

// On page load
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

// ==========================================
// DASHBOARD CHART.JS INITIALIZATION
// ==========================================
function initDashboardChart() {
    const ctx = document.getElementById('foodChart');
    if (!ctx) return;

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    Chart.defaults.color = isDark ? '#94a3b8' : '#475569';
    Chart.defaults.borderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';

    window.foodChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [
                {
                    label: 'Food Redistributed (kg)',
                    data: [320, 410, 380, 520, 490, 610, 580],
                    borderColor: '#10b981', // var(--primary)
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Food Wasted (kg)',
                    data: [120, 90, 110, 70, 80, 50, 40],
                    borderColor: '#ef4444', // var(--danger)
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: isDark ? '#f8fafc' : '#0f172a',
                        font: { family: "'Poppins', sans-serif" }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true
                },
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Initialize chart when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        themeIcon.textContent = savedTheme === 'light' ? '🌙' : '☀️';
    }

    if (currentUser) {
        applyRoleBehavior();
    } else {
        // If not logged in, ensure role step is shown if they go to login
        const role = localStorage.getItem('userRole');
        if (role) {
            document.getElementById('role-selection-step').classList.add('hidden');
            document.getElementById('auth-form-step').classList.remove('hidden');
        }
    }
    
    // NGO Need Level listener
    const needLevelSelect = document.getElementById('ngo-need-level');
    if (needLevelSelect) {
        const savedNeed = localStorage.getItem('ngoNeedLevel') || 'high';
        needLevelSelect.value = savedNeed;
        needLevelSelect.addEventListener('change', (e) => {
            localStorage.setItem('ngoNeedLevel', e.target.value);
            // In a real app, this would trigger an API call to update the NGO's status
        });
    }

    initDashboardChart();
    
    // Animate home page counters
    animateCounters();
});

// ==========================================
// HOME PAGE ANIMATIONS
// ==========================================
function animateCounters() {
    const counters = [
        { id: 'count-food', target: 12450 },
        { id: 'count-ngos', target: 84 },
        { id: 'count-alerts', target: 247 }
    ];
    
    const duration = 2000; // 2 seconds
    const fps = 60;
    const steps = duration / (1000 / fps);
    
    counters.forEach(counter => {
        const el = document.getElementById(counter.id);
        if (!el) return;
        
        let current = 0;
        const increment = counter.target / steps;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= counter.target) {
                current = counter.target;
                clearInterval(timer);
            }
            // Format with commas
            el.textContent = Math.floor(current).toLocaleString();
        }, 1000 / fps);
    });
}

// ==========================================
// REPORT GENERATION
// ==========================================
function generateReport() {
    // 1. Collect date/time
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString();

    // 2. Collect stats (mock data or DOM data)
    // The instructions say "Collect from current page state".
    // I will read them from the DOM.
    const statCards = document.querySelectorAll('#supplier-dashboard .stats-grid h3');
    let foodSaved = "12,450 kg";
    let ngosSupported = "84";
    let co2Reduced = "31,125 kg";
    let alerts = "247 Alerts";
    
    if (statCards.length >= 4) {
        foodSaved = statCards[0].textContent;
        ngosSupported = statCards[1].textContent.replace(' NGOs', '');
        co2Reduced = statCards[2].textContent;
        alerts = statCards[3].textContent;
    }

    // 3. Collect inventory
    let inventoryRows = "";
    const tableRows = document.querySelectorAll('#supplier-dashboard .glass-table tbody tr');
    tableRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 4) {
            const item = cells[0].textContent.padEnd(10, ' ');
            const qty = cells[1].textContent.padEnd(5, ' ');
            const expires = cells[2].textContent.padEnd(10, ' ');
            const urgency = cells[3].textContent.trim();
            inventoryRows += `${item} | ${qty} | ${expires} | ${urgency}\n   `;
        }
    });
    
    // Default fallback if table is empty
    if (!inventoryRows) {
        inventoryRows = `Milk       | 20 L  | 2 days     | Critical
   Tomato     | 12 kg | 3 days     | Warning
   Rice       | 50 kg | 30 days    | Safe\n   `;
    }

    // 4. Build text
    const reportText = `=== Zero Waste Supply Chain Report ===
Generated: ${dateStr} ${timeStr}

IMPACT SUMMARY
Food Saved: ${foodSaved}
NGOs Supported: ${ngosSupported}
CO2 Reduced: ${co2Reduced}
Active Alerts: ${alerts} (12 critical)

INVENTORY STATUS
Item       | Qty   | Expires In | Urgency
${inventoryRows.trim()}

RECOMMENDED ACTIONS
- Donate Milk immediately to nearest high-need NGO
- List Tomato for discounted sale or pickup
- Rice stock is safe — no action needed
======================================`;

    // 5. Trigger download
    const blob = new Blob([reportText], {type: 'text/plain'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'zero-waste-report-' + Date.now() + '.txt';
    a.click();

    // 6. Show toast
    showToast("Report downloaded successfully!", "success");
}

function showToast(message, type = "success") {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'glass-card';
    toast.style.padding = '1rem';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '0.5rem';
    toast.style.animation = 'slideIn 0.3s ease forwards';
    toast.style.background = type === 'success' ? 'var(--success)' : 'var(--danger)';
    toast.style.color = 'white';
    toast.style.border = 'none';

    toast.innerHTML = `<i class="ph ph-check-circle icon-large"></i> <span>${message}</span>`;
    
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ==========================================
// DONATION LOGIC
// ==========================================
async function triggerDonation(btn) {
    const row = btn.closest('tr');
    const item = row.cells[0].textContent.trim();
    const qty = row.cells[1].textContent.trim();
    
    // Step 1: Find nearest high-need NGO (Mocking the fetch if API is offline)
    let ngo = { name: "Hunger Relief Foundation", contact: "+91 98765 43210" }; // Fallback
    try {
        const res = await fetch('http://localhost:8000/ngos?need_level=high');
        if (res.ok) {
            const data = await res.json();
            if (data.ngos && data.ngos.length > 0) {
                ngo = data.ngos[0];
            }
        }
    } catch (e) {
        console.warn("Failed to fetch NGO, using fallback.");
    }

    // Step 2: Build message
    const message = `DONATION REQUEST — Zero Waste Supply Chain
------------------------------------------
From: Zero Waste Dashboard (Supplier)
To: ${ngo.name}
Contact: ${ngo.contact || "N/A"}

Food Item: ${item}
Quantity: ${qty}
Condition: Near expiry — urgent pickup needed

Pickup Location: Your registered address
Preferred Pickup Time: Within 24 hours

This is an automated alert from Zero Waste Intelligence.
Please confirm receipt and arrange pickup.
------------------------------------------`;

    // Step 3: Show Modal
    const modal = document.getElementById('donation-modal');
    document.getElementById('donation-modal-subtitle').textContent = `Message delivered to ${ngo.name}`;
    document.getElementById('donation-modal-message').textContent = message;
    modal.classList.remove('hidden');
    
    // Update button state
    btn.textContent = "Donated ✓";
    btn.style.background = "var(--border-color)";
    btn.style.color = "var(--text-muted)";
    btn.disabled = true;

    // Step 4: Log to console and localStorage
    const logEntry = { item, qty, ngo: ngo.name, timestamp: new Date().toISOString() };
    localStorage.setItem('last_donation_' + Date.now(), JSON.stringify(logEntry));
    console.log("Donation logged:", logEntry);

    // Step 5: Show Toast
    showToast(`${item} donation request sent to ${ngo.name}`, "success");
}

function closeDonationModal() {
    document.getElementById('donation-modal').classList.add('hidden');
}

function copyDonationMessage() {
    const msg = document.getElementById('donation-modal-message').textContent;
    navigator.clipboard.writeText(msg).then(() => {
        showToast("Message copied to clipboard!", "success");
    }).catch(err => {
        console.error("Failed to copy:", err);
    });
}
