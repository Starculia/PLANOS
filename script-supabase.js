// PLANOS with Supabase Integration - CDN Version
// Load Supabase from CDN to avoid module issues

// Load Supabase SDK
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
script.type = 'module';
script.crossOrigin = 'anonymous';
document.head.appendChild(script);

script.onload = function() {
    // Initialize Supabase after SDK loads
    window.supabaseClient = window.supabase.createClient(
        'https://fwgjphiegsppfvbpoxwi.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Z2pwaGllZ3NwcGZ2YnBveHdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NjkzNDYsImV4cCI6MjA4NzE0NTM0Nn0.6KpbC7QP9p1uEYndZzf_2cgbeATGUiTxLjjvr8fvY8A',
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        }
    );
    
    // Initialize app after Supabase loads
    initializeSupabaseApp();
};

// --- State ---
let audio = null;
let isPlaying = false;
let currentTrackIndex = 0;
let currentUser = null;
let timerTickInterval = null;

// --- Playlist ---
const playlist = [
    { title: "Feels Like Yesterday", src: "audios/Feels Like Yesterday.mp3" },
    { title: "Deep Focus", src: "audios/Fret Fade.mp3" },
    { title: "Night Work", src: " //coming soon" }
];

// --- Migration from localStorage ---
async function migrateFromLocalStorage() {
    try {
        // Migrate tasks
        const localTasks = JSON.parse(localStorage.getItem('tasks')) || [];
        if (localTasks.length > 0 && currentUser) {
            for (const task of localTasks) {
                await db.createTask({
                    ...task,
                    user_id: currentUser.id
                });
            }
            localStorage.removeItem('tasks');
        }

        // Migrate points and achievements
        const localPoints = parseInt(localStorage.getItem('points')) || 0;
        const localAchievements = JSON.parse(localStorage.getItem('achievements')) || [];
        
        if (localPoints > 0 && currentUser) {
            await db.updateUserProgress({
                points: localPoints,
                achievements: localAchievements
            });
            localStorage.removeItem('points');
            localStorage.removeItem('achievements');
        }
    } catch (error) {
        console.error('Migration error:', error);
    }
}

// --- Auth State Management ---
auth.onAuthStateChange(async (user) => {
    currentUser = user;
    updateUserUI();
    
    if (user) {
        await migrateFromLocalStorage();
        initializeApp();
    } else {
        // Fallback to localStorage for demo
        initializeApp();
    }
});

// --- App Initialization ---
async function initializeApp() {
    createAnimatedBackground();
    ensurePointsDisplayExists();
    
    if (currentUser) {
        await loadUserProgress();
        await loadTasks();
        setupRealtimeSubscriptions();
    } else {
        // Fallback to localStorage for demo
        loadTasksFromLocalStorage();
        loadPointsFromLocalStorage();
    }
    
    setupAudioPlayer();
    setupEventListeners();
    startTimerSystem();
}

// --- User Progress ---
async function loadUserProgress() {
    try {
        const progress = await db.getUserProgress();
        if (progress) {
            updatePointsAndLevel(progress.points);
            displayAchievements(progress.achievements || []);
        }
    } catch (error) {
        console.error('Error loading user progress:', error);
    }
}

// --- Task Management ---
async function loadTasks() {
    try {
        const tasks = await db.getTasks();
        updateTaskDisplay(tasks);
    } catch (error) {
        console.error('Error loading tasks:', error);
        updateTaskDisplay([]);
    }
}

function loadTasksFromLocalStorage() {
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    updateTaskDisplay(tasks);
}

async function createTask() {
    const titleEl = document.getElementById('task-title');
    const descEl = document.getElementById('task-description');
    const hoursEl = document.getElementById('task-hours');
    const minutesEl = document.getElementById('task-minutes');

    const title = titleEl?.value?.trim() || '';
    const description = descEl?.value?.trim() || '';
    let hours = parseInt(hoursEl?.value) || 0;
    let minutes = parseInt(minutesEl?.value) || 0;

    hours = clampNonNegative(hours);
    minutes = clampNonNegative(minutes);

    if (!title) {
        alert('Please enter a task title');
        return;
    }

    if (!currentUser) {
        alert('Please sign in to create tasks');
        return;
    }

    const totalMinutes = hours * 60 + minutes;

    try {
        const task = await db.createTask({
            title,
            description,
            status: 'ongoing',
            duration_minutes: totalMinutes,
            user_id: currentUser.id,
            end_time: totalMinutes > 0 ? new Date(Date.now() + totalMinutes * 60000).toISOString() : null
        });

        // Clear form
        if (titleEl) titleEl.value = '';
        if (descEl) descEl.value = '';
        if (hoursEl) hoursEl.value = '0';
        if (minutesEl) minutesEl.value = '0';

        switchTab('ongoing');
        playNotificationSound('add');
        
    } catch (error) {
        console.error('Error creating task:', error);
        alert('Error creating task');
    }
}

async function markAsFinished(taskId) {
    if (!currentUser) return;

    try {
        const task = await db.updateTask(taskId, { status: 'finished', end_time: null });
        
        // Award points
        const progress = await db.getUserProgress();
        const newPoints = (progress?.points || 0) + 50;
        
        await db.updateUserProgress({
            points: newPoints,
            level: calculateLevel(newPoints)
        });

        updatePointsAndLevel(newPoints);
        checkAchievements();
        updateTaskDisplay();
        playNotificationSound('complete');
        
    } catch (error) {
        console.error('Error marking task as finished:', error);
    }
}

async function deleteTask(taskId) {
    if (!currentUser) return;

    try {
        await db.deleteTask(taskId);
        updateTaskDisplay();
        playNotificationSound('error');
    } catch (error) {
        console.error('Error deleting task:', error);
    }
}

// --- Points and Level System ---
function calculateLevel(points) {
    let level = 0;
    let required = 100;
    let total = 0;

    while (points >= total + required) {
        total += required;
        required += 20;
        level++;
    }

    return level;
}

function updatePointsAndLevel(points) {
    ensurePointsDisplayExists();

    const pointsDisplay = document.getElementById('pointsDisplay');
    const levelDisplay = document.getElementById('level-display');
    const levelTitle = document.getElementById('level-title');
    const progressBar = document.getElementById('level-progress');

    let level = 0;
    let required = 100;
    let total = 0;

    while (points >= total + required) {
        total += required;
        required += 20;
        level++;
    }

    const currentXP = points - total;
    const progressPercent = (currentXP / required) * 100;

    if (levelDisplay) levelDisplay.textContent = level;
    if (progressBar) progressBar.style.width = `${progressPercent}%`;
    if (pointsDisplay) {
        pointsDisplay.textContent = `Points: ${currentXP} / ${required}`;
    }

    if (levelTitle) {
        if (level === 0 || level === 1) {
            levelTitle.textContent = "Newbie";
        } else if (level === 2) {
            levelTitle.textContent = "Getting Started";
        } else {
            levelTitle.textContent = `Level ${level}`;
        }
    }
}

function loadPointsFromLocalStorage() {
    const points = parseInt(localStorage.getItem('points')) || 0;
    updatePointsAndLevel(points);
}

// --- Achievement System ---
async function checkAchievements() {
    if (!currentUser) return;

    try {
        const progress = await db.getUserProgress();
        const currentLevel = calculateLevel(progress?.points || 0);
        const achievements = await db.getAchievements();

        let changed = false;
        const userAchievements = progress?.achievements || [];

        achievements.forEach(achievement => {
            if (!userAchievements.includes(achievement.level) && currentLevel >= achievement.level) {
                if (currentLevel >= 1) {
                    showAchievementNotification(achievement.name, achievement.description);
                }
                userAchievements.push(achievement.level);
                changed = true;
            }
        });

        if (changed) {
            await db.updateUserProgress({
                achievements: userAchievements
            });
            displayAchievements(userAchievements);
        }
    } catch (error) {
        console.error('Error checking achievements:', error);
    }
}

function displayAchievements(unlockedAchievements) {
    const badgeContainer = document.getElementById('achievement-badges');
    if (!badgeContainer) return;

    badgeContainer.innerHTML = '';

    if (unlockedAchievements.length === 0) return;

    const highestAchievement = unlockedAchievements.sort((a, b) => b - a)[0];
    const achievementData = {
        0: { name: "Newbie Planner", icon: "🌟" },
        2: { name: "First Step", icon: "🚀" },
        5: { name: "Task Handler", icon: "⚡" },
        10: { name: "Consistency Builder", icon: "🔥" },
        25: { name: "Productivity Mindset", icon: "💎" },
        50: { name: "Workflow Architect", icon: "👑" },
        100: { name: "Execution Master", icon: "🏆" },
        250: { name: "Performative Boss", icon: "🌟" }
    };

    const achievement = achievementData[highestAchievement];
    if (achievement) {
        const badge = document.createElement('div');
        badge.className = 'achievement-badge unlocked';
        badge.title = achievement.name;
        badge.textContent = achievement.icon;
        badgeContainer.appendChild(badge);
    }
}

// --- Real-time Subscriptions ---
function setupRealtimeSubscriptions() {
    if (!currentUser) return;

    // Subscribe to task changes
    const taskSubscription = db.subscribeToTasks((payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            loadTasks();
        }
    });

    // Subscribe to user progress changes
    const progressSubscription = db.subscribeToUserProgress((payload) => {
        if (payload.eventType === 'UPDATE') {
            loadUserProgress();
        }
    });

    return () => {
        taskSubscription.unsubscribe();
        progressSubscription.unsubscribe();
    };
}

// --- Audio Player (unchanged) ---
function loadTrack(index) {
    if (!audio) return;

    audio.src = playlist[index].src;
    audio.load();
    
    const trackSelector = document.getElementById('track-selector');
    if (trackSelector) trackSelector.value = index;
}

function selectTrack(index) {
    currentTrackIndex = parseInt(index);
    loadTrack(currentTrackIndex);
    if (isPlaying) {
        audio.play().catch(() => {});
    }
}

function togglePlayPause() {
    if (!audio) {
        audio = document.getElementById('audio-player');
        if (!audio) return;
        setupAudioPlayer();
        loadTrack(currentTrackIndex);
    }

    if (audio.paused) {
        audio.play().catch(() => {});
        isPlaying = true;
        document.getElementById('play-pause-btn').textContent = '⏸';
    } else {
        audio.pause();
        isPlaying = false;
        document.getElementById('play-pause-btn').textContent = '▶';
    }
}

function nextTrack(autoPlay = false) {
    currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
    loadTrack(currentTrackIndex);
    if (autoPlay || isPlaying) {
        audio.play().catch(() => {});
        isPlaying = true;
        document.getElementById('play-pause-btn').textContent = '⏸';
    }
}

function prevTrack() {
    currentTrackIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    loadTrack(currentTrackIndex);
    if (isPlaying) {
        audio.play().catch(() => {});
        isPlaying = true;
        document.getElementById('play-pause-btn').textContent = '⏸';
    }
}

function toggleAudioPlayer() {
    const container = document.getElementById('audio-player-container');
    if (container.classList.contains('minimized')) {
        container.classList.remove('minimized');
    } else {
        container.classList.add('minimized');
    }
}

function setupAudioPlayer() {
    if (!audio) return;
    audio.addEventListener('loadedmetadata', () => updateTotalTime());
    audio.addEventListener('timeupdate', () => {
        updateProgress();
        updateCurrentTime();
    });
    audio.addEventListener('ended', () => {
        isPlaying = false;
        const btn = document.getElementById('play-pause-btn');
        if (btn) btn.textContent = '▶';
        nextTrack(true);
    });
}

// --- Timer System ---
function startTimerSystem() {
    if (timerTickInterval) clearInterval(timerTickInterval);
    timerTickInterval = setInterval(tickTimers, 1000);
    tickTimers();
}

async function tickTimers() {
    try {
        const tasks = currentUser ? await db.getTasks() : JSON.parse(localStorage.getItem('tasks')) || [];
        const now = Date.now();
        let changed = false;

        tasks.forEach(task => {
            if (task.status === 'ongoing' && task.end_time) {
                const end = new Date(task.end_time).getTime();
                if (isNaN(end)) return;
                if (end <= now) {
                    console.log(`[PLANOS] Task expired: ${task.title} (id:${task.id})`);
                    markAsFinished(task.id);
                    changed = true;
                }
            }
        });

        if (changed && currentUser) {
            loadTasks();
        }
        
        updateTimerDisplays();
    } catch (err) {
        console.error('[PLANOS] tickTimers error:', err);
    }
}

// --- UI Updates ---
function updateTaskDisplay() {
    // This would need to be updated to work with Supabase data
    // For now, keeping the original implementation
    const tasks = currentUser ? db.getTasks() : JSON.parse(localStorage.getItem('tasks')) || [];
    // ... rest of the original updateTaskDisplay function
}

// --- Event Listeners ---
function setupEventListeners() {
    const titleEl = document.getElementById('task-title');
    if (titleEl) {
        titleEl.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') createTask();
        });
    }

    const descEl = document.getElementById('task-description');
    if (descEl) {
        descEl.addEventListener('keypress', function (e) {
            if (e.key === 'Enter' && e.ctrlKey) createTask();
        });
    }
}

// --- Utility Functions ---
function clampNonNegative(n) {
    if (isNaN(n) || n < 0) return 0;
    return n;
}

function ensurePointsDisplayExists() {
    if (!document.getElementById('pointsDisplay')) {
        const header = document.querySelector('header') || document.body;
        const span = document.createElement('div');
        span.id = 'pointsDisplay';
        span.style.fontSize = '0.9rem';
        span.style.marginTop = '6px';
        const levelContainer = document.querySelector('.level-container');
        if (levelContainer) levelContainer.parentNode.insertBefore(span, levelContainer.nextSibling);
        else header.appendChild(span);
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    const tabContent = document.getElementById(tabName + '-task');
    if (tabContent) tabContent.classList.add('active');

    const buttons = document.querySelectorAll('.tab-btn');
    const tabMap = { 'create': 0, 'ongoing': 1, 'finished': 2, 'badges': 3 };
    const btnIndex = tabMap[tabName];
    if (btnIndex !== undefined && buttons[btnIndex]) buttons[btnIndex].classList.add('active');
    
    if (tabName === 'badges') {
        displayAllBadges();
    }
}

// --- Audio Player Utilities ---
function updateProgress() {
    if (!audio) return;
    if (audio.duration && !isNaN(audio.duration)) {
        const progress = (audio.currentTime / audio.duration) * 100;
        const el = document.getElementById('progress');
        if (el) el.style.width = progress + '%';
    }
}

function updateCurrentTime() {
    if (!audio) return;
    const current = formatTime(audio.currentTime || 0);
    const el = document.getElementById('current-time');
    if (el) el.textContent = current;
}

function updateTotalTime() {
    if (!audio) return;
    const total = formatTime(audio.duration || 0);
    const el = document.getElementById('total-time');
    if (el) el.textContent = total;
}

function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) seconds = 0;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateTimerDisplays() {
    // Timer display logic would need to be updated for Supabase
}

// --- Badges Display ---
async function displayAllBadges() {
    const badgesGrid = document.getElementById('badges-grid');
    if (!badgesGrid) return;

    try {
        // Try to get from Supabase first
        const achievements = await db.getAchievements();
        const progress = await db.getUserProgress();
        const currentLevel = calculateLevel(progress?.points || 0);

        achievements.forEach((achievement, index) => {
            const isUnlocked = progress?.achievements?.includes(achievement.level) || currentLevel >= achievement.level;
            const progressPercent = isUnlocked ? 100 : calculateProgress(currentLevel, achievement.level);
            
            const badgeCard = document.createElement('div');
            badgeCard.className = `badge-card ${isUnlocked ? 'unlocked' : 'locked'}`;
            
            const lockStatus = isUnlocked ? '🏆' : '🔒';
            
            badgeCard.innerHTML = `
                <div class="lock-status">${lockStatus}</div>
                <div class="badge-icon">${achievement.icon}</div>
                <div class="badge-name">${achievement.name}</div>
                <div class="badge-description">${achievement.description}</div>
                <div class="badge-level">Level ${achievement.level}</div>
                ${!isUnlocked ? `
                    <div class="badge-progress">
                        <div class="badge-progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                    <div style="font-size: 0.5rem; color: rgba(254, 230, 255, 0.6); margin-top: 5px;">
                        ${progressPercent.toFixed(1)}% Complete
                    </div>
                ` : ''}
            `;
            
            badgesGrid.appendChild(badgeCard);
        });
    } catch (error) {
        console.log('[PLANOS] Using fallback badges (Supabase not available):', error);
        // Fallback to localStorage badges
        const points = parseInt(localStorage.getItem('points')) || 0;
        const currentLevel = calculateLevel(points);

        const achievements = [
            { level: 0, name: "Newbie Planner", description: "Just getting started!", icon: "🌟" },
            { level: 2, name: "First Step", description: "Okay okay… you're actually doing the tasks.", icon: "🚀" },
            { level: 5, name: "Task Handler", description: "Wow, tasks don't even scare you anymore.", icon: "⚡" },
            { level: 10, name: "Consistency Builder", description: "Not a fluke anymore. This is getting serious.", icon: "🔥" },
            { level: 25, name: "Productivity Mindset", description: "Planning first, chaos later. Respect.", icon: "💎" },
            { level: 50, name: "Workflow Architect", description: "You don't just plan days. You design them.", icon: "👑" },
            { level: 100, name: "Execution Master", description: "Plans made. Plans finished. No excuses.", icon: "🏆" },
            { level: 250, name: "Performative Boss", description: "At this point, productivity is your personality. No debate.", icon: "🌟" }
        ];

        achievements.forEach((achievement, index) => {
            const isUnlocked = currentLevel >= achievement.level;
            const progressPercent = isUnlocked ? 100 : calculateProgress(currentLevel, achievement.level);
            
            const badgeCard = document.createElement('div');
            badgeCard.className = `badge-card ${isUnlocked ? 'unlocked' : 'locked'}`;
            
            const lockStatus = isUnlocked ? '🏆' : '🔒';
            
            badgeCard.innerHTML = `
                <div class="lock-status">${lockStatus}</div>
                <div class="badge-icon">${achievement.icon}</div>
                <div class="badge-name">${achievement.name}</div>
                <div class="badge-description">${achievement.description}</div>
                <div class="badge-level">Level ${achievement.level}</div>
                ${!isUnlocked ? `
                    <div class="badge-progress">
                        <div class="badge-progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                    <div style="font-size: 0.5rem; color: rgba(254, 230, 255, 0.6); margin-top: 5px;">
                        ${progressPercent.toFixed(1)}% Complete
                    </div>
                ` : ''}
            `;
            
            badgesGrid.appendChild(badgeCard);
        });
    }
}

function calculateProgress(currentLevel, requiredLevel) {
    if (currentLevel >= requiredLevel) return 100;
    if (currentLevel === 0) return 0;
    return Math.min((currentLevel / requiredLevel) * 100, 99);
}

// --- Notification System ---
function showNotification(taskTitle) {
    const modal = document.getElementById('notification-modal');
    const text = document.getElementById('notification-text');
    if (text) text.textContent = `Time's up for "${taskTitle}"!`;
    if (modal) modal.classList.add('show');

    playNotificationSound();

    document.body.style.animation = 'none';
    void document.body.offsetWidth;
    document.body.style.animation = 'pulse 0.5s';
}

function showAchievementNotification(name, description) {
    const modal = document.getElementById('achievement-modal');
    const text = document.getElementById('achievement-text');
    
    if (text) {
        text.innerHTML = `<strong>${name}</strong><br><small>${description}</small>`;
    }
    
    if (modal) {
        modal.classList.add('show');
        setTimeout(() => closeAchievementModal(), 4000);
    }
    
    playAchievementSound();
}

function closeNotification() {
    const modal = document.getElementById('notification-modal');
    if (modal) modal.classList.remove('show');
    document.body.style.animation = '';
}

function closeAchievementModal() {
    const modal = document.getElementById('achievement-modal');
    if (modal) modal.classList.remove('show');
}

// --- Sound System ---
function playNotificationSound(type = 'default') {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    const sounds = {
        'add': { freq: 1000, type: 'sine', duration: 0.5, volume: 0.3 },
        'complete': { freq: 1500, type: 'sine', duration: 0.3, volume: 0.3 },
        'error': { freq: 800, type: 'square', duration: 0.2, volume: 0.2 },
        'alert': { freq: 2000, type: 'sine', duration: 0.1, volume: 0.2 }
    };
    
    const sound = sounds[type] || sounds['default'];
    
    oscillator.frequency.value = sound.freq;
    oscillator.type = sound.type;
    
    gainNode.gain.setValueAtTime(sound.volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + sound.duration);
}

function playAchievementSound() {
    const audioContext = new (window.AudioContext || window.AudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.linearRampToValueAtTime(1200, audioContext.currentTime + 0.2);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.6);
}

// --- Background Animation ---
function createAnimatedBackground() {
    const background = document.getElementById('animated-background');
    if (!background) return;
    background.innerHTML = '';
    for (let i = 0; i < 12; i++) {
        const circle = document.createElement('div');
        circle.className = 'shape circle';
        circle.style.width = Math.random() * 50 + 30 + 'px';
        circle.style.height = circle.style.width;
        circle.style.left = Math.random() * 100 + '%';
        circle.style.top = Math.random() * 100 + '%';
        circle.style.animationDuration = (Math.random() * 10 + 15) + 's';
        circle.style.animationDelay = Math.random() * 5 + 's';
        if (i % 2 === 0) circle.style.animationName = 'float-reverse';
        background.appendChild(circle);

        const square = document.createElement('div');
        square.className = 'shape square';
        const size = Math.random() * 40 + 25;
        square.style.width = size + 'px';
        square.style.height = size + 'px';
        square.style.left = Math.random() * 100 + '%';
        square.style.top = Math.random() * 100 + '%';
        square.style.animationDuration = (Math.random() * 10 + 18) + 's';
        square.style.animationDelay = Math.random() * 5 + 's';
        if (i % 3 === 0) square.style.animationName = 'float-reverse';
        background.appendChild(square);

        const triangle = document.createElement('div');
        triangle.className = 'shape triangle';
        const triangleSize = Math.random() * 30 + 20;
        triangle.style.borderLeftWidth = triangleSize + 'px';
        triangle.style.borderRightWidth = triangleSize + 'px';
        triangle.style.borderBottomWidth = (triangleSize * 1.7) + 'px';
        triangle.style.left = Math.random() * 100 + '%';
        triangle.style.top = Math.random() * 100 + '%';
        triangle.style.animationDuration = (Math.random() * 10 + 16) + 's';
        triangle.style.animationDelay = Math.random() * 5 + 's';
        if (i % 4 === 0) triangle.style.animationName = 'float-reverse';
        background.appendChild(triangle);
    }
}

// --- DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', function () {
    console.log('[PLANOS] Supabase Integration — init starting');
    
    // Show login button immediately
    updateUserUI();
    
    // Try to initialize app
    initializeApp();
});

// --- Authentication UI Functions ---
function showAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('show');
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('show');
    clearAuthMessage();
}

function switchAuthTab(tab) {
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');
    const signinTab = document.querySelector('.auth-tab:nth-child(1)');
    const signupTab = document.querySelector('.auth-tab:nth-child(2)');
    
    if (tab === 'signin') {
        signinForm.classList.add('active');
        signupForm.classList.remove('active');
        signinTab.classList.add('active');
        signupTab.classList.remove('active');
    } else {
        signinForm.classList.remove('active');
        signupForm.classList.add('active');
        signinTab.classList.remove('active');
        signupTab.classList.add('active');
    }
    
    clearAuthMessage();
}

function showAuthMessage(message, type = 'info') {
    const messageEl = document.getElementById('auth-message');
    if (messageEl) {
        messageEl.textContent = message;
        messageEl.className = `auth-message ${type}`;
    }
}

function clearAuthMessage() {
    const messageEl = document.getElementById('auth-message');
    if (messageEl) {
        messageEl.textContent = '';
        messageEl.className = 'auth-message';
    }
}

async function handleSignIn() {
    const email = document.getElementById('signin-email')?.value?.trim();
    const password = document.getElementById('signin-password')?.value;
    
    if (!email || !password) {
        showAuthMessage('Please fill in all fields', 'error');
        return;
    }
    
    try {
        showAuthMessage('Signing in...', 'info');
        const { data, error } = await auth.signIn(email, password);
        
        if (error) throw error;
        
        showAuthMessage('Sign in successful!', 'success');
        setTimeout(() => {
            closeAuthModal();
            updateUserUI();
        }, 1000);
        
    } catch (error) {
        console.error('Sign in error:', error);
        showAuthMessage(error.message || 'Sign in failed', 'error');
    }
}

async function handleSignUp() {
    const username = document.getElementById('signup-username')?.value?.trim();
    const email = document.getElementById('signup-email')?.value?.trim();
    const password = document.getElementById('signup-password')?.value;
    
    if (!username || !email || !password) {
        showAuthMessage('Please fill in all fields', 'error');
        return;
    }
    
    if (password.length < 6) {
        showAuthMessage('Password must be at least 6 characters', 'error');
        return;
    }
    
    try {
        showAuthMessage('Creating account...', 'info');
        const { data, error } = await auth.signUp(email, password, {
            data: { username }
        });
        
        if (error) throw error;
        
        showAuthMessage('Account created! Please check your email.', 'success');
        setTimeout(() => {
            switchAuthTab('signin');
        }, 2000);
        
    } catch (error) {
        console.error('Sign up error:', error);
        showAuthMessage(error.message || 'Sign up failed', 'error');
    }
}

async function handleGoogleSignIn() {
    try {
        showAuthMessage('Redirecting to Google...', 'info');
        const { data, error } = await auth.signInWithOAuth('google');
        
        if (error) throw error;
        
    } catch (error) {
        console.error('Google sign in error:', error);
        showAuthMessage('Google sign in failed', 'error');
    }
}

async function handleSignOut() {
    try {
        await auth.signOut();
        currentUser = null;
        updateUserUI();
        showAuthMessage('Signed out successfully', 'success');
    } catch (error) {
        console.error('Sign out error:', error);
    }
}

function updateUserUI() {
    const header = document.querySelector('header');
    if (!header) return;
    
    // Remove existing auth UI
    const existingAuthUI = header.querySelector('.auth-ui');
    if (existingAuthUI) existingAuthUI.remove();
    
    const authUI = document.createElement('div');
    authUI.className = 'auth-ui';
    
    if (currentUser) {
        // Show user info
        authUI.innerHTML = `
            <div class="user-info">
                <div class="user-avatar">${currentUser.email?.charAt(0).toUpperCase() || 'U'}</div>
                <div class="user-name">${currentUser.user_metadata?.username || currentUser.email?.split('@')[0] || 'User'}</div>
                <button class="sign-out-btn" onclick="handleSignOut()">Sign Out</button>
            </div>
        `;
    } else {
        // Show sign in button
        authUI.innerHTML = `
            <button class="auth-trigger" onclick="showAuthModal()">🔐 Sign In</button>
        `;
    }
    
    header.appendChild(authUI);
}

// --- Export for use in HTML ---
window.PLANOS = {
    auth,
    createTask,
    markAsFinished,
    deleteTask,
    switchTab,
    togglePlayPause,
    nextTrack,
    prevTrack,
    toggleAudioPlayer,
    selectTrack,
    // Auth functions
    showAuthModal,
    closeAuthModal,
    switchAuthTab,
    handleSignIn,
    handleSignUp,
    handleGoogleSignIn,
    handleSignOut
};
