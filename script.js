// ==========================================
// UTILITY FUNCTIONS & SECURITY SANITIZATION
// ==========================================
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ==========================================
// CONFIGURATION & GLOBAL STATE
// ==========================================
let state = {
    apiKey: '',
    playlistTitle: '',
    playlistId: '',
    videos: [], // Contains: { id, title, thumbnail, duration, position }
    filteredVideos: [],
    activeSpeed: 1.0,
    watchHoursPerDay: 1.5,
    isLoading: false,
    history: [], // Cached history list to optimize search/filters
    favorites: [], // Cached favorites list (playlist metadata)
    playlistTags: {}, // Map of playlistId -> array of tags
    playlistProgress: {} // Map of playlistId -> array of completed video IDs
};

// Real-world high-quality demo video items (Web Dev & Tech)
const DEMO_VIDEOS = [
    {
        id: "aqvtOP70O3o",
        title: "Introduction to Web Vitals (Google Chrome Developers)",
        thumbnail: "https://img.youtube.com/vi/aqvtOP70O3o/mqdefault.jpg",
        duration: 298, // 4:58
        position: 0
    },
    {
        id: "vN4U5yQv1k4",
        title: "Next-gen CSS: Houdini Layout APIs & Painting",
        thumbnail: "https://img.youtube.com/vi/vN4U5yQv1k4/mqdefault.jpg",
        duration: 552, // 9:12
        position: 1
    },
    {
        id: "7kVeCqQCxlk",
        title: "Mastering CSS Grid Layout: A Deep Technical Dive",
        thumbnail: "https://img.youtube.com/vi/7kVeCqQCxlk/mqdefault.jpg",
        duration: 1455, // 24:15
        position: 2
    },
    {
        id: "xR2aLqMlhco",
        title: "DevTools Tips: How to Inspect & Debug CSS Flexbox",
        thumbnail: "https://img.youtube.com/vi/xR2aLqMlhco/mqdefault.jpg",
        duration: 222, // 3:42
        position: 3
    },
    {
        id: "I7LskTz2xHQ",
        title: "What is WebAssembly? Compiling C++ and Rust to Web",
        thumbnail: "https://img.youtube.com/vi/I7LskTz2xHQ/mqdefault.jpg",
        duration: 725, // 12:05
        position: 4
    },
    {
        id: "jVvU8RJp0Hg",
        title: "Service Workers 101: Offline Caching & Background Sync",
        thumbnail: "https://img.youtube.com/vi/jVvU8RJp0Hg/mqdefault.jpg",
        duration: 930, // 15:30
        position: 5
    },
    {
        id: "eG7914R2Y2s",
        title: "The State of Responsive Web Design in the Modern Era",
        thumbnail: "https://img.youtube.com/vi/eG7914R2Y2s/mqdefault.jpg",
        duration: 1102, // 18:22
        position: 6
    },
    {
        id: "uM_c_1Cq5y0",
        title: "A Complete Guide to Console Methods Beyond console.log",
        thumbnail: "https://img.youtube.com/vi/uM_c_1Cq5y0/mqdefault.jpg",
        duration: 370, // 6:10
        position: 7
    },
    {
        id: "4K33w-0-p2c",
        title: "Understanding CORS: Cross-Origin Resource Sharing Explained",
        thumbnail: "https://img.youtube.com/vi/4K33w-0-p2c/mqdefault.jpg",
        duration: 885, // 14:45
        position: 8
    },
    {
        id: "p2HzZkd2A40",
        title: "Introduction to WebRTC: Live Video & Audio Peer Connections",
        thumbnail: "https://img.youtube.com/vi/p2HzZkd2A40/mqdefault.jpg",
        duration: 1338, // 22:18
        position: 9
    }
];

// Debounce timer states
let trackSearchTimeout;
let historySearchTimeout;
let historyDrawerSearchTimeout;

function filterTracksDebounced() {
    clearTimeout(trackSearchTimeout);
    trackSearchTimeout = setTimeout(() => {
        filterTracks();
    }, 150);
}

function filterHistoryDebounced() {
    clearTimeout(historySearchTimeout);
    historySearchTimeout = setTimeout(() => {
        filterHistory();
    }, 150);
}

function filterHistoryDrawerDebounced() {
    clearTimeout(historyDrawerSearchTimeout);
    historyDrawerSearchTimeout = setTimeout(() => {
        filterHistoryDrawer();
    }, 150);
}

// ==========================================
// THEME MANAGEMENT SYSTEM
// ==========================================
function initTheme() {
    // Theme is loaded synchronously via theme-init.js in the head.
    // Here we just sync the text label.
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    setTheme(currentTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const toggleText = document.getElementById('theme-toggle-text');
    if (toggleText) {
        toggleText.textContent = theme === 'dark' ? 'Dark Mode' : 'Light Mode';
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('vidsum_theme', newTheme);
    showToast(`Switched to ${newTheme === 'dark' ? 'Dark' : 'Light'} Mode`);
}

// Listen for system theme changes if no preference is saved
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('vidsum_theme')) {
        setTheme(e.matches ? 'dark' : 'light');
    }
});

// ==========================================
// APPLICATION INITIALIZATION & EVENT BINDING
// ==========================================
window.addEventListener('load', () => {
    initTheme();
    initializeApiKey();
    loadHistory();
    initDragAndDrop();
    bindEventListeners();
    handleDeepLinking();
});

function bindEventListeners() {
    // Header controls
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('history-badge-trigger').addEventListener('click', () => toggleHistoryDrawer(true));
    document.getElementById('api-badge-trigger').addEventListener('click', toggleApiDrawer);
    
    // API Setting controls
    document.querySelector('#api-drawer .btn-secondary').addEventListener('click', () => toggleApiDrawer(false));
    document.querySelector('#api-drawer .api-input-group button:nth-of-type(1)').addEventListener('click', saveApiKey);
    document.getElementById('btn-remove-api-key').addEventListener('click', removeApiKey);
    document.querySelector('#api-drawer div[style*="border-top"] button:nth-of-type(1)').addEventListener('click', saveBackendUrl);
    document.getElementById('btn-remove-backend-url').addEventListener('click', removeBackendUrl);
    
    // API Inputs keyboard Enter triggers
    document.getElementById('api-key-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveApiKey();
    });
    document.getElementById('backend-url-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveBackendUrl();
    });

    // Playlist input controls
    document.getElementById('playlist-url-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') analyzePlaylist();
    });
    document.getElementById('btn-analyze').addEventListener('click', analyzePlaylist);
    document.querySelector('.demo-btn').addEventListener('click', loadDemoPlaylist);

    // Landing History Search & Sorting controls
    document.getElementById('history-search').addEventListener('input', filterHistoryDebounced);
    document.getElementById('history-sort').addEventListener('change', filterHistory);
    document.querySelector('.landing-header-row .btn-clear-history').addEventListener('click', clearHistory);

    // Sidebar Drawer controls
    document.querySelector('.history-drawer-header .btn-secondary').addEventListener('click', () => toggleHistoryDrawer(false));
    document.getElementById('history-search-drawer').addEventListener('input', filterHistoryDrawerDebounced);
    document.getElementById('history-sort-drawer').addEventListener('change', filterHistoryDrawer);
    document.querySelector('#history-drawer .btn-clear-history').addEventListener('click', clearHistory);

    // Dashboard Controls
    document.querySelector('#dashboard-container button').addEventListener('click', backToHome);
    document.getElementById('dashboard-refresh-btn').addEventListener('click', refreshCurrentPlaylist);
    document.getElementById('dashboard-favorite-btn').addEventListener('click', toggleCurrentPlaylistFavorite);
    
    // Tag inputs
    document.getElementById('new-tag-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addPlaylistTag();
    });
    
    // Stats copy button
    document.getElementById('btn-copy-duration').addEventListener('click', copyPlaylistDuration);

    // Speed selection buttons
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const speed = parseFloat(btn.getAttribute('data-speed'));
            selectSpeed(speed, btn);
        });
    });

    // Budget Simulation inputs
    const hoursSlider = document.getElementById('hours-slider');
    const hoursNum = document.getElementById('hours-num');
    
    hoursSlider.addEventListener('input', (e) => onSliderChange(e.target.value));
    hoursNum.addEventListener('input', (e) => onNumInputChange(e.target.value));
    hoursNum.addEventListener('blur', (e) => {
        if (!e.target.value || parseFloat(e.target.value) <= 0) {
            e.target.value = state.watchHoursPerDay;
        }
    });

    // Track Explorer controls
    document.getElementById('track-search-input').addEventListener('input', filterTracksDebounced);
    document.getElementById('track-sort').addEventListener('change', sortTracks);

    // Export buttons
    document.querySelectorAll('.btn-export-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            const format = btn.textContent.toLowerCase().includes('markdown') 
                ? 'markdown' 
                : btn.textContent.toLowerCase().includes('csv') 
                    ? 'csv' 
                    : 'plain';
            exportData(format);
        });
    });
}

// ==========================================
// DEEP-LINK ROUTING (HISTORY API)
// ==========================================
function handleDeepLinking() {
    const urlParams = new URLSearchParams(window.location.search);
    const listId = urlParams.get('list');
    
    if (listId) {
        document.getElementById('playlist-url-input').value = listId;
        if (listId === 'DEMO_PLAYLIST_ID' || listId === 'PLBCF2DAC1B7B8D3EC') {
            loadDemoPlaylist();
        } else {
            analyzePlaylist();
        }
    } else {
        showDashboard(false);
    }
}

// Handle browser Back/Forward navigation
window.addEventListener('popstate', (e) => {
    const urlParams = new URLSearchParams(window.location.search);
    const listId = urlParams.get('list');
    if (listId) {
        document.getElementById('playlist-url-input').value = listId;
        if (listId === 'DEMO_PLAYLIST_ID' || listId === 'PLBCF2DAC1B7B8D3EC') {
            loadDemoPlaylist();
        } else {
            analyzePlaylist();
        }
    } else {
        backToHome();
    }
});

// ==========================================
// CORE INITIALIZATION & API KEY MANAGING
// ==========================================
function updateRemoveKeyButtonVisibility(isVisible) {
    const btnRemove = document.getElementById('btn-remove-api-key');
    if (btnRemove) {
        btnRemove.style.display = isVisible ? 'inline-flex' : 'none';
    }
}

function initializeApiKey() {
    // Read backend URL
    const savedUrl = localStorage.getItem('vidsum_backend_url');
    if (savedUrl) {
        document.getElementById('backend-url-input').value = savedUrl;
        updateBackendUrlControls(true);
    } else {
        updateBackendUrlControls(false);
    }

    // Read API key
    const savedKey = localStorage.getItem('yt_playlist_duration_key');
    const apiModeStatus = document.getElementById('api-mode-status');

    if (savedKey) {
        state.apiKey = savedKey;
        document.getElementById('api-key-input').value = savedKey;
        updateApiStatusBadge(true, "Custom API Key");
        updateRemoveKeyButtonVisibility(true);
        
        if (apiModeStatus) {
            apiModeStatus.textContent = "Custom API Key";
            apiModeStatus.className = "api-mode-val custom";
        }
    } else {
        state.apiKey = '';
        document.getElementById('api-key-input').value = '';
        updateApiStatusBadge(false, "Server API Key");
        updateRemoveKeyButtonVisibility(false);
        
        if (apiModeStatus) {
            apiModeStatus.textContent = "Server API Key";
            apiModeStatus.className = "api-mode-val server";
        }
    }
}

function saveApiKey() {
    const val = document.getElementById('api-key-input').value.trim();
    if (val) {
        localStorage.setItem('yt_playlist_duration_key', val);
        state.apiKey = val;
        updateApiStatusBadge(true, "Custom API Key");
        updateRemoveKeyButtonVisibility(true);
        
        const apiModeStatus = document.getElementById('api-mode-status');
        if (apiModeStatus) {
            apiModeStatus.textContent = "Custom API Key";
            apiModeStatus.className = "api-mode-val custom";
        }
        
        showToast("Custom API Key saved successfully!");
        toggleApiDrawer(false);
    } else {
        removeApiKey();
    }
}

function removeApiKey() {
    localStorage.removeItem('yt_playlist_duration_key');
    state.apiKey = '';
    document.getElementById('api-key-input').value = '';
    updateApiStatusBadge(false, "Server API Key");
    updateRemoveKeyButtonVisibility(false);
    
    const apiModeStatus = document.getElementById('api-mode-status');
    if (apiModeStatus) {
        apiModeStatus.textContent = "Server API Key";
        apiModeStatus.className = "api-mode-val server";
    }
    
    showToast("Custom API Key removed. Using Server API Key.");
    toggleApiDrawer(false);
}

function saveBackendUrl() {
    const val = document.getElementById('backend-url-input').value.trim();
    if (val) {
        if (!val.startsWith('http://') && !val.startsWith('https://')) {
            showToast("Error: URL must start with http:// or https://", true);
            return;
        }
        localStorage.setItem('vidsum_backend_url', val);
        showToast("Backend Proxy URL saved!");
        updateBackendUrlControls(true);
    } else {
        removeBackendUrl();
    }
}

function removeBackendUrl() {
    localStorage.removeItem('vidsum_backend_url');
    document.getElementById('backend-url-input').value = '';
    showToast("Backend URL reset to auto-detect.");
    updateBackendUrlControls(false);
}

function updateBackendUrlControls(hasUrl) {
    const btnRemove = document.getElementById('btn-remove-backend-url');
    if (btnRemove) {
        btnRemove.style.display = hasUrl ? 'inline-flex' : 'none';
    }
}

function updateApiStatusBadge(isCustom, text) {
    const dot = document.getElementById('api-status-dot');
    const statusText = document.getElementById('api-status-text');
    if (dot) {
        dot.className = 'api-status-dot'; // Reset classes
        if (isCustom) {
            dot.classList.add('custom');
        } else {
            dot.classList.add('server');
        }
    }
    if (statusText) {
        statusText.textContent = text;
    }
}

function toggleApiDrawer(forceState) {
    const drawer = document.getElementById('api-drawer');
    if (forceState !== undefined) {
        if (forceState) drawer.classList.add('open');
        else drawer.classList.remove('open');
    } else {
        drawer.classList.toggle('open');
    }
}

// ==========================================
// URL PARSING & YOUTUBE API OPERATIONS
// ==========================================
function parsePlaylistId(input) {
    if (!input) return null;
    input = input.trim();
    
    let playlistId = null;
    
    // Check if is 18-56 length ID directly
    if (/^[A-Za-z0-9_-]{18,56}$/.test(input)) {
        playlistId = input;
    } else {
        try {
            const url = new URL(input);
            let listId = url.searchParams.get('list');
            if (listId) {
                playlistId = listId;
            } else {
                const pathSegments = url.pathname.split('/');
                for (let i = 0; i < pathSegments.length; i++) {
                    if (pathSegments[i] === 'playlist' && pathSegments[i+1]) {
                        playlistId = pathSegments[i+1];
                        break;
                    }
                }
            }
        } catch (e) {
            // Attempt regex match if not a fully qualified URL
            const match = input.match(/[?&]list=([^#\&\?]+)/);
            if (match && match[1]) {
                playlistId = match[1];
            }
        }
    }
    
    // Validate the extracted ID to prevent injection/abuse
    if (playlistId && /^[A-Za-z0-9_-]{18,56}$/.test(playlistId)) {
        return playlistId;
    }
    
    return null;
}

async function fetchPlaylistItems(playlistId, apiKey, forceRefresh = false) {
    updateLoadingStatus("Connecting to backend proxy server...", 20);
    
    const headers = {
        'Content-Type': 'application/json'
    };
    if (apiKey) {
        headers['X-Custom-API-Key'] = apiKey;
    }

    // Backend API base URL detection
    let apiBase = localStorage.getItem('vidsum_backend_url') || '';
    if (!apiBase) {
        if (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')) {
            apiBase = 'http://localhost:5000';
        } else {
            apiBase = ''; // Same origin
        }
    }
    
    const url = `${apiBase}/api/playlist?url=${encodeURIComponent(playlistId)}${forceRefresh ? '&refresh=true' : ''}`;
    
    updateLoadingStatus("Fetching playlist metadata & video durations from backend proxy...", 45);
    const response = await fetch(url, {
        method: 'GET',
        headers: headers
    });

    if (!response.ok) {
        let errMsg = "Backend API error occurred";
        try {
            const errData = await response.json();
            errMsg = errData.error || errMsg;
        } catch (e) {
            errMsg = `HTTP Error ${response.status}: ${response.statusText}`;
        }
        throw new Error(errMsg);
    }

    updateLoadingStatus("Processing playlist statistics...", 90);
    return await response.json();
}

function setLoading(isLoading) {
    state.isLoading = isLoading;
    const analyzeBtn = document.getElementById('btn-analyze');
    const urlInput = document.getElementById('playlist-url-input');
    const demoBtn = document.querySelector('.demo-btn');
    
    if (isLoading) {
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.style.opacity = '0.7';
            const span = analyzeBtn.querySelector('span');
            if (span) span.textContent = 'Loading...';
        }
        if (urlInput) urlInput.disabled = true;
        if (demoBtn) {
            demoBtn.disabled = true;
            demoBtn.style.opacity = '0.5';
        }
    } else {
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.style.opacity = '1';
            const span = analyzeBtn.querySelector('span');
            if (span) span.textContent = 'Load Playlist';
        }
        if (urlInput) urlInput.disabled = false;
        if (demoBtn) {
            demoBtn.disabled = false;
            demoBtn.style.opacity = '1';
        }
    }
}

async function analyzePlaylist() {
    if (state.isLoading) return;
    
    if (!navigator.onLine) {
        showError("Connection Offline", "You are currently disconnected from the internet. Please restore connectivity and try again.");
        return;
    }

    const input = document.getElementById('playlist-url-input').value.trim();
    const errorSection = document.getElementById('error-section');
    const loadingSection = document.getElementById('loading-section');
    const dashboardGrid = document.getElementById('dashboard-grid');

    // Reset UI states
    errorSection.style.display = 'none';
    dashboardGrid.style.display = 'none';
    
    if (input.length > 2048) {
        showError("Invalid Input Format", "Input is too long (maximum 2048 characters).");
        return;
    }
    
    const playlistId = parsePlaylistId(input);
    if (!playlistId) {
        showError("Invalid Input Format", "Please check your playlist URL or ID. It must be a valid YouTube playlist link or alphanumeric playlist ID.");
        return;
    }

    // Redirect demo playlist requests
    if (playlistId === 'PLBCF2DAC1B7B8D3EC' || playlistId === 'DEMO_PLAYLIST_ID') {
        loadDemoPlaylist();
        return;
    }

    state.playlistId = playlistId;
    loadingSection.style.display = 'block';
    updateLoadingStatus("Connecting to YouTube APIs...", 10);
    setLoading(true);

    try {
        const result = await fetchPlaylistItems(playlistId, state.apiKey);
        
        state.playlistTitle = result.title;
        state.videos = result.videos;
        state.filteredVideos = [...result.videos];
        
        // Add to history
        const totalSeconds = result.videos.reduce((sum, v) => sum + v.duration, 0);
        const thumb = result.thumbnail || (result.videos[0]?.thumbnail || '');
        const playlistUrl = input.startsWith('http') ? input : `https://www.youtube.com/playlist?list=${playlistId}`;
        addToHistory(playlistId, result.title, thumb, totalSeconds, result.videos.length, playlistUrl, result.publishedAt || '');

        buildDashboard();
        
        // Update URL path without reload
        const newUrl = `${window.location.origin}${window.location.pathname}?list=${playlistId}`;
        window.history.pushState({ playlistId }, '', newUrl);

        loadingSection.style.display = 'none';
        showDashboard(true);
        showToast("Playlist loaded successfully!");
    } catch (err) {
        loadingSection.style.display = 'none';
        showError("API Execution Error", err.message || "An unexpected error occurred while communicating with YouTube servers.");
    } finally {
        setLoading(false);
    }
}

async function refreshCurrentPlaylist() {
    if (state.isLoading || !state.playlistId) return;
    
    if (state.playlistId === "DEMO_PLAYLIST_ID") {
        showToast("Demo playlist cannot be refreshed.", true);
        return;
    }

    if (!navigator.onLine) {
        showToast("Connection Offline. Unable to refresh.", true);
        return;
    }

    const errorSection = document.getElementById('error-section');
    const loadingSection = document.getElementById('loading-section');

    errorSection.style.display = 'none';
    loadingSection.style.display = 'block';
    updateLoadingStatus("Querying fresh playlist telemetry...", 10);
    setLoading(true);

    try {
        // Fetch from backend with forceRefresh parameter
        const result = await fetchPlaylistItems(state.playlistId, state.apiKey, true);

        if (result._refresh_throttled) {
            showToast("Refresh cooldown active. Loaded cached version.");
        } else {
            showToast("Playlist data refreshed!");
        }

        state.playlistTitle = result.title;
        state.videos = result.videos;
        state.filteredVideos = [...result.videos];
        
        // Update history
        const totalSeconds = result.videos.reduce((sum, v) => sum + v.duration, 0);
        const thumb = result.thumbnail || (result.videos[0]?.thumbnail || '');
        const playlistUrl = `https://www.youtube.com/playlist?list=${state.playlistId}`;
        addToHistory(state.playlistId, result.title, thumb, totalSeconds, result.videos.length, playlistUrl, result.publishedAt || '');

        buildDashboard();
        
        loadingSection.style.display = 'none';
        showDashboard(true);
    } catch (err) {
        loadingSection.style.display = 'none';
        showError("Refresh Failed", err.message || "Could not refresh playlist telemetry.");
    } finally {
        setLoading(false);
    }
}

function loadDemoPlaylist() {
    state.playlistTitle = "Google I/O Web Development Workshop (Demo)";
    state.playlistId = "DEMO_PLAYLIST_ID";
    state.videos = [...DEMO_VIDEOS];
    state.filteredVideos = [...DEMO_VIDEOS];

    document.getElementById('playlist-url-input').value = "https://www.youtube.com/playlist?list=PLBCF2DAC1B7B8D3EC";
    document.getElementById('error-section').style.display = 'none';
    document.getElementById('loading-section').style.display = 'none';

    // Add demo to history
    const totalSeconds = DEMO_VIDEOS.reduce((sum, v) => sum + v.duration, 0);
    addToHistory("DEMO_PLAYLIST_ID", state.playlistTitle, DEMO_VIDEOS[0].thumbnail, totalSeconds, DEMO_VIDEOS.length, "https://www.youtube.com/playlist?list=PLBCF2DAC1B7B8D3EC", "2024-05-15T09:00:00Z");

    buildDashboard();

    // Update URL path without reload
    const newUrl = `${window.location.origin}${window.location.pathname}?list=DEMO_PLAYLIST_ID`;
    window.history.pushState({ playlistId: 'DEMO_PLAYLIST_ID' }, '', newUrl);

    showDashboard(true);
    showToast("Loaded interactive demo playlist.");
}

// ==========================================
// SIDEBAR HISTORY DRAWER TOGGLE
// ==========================================
function toggleHistoryDrawer(forceState) {
    const drawer = document.getElementById('history-drawer');
    if (forceState !== undefined) {
        if (forceState) drawer.classList.add('open');
        else drawer.classList.remove('open');
    } else {
        drawer.classList.toggle('open');
    }
}

// ==========================================
// DASHBOARD VISIBILITY TOGGLE
// ==========================================
function showDashboard(visible) {
    const landing = document.getElementById('landing-container');
    const dashboard = document.getElementById('dashboard-container');
    const dashboardGrid = document.getElementById('dashboard-grid');
    const errorSection = document.getElementById('error-section');
    
    if (visible) {
        landing.style.display = 'none';
        dashboard.style.display = 'block';
        if (dashboardGrid) {
            dashboardGrid.style.display = 'grid';
        }
        errorSection.style.display = 'none';
    } else {
        landing.style.display = 'block';
        dashboard.style.display = 'none';
        document.getElementById('playlist-url-input').value = '';
    }
}

function backToHome() {
    showDashboard(false);
    
    // Clear URL parameters
    const newUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.pushState({}, '', newUrl);

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
// HISTORY STATE & PERSISTENCE
// ==========================================
function isPlaylistFavorite(id) {
    return state.favorites.some(item => item.id === id);
}

function getPlaylistTags(id) {
    return state.playlistTags[id] || [];
}

function loadHistory() {
    try {
        state.history = JSON.parse(localStorage.getItem('vidsum_history')) || [];
    } catch (e) {
        state.history = [];
    }

    try {
        state.favorites = JSON.parse(localStorage.getItem('vidsum_favorites')) || [];
    } catch (e) {
        state.favorites = [];
    }

    try {
        state.playlistTags = JSON.parse(localStorage.getItem('vidsum_playlistTags')) || {};
    } catch (e) {
        state.playlistTags = {};
    }

    try {
        state.playlistProgress = JSON.parse(localStorage.getItem('vidsum_playlistProgress')) || {};
    } catch (e) {
        state.playlistProgress = {};
    }

    performDataMigration();
    renderHistory();
}

function performDataMigration() {
    let migrated = false;

    // 1. Migrate favorites from history if separate store is empty
    if (state.favorites.length === 0 && state.history.length > 0) {
        const legacyFavorites = state.history.filter(item => item.isFavorite);
        if (legacyFavorites.length > 0) {
            state.favorites = legacyFavorites.map(item => {
                return {
                    id: item.id,
                    title: item.title,
                    thumbnail: item.thumbnail,
                    totalDuration: item.totalDuration,
                    videoCount: item.videoCount,
                    url: item.url,
                    timestamp: item.timestamp,
                    publishedAt: item.publishedAt
                };
            });
            localStorage.setItem('vidsum_favorites', JSON.stringify(state.favorites));
            migrated = true;
        }
    }

    // 2. Migrate tags from history if separate store is empty
    if (Object.keys(state.playlistTags).length === 0 && state.history.length > 0) {
        let foundTags = false;
        state.history.forEach(item => {
            if (item.tags && item.tags.length > 0) {
                state.playlistTags[item.id] = [...item.tags];
                foundTags = true;
            }
        });
        if (foundTags) {
            localStorage.setItem('vidsum_playlistTags', JSON.stringify(state.playlistTags));
            migrated = true;
        }
    }

    // 3. Migrate progress from legacy key "vidsum_completed"
    const legacyCompleted = localStorage.getItem('vidsum_completed');
    if (legacyCompleted && Object.keys(state.playlistProgress).length === 0) {
        try {
            state.playlistProgress = JSON.parse(legacyCompleted) || {};
            localStorage.setItem('vidsum_playlistProgress', JSON.stringify(state.playlistProgress));
            localStorage.removeItem('vidsum_completed');
            migrated = true;
        } catch (e) {
            console.error("Failed to migrate progress", e);
        }
    }

    // 4. Clean up legacy fields from history items
    let historyNeedsCleanup = false;
    state.history.forEach(item => {
        if (item.hasOwnProperty('isFavorite') || item.hasOwnProperty('tags')) {
            delete item.isFavorite;
            delete item.tags;
            historyNeedsCleanup = true;
        }
    });
    if (historyNeedsCleanup) {
        localStorage.setItem('vidsum_history', JSON.stringify(state.history));
    }
}

function addToHistory(id, title, thumbnail, totalSeconds, videoCount, url, publishedAt = '') {
    const existingEntry = state.history.find(item => item.id === id) || state.favorites.find(item => item.id === id);

    const newEntry = {
        id: id,
        title: title,
        thumbnail: thumbnail || (state.videos[0]?.thumbnail || 'https://via.placeholder.com/320x180?text=No+Thumbnail'),
        totalDuration: totalSeconds,
        videoCount: videoCount,
        url: url,
        timestamp: Date.now(),
        publishedAt: publishedAt || (existingEntry && existingEntry.publishedAt ? existingEntry.publishedAt : '')
    };
    
    state.history = state.history.filter(item => item.id !== id);
    state.history.unshift(newEntry);
    
    if (state.history.length > 50) {
        state.history = state.history.slice(0, 50);
    }
    
    localStorage.setItem('vidsum_history', JSON.stringify(state.history));
    renderHistory();
}

function deleteHistoryItem(id, event) {
    if (event) event.stopPropagation();
    
    state.history = state.history.filter(item => item.id !== id);
    localStorage.setItem('vidsum_history', JSON.stringify(state.history));
    
    // Clean up lifecycle data if not a favorite either
    const isFav = isPlaylistFavorite(id);
    if (!isFav) {
        delete state.playlistTags[id];
        delete state.playlistProgress[id];
        localStorage.setItem('vidsum_playlistTags', JSON.stringify(state.playlistTags));
        localStorage.setItem('vidsum_playlistProgress', JSON.stringify(state.playlistProgress));
    }

    renderHistory();
    showToast("Item deleted from history.");
}

function clearHistory() {
    if (confirm("Are you sure you want to clear all history?")) {
        // Clean up tags and progress for items that are not in favorites
        state.history.forEach(item => {
            const isFav = isPlaylistFavorite(item.id);
            if (!isFav) {
                delete state.playlistTags[item.id];
                delete state.playlistProgress[item.id];
            }
        });
        
        state.history = [];
        localStorage.removeItem('vidsum_history');
        localStorage.setItem('vidsum_playlistTags', JSON.stringify(state.playlistTags));
        localStorage.setItem('vidsum_playlistProgress', JSON.stringify(state.playlistProgress));
        
        renderHistory();
        showToast("History cleared.");
    }
}

function renderHistory() {
    drawHistoryGrid(state.history);
    drawHistoryDrawerList(state.history);
    drawFavoritesGrid();
}

function sortHistoryItems(items, sortVal) {
    if (sortVal === 'date-added-desc') {
        items.sort((a, b) => b.timestamp - a.timestamp);
    } else if (sortVal === 'date-added-asc') {
        items.sort((a, b) => a.timestamp - b.timestamp);
    }
}

function getPlaylistProgress(playlistId) {
    try {
        const completedList = state.playlistProgress[playlistId] || [];
        return completedList.length;
    } catch (e) {
        return 0;
    }
}

function toggleFavorite(id, event) {
    if (event) event.stopPropagation();
    
    const isFav = isPlaylistFavorite(id);
    if (isFav) {
        // Remove from favorites
        state.favorites = state.favorites.filter(item => item.id !== id);
        localStorage.setItem('vidsum_favorites', JSON.stringify(state.favorites));

        // Clean up tags and progress if not in history either
        const inHistory = state.history.some(item => item.id === id);
        if (!inHistory) {
            delete state.playlistTags[id];
            delete state.playlistProgress[id];
            localStorage.setItem('vidsum_playlistTags', JSON.stringify(state.playlistTags));
            localStorage.setItem('vidsum_playlistProgress', JSON.stringify(state.playlistProgress));
        }
    } else {
        // Add to favorites. Find item in history or construct from current state
        let item = state.history.find(entry => entry.id === id);
        if (!item && state.playlistId === id) {
            const totalSeconds = state.videos.reduce((sum, v) => sum + v.duration, 0);
            const thumb = state.videos[0]?.thumbnail || '';
            const playlistUrl = `https://www.youtube.com/playlist?list=${state.playlistId}`;
            item = {
                id: id,
                title: state.playlistTitle,
                thumbnail: thumb,
                totalDuration: totalSeconds,
                videoCount: state.videos.length,
                url: playlistUrl,
                timestamp: Date.now(),
                publishedAt: ''
            };
        }
        if (item) {
            state.favorites = state.favorites.filter(entry => entry.id !== id);
            state.favorites.unshift({
                id: item.id,
                title: item.title,
                thumbnail: item.thumbnail,
                totalDuration: item.totalDuration,
                videoCount: item.videoCount,
                url: item.url,
                timestamp: item.timestamp,
                publishedAt: item.publishedAt
            });
            localStorage.setItem('vidsum_favorites', JSON.stringify(state.favorites));
        }
    }
    
    const newFavStatus = !isFav;
    if (state.playlistId === id) {
        updateDashboardFavoriteBtn(newFavStatus);
    }
    
    renderHistory();
    showToast(newFavStatus ? "Added to Favorites" : "Removed from Favorites");
}

function toggleCurrentPlaylistFavorite() {
    if (!state.playlistId) return;
    toggleFavorite(state.playlistId);
}

function updateDashboardFavoriteBtn(isFavorite) {
    const btn = document.getElementById('dashboard-favorite-btn');
    if (!btn) return;
    
    if (isFavorite) {
        btn.classList.add('active');
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" width="18" height="18" fill="#EF4444" stroke="#EF4444" stroke-width="2">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
        `;
    } else {
        btn.classList.remove('active');
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
        `;
    }
}

// ==========================================
// RENDER METHODS (OPTIMIZED WITH FRAGMENTS)
// ==========================================
function drawFavoritesGrid() {
    const favoritesSection = document.getElementById('favorites-section');
    const favoritesGrid = document.getElementById('favorites-grid');
    if (!favoritesGrid || !favoritesSection) return;
    
    const favorites = state.favorites;
    
    if (favorites.length === 0) {
        favoritesSection.style.display = 'none';
        favoritesGrid.innerHTML = '';
    } else {
        favoritesSection.style.display = 'block';
        favoritesGrid.innerHTML = '';
        
        const fragment = document.createDocumentFragment();
        
        favorites.forEach(item => {
            const card = document.createElement('div');
            card.className = 'history-card';
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('data-playlist-id', item.id);
            card.setAttribute('aria-label', `Load playlist: ${item.title}`);
            
            card.onclick = (e) => {
                if (e.target.closest('.history-card-delete-btn') || e.target.closest('.history-card-favorite-btn')) return;
                reopenPlaylist(item);
            };
            card.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (e.target.closest('.history-card-delete-btn') || e.target.closest('.history-card-favorite-btn')) return;
                    reopenPlaylist(item);
                }
            };
            
            const formattedDate = new Date(item.timestamp).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const formattedUploaded = item.publishedAt
                ? new Date(item.publishedAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })
                : 'Unknown';
            
            const completedCount = getPlaylistProgress(item.id);
            const progressPercent = item.videoCount > 0 ? Math.round((completedCount / item.videoCount) * 100) : 0;
            
            const itemTags = getPlaylistTags(item.id);
            const tagsHTML = itemTags && itemTags.length > 0
                ? `<div class="history-card-tags" style="display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.5rem; min-height: 20px;">
                     ${itemTags.map(tag => `<span class="history-tag">${escapeHTML(tag)}</span>`).join('')}
                   </div>`
                : `<div class="history-card-tags" style="display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.5rem; min-height: 20px;"></div>`;

            card.innerHTML = `
                <button class="history-card-delete-btn" title="Delete from history" aria-label="Delete ${escapeHTML(item.title)} from history">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
                <button class="history-card-favorite-btn active" title="Remove from Favorites" aria-label="Remove ${escapeHTML(item.title)} from Favorites">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="#EF4444" stroke="#EF4444" stroke-width="2">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                </button>
                <div class="history-card-thumb-wrapper">
                    <img class="history-card-thumb" src="${escapeHTML(item.thumbnail)}" alt="" loading="lazy">
                </div>
                <div class="history-card-details">
                    <div class="history-card-title" title="${escapeHTML(item.title)}">${escapeHTML(item.title)}</div>
                    <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px; display: flex; flex-direction: column; gap: 2px;">
                        <span>Uploaded: ${formattedUploaded}</span>
                        <span>Analyzed: ${formattedDate}</span>
                    </div>
                    
                    ${tagsHTML}

                    <div style="margin-top: 0.5rem; display: flex; flex-direction: column; gap: 2px;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-secondary);">
                            <span>Progress:</span>
                            <span class="card-progress-text">${progressPercent}% (${completedCount}/${item.videoCount})</span>
                        </div>
                        <div class="card-progress-bar-container">
                            <div class="card-progress-bar-fill" style="width: ${progressPercent}%;"></div>
                        </div>
                    </div>

                    <div class="history-card-meta" style="margin-top: 0.6rem;">
                        <span class="history-card-count">${item.videoCount} videos</span>
                        <span class="history-card-duration">${formatSecondsShort(item.totalDuration)}</span>
                    </div>
                </div>
            `;
            
            // Programmatic event listeners inside card to prevent inline script execution / XSS
            card.querySelector('.history-card-delete-btn').addEventListener('click', (e) => deleteHistoryItem(item.id, e));
            card.querySelector('.history-card-favorite-btn').addEventListener('click', (e) => toggleFavorite(item.id, e));
            
            fragment.appendChild(card);
        });
        favoritesGrid.appendChild(fragment);
    }
}

function drawHistoryGrid(history) {
    const landingGrid = document.getElementById('history-grid');
    if (!landingGrid) return;
    
    const sortVal = document.getElementById('history-sort') ? document.getElementById('history-sort').value : 'date-added-desc';
    let sortedHistory = [...history];
    sortHistoryItems(sortedHistory, sortVal);
    
    if (sortedHistory.length === 0) {
        landingGrid.innerHTML = `
            <div class="empty-history-box" style="grid-column: 1 / -1;">
                <svg class="empty-history-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p style="font-weight: 600; margin-bottom: 0.25rem;">No playlists found</p>
                <p style="font-size: 0.85rem; color: var(--text-secondary);">No items match your search or filter settings.</p>
            </div>
        `;
    } else {
        landingGrid.innerHTML = '';
        const fragment = document.createDocumentFragment();
        
        sortedHistory.forEach(item => {
            const card = document.createElement('div');
            card.className = 'history-card';
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('data-playlist-id', item.id);
            card.setAttribute('aria-label', `Load playlist: ${item.title}`);
            
            card.onclick = (e) => {
                if (e.target.closest('.history-card-delete-btn') || e.target.closest('.history-card-favorite-btn')) return;
                reopenPlaylist(item);
            };
            card.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (e.target.closest('.history-card-delete-btn') || e.target.closest('.history-card-favorite-btn')) return;
                    reopenPlaylist(item);
                }
            };
            
            const formattedDate = new Date(item.timestamp).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const formattedUploaded = item.publishedAt
                ? new Date(item.publishedAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })
                : 'Unknown';
            
            const completedCount = getPlaylistProgress(item.id);
            const progressPercent = item.videoCount > 0 ? Math.round((completedCount / item.videoCount) * 100) : 0;
            
            const isFav = isPlaylistFavorite(item.id);
            const itemTags = getPlaylistTags(item.id);
            const tagsHTML = itemTags && itemTags.length > 0
                ? `<div class="history-card-tags" style="display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.5rem; min-height: 20px;">
                     ${itemTags.map(tag => `<span class="history-tag">${escapeHTML(tag)}</span>`).join('')}
                   </div>`
                : `<div class="history-card-tags" style="display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.5rem; min-height: 20px;"></div>`;

            card.innerHTML = `
                <button class="history-card-delete-btn" title="Delete from history" aria-label="Delete ${escapeHTML(item.title)} from history">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
                <button class="history-card-favorite-btn ${isFav ? 'active' : ''}" title="${isFav ? 'Remove from Favorites' : 'Add to Favorites'}" aria-label="${isFav ? 'Remove from Favorites' : 'Add to Favorites'}">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="${isFav ? '#EF4444' : 'none'}" stroke="${isFav ? '#EF4444' : 'currentColor'}" stroke-width="2">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                </button>
                <div class="history-card-thumb-wrapper">
                    <img class="history-card-thumb" src="${escapeHTML(item.thumbnail)}" alt="" loading="lazy">
                </div>
                <div class="history-card-details">
                    <div class="history-card-title" title="${escapeHTML(item.title)}">${escapeHTML(item.title)}</div>
                    <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px; display: flex; flex-direction: column; gap: 2px;">
                        <span>Uploaded: ${formattedUploaded}</span>
                        <span>Analyzed: ${formattedDate}</span>
                    </div>
                    
                    ${tagsHTML}

                    <div style="margin-top: 0.5rem; display: flex; flex-direction: column; gap: 2px;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-secondary);">
                            <span>Progress:</span>
                            <span class="card-progress-text">${progressPercent}% (${completedCount}/${item.videoCount})</span>
                        </div>
                        <div class="card-progress-bar-container">
                            <div class="card-progress-bar-fill" style="width: ${progressPercent}%;"></div>
                        </div>
                    </div>

                    <div class="history-card-meta" style="margin-top: 0.6rem;">
                        <span class="history-card-count">${item.videoCount} videos</span>
                        <span class="history-card-duration">${formatSecondsShort(item.totalDuration)}</span>
                    </div>
                </div>
            `;
            
            card.querySelector('.history-card-delete-btn').addEventListener('click', (e) => deleteHistoryItem(item.id, e));
            card.querySelector('.history-card-favorite-btn').addEventListener('click', (e) => toggleFavorite(item.id, e));
            
            fragment.appendChild(card);
        });
        landingGrid.appendChild(fragment);
    }
}

function drawHistoryDrawerList(history) {
    const drawerList = document.getElementById('history-drawer-list');
    if (!drawerList) return;
    
    const sortVal = document.getElementById('history-sort-drawer') ? document.getElementById('history-sort-drawer').value : 'date-added-desc';
    let sortedHistory = [...history];
    sortHistoryItems(sortedHistory, sortVal);
    
    if (sortedHistory.length === 0) {
        drawerList.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); padding: 3rem 1rem; font-size: 0.85rem;">
                No history items found.
            </div>
        `;
    } else {
        drawerList.innerHTML = '';
        const fragment = document.createDocumentFragment();
        
        sortedHistory.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'history-drawer-item';
            itemEl.setAttribute('role', 'button');
            itemEl.setAttribute('tabindex', '0');
            itemEl.setAttribute('data-playlist-id', item.id);
            itemEl.setAttribute('aria-label', `Load playlist: ${item.title}`);
            
            itemEl.onclick = (e) => {
                if (e.target.closest('.history-drawer-item-delete') || e.target.closest('.history-drawer-item-favorite')) return;
                reopenPlaylist(item);
                toggleHistoryDrawer(false);
            };
            itemEl.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (e.target.closest('.history-drawer-item-delete') || e.target.closest('.history-drawer-item-favorite')) return;
                    reopenPlaylist(item);
                    toggleHistoryDrawer(false);
                }
            };
            
            const completedCount = getPlaylistProgress(item.id);
            const progressPercent = item.videoCount > 0 ? Math.round((completedCount / item.videoCount) * 100) : 0;
            const isFav = isPlaylistFavorite(item.id);
            
            itemEl.innerHTML = `
                <button class="history-drawer-item-delete" title="Delete" aria-label="Delete ${escapeHTML(item.title)} from history">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
                <button class="history-drawer-item-favorite ${isFav ? 'active' : ''}" title="${isFav ? 'Remove from Favorites' : 'Add to Favorites'}" aria-label="${isFav ? 'Remove from Favorites' : 'Add to Favorites'}">
                    <svg viewBox="0 0 24 24" width="10" height="10" fill="${isFav ? '#EF4444' : 'none'}" stroke="${isFav ? '#EF4444' : 'currentColor'}" stroke-width="2.5">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                </button>
                <img class="history-drawer-item-thumb" src="${escapeHTML(item.thumbnail)}" alt="">
                <div class="history-drawer-item-details">
                    <div class="history-drawer-item-title" title="${escapeHTML(item.title)}">${escapeHTML(item.title)}</div>
                    <div class="history-drawer-item-meta" style="margin-top: 2px;">
                        <span class="card-progress-text-compact">${item.videoCount} videos (${progressPercent}%)</span>
                        <span style="color: var(--accent-cyan);">${formatSecondsShort(item.totalDuration)}</span>
                    </div>
                </div>
            `;
            
            itemEl.querySelector('.history-drawer-item-delete').addEventListener('click', (e) => deleteHistoryItem(item.id, e));
            itemEl.querySelector('.history-drawer-item-favorite').addEventListener('click', (e) => toggleFavorite(item.id, e));
            
            fragment.appendChild(itemEl);
        });
        drawerList.appendChild(fragment);
    }
}

function filterHistory() {
    const query = document.getElementById('history-search').value.toLowerCase().trim();
    const filtered = state.history.filter(item => {
        const matchesTitle = item.title.toLowerCase().includes(query);
        const itemTags = getPlaylistTags(item.id);
        const matchesTags = itemTags && itemTags.some(tag => tag.toLowerCase().includes(query));
        return matchesTitle || matchesTags;
    });
    drawHistoryGrid(filtered);
}

function filterHistoryDrawer() {
    const query = document.getElementById('history-search-drawer').value.toLowerCase().trim();
    const filtered = state.history.filter(item => {
        const matchesTitle = item.title.toLowerCase().includes(query);
        const itemTags = getPlaylistTags(item.id);
        const matchesTags = itemTags && itemTags.some(tag => tag.toLowerCase().includes(query));
        return matchesTitle || matchesTags;
    });
    drawHistoryDrawerList(filtered);
}

function reopenPlaylist(item) {
    document.getElementById('playlist-url-input').value = item.url;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (item.id === "DEMO_PLAYLIST_ID") {
        loadDemoPlaylist();
    } else {
        analyzePlaylist();
    }
}

// ==========================================
// UI DRAWING & CALCULATIONS
// ==========================================
function buildDashboard() {
    loadCompletedVideos(state.playlistId);

    // 1. Title
    document.getElementById('playlist-title').textContent = state.playlistTitle;

    // 2. Sum durations
    const totalSeconds = state.videos.reduce((sum, v) => sum + v.duration, 0);
    
    document.getElementById('duration-display-hms').textContent = formatSecondsToHMS(totalSeconds);
    document.getElementById('duration-display-human').textContent = formatSecondsToHuman(totalSeconds);
    document.getElementById('stat-video-count').textContent = state.videos.length;
    
    const availableVideos = state.videos.filter(v => v.duration > 0);
    const avgSeconds = availableVideos.length > 0 ? Math.round(totalSeconds / availableVideos.length) : 0;
    document.getElementById('stat-avg-duration').textContent = formatSecondsShort(avgSeconds);

    renderDashboardTags();
    updatePlaylistProgressBar();
    updateDashboardFavoriteBtn(isPlaylistFavorite(state.playlistId));

    // 3. Update Speeds matrix times
    document.getElementById('speed-time-1x').textContent = formatSecondsToDhms(totalSeconds);
    document.getElementById('speed-time-125x').textContent = formatSecondsToDhms(totalSeconds / 1.25);
    document.getElementById('speed-time-15x').textContent = formatSecondsToDhms(totalSeconds / 1.5);
    document.getElementById('speed-time-175x').textContent = formatSecondsToDhms(totalSeconds / 1.75);
    document.getElementById('speed-time-2x').textContent = formatSecondsToDhms(totalSeconds / 2.0);

    // 4. Reset Speed selection to 1x
    const speedBtns = document.querySelectorAll('.speed-btn');
    speedBtns.forEach(btn => btn.classList.remove('active'));
    
    const defaultSpeedBtn = document.querySelector('.speed-btn[data-speed="1.0"]');
    if (defaultSpeedBtn) {
        defaultSpeedBtn.classList.add('active');
    }
    state.activeSpeed = 1.0;

    // 5. Build Tracks List
    filterAndDrawTracks();

    // 6. Run completion simulations
    runSimulations();
}

function filterAndDrawTracks() {
    const container = document.getElementById('track-container');
    container.innerHTML = '';
    
    if (state.filteredVideos.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); padding: 3rem 1rem;">
                No videos match your filter criteria.
            </div>
        `;
        document.getElementById('tracklist-count-badge').textContent = `0 videos`;
        return;
    }

    document.getElementById('tracklist-count-badge').textContent = `${state.filteredVideos.length} video${state.filteredVideos.length !== 1 ? 's' : ''}`;

    const fragment = document.createDocumentFragment();

    state.filteredVideos.forEach((vid) => {
        const card = document.createElement('div');
        card.className = `track-card track-card-${vid.id} ${vid.isCompleted ? 'completed' : ''}`;
        
        const watchUrl = state.playlistId 
            ? `https://www.youtube.com/watch?v=${vid.id}&list=${state.playlistId}&index=${vid.position + 1}`
            : `https://youtu.be/${vid.id}`;
        
        const isUnavailable = vid.duration === 0;
        const durationText = isUnavailable ? "Unavailable" : formatSecondsShort(vid.duration);
        const durationClass = isUnavailable ? "track-duration-badge unavailable" : "track-duration-badge";

        card.innerHTML = `
            <button class="track-checkbox-btn" type="button" aria-label="${vid.isCompleted ? 'Mark video ' + (vid.position + 1) + ' as incomplete' : 'Mark video ' + (vid.position + 1) + ' as complete'}" aria-pressed="${vid.isCompleted ? 'true' : 'false'}">
                <div class="track-checkbox ${vid.isCompleted ? 'checked' : ''}">
                    <span class="track-number-text">${vid.position + 1}</span>
                    <svg class="track-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
            </button>
            <a class="track-thumb-wrapper" href="${escapeHTML(watchUrl)}" target="_blank" rel="noopener" aria-label="Watch ${escapeHTML(vid.title)} on YouTube">
                <img class="track-thumb" src="${escapeHTML(vid.thumbnail)}" alt="" loading="lazy">
            </a>
            <div class="track-details">
                <a class="track-title-link" href="${escapeHTML(watchUrl)}" target="_blank" rel="noopener" title="${escapeHTML(vid.title)}">
                    ${escapeHTML(vid.title)}
                </a>
                <div class="track-badge-group">
                    <span class="${durationClass}">${escapeHTML(durationText)}</span>
                </div>
            </div>
            <a href="${escapeHTML(watchUrl)}" target="_blank" rel="noopener" class="track-external-link" aria-label="Watch video on YouTube">
                <svg class="track-external-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="opacity: 1;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
            </a>
        `;
        
        // Programmatic event listener on the checklist button
        card.querySelector('.track-checkbox-btn').addEventListener('click', (e) => toggleVideoCompleted(vid.id, e));
        
        fragment.appendChild(card);
    });

    container.appendChild(fragment);
}

function filterTracks() {
    const query = document.getElementById('track-search-input').value.toLowerCase().trim();
    if (!query) {
        state.filteredVideos = [...state.videos];
    } else {
        state.filteredVideos = state.videos.filter(v => v.title.toLowerCase().includes(query));
    }
    sortTracks(); // Keep sorting active
}

function sortTracks() {
    const sortVal = document.getElementById('track-sort').value;
    if (sortVal === 'duration-desc') {
        state.filteredVideos.sort((a, b) => b.duration - a.duration);
    } else if (sortVal === 'duration-asc') {
        state.filteredVideos.sort((a, b) => a.duration - b.duration);
    } else {
        // Original index position
        state.filteredVideos.sort((a, b) => a.position - b.position);
    }
    filterAndDrawTracks();
}

function selectSpeed(speed, element) {
    state.activeSpeed = speed;
    
    // Manage speed button active styling
    const speedBtns = document.querySelectorAll('.speed-btn');
    speedBtns.forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');

    runSimulations();
}

function onSliderChange(val) {
    state.watchHoursPerDay = parseFloat(val);
    document.getElementById('slider-val-display').textContent = `${val} hour${val != 1 ? 's' : ''}`;
    document.getElementById('hours-num').value = val;
    runSimulations();
}

function onNumInputChange(val) {
    let parsedVal = parseFloat(val);
    if (isNaN(parsedVal) || parsedVal <= 0) {
        state.watchHoursPerDay = 1.5;
        document.getElementById('slider-val-display').textContent = `1.5 hours`;
        runSimulations();
        return;
    }
    if (parsedVal > 24) {
        parsedVal = 24;
        document.getElementById('hours-num').value = 24;
    }
    state.watchHoursPerDay = parsedVal;
    document.getElementById('slider-val-display').textContent = `${parsedVal} hour${parsedVal != 1 ? 's' : ''}`;
    
    // Sync slider
    if (parsedVal <= 8) {
        document.getElementById('hours-slider').value = parsedVal;
    }
    runSimulations();
}

function runSimulations() {
    const remainingOriginalSeconds = state.videos.reduce((sum, v) => sum + (v.isCompleted ? 0 : v.duration), 0);
    const adjustedSeconds = remainingOriginalSeconds / state.activeSpeed;

    document.getElementById('sim-active-speed').textContent = `${state.activeSpeed.toFixed(2)}×`;
    document.getElementById('sim-adjusted-time').textContent = formatSecondsToHMS(adjustedSeconds);

    const hoursPerDay = state.watchHoursPerDay;
    if (remainingOriginalSeconds === 0) {
        document.getElementById('sim-days-needed').textContent = "0 days";
        document.getElementById('sim-completion-date').textContent = "Playlist completed! 🎉";
        return;
    }
    if (hoursPerDay <= 0) {
        document.getElementById('sim-days-needed').textContent = "Never";
        document.getElementById('sim-completion-date').textContent = "Watch hours must be greater than zero.";
        return;
    }

    const secondsPerDay = hoursPerDay * 3600;
    const daysNeededFloat = adjustedSeconds / secondsPerDay;
    const daysNeededCeil = Math.ceil(daysNeededFloat);

    document.getElementById('sim-days-needed').textContent = `${daysNeededCeil} day${daysNeededCeil !== 1 ? 's' : ''}`;

    const today = new Date();
    const msInDay = 24 * 60 * 60 * 1000;
    const targetDate = new Date(today.getTime() + (daysNeededFloat * msInDay));
    
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('sim-completion-date').textContent = targetDate.toLocaleDateString(undefined, dateOptions);
}

function loadCompletedVideos(playlistId) {
    try {
        const list = state.playlistProgress[playlistId] || [];
        state.videos.forEach(v => {
            v.isCompleted = list.includes(v.id);
        });
    } catch (e) {
        console.error("Failed to load completed videos", e);
    }
}

// ==========================================
// HIGH PERFORMANCE TARGETED DOM UPDATER
// ==========================================
function toggleVideoCompleted(videoId, event) {
    if (event) event.stopPropagation();
    
    const video = state.videos.find(v => v.id === videoId);
    if (!video) return;
    
    video.isCompleted = !video.isCompleted;
    
    // Save to LocalStorage
    try {
        if (!state.playlistProgress[state.playlistId]) {
            state.playlistProgress[state.playlistId] = [];
        }
        
        if (video.isCompleted) {
            if (!state.playlistProgress[state.playlistId].includes(videoId)) {
                state.playlistProgress[state.playlistId].push(videoId);
            }
        } else {
            state.playlistProgress[state.playlistId] = state.playlistProgress[state.playlistId].filter(id => id !== videoId);
        }
        
        localStorage.setItem('vidsum_playlistProgress', JSON.stringify(state.playlistProgress));
    } catch (e) {
        console.error("Failed to save completed videos", e);
    }
    
    // 1. Targeted DOM update to the toggled track card (avoids redrawing the entire list!)
    const cardEl = document.querySelector(`.track-card-${videoId}`);
    if (cardEl) {
        if (video.isCompleted) {
            cardEl.classList.add('completed');
        } else {
            cardEl.classList.remove('completed');
        }
        
        const checkbox = cardEl.querySelector('.track-checkbox');
        if (checkbox) {
            if (video.isCompleted) {
                checkbox.classList.add('checked');
            } else {
                checkbox.classList.remove('checked');
            }
        }

        const checkboxBtn = cardEl.querySelector('.track-checkbox-btn');
        if (checkboxBtn) {
            checkboxBtn.setAttribute('aria-label', video.isCompleted 
                ? `Mark video ${video.position + 1} as incomplete` 
                : `Mark video ${video.position + 1} as complete`);
            checkboxBtn.setAttribute('aria-pressed', video.isCompleted ? 'true' : 'false');
        }
    }
    
    // 2. Update stats and progress bar
    updatePlaylistProgressBar();
    
    // 3. Re-run simulations
    runSimulations();
    
    // 4. Update landing history card progress states
    updateDOMHistoryProgress(state.playlistId);
}

function updateDOMHistoryProgress(playlistId) {
    const completedCount = getPlaylistProgress(playlistId);
    const historyItem = state.history.find(item => item.id === playlistId) || state.favorites.find(item => item.id === playlistId);
    if (!historyItem) return;
    const totalCount = historyItem.videoCount;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    
    const elements = document.querySelectorAll(`[data-playlist-id="${playlistId}"]`);
    elements.forEach(el => {
        if (el.classList.contains('history-card')) {
            const progressTextEl = el.querySelector('.card-progress-text');
            if (progressTextEl) {
                progressTextEl.textContent = `${progressPercent}% (${completedCount}/${totalCount})`;
            }
            const fillEl = el.querySelector('.card-progress-bar-fill');
            if (fillEl) {
                fillEl.style.width = `${progressPercent}%`;
            }
        }
        if (el.classList.contains('history-drawer-item')) {
            const compactTextEl = el.querySelector('.card-progress-text-compact');
            if (compactTextEl) {
                compactTextEl.textContent = `${totalCount} videos (${progressPercent}%)`;
            }
        }
    });
}

function updatePlaylistProgressBar() {
    const completedCount = state.videos.filter(v => v.isCompleted).length;
    const totalCount = state.videos.length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    
    const pctText = document.getElementById('progress-percent-text');
    if (pctText) {
        pctText.textContent = `${progressPercent}% (${completedCount}/${totalCount})`;
    }
    
    const fill = document.getElementById('playlist-progress-fill');
    if (fill) {
        fill.style.width = `${progressPercent}%`;
    }

    const completedStatVal = document.getElementById('stat-completed-count');
    if (completedStatVal) {
        completedStatVal.textContent = `${completedCount} / ${totalCount}`;
    }

    const remainingSeconds = state.videos.reduce((sum, v) => sum + (v.isCompleted ? 0 : v.duration), 0);
    const remainingDurationVal = document.getElementById('stat-remaining-duration');
    if (remainingDurationVal) {
        remainingDurationVal.textContent = formatSecondsToHMS(remainingSeconds);
    }
}

// ==========================================
// TAG SYSTEM MANAGER (SECURE FROM XSS)
// ==========================================
function addPlaylistTag() {
    const input = document.getElementById('new-tag-input');
    const tagValue = input.value.trim().toLowerCase();
    if (!tagValue || !state.playlistId) return;
    
    // Tag validation: Alphanumeric and spaces only, max 20 chars
    if (!/^[a-zA-Z0-9\s]{1,20}$/.test(tagValue)) {
        showToast("Invalid tag format (1-20 alphanumeric characters only).", true);
        return;
    }

    if (!state.playlistTags[state.playlistId]) {
        state.playlistTags[state.playlistId] = [];
    }
    
    if (!state.playlistTags[state.playlistId].includes(tagValue)) {
        state.playlistTags[state.playlistId].push(tagValue);
        localStorage.setItem('vidsum_playlistTags', JSON.stringify(state.playlistTags));
        renderDashboardTags();
        renderHistory();
        showToast(`Added tag: ${tagValue}`);
    } else {
        showToast("Tag already exists.", true);
    }
    input.value = '';
}

function removePlaylistTag(tagValue) {
    if (!state.playlistId) return;
    
    if (state.playlistTags[state.playlistId]) {
        state.playlistTags[state.playlistId] = state.playlistTags[state.playlistId].filter(t => t !== tagValue);
        localStorage.setItem('vidsum_playlistTags', JSON.stringify(state.playlistTags));
        renderDashboardTags();
        renderHistory();
        showToast(`Removed tag: ${tagValue}`);
    }
}

function renderDashboardTags() {
    const listContainer = document.getElementById('playlist-tags-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    
    const tags = state.playlistTags[state.playlistId] || [];
    
    if (tags.length === 0) {
        const noTagsSpan = document.createElement('span');
        noTagsSpan.style.fontSize = '0.8rem';
        noTagsSpan.style.color = 'var(--text-muted)';
        noTagsSpan.style.fontStyle = 'italic';
        noTagsSpan.textContent = 'No tags added';
        listContainer.appendChild(noTagsSpan);
    } else {
        const fragment = document.createDocumentFragment();
        tags.forEach(tag => {
            const tagEl = document.createElement('span');
            tagEl.className = 'playlist-tag';
            
            // Programmatic safely escaped DOM text nodes to block XSS
            const textNode = document.createTextNode(tag);
            tagEl.appendChild(textNode);
            
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'playlist-tag-remove';
            btn.title = `Remove tag ${tag}`;
            btn.setAttribute('aria-label', `Remove tag ${tag}`);
            btn.innerHTML = '&times;';
            btn.addEventListener('click', () => removePlaylistTag(tag));
            
            tagEl.appendChild(btn);
            fragment.appendChild(tagEl);
        });
        listContainer.appendChild(fragment);
    }
}

// ==========================================
// DRAG AND DROP HANDLERS (NO-FLICKER COUNTER)
// ==========================================
function initDragAndDrop() {
    const wrapper = document.querySelector('.playlist-input-wrapper');
    const input = document.getElementById('playlist-url-input');
    if (!wrapper || !input) return;

    let dragCounter = 0;

    wrapper.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter++;
        wrapper.classList.add('drag-over');
    }, false);

    wrapper.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
    }, false);

    wrapper.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter--;
        if (dragCounter === 0) {
            wrapper.classList.remove('drag-over');
        }
    }, false);

    wrapper.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter = 0;
        wrapper.classList.remove('drag-over');
        
        const dt = e.dataTransfer;
        let url = dt.getData('text/plain') || dt.getData('text/uri-list');
        
        if (url) {
            input.value = url.trim();
            showToast("URL Dropped! Analyzing...");
            analyzePlaylist();
        }
    }, false);
}

// ==========================================
// EXPORT AND CLIPBOARD UTILITIES
// ==========================================
async function copyPlaylistDuration() {
    const button = document.getElementById('btn-copy-duration');
    if (button.classList.contains('copied')) return;

    const totalOriginalSeconds = state.videos.reduce((sum, v) => sum + v.duration, 0);
    const hmsText = formatSecondsToHMS(totalOriginalSeconds);
    
    try {
        button.classList.add('copied');
        const origText = button.querySelector('span').textContent;
        button.querySelector('span').textContent = 'Copied!';
        
        await copyStringToClipboard(hmsText, "Duration string copied: " + hmsText);
        
        setTimeout(() => {
            button.classList.remove('copied');
            button.querySelector('span').textContent = origText;
        }, 2000);
    } catch (err) {
        button.classList.remove('copied');
        console.error("Clipboard copy failed", err);
    }
}

function exportData(format) {
    if (state.videos.length === 0) {
        showToast("No data available to export.", true);
        return;
    }

    let textContent = '';
    
    if (format === 'plain') {
        textContent = `Playlist: ${state.playlistTitle}\n`;
        textContent += `Total Videos: ${state.videos.length}\n`;
        textContent += `Total Duration: ${formatSecondsToHMS(state.videos.reduce((s, v) => s + v.duration, 0))}\n\n`;
        state.videos.forEach((v, i) => {
            const url = `https://youtu.be/${v.id}`;
            textContent += `${i + 1}. ${v.title} (${formatSecondsShort(v.duration)}) - ${url}\n`;
        });
    } else if (format === 'markdown') {
        textContent = `# ${state.playlistTitle}\n\n`;
        textContent += `- **Total Videos:** ${state.videos.length}\n`;
        textContent += `- **Total Duration:** ${formatSecondsToHMS(state.videos.reduce((s, v) => s + v.duration, 0))}\n\n`;
        textContent += `| # | Title | Duration | Link |\n`;
        textContent += `|---|-------|----------|------|\n`;
        state.videos.forEach((v, i) => {
            const url = `https://youtu.be/${v.id}`;
            const cleanMarkdownTitle = v.title.replace(/\|/g, '\\|');
            textContent += `| ${i + 1} | [${cleanMarkdownTitle}](${url}) | ${formatSecondsShort(v.duration)} | [Watch](${url}) |\n`;
        });
    } else if (format === 'csv') {
        textContent = `"Index","Video Title","Duration Seconds","Duration Text","Video URL"\n`;
        state.videos.forEach((v, i) => {
            const url = `https://youtu.be/${v.id}`;
            const cleanTitle = v.title.replace(/"/g, '""');
            textContent += `"${i + 1}","${cleanTitle}","${v.duration}","${formatSecondsShort(v.duration)}","${url}"\n`;
        });
    }

    copyStringToClipboard(textContent, `Exported ${format.toUpperCase()} to clipboard!`);
}

async function copyStringToClipboard(str, successMessage) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(str);
            showToast(successMessage);
            return;
        } catch (err) {
            console.warn("navigator.clipboard failed, trying fallback", err);
        }
    }
    
    // Fallback copy utility
    try {
        const textarea = document.createElement('textarea');
        textarea.value = str;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (successful) {
            showToast(successMessage);
        } else {
            throw new Error("Fallback copy command rejected");
        }
    } catch (err) {
        console.error("Fallback copy failed", err);
        showToast("Failed to copy to clipboard.", true);
    }
}

// ==========================================
// FORMATTER HELPER FUNCTIONS
// ==========================================
function formatSecondsToHMS(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    
    const pad = (num) => String(num).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function formatSecondsToDhms(totalSeconds) {
    totalSeconds = Math.round(totalSeconds);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    
    return parts.join(' ');
}

function formatSecondsToHuman(totalSeconds) {
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds} second${seconds > 1 ? 's' : ''}`);
    
    return parts.join(', ');
}

function formatSecondsShort(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
}

// ==========================================
// UI HELPERS (TOAST, ERROR, STATUS)
// ==========================================
function updateLoadingStatus(text, pct) {
    document.getElementById('loading-status').textContent = text;
    document.getElementById('loading-progress-bar').style.width = `${pct}%`;
}

function showToast(text, isError = false) {
    const toast = document.getElementById('copy-toast');
    const toastText = document.getElementById('toast-text');
    
    toastText.textContent = text;
    if (isError) {
        toast.style.background = "#EF4444";
    } else {
        toast.style.background = "#10B981";
    }
    
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showError(title, message) {
    const section = document.getElementById('error-section');
    document.getElementById('error-title').textContent = title;
    document.getElementById('error-message').textContent = message;
    section.style.display = 'flex';
    section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
