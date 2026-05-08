
// PLANOS Main Application Script

// --- Mobile Menu Toggle ---
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
}

// --- Sidebar Toggle ---
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainWrapper = document.querySelector('.main-wrapper');
    const toggleBtn = document.querySelector('.sidebar-toggle');

    if (sidebar && mainWrapper) {
        sidebar.classList.toggle('minimized');
        mainWrapper.classList.toggle('minimized');

        // Update toggle button text
        if (sidebar.classList.contains('minimized')) {
            toggleBtn.textContent = '▶';
        } else {
            toggleBtn.textContent = '◀';
        }
    }
}

// Make functions globally accessible
window.toggleMobileMenu = toggleMobileMenu;
window.toggleSidebar = toggleSidebar;

// --- Authentication Dropdown Functions ---
function toggleAuthDropdown() {
    const dropdown = document.getElementById('auth-dropdown-menu');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

function openAuthModal(tab = 'signup') {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.add('show');
        switchAuthTab(tab);
    }
    // Close dropdown
    const dropdown = document.getElementById('auth-dropdown-menu');
    if (dropdown) {
        dropdown.classList.remove('show');
    }
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function switchAuthTab(tab) {
    const signupTab = document.getElementById('signup-tab');
    const loginTab = document.getElementById('login-tab');
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');
    const modalTitle = document.getElementById('auth-modal-title');
    const modalSubtitle = document.getElementById('auth-modal-subtitle');

    if (tab === 'signup') {
        signupTab?.classList.add('active');
        loginTab?.classList.remove('active');
        signupForm?.classList.add('active');
        loginForm?.classList.remove('active');
        if (modalTitle) modalTitle.textContent = 'Sign Up';
        if (modalSubtitle) modalSubtitle.textContent = 'Create your account';
    } else {
        loginTab?.classList.add('active');
        signupTab?.classList.remove('active');
        loginForm?.classList.add('active');
        signupForm?.classList.remove('active');
        if (modalTitle) modalTitle.textContent = 'Login';
        if (modalSubtitle) modalSubtitle.textContent = 'Welcome back';
    }
}

function updateAuthUI(user) {
    const authDropdownText = document.getElementById('auth-dropdown-text');
    const authLoggedOut = document.getElementById('auth-logged-out');
    const authLoggedIn = document.getElementById('auth-logged-in');
    const headerUsername = document.getElementById('header-username');

    if (user) {
        // User is logged in
        if (authDropdownText) authDropdownText.textContent = 'Hey, ' + (user.user_metadata?.username || 'User');
        if (authLoggedOut) authLoggedOut.style.display = 'none';
        if (authLoggedIn) authLoggedIn.style.display = 'block';
        if (headerUsername) headerUsername.textContent = user.user_metadata?.username || 'User';
    } else {
        // User is logged out
        if (authDropdownText) authDropdownText.textContent = 'Login';
        if (authLoggedOut) authLoggedOut.style.display = 'block';
        if (authLoggedIn) authLoggedIn.style.display = 'none';
    }
}

function signOut() {
    // Close dropdown
    const dropdown = document.getElementById('auth-dropdown-menu');
    if (dropdown) {
        dropdown.classList.remove('show');
    }

    // Sign out from Supabase
    if (window.supabase) {
        window.supabase.auth.signOut().then(() => {
            currentUser = null;
            updateAuthUI(null);
            showAuthNotification('👋 Logged Out', 'You have been successfully logged out.', 'info');
        }).catch(error => {
            console.error('Sign out error:', error);
        });
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function (event) {
    const dropdown = document.getElementById('auth-dropdown-menu');
    const dropdownBtn = document.querySelector('.auth-dropdown-btn');

    if (dropdown && dropdownBtn && !dropdownBtn.contains(event.target) && !dropdown.contains(event.target)) {
        dropdown.classList.remove('show');
    }
});

// --- Authentication Handlers ---
function handleSignUp(event) {
    event.preventDefault();

    const username = document.getElementById('signup-name')?.value?.trim();
    const email = document.getElementById('signup-email')?.value?.trim();
    const password = document.getElementById('signup-password')?.value;
    const confirmPassword = document.getElementById('signup-confirm-password')?.value;

    console.log('[PLANOS] Sign up attempt:', {
        username,
        email: email ? email.substring(0, 3) + '***' : 'empty',
        hasPassword: !!password,
        passwordsMatch: password === confirmPassword
    });

    if (!username || !email || !password || !confirmPassword) {
        showAuthMessage('Please fill in all fields', 'error');
        return;
    }

    if (password.length < 6) {
        showAuthMessage('Password must be at least 6 characters', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showAuthMessage('Passwords do not match', 'error');
        return;
    }

    if (!window.supabase) {
        console.error('[PLANOS] Supabase not available during sign up');
        showAuthMessage('Authentication service not available', 'error');
        return;
    }

    showAuthMessage('Creating account...', 'info');

    window.supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                username: username.toLowerCase().replace(/\s+/g, '_')
            }
        }
    }).then(({ data, error }) => {
        console.log('[PLANOS] Sign up response:', { data, error });

        if (error) {
            console.error('[PLANOS] Sign up error details:', error);
            throw error;
        }

        showAuthMessage('Account created! Please check your email to verify.', 'success');
        showAuthNotification('📧 Account Created!', 'Please check your email to verify your account before logging in.', 'info');
        setTimeout(() => {
            closeAuthModal();
        }, 2000);
    }).catch(error => {
        console.error('[PLANOS] Sign up error:', error);

        // Handle specific error messages
        let errorMessage = 'Sign up failed. Please try again.';

        if (error.message?.includes('User already registered')) {
            errorMessage = 'This email is already registered. Try logging in instead.';
        } else if (error.message?.includes('Password should be at least')) {
            errorMessage = 'Password must be at least 6 characters.';
        } else if (error.message?.includes('Invalid email')) {
            errorMessage = 'Please enter a valid email address.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        showAuthMessage(errorMessage, 'error');
    });
}

function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('login-email')?.value?.trim();
    const password = document.getElementById('login-password')?.value;

    console.log('[PLANOS] Login attempt:', { email: email ? email.substring(0, 3) + '***' : 'empty', hasPassword: !!password });

    if (!email || !password) {
        showAuthMessage('Please fill in all fields', 'error');
        return;
    }

    if (!window.supabase) {
        console.error('[PLANOS] Supabase not available during login');
        showAuthMessage('Authentication service not available', 'error');
        return;
    }

    showAuthMessage('Signing in...', 'info');

    window.supabase.auth.signInWithPassword({
        email,
        password
    }).then(({ data, error }) => {
        console.log('[PLANOS] Login response:', { data, error });

        if (error) {
            console.error('[PLANOS] Login error details:', error);
            throw error;
        }

        if (!data.user) {
            throw new Error('No user data returned');
        }

        currentUser = data.user;
        console.log('[PLANOS] Login successful for:', currentUser.email);

        updateAuthUI(currentUser);
        closeAuthModal();
        showAuthNotification('🎉 Login Successful!', 'Welcome back, ' + (currentUser.user_metadata?.username || 'User') + '!', 'success');
    }).catch(error => {
        console.error('[PLANOS] Login error:', error);

        // Handle specific error messages
        let errorMessage = 'Login failed. Please try again.';

        if (error.message?.includes('Invalid login credentials')) {
            errorMessage = 'Invalid email or password';
        } else if (error.message?.includes('Email not confirmed')) {
            errorMessage = 'Please check your email and confirm your account';
        } else if (error.message?.includes('User not found')) {
            errorMessage = 'No account found with this email';
        } else if (error.message) {
            errorMessage = error.message;
        }

        showAuthMessage(errorMessage, 'error');
    });
}

function handleGoogleAuth() {
    if (!window.supabase) {
        showAuthMessage('Authentication service not available', 'error');
        return;
    }

    showAuthMessage('Connecting to Google...', 'info');

    window.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin
        }
    }).catch(error => {
        console.error('Google auth error:', error);
        showAuthMessage('Google authentication failed. Please try again.', 'error');
    });
}

function showAuthMessage(message, type = 'info') {
    const messageEl = document.getElementById('auth-message');
    if (messageEl) {
        messageEl.textContent = message;
        messageEl.className = 'auth-message ' + type;
    }
}

// --- Authentication State Management ---
function initializeAuth() {
    // Wait for Supabase to be available
    const checkSupabase = () => {
        if (window.supabase) {
            console.log('[PLANOS] Initializing authentication...');

            // Check current auth state
            window.supabase.auth.getSession().then(({ data: { session } }) => {
                currentUser = session?.user || null;
                updateAuthUI(currentUser);
                console.log('[PLANOS] Auth state initialized:', currentUser ? 'Logged in' : 'Logged out');
                if (currentUser) {
                    loadUserDataFromSupabase();
                    loadUserTier();
                }
                // Always apply gating so Free / logged-out users see the correct locks
                applyPremiumGating();
                fetchUserTracks();
            });

            // Listen for auth changes
            window.supabase.auth.onAuthStateChange((event, session) => {
                const previousUser = currentUser;
                currentUser = session?.user || null;
                updateAuthUI(currentUser);

                if (event === 'SIGNED_IN' && currentUser) {
                    // Load user-specific data from Supabase
                    loadUserDataFromSupabase();
                    loadUserTier();
                    subscribeToPaymentUpdates();
                    fetchUserTracks();
                    showAuthNotification('🎉 Welcome Back!', 'You are now logged in as ' + (currentUser.user_metadata?.username || 'User'), 'success');
                } else if (event === 'SIGNED_OUT') {
                    // Tear down realtime subscription
                    if (_paymentChannel && window.supabase) {
                        window.supabase.removeChannel(_paymentChannel);
                        _paymentChannel = null;
                    }
                    // Clear local data and show empty state
                    localStorage.removeItem('tasks');
                    localStorage.removeItem('points');
                    localStorage.removeItem('achievements');
                    clearTaskDisplay();
                    fetchUserTracks();
                    showAuthNotification('👋 Logged Out', 'You have been successfully logged out.', 'info');
                }
            });
        } else {
            // Retry after a short delay
            setTimeout(checkSupabase, 100);
        }
    };

    checkSupabase();
}

async function loadUserDataFromSupabase() {
    if (!currentUser) return;

    // Tasks: getTasks() is now the single source — it fetches from Supabase
    // and writes through to localStorage automatically.
    await updateTaskDisplay();

    // Load user's progress from Supabase
    window.supabase
        .from('user_progress')
        .select('points, level, achievements')
        .eq('user_id', currentUser.id)
        .single()
        .then(({ data, error }) => {
            if (error) {
                console.error('[PLANOS] Error loading user progress:', error);
                return;
            }

            if (data) {
                localStorage.setItem('points', data.points || 0);

                // Load achievements if they exist
                if (data.achievements && data.achievements.length > 0) {
                    localStorage.setItem('achievements', JSON.stringify(data.achievements));
                    achievements = data.achievements;
                }

                updatePointsAndLevel();
            } else {
                // Initialize with defaults
                localStorage.setItem('points', '0');
                updatePointsAndLevel();
            }
        });
}

function clearTaskDisplay() {
    const ongoingList = document.getElementById('ongoing-tasks');
    const finishedList = document.getElementById('finished-tasks');

    const ongoingListAlt = ongoingList || document.getElementById('ongoing-task');
    const finishedListAlt = finishedList || document.getElementById('finished-task');

    const ongoingContainer = ongoingListAlt?.querySelector('.task-list, ul') || ongoingListAlt;
    const finishedContainer = finishedListAlt?.querySelector('.task-list, ul') || finishedListAlt;

    if (ongoingContainer) {
        ongoingContainer.innerHTML = '<li class="empty-state">No ongoing tasks yet</li>';
    }
    if (finishedContainer) {
        finishedContainer.innerHTML = '<li class="empty-state">No finished tasks yet</li>';
    }
}

// Make functions globally accessible
window.toggleAuthDropdown = toggleAuthDropdown;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.switchAuthTab = switchAuthTab;
window.handleSignUp = handleSignUp;
window.handleLogin = handleLogin;
window.handleGoogleAuth = handleGoogleAuth;
window.signOut = signOut;

// --- State ---
let audio = null;
let isPlaying = false;
let currentTrackIndex = 0;
let currentUser = null;
let userTier = 'Free';          // 'Free' | 'Pro' | 'Elite'
let userUnlockedThemes = ['Default']; // synced from Supabase profiles
let timerTickInterval = null;

// --- Playlist ---
const defaultPlaylist = [
    { title: "Feels Like Yesterday", src: "audios/Feels Like Yesterday.mp3" },
    { title: "Deep Focus", src: "audios/Fret Fade.mp3" },
    { title: "Inspiring Focus", src: "audios/Inspiring Focus.mp3" }
];
let allTracks = [...defaultPlaylist];

function loadTrack(index) {
    if (!audio) return;
    
    // Safety bounds
    if (index < 0 || index >= allTracks.length) return;

    audio.src = allTracks[index].src;
    audio.load();

    // Update dropdown to reflect current track
    const trackSelector = document.getElementById('track-selector');
    if (trackSelector) trackSelector.value = index;
}

// persistent data
let achievements = JSON.parse(localStorage.getItem('achievements')) || [
    {
        id: 1,
        level: 0,
        name: "Newbie Planner",
        unlocked: false,
    },
    {
        id: 2,
        level: 2,
        name: "First Step",
        unlocked: false,
        description: "Okay okay… you’re actually doing the tasks."
    },
    {
        id: 3,
        level: 5,
        name: "Task Handler",
        unlocked: false,
        description: "Wow, tasks don’t even scare you anymore."
    },
    {
        id: 4,
        level: 10,
        name: "Consistency Builder",
        unlocked: false,
        description: "Not a fluke anymore. This is getting serious."
    },
    {
        id: 5,
        level: 25,
        name: "Productivity Mindset",
        unlocked: false,
        description: "Planning first, chaos later. Respect."
    },
    {
        id: 6,
        level: 50,
        name: "Workflow Architect",
        unlocked: false,
        description: "You don’t just plan days. You design them."
    },
    {
        id: 7,
        level: 100,
        name: "Execution Master",
        unlocked: false,
        description: "Plans made. Plans finished. No excuses."
    },
    {
        id: 8,
        level: 250,
        name: "Performative Boss",
        unlocked: false,
        description: "At this point, productivity is your personality. No debate"
    }
];


// --- Utility / Init ---
function getNextTaskId() {
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    const maxId = tasks.reduce((m, t) => (typeof t.id === 'number' && t.id > m ? t.id : m), -1);
    return maxId + 1;
}

function saveTasks(tasks) {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

/** Fast synchronous read from localStorage — used internally by tickTimers etc. */
function loadTasks() {
    return JSON.parse(localStorage.getItem('tasks')) || [];
}

/**
 * UNIFIED DATA SOURCE — always call this for UI rendering.
 * • Logged in  → fetch from Supabase (server is truth), write-through to localStorage.
 * • Logged out → read from localStorage (offline / demo mode).
 */
async function getTasks() {
    if (currentUser && window.supabase) {
        try {
            const { data, error } = await window.supabase
                .from('tasks')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Keep localStorage in sync as a write-through cache
            const tasks = data || [];
            localStorage.setItem('tasks', JSON.stringify(tasks));
            return tasks;
        } catch (err) {
            console.warn('[PLANOS] getTasks: Supabase fetch failed, falling back to localStorage:', err.message);
            return loadTasks();
        }
    }
    return loadTasks();
}

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

// --- Tab Switching ---
async function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    const tabContent = document.getElementById(tabName + '-task');
    if (tabContent) tabContent.classList.add('active');

    const buttons = document.querySelectorAll('.nav-btn');
    const tabMap = { 'create': 0, 'ongoing': 1, 'finished': 2, 'planning': 3, 'badges': 4, 'leaderboard': 5, 'global-rankings': 6, 'pricing': 7, 'about': 8 };
    const btnIndex = tabMap[tabName];
    if (btnIndex !== undefined && buttons[btnIndex]) buttons[btnIndex].classList.add('active');

    // Await the unified async render so the list is always populated before the tab is visible
    if (tabName === 'ongoing' || tabName === 'finished') await updateTaskDisplay();
    if (tabName === 'badges') displayAllBadges();
    if (tabName === 'leaderboard') { renderLeaderboard(); applyPremiumGating(); }
    if (tabName === 'global-rankings') { renderGlobalLeaderboard(); applyPremiumGating(); }
    if (tabName === 'pricing') updatePricingUI();
}

// --- Animated background ---
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

// --- Timer tick system ---
function tickTimers() {
    try {
        const tasks = loadTasks();
        const now = Date.now();
        let changed = false;

        tasks.forEach(task => {
            if (task.status === 'ongoing' && task.end_time) {
                const end = new Date(task.end_time).getTime();
                if (isNaN(end)) return;
                if (end <= now) {
                    console.log(`[PLANOS] Task expired: ${task.title} (id:${task.id})`);
                    task.status = 'finished';
                    task.end_time = null;
                    changed = true;

                    // --- TIME-TIERED POINT AWARD (anti-spam: only on auto-expire) ---
                    const earnedPoints = calculateTierPoints(task.duration_minutes || 0);
                    const tierInfo = getTierInfo(task.duration_minutes || 0);
                    const currentPoints = parseInt(localStorage.getItem('points')) || 0;
                    const newPoints = currentPoints + earnedPoints;
                    localStorage.setItem('points', newPoints);

                    // Route to the correct leaderboard tier
                    if (earnedPoints > 0) {
                        addLeaderboardEntry(task, earnedPoints);
                    }

                    updatePointsAndLevel();

                    // Update in Supabase if user is logged in
                    if (currentUser && window.supabase) {
                        window.supabase
                            .from('tasks')
                            .update({ status: 'finished', end_time: null })
                            .eq('id', task.id)
                            .eq('user_id', currentUser.id)
                            .then(({ error }) => {
                                if (error) console.error('[PLANOS] Error updating expired task in Supabase:', error);
                            });
                    }

                    // Show enriched completion notification
                    const pointLine = earnedPoints > 0
                        ? `+${earnedPoints} pts (${tierInfo.tier} Tier ${tierInfo.emoji} ${tierInfo.label})`
                        : 'No points (no timer was set)';
                    showTimerCompleteNotification(task.title, pointLine);

                    // Lootbox fires ONLY on auto-complete (timer reaches zero)
                    rollLootDrop(task);
                }
            }
        });

        if (changed) {
            localStorage.setItem('tasks', JSON.stringify(tasks));
            updateTaskDisplay();
        }
        // Always update timer displays to ensure countdowns are accurate
        updateTimerDisplays();
    } catch (err) {
        console.error('[PLANOS] tickTimers error:', err);
    }
}

// Update timers every second
setInterval(tickTimers, 1000);

function playNotificationSound(type = 'default') {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Different sound types
        const sounds = {
            'default': { freq: 1000, type: 'sine', duration: 0.5, volume: 0.3 },
            'add': { freq: 1000, type: 'sine', duration: 0.5, volume: 0.3 },
            'complete': { freq: 1500, type: 'sine', duration: 0.3, volume: 0.3 },
            'error': { freq: 800, type: 'square', duration: 0.2, volume: 0.2 },
            'alert': { freq: 2000, type: 'sine', duration: 0.1, volume: 0.2 }
        };

        const sound = sounds[type] || sounds['default'];

        // Check if oscillator and frequency exist
        if (oscillator && oscillator.frequency) {
            oscillator.frequency.setValueAtTime(sound.freq, audioContext.currentTime);
            oscillator.type = sound.type;

            gainNode.gain.setValueAtTime(sound.volume, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + sound.duration);
        } else {
            console.warn('[PLANOS] Could not create oscillator for notification sound');
        }
    } catch (error) {
        console.warn('[PLANOS] Error playing notification sound:', error);
        // Don't throw error - notification sound is not critical
    }
}

function showNotification(taskTitle, message = '', isTask = true) {
    console.log('[PLANOS] showNotification called with:', { taskTitle, message, isTask });
    console.log('[PLANOS] Current notification element:', document.getElementById('notification'));
    console.log('[PLANOS] Current notification modal:', document.getElementById('notification-modal'));

    // Use existing notification modal system
    const modal = document.getElementById('notification-modal');
    const text = document.getElementById('notification-text');

    console.log('[PLANOS] Modal element:', modal);
    console.log('[PLANOS] Text element:', text);

    // Set appropriate title and message based on context
    if (text) {
        if (isTask) {
            text.textContent = `Time's up for "${taskTitle}"!`;
        } else {
            text.textContent = taskTitle;
        }
        console.log('[PLANOS] Set text content to:', text.textContent);
    }

    if (modal) {
        console.log('[PLANOS] Adding show class to modal');
        modal.classList.add('show');

        // Add plan-specific styling
        if (!modal.classList.contains('plan-notification')) {
            console.log('[PLANOS] Adding plan-notification class');
            modal.classList.add('plan-notification');
        }
    }

    console.log('[PLANOS] Playing notification sound');
    playNotificationSound();

    // Browser notification for plans
    if ("Notification" in window && Notification.permission === "granted") {
        const notificationTitle = isTask ? "PLANOS - Task Complete!" : `PLANOS - ${taskTitle}`;
        console.log('[PLANOS] Creating browser notification:', notificationTitle);
        new Notification(notificationTitle, {
            body: message || (isTask ? `Time's up for "${taskTitle}"!` : ''),
            icon: "data:image/x-icon;base64,AAABAAEAEBAAAAAAAABoBQAAFgAAACg...", // Your favicon
            requireInteraction: true  // This makes browser notification manual
        });
    }

    // Body animation
    document.body.style.animation = 'none';
    void document.body.offsetWidth;

    console.log('[PLANOS] Notification setup complete');
    document.body.style.animation = 'pulse 0.5s';
}


function closeNotification() {
    const modal = document.getElementById('notification-modal');
    if (modal) modal.classList.remove('show');
    document.body.style.animation = '';
}

// --- Authentication Notification Functions ---
function showAuthNotification(title, message, type = 'info') {
    const modal = document.getElementById('auth-notification-modal');
    const titleEl = document.getElementById('auth-notification-title');
    const textEl = document.getElementById('auth-notification-text');

    if (titleEl) titleEl.textContent = title;
    if (textEl) textEl.textContent = message;
    if (modal) modal.classList.add('show');

    // Play authentication sound
    playAuthNotificationSound(type);

    // Body animation for auth notifications
    document.body.style.animation = 'none';
    void document.body.offsetWidth;
    document.body.style.animation = 'authPulse 0.5s';
}

function closeAuthNotification() {
    const modal = document.getElementById('auth-notification-modal');
    if (modal) modal.classList.remove('show');
    document.body.style.animation = '';
}

function playAuthNotificationSound(type = 'info') {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Different sounds for different auth events
        const authSounds = {
            'success': { freq: 1200, type: 'triangle', duration: 0.4, volume: 0.3 },
            'error': { freq: 600, type: 'sawtooth', duration: 0.3, volume: 0.2 },
            'info': { freq: 800, type: 'sine', duration: 0.3, volume: 0.25 },
            'warning': { freq: 1000, type: 'square', duration: 0.2, volume: 0.2 }
        };

        const sound = authSounds[type] || authSounds['info'];

        // Check if oscillator and frequency exist
        if (oscillator && oscillator.frequency) {
            oscillator.frequency.setValueAtTime(sound.freq, audioContext.currentTime);
            oscillator.type = sound.type;

            gainNode.gain.setValueAtTime(sound.volume, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + sound.duration);
        } else {
            console.warn('[PLANOS] Could not create oscillator for auth notification sound');
        }
    } catch (error) {
        console.warn('[PLANOS] Error playing auth notification sound:', error);
        // Don't throw error - sound is not critical
    }
}

// --- Achievement System (NO ICONS) ---
function playAchievementSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Check if oscillator and frequency exist
        if (oscillator && oscillator.frequency) {
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.linearRampToValueAtTime(1200, audioContext.currentTime + 0.2);
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.6);
        } else {
            console.warn('[PLANOS] Could not create oscillator for achievement sound');
        }
    } catch (error) {
        console.warn('[PLANOS] Error playing achievement sound:', error);
        // Don't throw error - achievement sound is not critical
    }
}

function showAchievementNotification(name, description) {
    const modal = document.getElementById('achievement-modal');
    const text = document.getElementById('achievement-text');

    if (text) {
        text.innerHTML = `<strong>${name}</strong><br><small>${description}</small>`;
    }

    if (modal) {
        modal.classList.add('show');
        // Removed auto-close - now manual only
    }

    playAchievementSound();
}

function closeAchievementModal() {
    const modal = document.getElementById('achievement-modal');
    if (modal) modal.classList.remove('show');
}

function displayAllBadges() {
    const badgesGrid = document.getElementById('badges-grid');
    if (!badgesGrid) return;
    badgesGrid.innerHTML = '';

    const currentPoints = parseInt(localStorage.getItem('points')) || 0;
    const currentLevel = getLevelFromPoints(currentPoints);

    achievements.forEach((achievement, index) => {
        const isUnlocked = achievement.unlocked;
        const progress = isUnlocked ? 100 : calculateProgress(currentLevel, achievement.level);

        const badgeCard = document.createElement('div');
        badgeCard.className = `badge-card ${isUnlocked ? 'unlocked' : 'locked'}`;

        const badgeIcon = getBadgeIcon(achievement.level);
        const lockStatus = isUnlocked ? '🏆' : '🔒';

        badgeCard.innerHTML = `
            <div class="lock-status">${lockStatus}</div>
            <div class="badge-icon">${badgeIcon}</div>
            <div class="badge-name">${achievement.name}</div>
            <div class="badge-description">${achievement.description || 'Complete more tasks to unlock this achievement!'}</div>
            <div class="badge-level">Level ${achievement.level}</div>
            ${!isUnlocked ? `
                <div class="badge-progress">
                    <div class="badge-progress-fill" style="width: ${progress}%"></div>
                </div>
                <div style="font-size: 0.5rem; color: rgba(230, 235, 254, 0.6); margin-top: 5px;">
                    ${progress.toFixed(1)}% Complete
                </div>
            ` : ''}
        `;

        badgesGrid.appendChild(badgeCard);
    });
}

function getBadgeIcon(level) {
    const icons = {
        0: '🌟',
        2: '🚀',
        5: '⚡',
        10: '🔥',
        25: '💎',
        50: '👑',
        100: '🏆',
        250: '🌟'
    };
    return icons[level] || '🏅';
}

function displayAchievements() {
    const badgeContainer = document.getElementById('achievement-badges');
    if (!badgeContainer) return;

    badgeContainer.innerHTML = '';

    const currentPoints = parseInt(localStorage.getItem('points')) || 0;
    const currentLevel = getLevelFromPoints(currentPoints);

    const currentBadge = achievements
        .filter(a => a.unlocked && a.level <= currentLevel)
        .sort((a, b) => b.level - a.level)[0];

    if (!currentBadge) return;

    const badge = document.createElement('div');
    badge.className = 'achievement-badge unlocked';
    badge.title = currentBadge.description;
    badge.textContent = currentBadge.name;

    badgeContainer.appendChild(badge);
}

function calculateProgress(currentLevel, requiredLevel) {
    if (currentLevel >= requiredLevel) return 100;
    if (currentLevel === 0) return 0;
    return Math.min((currentLevel / requiredLevel) * 100, 99);
}

function getLevelFromPoints(points) {
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

// --- Time-Tiered Multiplier System ---

/**
 * Returns tier info based on the task duration in minutes.
 * Easy:   1–25 min  → 1.0x
 * Medium: 26–59 min → 1.5x
 * Hard:   60+ min   → 2.0x
 */
function getTierInfo(durationMinutes) {
    if (durationMinutes >= 60) return { tier: 'Hard', multiplier: 2.0, label: '2x', emoji: '🔴', color: '#ff4d4d', cssClass: 'tier-hard' };
    if (durationMinutes >= 26) return { tier: 'Medium', multiplier: 1.5, label: '1.5x', emoji: '🟡', color: '#ffd700', cssClass: 'tier-medium' };
    return { tier: 'Easy', multiplier: 1.0, label: '1x', emoji: '🟢', color: '#4dff91', cssClass: 'tier-easy' };
}

/**
 * Calculates points for a completed task.
 * Points = floor(duration_minutes × multiplier)
 * Returns 0 for tasks with no duration (anti-spam: 0-min tasks earn nothing).
 */
function calculateTierPoints(durationMinutes) {
    if (!durationMinutes || durationMinutes <= 0) return 0;
    const { multiplier } = getTierInfo(durationMinutes);
    return Math.floor(durationMinutes * multiplier);
}

// --- Leaderboard System ---

function getLeaderboard() {
    return JSON.parse(localStorage.getItem('leaderboard')) || { easy: [], medium: [], hard: [] };
}

function saveLeaderboard(lb) {
    localStorage.setItem('leaderboard', JSON.stringify(lb));
}

/**
 * Adds a completed task entry to the correct leaderboard tier.
 * Writes to Supabase when logged in AND to localStorage as a cache/fallback.
 */
async function addLeaderboardEntry(task, points) {
    const tierInfo = getTierInfo(task.duration_minutes || 0);
    const bucketKey = tierInfo.tier.toLowerCase(); // 'easy' | 'medium' | 'hard'
    const username = currentUser?.user_metadata?.username || currentUser?.email || 'Anonymous';

    const entry = {
        id: task.id,
        title: task.title,
        username: username,
        points: points,
        duration: task.duration_minutes || 0,
        date: new Date().toISOString()
    };

    // --- Write to localStorage (always, as cache/offline fallback) ---
    const lb = getLeaderboard();
    lb[bucketKey].push(entry);
    lb[bucketKey].sort((a, b) => b.points - a.points);
    if (lb[bucketKey].length > 10) lb[bucketKey].length = 10;
    saveLeaderboard(lb);

    // --- Write to Supabase (when logged in) ---
    if (currentUser && window.supabase) {
        const { error } = await window.supabase
            .from('leaderboard')
            .insert({
                user_id: currentUser.id,
                task_id: task.id,
                task_title: task.title,
                username: username,
                points: points,
                duration_minutes: task.duration_minutes || 0,
                tier: bucketKey
            });

        if (error) {
            console.error('[PLANOS] Error writing leaderboard entry to Supabase:', error);
        } else {
            console.log(`[PLANOS] Leaderboard entry saved to Supabase: ${task.title} (${bucketKey}, ${points} pts)`);
        }
    }
}

/**
 * Renders the three-tier leaderboard in the #leaderboard-task tab.
 * Reads from Supabase when logged in (global board), falls back to localStorage.
 */
async function renderLeaderboard() {
    const tiers = [
        { key: 'easy', label: 'Easy', emoji: '🟢', color: '#4dff91' },
        { key: 'medium', label: 'Medium', emoji: '🟡', color: '#ffd700' },
        { key: 'hard', label: 'Hard', emoji: '🔴', color: '#ff4d4d' }
    ];

    // Show loading state
    tiers.forEach(({ key }) => {
        const container = document.getElementById(`leaderboard-${key}`);
        if (container) container.innerHTML = '<div class="leaderboard-empty">Loading...</div>';
    });

    if (currentUser && window.supabase) {
        // --- Read from Supabase (global leaderboard across all users) ---
        try {
            const { data, error } = await window.supabase
                .from('leaderboard')
                .select('task_title, username, points, duration_minutes, tier, created_at')
                .eq('user_id', currentUser.id)
                .order('points', { ascending: false })
                .limit(50); // fetch enough to fill all 3 tiers

            if (error) throw error;

            // Group by tier
            const grouped = { easy: [], medium: [], hard: [] };
            (data || []).forEach(row => {
                if (grouped[row.tier] && grouped[row.tier].length < 10) {
                    grouped[row.tier].push({
                        title: row.task_title,
                        username: row.username,
                        points: row.points,
                        duration: row.duration_minutes,
                        date: row.created_at
                    });
                }
            });

            _renderLeaderboardPanels(grouped, tiers);
            return;
        } catch (err) {
            console.error('[PLANOS] Error fetching leaderboard from Supabase, falling back to localStorage:', err);
        }
    }

    // --- Fallback: read from localStorage ---
    const lb = getLeaderboard();
    const localGrouped = {
        easy: lb.easy.map(e => ({ title: e.title, username: e.username, points: e.points, duration: e.duration, date: e.date })),
        medium: lb.medium.map(e => ({ title: e.title, username: e.username, points: e.points, duration: e.duration, date: e.date })),
        hard: lb.hard.map(e => ({ title: e.title, username: e.username, points: e.points, duration: e.duration, date: e.date }))
    };
    _renderLeaderboardPanels(localGrouped, tiers);
}

/** Internal helper — builds the DOM for all three leaderboard panels from normalized data. */
function _renderLeaderboardPanels(grouped, tiers) {
    tiers.forEach(({ key, label, color }) => {
        const container = document.getElementById(`leaderboard-${key}`);
        if (!container) return;

        const entries = grouped[key] || [];
        if (entries.length === 0) {
            container.innerHTML = `<div class="leaderboard-empty">No entries yet. Complete a ${label} task to appear here!</div>`;
            return;
        }

        container.innerHTML = entries.map((e, i) => {
            const rank = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
            const dateStr = new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return `
                <div class="leaderboard-entry">
                    <span class="lb-rank">${rank}</span>
                    <div class="lb-info">
                        <div class="lb-task-title">${escapeHtml(e.title)}</div>
                        <div class="lb-meta">${escapeHtml(e.username)} · ${e.duration}min · ${dateStr}</div>
                    </div>
                    <span class="lb-points" style="color:${color}">${e.points}pts</span>
                </div>
            `;
        }).join('');
    });
}

/**
 * Shows a "Power-Up" tier upgrade toast popup.
 */
function showTierUpgradeToast(tierInfo) {
    const toast = document.getElementById('tier-powerup-toast');
    if (!toast) return;

    document.getElementById('tier-toast-emoji').textContent = tierInfo.emoji;
    document.getElementById('tier-toast-label').textContent = `${tierInfo.tier} Tier Unlocked!`;
    document.getElementById('tier-toast-multiplier').textContent = `${tierInfo.label} Multiplier Active`;
    toast.style.setProperty('--tier-color', tierInfo.color);

    toast.classList.remove('show');
    void toast.offsetWidth; // reflow to restart animation
    toast.classList.add('show');

    // Play power-up sound
    playPowerUpSound();

    setTimeout(() => toast.classList.remove('show'), 3500);
}

function playPowerUpSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 E5 G5 C6
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = freq;
            osc.type = 'sine';
            const start = ctx.currentTime + i * 0.12;
            gain.gain.setValueAtTime(0.3, start);
            gain.gain.exponentialRampToValueAtTime(0.01, start + 0.25);
            osc.start(start);
            osc.stop(start + 0.25);
        });
    } catch (e) {
        // Sound is non-critical
    }
}


function checkAchievements() {
    achievements = JSON.parse(localStorage.getItem('achievements')) || achievements;
    let changed = false;

    const points = parseInt(localStorage.getItem('points')) || 0;
    const currentLevel = getLevelFromPoints(points);

    achievements.forEach(a => {
        if (!a.unlocked && a.level === currentLevel) {
            a.unlocked = true;
            changed = true;

            //Pop-Ups for level 0 & 1
            if (currentLevel >= 1) {
                showAchievementNotification(a.name, a.description);
            }
        }
    });

    if (changed) {
        localStorage.setItem('achievements', JSON.stringify(achievements));
        displayAchievements();

        // Sync achievements to Supabase if user is logged in
        if (currentUser && window.supabase) {
            const currentPoints = parseInt(localStorage.getItem('points')) || 0;
            syncProgressToSupabase(currentPoints, currentLevel);
        }
    }
}





// --- Task creation & management ---
async function createTask() {
    const titleEl = document.getElementById('task-title');
    const descEl = document.getElementById('task-description');
    const hoursEl = document.getElementById('task-hours');
    const minutesEl = document.getElementById('task-minutes');
    const categoryEl = document.getElementById('task-category');

    const title = titleEl ? titleEl.value.trim() : '';
    const description = descEl ? descEl.value.trim() : '';
    const category = categoryEl ? categoryEl.value : 'Normal';
    let hours = hoursEl ? parseInt(hoursEl.value) : 0;
    let minutes = minutesEl ? parseInt(minutesEl.value) : 0;

    hours = clampNonNegative(hours);
    minutes = clampNonNegative(minutes);

    if (!title) {
        alert('Please enter a task title');
        return;
    }

    const totalMinutes = hours * 60 + minutes;

    if (totalMinutes === 0) {
        if (!confirm('You set the task duration to 0 minutes. Continue?')) {
            return;
        }
    }

    // Clear form immediately for responsiveness
    if (titleEl) titleEl.value = '';
    if (descEl) descEl.value = '';
    if (hoursEl) hoursEl.value = '0';
    if (minutesEl) minutesEl.value = '0';
    if (categoryEl) categoryEl.value = 'Normal';

    // Await addTask so the Supabase insert + localStorage cache are both
    // settled before we switch tabs and render the updated list.
    await addTask(title, description, 'ongoing', totalMinutes, category);

    switchTab('ongoing');
}

async function addTask(title, description, requestedStatus, durationMinutes = 0, category = 'Normal') {
    const tasks = loadTasks();
    let status = requestedStatus;

    if (status === 'ongoing') {
        const hasOngoing = tasks.some(t => t.status === 'ongoing');
        if (hasOngoing) {
            status = 'pending';
            showAuthNotification('⏸️ Task Pending', 'You are currently focusing on another task. Finish it first!', 'info');
        }
    }

    // Generate UUID for Supabase compatibility
    const taskId = crypto.randomUUID();
    const newTask = {
        id: taskId,
        title: title,
        description: description,
        category: category,
        status: status,
        duration_minutes: durationMinutes,
        created_at: new Date().toISOString(),
        end_time: durationMinutes > 0 ? new Date(Date.now() + durationMinutes * 60000).toISOString() : null
    };

    // Optimistically push to localStorage so the UI is never blank
    tasks.push(newTask);
    localStorage.setItem('tasks', JSON.stringify(tasks));

    // Await the Supabase insert so localStorage is the confirmed server state
    // before updateTaskDisplay() reads it via getTasks().
    if (currentUser && window.supabase) {
        // Only send columns that exist in the DB schema:
        // - 'category' is NOT in the tasks table → omit
        // - 'created_at' has a server DEFAULT NOW() → omit to avoid conflicts
        // - 'pending' is a local-only UI state; DB CHECK only allows 'ongoing'/'finished'/'create'
        const taskToSave = {
            id:               newTask.id,
            user_id:          currentUser.id,
            title:            newTask.title,
            description:      newTask.description || null,
            status:           newTask.status === 'pending' ? 'ongoing' : newTask.status,
            duration_minutes: newTask.duration_minutes,
            end_time:         newTask.end_time || null
        };
        const { error } = await window.supabase
            .from('tasks')
            .insert(taskToSave);
        if (error) {
            console.error('[PLANOS] Error saving task to Supabase:', error);
            // Task stays in localStorage — user won't lose it locally
        }
    }

    playNotificationSound('add');
    // Await so the tab switch only happens after the list is fully painted
    await updateTaskDisplay();
}

async function markAsFinished(taskId) {
    const tasks = loadTasks();
    const taskIndex = tasks.findIndex(t => t.id === taskId);

    if (taskIndex !== -1) {
        const task = tasks[taskIndex];
        task.status = 'finished';
        task.end_time = null;
        localStorage.setItem('tasks', JSON.stringify(tasks));

        // ── Visual Juice: shake body + glow the task card ──
        triggerFinishJuice(taskId);

        // ── Award 50 points for completion ──
        const oldPoints = parseInt(localStorage.getItem('points')) || 0;
        const newPoints = oldPoints + 50;
        localStorage.setItem('points', newPoints);

        // ── Check for level-up with the NEW formula (100 * level) ──
        checkLevelUp(newPoints, oldPoints);

        // ── Check Execution Master achievement ──
        checkExecutionMasterAchievement(task);

        // ── Update UI points display & sync to Supabase ──
        updatePointsAndLevel();

        // ── Update task in Supabase if logged in (fire-and-forget — localStorage already updated) ──
        if (currentUser && window.supabase) {
            window.supabase
                .from('tasks')
                .update({ status: 'finished', end_time: null })
                .eq('id', taskId)
                .eq('user_id', currentUser.id)
                .then(({ error }) => {
                    if (error) console.error('[PLANOS] Error updating task in Supabase:', error);
                });

            // Sync new points to user_progress table
            const newLevel = Math.floor(newPoints / 100);
            syncProgressToSupabase(newPoints, newLevel);
        }

        showEarlyFinishNotification(task.title);
        playNotificationSound('complete');
        await updateTaskDisplay();
        checkNextPendingTask();

        // ── Loot Box: moved to tickTimers() — only fires on auto-complete ──
        // rollLootDrop(task);  ← intentionally disabled here
    }
}

// ─────────────────────────────────────────────
// LEVELING SYSTEM
// Formula: variable XP per level (100 → 120 → 140 → …)
// Use getLevelFromPoints() for ALL level calculations.
// ─────────────────────────────────────────────

/**
 * Compares old vs new level and shows the Level Up Modal if the player
 * crossed a level boundary.  Call after awarding points.
 * @param {number} newPoints  - total points AFTER the task was completed
 * @param {number} oldPoints  - total points BEFORE the task was completed
 */
function checkLevelUp(newPoints, oldPoints) {
    const newLevel = getLevelFromPoints(newPoints);
    const oldLevel = getLevelFromPoints(oldPoints);

    if (newLevel > oldLevel) {
        // Show modal for every level crossed (handles multi-level jumps)
        for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
            showLevelUpModal(lvl);
        }
    }
}

// ─────────────────────────────────────────────
// SINGLE-TASK FOCUS & TRANSITIONS
// ─────────────────────────────────────────────

let currentTransitionTaskId = null;

async function startPendingTask(taskId) {
    const tasks = loadTasks();
    const hasOngoing = tasks.some(t => t.status === 'ongoing');

    if (hasOngoing) {
        showAuthNotification('⏸️ Focus Required', 'You are currently focusing on another task. Finish it first!', 'warning');
        return;
    }

    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
        const task = tasks[taskIndex];
        task.status = 'ongoing';
        task.end_time = task.duration_minutes > 0 ? new Date(Date.now() + task.duration_minutes * 60000).toISOString() : null;
        localStorage.setItem('tasks', JSON.stringify(tasks));

        if (currentUser && window.supabase) {
            window.supabase.from('tasks')
                .update({ status: 'ongoing', end_time: task.end_time })
                .eq('id', taskId)
                .eq('user_id', currentUser.id)
                .then(({ error }) => {
                    if (error) console.error('[PLANOS] Error starting pending task in Supabase:', error);
                });
        }

        playNotificationSound('add');
        await updateTaskDisplay();

        // Auto-play music if loaded
        if (audio && audio.src && audio.paused) {
            audio.play().catch(() => {});
            isPlaying = true;
            const playBtn = document.getElementById('play-pause-btn');
            if (playBtn) playBtn.textContent = '⏸';
        }
    }
}

function checkNextPendingTask() {
    const tasks = loadTasks();
    const nextTask = tasks.find(t => t.status === 'pending');

    if (nextTask) {
        currentTransitionTaskId = nextTask.id;
        document.getElementById('transition-next-task-name').textContent = nextTask.title;
        document.getElementById('transition-modal').style.display = 'flex';
    }
}

function acceptTransition() {
    document.getElementById('transition-modal').style.display = 'none';
    if (currentTransitionTaskId) {
        startPendingTask(currentTransitionTaskId);
        currentTransitionTaskId = null;
    }
}

function declineTransition() {
    document.getElementById('transition-modal').style.display = 'none';
    currentTransitionTaskId = null;
}

/** Opens the pixel-art Level Up Modal and populates it with the new level number. */
function showLevelUpModal(level) {
    const modal = document.getElementById('levelup-modal');
    const numEl = document.getElementById('levelup-number');
    const msgEl = document.getElementById('levelup-message');
    const badgeEl = document.getElementById('levelup-badge');

    if (!modal) return;

    // ── Level number ──
    if (numEl) numEl.textContent = level;

    // ── Badge label: show rank icon + "LV" ──
    if (badgeEl) {
        const rankIcons = [
            { threshold: 0, icon: '🌱' },
            { threshold: 2, icon: '⚔️' },
            { threshold: 5, icon: '🛡️' },
            { threshold: 10, icon: '🏹' },
            { threshold: 25, icon: '🔥' },
            { threshold: 50, icon: '💎' },
            { threshold: 100, icon: '👑' },
        ];
        let icon = rankIcons[0].icon;
        for (const r of rankIcons) { if (level >= r.threshold) icon = r.icon; }
        badgeEl.textContent = `${icon} LV`;
    }

    // ── Flavour message ──
    if (msgEl) msgEl.textContent = getLevelUpFlavourText(level);

    // ── Dynamic XP note: how much XP is needed for the NEXT level ──
    const noteEl = modal.querySelector('.levelup-xp-note');
    if (noteEl) {
        // Calculate XP required for next level from current level
        let total = 0, req = 100;
        for (let i = 0; i < level; i++) { total += req; req += 20; }
        // req is now the XP needed for level → level+1
        noteEl.innerHTML =
            `Next level needs <strong>${req}</strong> XP<br>Keep completing tasks!`;
    }

    modal.classList.add('show');
    playLevelUpSound();
}

/** Closes the Level Up Modal. */
function closeLevelUpModal() {
    const modal = document.getElementById('levelup-modal');
    if (modal) modal.classList.remove('show');
}

/** Returns retro flavour text based on the new level. */
function getLevelUpFlavourText(level) {
    if (level === 1) return 'First level cleared!';
    if (level === 2) return 'Getting started...';
    if (level < 5) return 'Apprentice rising!';
    if (level === 5) return 'Task Handler!';
    if (level < 10) return 'Building momentum...';
    if (level === 10) return 'Consistency Builder!';
    if (level < 25) return 'On a roll! Keep going!';
    if (level === 25) return 'Productivity Mindset!';
    if (level < 50) return 'Unstoppable force!';
    if (level === 50) return 'Workflow Architect!';
    if (level < 100) return 'Elite Planner status!';
    if (level === 100) return 'EXECUTION MASTER! 👑';
    return `Level ${level} — Legendary!`;
}


/** Plays a short ascending chime for the level-up event. */
function playLevelUpSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        // C5  E5  G5  C6  E6 — triumphant arpeggio
        [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;
            const t = ctx.currentTime + i * 0.1;
            gain.gain.setValueAtTime(0.35, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
            osc.start(t);
            osc.stop(t + 0.3);
        });
    } catch (_) { /* non-critical */ }
}

// ─────────────────────────────────────────────
// EXECUTION MASTER ACHIEVEMENT
// Unlocked when the user completes 5 Urgent tasks.
// Progress is stored in user_stats (localStorage)
// and synced to Supabase user_progress metadata.
// ─────────────────────────────────────────────

/** Called on every task completion.  If the task is Urgent, increments the
 *  counter and fires the modal once the threshold is reached. */
function checkExecutionMasterAchievement(task) {
    if (!task || task.category !== 'Urgent') return;

    // Read / initialise user_stats from localStorage
    const stats = getUserStats();

    // Skip if badge already earned
    if (stats.execution_master_unlocked) return;

    stats.urgent_completed = (stats.urgent_completed || 0) + 1;
    saveUserStats(stats);

    console.log(`[PLANOS] Urgent tasks completed: ${stats.urgent_completed} / 5`);

    if (stats.urgent_completed >= 5) {
        stats.execution_master_unlocked = true;
        saveUserStats(stats);
        showExecutionMasterModal();
        syncExecutionMasterToSupabase(stats);
    }
}

/** Returns the user_stats object from localStorage (creates it if absent). */
function getUserStats() {
    try {
        return JSON.parse(localStorage.getItem('user_stats')) || {};
    } catch (_) {
        return {};
    }
}

/** Persists the user_stats object to localStorage. */
function saveUserStats(stats) {
    localStorage.setItem('user_stats', JSON.stringify(stats));
}

/** Shows the Execution Master achievement modal. */
function showExecutionMasterModal() {
    const modal = document.getElementById('execution-master-modal');
    if (modal) modal.classList.add('show');
    playLevelUpSound(); // reuse the triumphant sound
}

/** Closes the Execution Master modal. */
function closeExecutionMasterModal() {
    const modal = document.getElementById('execution-master-modal');
    if (modal) modal.classList.remove('show');
}

/**
 * Placeholder: syncs the Execution Master unlock to the user_progress table.
 * Extend this when the column is added to the Supabase schema.
 */
function syncExecutionMasterToSupabase(stats) {
    if (!currentUser || !window.supabase) return;

    // Placeholder sync — stores stats as metadata in user_progress.
    // Add an `achievements_meta` (JSONB) column to user_progress for full support.
    window.supabase
        .from('user_progress')
        .update({ achievements_meta: stats })
        .eq('user_id', currentUser.id)
        .then(({ error }) => {
            if (error) {
                console.warn('[PLANOS] Could not sync Execution Master to Supabase (column may not exist yet):', error.message);
            } else {
                console.log('[PLANOS] Execution Master synced to Supabase.');
            }
        });
}

// ─────────────────────────────────────────────
// JUICE HELPERS
// ─────────────────────────────────────────────

/**
 * Shakes the body and applies a green glow to the finishing task card.
 * The glow targets the card in the current DOM (before updateTaskDisplay
 * re-renders it).
 */
function triggerFinishJuice(taskId) {
    // Shake body
    document.body.classList.remove('shake-active');
    // Force reflow so the animation restarts cleanly even if called twice quickly
    void document.body.offsetWidth;
    document.body.classList.add('shake-active');
    document.body.addEventListener('animationend', () => {
        document.body.classList.remove('shake-active');
    }, { once: true });

    // Glow on the task card
    const card = document.querySelector(`.task-item[data-task-id="${taskId}"]`);
    if (card) {
        card.classList.remove('task-glow');
        void card.offsetWidth;
        card.classList.add('task-glow');
        card.addEventListener('animationend', () => card.classList.remove('task-glow'), { once: true });
    }
}

/** Notification shown when a task timer naturally expires with full tier points. */
function showTimerCompleteNotification(taskTitle, pointLine) {
    const modal = document.getElementById('notification-modal');
    const titleEl = document.getElementById('notification-title');
    const textEl = document.getElementById('notification-text');
    if (titleEl) titleEl.textContent = '⏰ Task Complete!';
    if (textEl) textEl.innerHTML = `<strong>${escapeHtml(taskTitle)}</strong><br><span class="notif-points">${escapeHtml(pointLine)}</span>`;
    if (modal) modal.classList.add('show');
    playNotificationSound('complete');
    document.body.style.animation = 'none';
    void document.body.offsetWidth;
    document.body.style.animation = 'pulse 0.5s';
}

/** Notification shown when user manually finishes a task (no points awarded). */
function showEarlyFinishNotification(taskTitle) {
    const modal = document.getElementById('notification-modal');
    const titleEl = document.getElementById('notification-title');
    const textEl = document.getElementById('notification-text');
    if (titleEl) titleEl.textContent = '✅ Task Finished Early';
    if (textEl) textEl.innerHTML = `<strong>${escapeHtml(taskTitle)}</strong><br><span class="notif-no-points">No points — let the timer run to earn tier points!</span>`;
    if (modal) modal.classList.add('show');
}

async function deleteTask(taskId) {
    const tasks = loadTasks();
    const filtered = tasks.filter(t => t.id !== taskId);
    localStorage.setItem('tasks', JSON.stringify(filtered));

    // Also delete from Supabase if user is logged in
    if (currentUser && window.supabase) {
        window.supabase
            .from('tasks')
            .delete()
            .eq('id', taskId)
            .eq('user_id', currentUser.id)
            .then(({ error }) => {
                if (error) {
                    console.error('[PLANOS] Error deleting task from Supabase:', error);
                }
            });
    }

    await updateTaskDisplay();
}

// --- UI rendering ---
// Async: always awaits getTasks() which is the single unified data source
// (Supabase when logged in, localStorage when not).
async function updateTaskDisplay() {
    const tasks = await getTasks();

    // Prefer the <ul> directly; fall back to the tab container
    const ongoingContainer = document.getElementById('ongoing-tasks') || document.getElementById('ongoing-task');
    const finishedContainer = document.getElementById('finished-tasks') || document.getElementById('finished-task');

    const ongoingTasks = tasks.filter(task => task.status === 'ongoing' || task.status === 'pending');
    const finishedTasks = tasks.filter(task => task.status === 'finished');

    if (ongoingContainer) {
        ongoingContainer.innerHTML = ongoingTasks.length > 0
            ? ''
            : '<li class="empty-state">No ongoing or pending tasks yet</li>';
        ongoingTasks.forEach(task => ongoingContainer.appendChild(createTaskElement(task)));
    }

    if (finishedContainer) {
        finishedContainer.innerHTML = finishedTasks.length > 0
            ? ''
            : '<li class="empty-state">No finished tasks yet</li>';
        finishedTasks.forEach(task => finishedContainer.appendChild(createTaskElement(task)));
    }

    updateTimerDisplays();
}

function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = 'task-item';
    li.dataset.taskId = task.id;

    let timerDisplay = '';
    let tierHud = '';

    if (task.status === 'ongoing' && task.end_time && task.duration_minutes > 0) {
        const tierInfo = getTierInfo(task.duration_minutes);
        const potentialPoints = calculateTierPoints(task.duration_minutes);

        tierHud = `
            <div class="tier-hud ${tierInfo.cssClass}" data-duration="${task.duration_minutes}" data-task-id="${task.id}">
                <span class="tier-hud-badge">${tierInfo.emoji} <strong>${tierInfo.label}</strong></span>
                <span class="tier-hud-tier">${tierInfo.tier} Tier</span>
                <span class="tier-hud-pts">= ${potentialPoints} pts if completed</span>
            </div>`;

        timerDisplay = `<div class="task-timer" data-end-time="${task.end_time}" data-duration-minutes="${task.duration_minutes}">
            <span class="timer-label">⏱️ Time remaining:</span>
            <span class="timer-display">Calculating...</span>
        </div>`;
    } else if (task.status === 'ongoing' && task.end_time) {
        timerDisplay = `<div class="task-timer" data-end-time="${task.end_time}" data-duration-minutes="0">
            <span class="timer-label">⏱️ Time remaining:</span>
            <span class="timer-display">Calculating...</span>
        </div>`;
    }

    // For finished tasks, show points earned badge if available
    let finishedBadge = '';
    if (task.status === 'finished' && task.duration_minutes > 0) {
        const tierInfo = getTierInfo(task.duration_minutes);
        const pts = calculateTierPoints(task.duration_minutes);
        finishedBadge = `<span class="tier-finished-badge ${tierInfo.cssClass}">${tierInfo.emoji} ${tierInfo.tier} · ${pts} pts</span>`;
    }

    // Category badge
    const cat = task.category || 'Normal';
    const catClass = cat === 'Urgent' ? 'urgent' : cat === 'Low Priority' ? 'low' : 'normal';
    const catLabel = cat === 'Urgent' ? '🔥 URGENT' : cat === 'Low Priority' ? '🔵 LOW' : '⚪ NORMAL';
    const categoryBadge = `<span class="task-category-badge ${catClass}">${catLabel}</span>`;

    li.innerHTML = `
        <div class="task-header">
            <span class="task-title">${escapeHtml(task.title)}</span>
            ${categoryBadge}
            ${finishedBadge}
        </div>
        <div class="task-description">${escapeHtml(task.description || 'No description')}</div>
        ${tierHud}
        ${timerDisplay}
        <div class="task-actions">
            ${task.status === 'ongoing'
            ? `<button class="btn-small btn-success" onclick="markAsFinished('${task.id}')">Finish Early</button>
               <button class="btn-small btn-danger" onclick="deleteTask('${task.id}')">Delete</button>`
            : task.status === 'pending'
                ? `<button class="btn-small btn-success" onclick="startPendingTask('${task.id}')">▶ Start Focus</button>
               <button class="btn-small btn-danger" onclick="deleteTask('${task.id}')">Delete</button>`
                : `<button class="btn-small btn-secondary" onclick="deleteTask('${task.id}')">Delete</button>`}
        </div>
        ${task.status === 'ongoing' && task.end_time ? '<div class="no-points-hint">💡 Let the timer run to earn tier points</div>' : ''}
    `;
    return li;
}

// Tracks which tasks have already triggered tier-upgrade popups this session
const _tierUpgradeShown = new Set();

function updateTimerDisplays() {
    const timers = document.querySelectorAll('.timer-display');
    const now = Date.now();
    timers.forEach(timer => {
        const timerContainer = timer.closest('.task-timer');
        if (!timerContainer) return;
        const endTimeAttr = timerContainer.dataset.endTime;
        const totalDuration = parseInt(timerContainer.dataset.durationMinutes) || 0;
        if (!endTimeAttr) {
            timer.textContent = '—';
            return;
        }
        const endTime = new Date(endTimeAttr).getTime();
        if (isNaN(endTime)) {
            timer.textContent = '—';
            return;
        }
        const remaining = endTime - now;
        if (remaining > 0) {
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
            timer.textContent = hours > 0 ? `${hours}h ${minutes}m ${seconds}s` :
                minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
            timer.style.color = 'rgba(254, 220, 255, 1)';

            // --- Live tier HUD upgrade detection ---
            if (totalDuration > 0) {
                const elapsedMinutes = totalDuration - (remaining / 60000);
                const taskId = timerContainer.closest('.task-item')?.dataset.taskId;
                const tierHud = taskId ? document.querySelector(`.tier-hud[data-task-id="${taskId}"]`) : null;

                if (tierHud) {
                    const currentTier = getTierInfo(elapsedMinutes);
                    const originalTier = getTierInfo(totalDuration);

                    // Animate upgrade: when elapsed crosses a threshold the original tier doesn't cover
                    // (i.e. original was Easy, now we've elapsed into Medium or Hard territory)
                    const upgradeKey26 = `${taskId}-medium`;
                    const upgradeKey60 = `${taskId}-hard`;

                    if (elapsedMinutes >= 60 && !_tierUpgradeShown.has(upgradeKey60)) {
                        _tierUpgradeShown.add(upgradeKey60);
                        const hardTier = getTierInfo(61);
                        animateTierHud(tierHud, hardTier);
                        showTierUpgradeToast(hardTier);
                    } else if (elapsedMinutes >= 26 && !_tierUpgradeShown.has(upgradeKey26)) {
                        _tierUpgradeShown.add(upgradeKey26);
                        const medTier = getTierInfo(30);
                        animateTierHud(tierHud, medTier);
                        showTierUpgradeToast(medTier);
                    }
                }
            }
        } else {
            timer.textContent = 'Completing...';
            timer.style.color = 'rgba(220, 53, 69, 1)';
        }
    });
}

/** Updates the visual state of a tier-hud badge and fires the glow animation. */
function animateTierHud(tierHud, tierInfo) {
    tierHud.className = `tier-hud ${tierInfo.cssClass} tier-upgrade-anim`;
    const badge = tierHud.querySelector('.tier-hud-badge');
    const tierLabel = tierHud.querySelector('.tier-hud-tier');
    const ptsLabel = tierHud.querySelector('.tier-hud-pts');
    const taskId = tierHud.dataset.taskId;
    const duration = parseInt(tierHud.dataset.duration) || 0;

    if (badge) badge.innerHTML = `${tierInfo.emoji} <strong>${tierInfo.label}</strong>`;
    if (tierLabel) tierLabel.textContent = `${tierInfo.tier} Tier`;
    if (ptsLabel) ptsLabel.textContent = `= ${calculateTierPoints(duration)} pts if completed`;

    // Remove animation class after it finishes so it can replay next time
    setTimeout(() => tierHud.classList.remove('tier-upgrade-anim'), 1500);
}

// --- Points & Level UI ---
function updatePointsAndLevel() {
    const points = parseInt(localStorage.getItem('points')) || 0;
    ensurePointsDisplayExists();

    const pointsDisplay = document.getElementById('pointsDisplay');
    const levelDisplay = document.getElementById('level-display');
    const levelTitle = document.getElementById('level-title');
    const progressBar = document.getElementById('level-progress');
    const ringCircle = document.getElementById('ring-xp-circle');
    const rankIcon = document.getElementById('level-rank-icon');

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

    // ── Number & title ──
    if (levelDisplay) levelDisplay.textContent = level;

    if (levelTitle) {
        if (level === 0 || level === 1) {
            levelTitle.textContent = 'Newbie';
        } else if (level === 2) {
            levelTitle.textContent = 'Getting Started';
        } else if (level < 5) {
            levelTitle.textContent = 'Apprentice';
        } else if (level < 10) {
            levelTitle.textContent = 'Task Handler';
        } else if (level < 25) {
            levelTitle.textContent = 'Consistency Builder';
        } else if (level < 50) {
            levelTitle.textContent = 'Productivity Mindset';
        } else if (level < 100) {
            levelTitle.textContent = 'Workflow Architect';
        } else {
            levelTitle.textContent = 'Execution Master';
        }
    }

    // ── Rank icon based on level ──
    if (rankIcon) {
        const rankIcons = [
            { threshold: 0, icon: '🌱' },
            { threshold: 2, icon: '⚔️' },
            { threshold: 5, icon: '🛡️' },
            { threshold: 10, icon: '🏹' },
            { threshold: 25, icon: '🔥' },
            { threshold: 50, icon: '💎' },
            { threshold: 100, icon: '👑' },
        ];
        let chosenIcon = rankIcons[0].icon;
        for (const r of rankIcons) {
            if (level >= r.threshold) chosenIcon = r.icon;
        }
        rankIcon.textContent = chosenIcon;
    }

    // ── Flat XP progress bar ──
    if (progressBar) progressBar.style.width = `${progressPercent}%`;

    // ── SVG ring ──
    if (ringCircle) {
        // Ensure the gradient <defs> block exists inside the SVG
        const svg = ringCircle.closest('svg');
        if (svg && !svg.querySelector('#xpGrad')) {
            const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            defs.innerHTML = `
                <linearGradient id="xpGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%"   stop-color="#6d28d9"/>
                    <stop offset="50%"  stop-color="#a78bfa"/>
                    <stop offset="100%" stop-color="#38bdf8"/>
                </linearGradient>`;
            svg.insertBefore(defs, svg.firstChild);
        }
        const circumference = 213.63; // 2 * π * 34
        const offset = circumference - (progressPercent / 100) * circumference;
        ringCircle.style.strokeDashoffset = offset;
    }

    // ── XP numbers display ──
    if (pointsDisplay) {
        pointsDisplay.textContent = `${currentXP} / ${required}`;
    }

    // Sync with Supabase if user is logged in
    if (currentUser && window.supabase) {
        syncProgressToSupabase(points, level);
    }

    // Check for new achievements
    checkAchievements();
}

function syncProgressToSupabase(points, level) {
    if (!currentUser) return;

    window.supabase
        .from('user_progress')
        .upsert({
            user_id: currentUser.id,
            points: points,
            level: level,
            achievements: JSON.parse(localStorage.getItem('achievements')) || []
        }, {
            onConflict: 'user_id' // Specify the conflict column
        })
        .then(({ error }) => {
            if (error) {
                console.error('[PLANOS] Error syncing progress to Supabase:', error);
                // Try update as fallback
                window.supabase
                    .from('user_progress')
                    .update({
                        points: points,
                        level: level,
                        achievements: JSON.parse(localStorage.getItem('achievements')) || []
                    })
                    .eq('user_id', currentUser.id)
                    .then(({ error: updateError }) => {
                        if (updateError) {
                            console.error('[PLANOS] Error updating progress to Supabase:', updateError);
                        } else {
                            console.log('[PLANOS] Progress updated to Supabase:', { points, level });
                        }
                    });
            } else {
                console.log('[PLANOS] Progress synced to Supabase:', { points, level });
            }
        });
}

// --- Helpers ---
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// --- Audio player ---
function togglePlayPause() {
    if (!audio) {
        audio = document.getElementById('audio-player');
        if (!audio) return;
        setupAudioPlayer();
        loadTrack(currentTrackIndex);
    }

    if (audio.paused) {
        audio.play().catch(() => { });
        isPlaying = true;
        document.getElementById('play-pause-btn').textContent = '⏸';
    } else {
        audio.pause();
        isPlaying = false;
        document.getElementById('play-pause-btn').textContent = '▶';
    }
}

function selectTrack(index) {
    currentTrackIndex = parseInt(index);
    loadTrack(currentTrackIndex);
    if (isPlaying) {
        audio.play();
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

// Handle click on minimized container to restore
document.addEventListener('DOMContentLoaded', function () {
    console.log('[PLANOS] DOMContentLoaded — init starting');

    createAnimatedBackground();
    ensurePointsDisplayExists();
    updatePointsAndLevel();
    displayAchievements();
    updateTaskDisplay();
    displayPlans();
    restoreSavedTheme();
    renderInventory();
    applyPremiumGating();
    updatePricingUI();

    audio = document.getElementById('audio-player');
    if (audio) {
        setupAudioPlayer();
        loadTrack(currentTrackIndex);
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.addEventListener('click', function (e) {
                const width = this.offsetWidth;
                const clickX = e.offsetX;
                const duration = audio.duration || 0;
                if (duration > 0) audio.currentTime = (clickX / width) * duration;
            });
        }
    }

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

    // Past-date validation listeners for Plan Maker
    const planDateEl = document.getElementById('plan-date');
    const planTimeEl = document.getElementById('plan-time');
    if (planDateEl) planDateEl.addEventListener('change', validatePlanDateTime);
    if (planTimeEl) planTimeEl.addEventListener('change', validatePlanDateTime);

    if (timerTickInterval) clearInterval(timerTickInterval);
    timerTickInterval = setInterval(tickTimers, 1000);
    console.log('[PLANOS] tickTimers interval started');

    tickTimers();

    // Initialize authentication
    initializeAuth();

    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }
});

function nextTrack(autoPlay = false) {
    currentTrackIndex = (currentTrackIndex + 1) % allTracks.length;
    loadTrack(currentTrackIndex);
    // Auto-play if requested or if currently playing
    if (autoPlay || isPlaying) {
        audio.play().catch(() => { });
        isPlaying = true;
        document.getElementById('play-pause-btn').textContent = '⏸';
    }
}

function prevTrack() {
    currentTrackIndex =
        (currentTrackIndex - 1 + allTracks.length) % allTracks.length;
    loadTrack(currentTrackIndex);
    // Auto-play if currently playing
    if (isPlaying) {
        audio.play().catch(() => { });
        isPlaying = true;
        document.getElementById('play-pause-btn').textContent = '⏸';
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

        // Automatically play next track when current track ends
        nextTrack(true);
    });
}

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

function showPlanNotification(title, message = '') {
    console.log('[PLANOS] showPlanNotification called:', title, message);

    // Use existing notification modal system
    const modal = document.getElementById('notification-modal');
    const text = document.getElementById('notification-text');

    if (text) {
        text.textContent = title;
    }

    if (modal) {
        modal.classList.add('show');

        // Add plan-specific styling
        if (!modal.classList.contains('plan-notification')) {
            modal.classList.add('plan-notification');
        }
    }

    playNotificationSound();

    // Browser notification for plans
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(`PLANOS - ${title}`, {
            body: message,
            icon: "data:image/x-icon;base64,AAABAAEAEBAAAAAAAABoBQAAFgAAACg...", // Your favicon
            requireInteraction: true
        });
    }

    // Body animation
    document.body.style.animation = 'none';
    void document.body.offsetWidth;
}

// --- Planning System ---

/**
 * Validates that the selected plan date+time is in the future.
 * Returns true if valid (future), false if in the past.
 * Updates the UI error message and disables/enables the Create Plan button.
 */
function validatePlanDateTime() {
    const dateEl = document.getElementById('plan-date');
    const timeEl = document.getElementById('plan-time');
    const errorEl = document.getElementById('plan-date-error');
    const btnEl = document.getElementById('create-plan-btn');

    if (!dateEl || !dateEl.value) {
        if (errorEl) errorEl.style.display = 'none';
        if (btnEl) btnEl.disabled = false;
        return true; // no date chosen yet — don't block
    }

    // Build a Date using the selected date + time (default to 00:00 if no time)
    const timeStr = (timeEl && timeEl.value) ? timeEl.value : '00:00';
    const selectedDateTime = new Date(`${dateEl.value}T${timeStr}`);
    const now = new Date();

    // Floor comparison to the minute (ignore seconds)
    const nowMinute = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
    const isPast = selectedDateTime < nowMinute;

    if (errorEl) errorEl.style.display = isPast ? 'block' : 'none';
    if (btnEl) btnEl.disabled = isPast;

    return !isPast;
}

function createPlan() {
    const titleEl = document.getElementById('plan-title');
    const descEl = document.getElementById('plan-description');
    const dateEl = document.getElementById('plan-date');
    const timeEl = document.getElementById('plan-time');

    if (!titleEl || !descEl || !dateEl || !timeEl) return;

    const title = titleEl.value.trim();
    const description = descEl.value.trim();
    const date = dateEl.value;
    const time = timeEl.value;

    if (!title || !date) {
        showNotification('Please enter a title and select a date', '', false);
        return;
    }

    // --- Past-date guard ---
    if (!validatePlanDateTime()) {
        // Error message already shown by validatePlanDateTime()
        return;
    }

    const allPlans = JSON.parse(localStorage.getItem('plans')) || [];
    const newPlan = {
        id: crypto.randomUUID(),
        title: title,
        description: description,
        date: date,
        time: time,
        created_at: new Date().toISOString()
    };

    allPlans.push(newPlan);
    localStorage.setItem('plans', JSON.stringify(allPlans));

    // Clear form
    titleEl.value = '';
    descEl.value = '';
    dateEl.value = '';
    timeEl.value = '';

    // Set reminder
    if (date && time) {
        setPlanReminder(newPlan);
    }

    displayPlans();
    showPlanNotification('Plan created successfully!', '', false);
    playNotificationSound('add');

    // Update notification badge
    const updatedPlans = JSON.parse(localStorage.getItem('plans')) || [];
    updatePlanNotificationBadge(updatedPlans);
}

function clearPlans() {
    if (confirm('Are you sure you want to clear all plans?')) {
        localStorage.removeItem('plans');
        displayPlans();
        showNotification('All plans cleared');
        playNotificationSound('delete');
    }
}

function displayPlans() {
    const plansGrid = document.getElementById('plans-grid');
    if (!plansGrid) return;

    const allPlans = JSON.parse(localStorage.getItem('plans')) || [];
    plansGrid.innerHTML = '';

    // Update notification badge
    updatePlanNotificationBadge(allPlans);

    if (allPlans.length === 0) {
        plansGrid.innerHTML = '<div class="empty-state">No plans yet. Create your first plan!</div>';
        return;
    }

    // Sort plans by date
    allPlans.sort((a, b) => new Date(a.date) - new Date(b.date));

    allPlans.forEach(plan => {
        const planCard = createPlanCard(plan);
        plansGrid.appendChild(planCard);
    });
}

function updatePlanNotificationBadge(allPlans) {
    const badgeCount = document.getElementById('plan-badge-count');
    const notificationCount = document.getElementById('plan-notification-count');
    if (!badgeCount || !notificationCount) return;

    const now = new Date();
    const activePlans = allPlans.filter(plan => {
        if (!plan.date) return false;
        const planDate = new Date(plan.date);
        return planDate >= now;
    });

    // Count today's plans for separate notification
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayPlans = allPlans.filter(plan => {
        if (!plan.date) return false;
        const planDate = new Date(plan.date);
        return planDate >= today && planDate < tomorrow;
    });

    badgeCount.textContent = activePlans.length;
    notificationCount.textContent = todayPlans.length;
}

function createPlanCard(plan) {
    const card = document.createElement('div');
    card.className = 'plan-card';
    card.innerHTML = `
        <div class="plan-date">${formatDate(plan.date)}</div>
        <div class="plan-title">${escapeHtml(plan.title)}</div>
        <div class="plan-description">${escapeHtml(plan.description || 'No description')}</div>
        ${plan.time ? `<div class="plan-time">⏰ ${plan.time}</div>` : ''}
        <div class="plan-actions">
            <button onclick="deletePlan('${plan.id}')" class="btn-small btn-danger">Delete</button>
        </div>
    `;
    return card;
}

function deletePlan(planId) {
    if (confirm('Are you sure you want to delete this plan?')) {
        const allPlans = JSON.parse(localStorage.getItem('plans')) || [];
        const filtered = allPlans.filter(p => p.id !== planId);
        localStorage.setItem('plans', JSON.stringify(filtered));
        displayPlans();
        showPlanNotification('Plan deleted', '', false);
        playNotificationSound('delete');
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function setPlanReminder(plan) {
    const reminderDate = new Date(plan.date + 'T' + plan.time);
    const now = new Date();

    // Only set reminder if it's in the future
    if (reminderDate > now) {
        const timeUntilReminder = reminderDate - now;

        // Check if reminder is within 24 hours
        if (timeUntilReminder <= 24 * 60 * 60 * 1000) {
            setTimeout(() => {
                showPlanNotification(`📅 Plan Reminder: ${plan.title}`, `Don't forget: ${plan.description}`);
                playNotificationSound('notification');
            }, timeUntilReminder);
        }
    }
}

// Check for due plans periodically
setInterval(checkPlanReminders, 60000); // Check every minute

function checkPlanReminders() {
    const allPlans = JSON.parse(localStorage.getItem('plans')) || [];
    const now = new Date();

    allPlans.forEach(plan => {
        if (plan.date && plan.time) {
            const reminderDateTime = new Date(plan.date + 'T' + plan.time);
            const timeUntilReminder = reminderDateTime - now;

            // Check if reminder is due in the next minute
            if (timeUntilReminder > 0 && timeUntilReminder <= 60000) {
                showPlanNotification(`📅 Plan Due: ${plan.title}`, `Time for: ${plan.description}`);
                playNotificationSound('notification');
            }
        }
    });
}

// Export functions
window.PLANOS = {
    createTask,
    markAsFinished,
    deleteTask,
    switchTab,
    togglePlayPause,
    nextTrack,
    prevTrack,
    toggleAudioPlayer,
    createPlan,
    clearPlans,
    deletePlan,
    selectTrack,
    renderLeaderboard,
    getTierInfo,
    calculateTierPoints
};
// Expose necessary functions globally
window.openLootBox = openLootBox;
window.closeLootBurstOverlay = closeLootBurstOverlay;
window.equipTheme = equipTheme;
window.toggleInventoryPanel = toggleInventoryPanel;

// ============================================================
// PLANOS — LOOT BOX SYSTEM
// 20% drop chance on task completion.
// Three cosmetic themes: Cyberpunk, Matrix, Gold.
// Themes persist in localStorage + sync to Supabase.
// ============================================================

const LOOT_THEMES = [
    {
        id: 'cyberpunk',
        name: 'Cyberpunk',
        desc: 'Neon Pink activated!',
        icon: '🌸',
        rarity: 'Epic',
        cssClass: 'theme-cyberpunk'
    },
    {
        id: 'matrix',
        name: 'Matrix',
        desc: 'Lime Green activated!',
        icon: '💚',
        rarity: 'Rare',
        cssClass: 'theme-matrix'
    },
    {
        id: 'gold',
        name: 'Gold',
        desc: 'Golden Aura activated!',
        icon: '✨',
        rarity: 'Legendary',
        cssClass: 'theme-gold'
    }
];

/** Pre-rolled theme waiting for the player to click the chest. */
let _pendingLootTheme = null;

// ─── Drop Logic ───────────────────────────────────────────────

/**
 * Returns a random theme the player has NOT yet unlocked,
 * or null if they own everything.
 */
function getLockedTheme() {
    const inventory = getLootInventory();
    const locked = LOOT_THEMES.filter(t => !inventory.themes.includes(t.id));
    if (locked.length === 0) return null;
    return locked[Math.floor(Math.random() * locked.length)];
}

/**
 * Called from tickTimers() on auto-complete ONLY (not manual finish).
 * Rules:
 *   - Task must have been created with >= 1 minute duration.
 *   - Elite users bypass — they already own all themes.
 *   - Free: 20% chance | Pro: 35% chance | Elite: skip.
 * @param {object} task  The completed task object.
 */
function rollLootDrop(task) {
    // Gate 1: task must be a timed task (>= 1 minute)
    if (!task || (task.duration_minutes || 0) < 1) return;

    // Gate 2: Elite users skip lootbox — they already own everything
    if (userTier === 'Elite') return;

    // Gate 3: must have at least one theme still locked
    const lockedTheme = getLockedTheme();
    if (!lockedTheme) {
        console.log('[PLANOS] All themes unlocked — no loot drop possible.');
        return;
    }

    // Gate 3: tier-aware drop chance
    const dropChance = userTier === 'Pro' ? 0.35 : 0.20; // Elite bypassed above
    if (Math.random() < dropChance) {
        _pendingLootTheme = lockedTheme;
        showLootDropWidget();
    }
}

// ─── Widget (floating chest) ───────────────────────────────────

function showLootDropWidget() {
    const widget = document.getElementById('lootbox-widget');
    if (!widget) return;

    widget.classList.remove('lootbox-hidden', 'lootbox-opening');
    // Re-trigger animation even if called again quickly
    void widget.offsetWidth;
    widget.classList.add('lootbox-visible');
}

function openLootBox() {
    const widget = document.getElementById('lootbox-widget');
    if (!widget || !_pendingLootTheme) return;

    // Prevent double-open
    widget.onclick = null;

    // Shake animation
    widget.classList.add('lootbox-opening');

    // After shake completes → burst + award
    setTimeout(() => {
        widget.classList.remove('lootbox-visible', 'lootbox-opening');
        widget.classList.add('lootbox-hidden');
        // Restore click handler for next drop
        widget.onclick = openLootBox;

        showLootBurstOverlay(_pendingLootTheme);
        awardTheme(_pendingLootTheme);
        _pendingLootTheme = null;
    }, 800);
}

// ─── Burst Overlay ────────────────────────────────────────────

function showLootBurstOverlay(theme) {
    const overlay = document.getElementById('lootbox-burst');
    const nameEl = document.getElementById('burst-reward-name');
    const descEl = document.getElementById('burst-reward-desc');
    const iconEl = document.getElementById('burst-reward-icon');
    const particlesEl = document.getElementById('burst-particles');

    if (!overlay) return;

    if (nameEl) nameEl.textContent = theme.name + ' Theme';
    if (descEl) descEl.textContent = theme.desc;
    if (iconEl) iconEl.textContent = theme.icon;

    // Generate particles
    if (particlesEl) {
        particlesEl.innerHTML = '';
        for (let i = 0; i < 22; i++) {
            const p = document.createElement('div');
            p.className = 'burst-particle';
            const angle = (i / 22) * 360;
            const distance = 70 + Math.random() * 100;
            p.style.setProperty('--angle', angle + 'deg');
            p.style.setProperty('--distance', distance + 'px');
            p.style.animationDelay = (Math.random() * 0.15) + 's';
            particlesEl.appendChild(p);
        }
    }

    overlay.classList.add('show');

    // Play a celebratory sound
    playLootSound();

    // Auto-dismiss after 3.5 seconds
    setTimeout(() => closeLootBurstOverlay(), 3500);
}

function closeLootBurstOverlay() {
    const overlay = document.getElementById('lootbox-burst');
    if (overlay) overlay.classList.remove('show');
}

function playLootSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        // Bouncy major chord arpeggio
        [659.25, 783.99, 1046.5, 1318.51].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;
            const t = ctx.currentTime + i * 0.08;
            gain.gain.setValueAtTime(0.3, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
            osc.start(t);
            osc.stop(t + 0.4);
        });
    } catch (_) { /* non-critical */ }
}

// ─── Theme Application ────────────────────────────────────────

/**
 * Awards the theme, saves to inventory, applies it immediately,
 * updates the UI, and syncs to Supabase.
 */
function awardTheme(theme) {
    const inventory = getLootInventory();

    // Add to collection if not already owned
    if (!inventory.themes.includes(theme.id)) {
        inventory.themes.push(theme.id);
    }

    // Equip immediately
    inventory.activeTheme = theme.id;
    saveLootInventory(inventory);

    // Persist theme independently
    localStorage.setItem('planos_active_theme', theme.id);

    applyTheme(theme.id);
    renderInventory();
    syncInventoryToSupabase(inventory);
}

/**
 * Applies a theme class to the body with a smooth CSS transition.
 * Pass 'default' (or null) to clear all themes.
 */
function applyTheme(themeId) {
    // Smooth fade-in via theme-transition class
    document.body.classList.add('theme-transition');

    // Strip all existing theme classes
    LOOT_THEMES.forEach(t => document.body.classList.remove(t.cssClass));

    // Apply requested theme
    if (themeId && themeId !== 'default') {
        const theme = LOOT_THEMES.find(t => t.id === themeId);
        if (theme) document.body.classList.add(theme.cssClass);
    }

    // Remove transition helper after animation finishes
    setTimeout(() => document.body.classList.remove('theme-transition'), 700);
}

/** Called in equipTheme chip click — saves & applies the chosen theme. */
function equipTheme(themeId) {
    const inventory = getLootInventory();
    inventory.activeTheme = themeId;
    saveLootInventory(inventory);

    // Persist theme independently so it survives auth state changes
    localStorage.setItem('planos_active_theme', themeId);

    applyTheme(themeId);
    renderInventory();
    syncInventoryToSupabase(inventory);
}

// ─── localStorage Helpers ─────────────────────────────────────

function getLootInventory() {
    try {
        const raw = localStorage.getItem('loot_inventory');
        if (raw) return JSON.parse(raw);
    } catch (_) { /* fallback below */ }
    return { themes: [], activeTheme: null };
}

function saveLootInventory(inventory) {
    localStorage.setItem('loot_inventory', JSON.stringify(inventory));
}

// ─── Inventory UI (sidebar) ───────────────────────────────────

function renderInventory() {
    const container = document.getElementById('inventory-themes');
    if (!container) return;

    const inventory = getLootInventory();
    container.innerHTML = '';

    // ── Default chip (always shown) ──
    const isDefault = !inventory.activeTheme || inventory.activeTheme === 'default';
    const defaultChip = document.createElement('div');
    defaultChip.className = 'inventory-chip' + (isDefault ? ' active' : '');
    defaultChip.innerHTML = '<span class="chip-icon">🔵</span><span class="chip-name">Default</span>';
    defaultChip.onclick = () => equipTheme('default');
    container.appendChild(defaultChip);

    // ── All themes — unlocked OR locked ──
    LOOT_THEMES.forEach(themeDef => {
        const isOwned = inventory.themes.includes(themeDef.id);
        const isActive = inventory.activeTheme === themeDef.id;

        const chip = document.createElement('div');

        if (isOwned) {
            chip.className = 'inventory-chip' + (isActive ? ' active' : '');
            chip.innerHTML = `<span class="chip-icon">${themeDef.icon}</span><span class="chip-name">${themeDef.name}</span><span class="chip-rarity">${themeDef.rarity}</span>`;
            chip.onclick = () => equipTheme(themeDef.id);
            chip.title = `Equip ${themeDef.name} theme`;
        } else {
            chip.className = 'inventory-chip locked';
            chip.innerHTML = `<span class="chip-icon">🔒</span><span class="chip-name">${themeDef.name}</span><span class="chip-rarity locked-rarity">${themeDef.rarity}</span>`;
            chip.title = `Locked — complete timed tasks for a 20% drop chance!`;
        }

        container.appendChild(chip);
    });
}

function toggleInventoryPanel() {
    const body = document.getElementById('inventory-body');
    const arrow = document.getElementById('inventory-arrow');
    if (!body) return;

    const isOpen = body.classList.toggle('open');
    if (arrow) arrow.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
}

// ─── Supabase Sync (placeholder) ─────────────────────────────

/**
 * Placeholder: stores loot_inventory JSON in user_progress.
 * For full Supabase Auth user_metadata sync, add a server-side
 * function or use the Admin API (the anon key cannot write to
 * auth.users.raw_user_meta_data directly).
 * Add a `loot_inventory` JSONB column to user_progress to enable this.
 */
function syncInventoryToSupabase(inventory) {
    if (!currentUser || !window.supabase) return;

    window.supabase
        .from('user_progress')
        .update({ loot_inventory: inventory })
        .eq('user_id', currentUser.id)
        .then(({ error }) => {
            if (error) {
                console.warn('[PLANOS] Could not sync loot inventory to Supabase (column may not exist yet):', error.message);
            } else {
                console.log('[PLANOS] Loot inventory synced to Supabase.');
            }
        });
}

// ─── Init: restore saved theme on page load ───────────────────

/**
 * Reads the active theme from localStorage and re-applies it
 * immediately (no transition flicker on page load).
 * Uses a dedicated key 'planos_active_theme' so the theme
 * survives logout / login cycles regardless of loot_inventory state.
 */
function restoreSavedTheme() {
    // Primary source: dedicated theme key (most reliable across login cycles)
    const savedThemeId = localStorage.getItem('planos_active_theme');

    // Fallback: read from loot_inventory for backwards compatibility
    const inventory = getLootInventory();
    const themeId = savedThemeId || inventory.activeTheme;

    LOOT_THEMES.forEach(t => document.body.classList.remove(t.cssClass));

    if (themeId && themeId !== 'default') {
        const theme = LOOT_THEMES.find(t => t.id === themeId);
        if (theme) document.body.classList.add(theme.cssClass);
    }
}


// ============================================================
// PLANOS — NEW FEATURE FUNCTIONS
// Tier System, Global Rankings, Pricing, Premium Gating
// ============================================================

// ─── Load User Tier from Supabase ────────────────────────────

async function loadUserTier() {
    if (!currentUser || !window.supabase) return;

    try {
        const { data, error } = await window.supabase
            .from('profiles')
            .select('tier, unlocked_themes')
            .eq('id', currentUser.id)
            .single();

        if (error) throw error;

        if (data) {
            userTier = data.tier || 'Free';
            userUnlockedThemes = data.unlocked_themes || ['Default'];

            // Sync unlocked themes into local inventory
            const inventory = getLootInventory();
            const merged = [...new Set([...inventory.themes, ...userUnlockedThemes.filter(t => t !== 'Default')])];
            inventory.themes = merged;

            // If Elite, grant all themes automatically
            if (userTier === 'Elite') {
                inventory.themes = LOOT_THEMES.map(t => t.id);
            }

            saveLootInventory(inventory);
            renderInventory();

            console.log(`[PLANOS] Tier loaded: ${userTier}`, userUnlockedThemes);
            updatePricingUI();
            applyPremiumGating();
        }
    } catch (err) {
        console.warn('[PLANOS] Could not load tier from Supabase:', err.message);
    }
}

// ─── Premium Gating ──────────────────────────────────────────

function applyPremiumGating() {
    const isFree = userTier === 'Free';

    // Task Tracker lock
    const ttLock = document.getElementById('task-tracker-lock');
    if (ttLock) ttLock.style.display = isFree ? 'flex' : 'none';
}

// ─── Global Rankings ─────────────────────────────────────────

async function renderGlobalLeaderboard() {
    const container = document.getElementById('global-rankings-list');
    if (!container) return;

    // Free users see the lock overlay — still load data but it's hidden
    container.innerHTML = '<div class="leaderboard-empty">Loading rankings...</div>';

    if (!currentUser || !window.supabase) {
        container.innerHTML = '<div class="leaderboard-empty">Please log in to view Global Rankings.</div>';
        return;
    }

    try {
        const { data, error } = await window.supabase
            .from('user_progress')
            .select('user_id, points, level')
            .order('level', { ascending: false })
            .order('points', { ascending: false })
            .limit(10);

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = '<div class="leaderboard-empty">No players yet. Be the first to level up!</div>';
            return;
        }

        // Fetch usernames for those user_ids
        const userIds = data.map(r => r.user_id);
        const { data: profiles } = await window.supabase
            .from('profiles')
            .select('id, username, tier')
            .in('id', userIds);

        const profileMap = {};
        (profiles || []).forEach(p => { profileMap[p.id] = p; });

        const rankMedals = ['🥇', '🥈', '🥉'];
        const rankClasses = ['rank-1', 'rank-2', 'rank-3'];

        container.innerHTML = data.map((row, i) => {
            const profile = profileMap[row.user_id] || {};
            const username = escapeHtml(profile.username || 'Anonymous');
            const tier = profile.tier || 'Free';
            const tierPill = `<span class="ranking-tier-pill pill-${tier.toLowerCase()}">${tier}</span>`;
            const medal = i < 3 ? `<span class="ranking-medal ${['gold', 'silver', 'bronze'][i]}">${rankMedals[i]}</span>`
                : `<span class="ranking-medal">#${i + 1}</span>`;
            const rankBadge = getRankBadgeForLevel(row.level || 0);

            return `
                <div class="ranking-entry ${rankClasses[i] || ''}">
                    ${medal}
                    <div class="ranking-info">
                        <div class="ranking-username">${username}</div>
                        <div class="ranking-badge-row">
                            <span>${rankBadge}</span>
                            ${tierPill}
                        </div>
                    </div>
                    <div class="ranking-level">
                        <span class="ranking-level-num">${row.level || 0}</span>
                        <span class="ranking-level-label">LV</span>
                    </div>
                    <div class="ranking-points">
                        <span class="ranking-pts-num">${row.points || 0}</span>
                        <span class="ranking-pts-label">pts</span>
                    </div>
                </div>`;
        }).join('');

    } catch (err) {
        console.error('[PLANOS] Error loading global rankings:', err);
        container.innerHTML = '<div class="leaderboard-empty">Could not load rankings. Try again.</div>';
    }
}

function getRankBadgeForLevel(level) {
    if (level >= 100) return '👑';
    if (level >= 50) return '💎';
    if (level >= 25) return '🔥';
    if (level >= 10) return '🏹';
    if (level >= 5) return '🛡️';
    if (level >= 2) return '⚔️';
    return '🌱';
}

// ─── Pricing UI ───────────────────────────────────────────────

function updatePricingUI() {
    const tierNameEl = document.getElementById('current-tier-name');
    const tierEmojiEl = document.getElementById('current-tier-emoji');
    const proBtn = document.getElementById('pro-upgrade-btn');
    const eliteBtn = document.getElementById('elite-upgrade-btn');
    const freeLabel = document.getElementById('free-current-label');
    const freeCard = document.getElementById('pricing-free-card');
    const proCard = document.getElementById('pricing-pro-card');
    const eliteCard = document.getElementById('pricing-elite-card');

    const tierEmojis = { Free: '🌱', Pro: '⚡', Elite: '👑' };

    if (tierNameEl) tierNameEl.textContent = userTier;
    if (tierEmojiEl) tierEmojiEl.textContent = tierEmojis[userTier] || '🌱';

    // Reset active-tier class
    [freeCard, proCard, eliteCard].forEach(c => c?.classList.remove('active-tier'));

    if (userTier === 'Free') {
        freeCard?.classList.add('active-tier');
        if (freeLabel) freeLabel.style.display = 'block';
        if (proBtn) { proBtn.disabled = false; proBtn.textContent = '⚡ Upgrade to Pro'; }
        if (eliteBtn) { eliteBtn.disabled = false; eliteBtn.textContent = '👑 Upgrade to Elite'; }
    } else if (userTier === 'Pro') {
        proCard?.classList.add('active-tier');
        if (freeLabel) freeLabel.style.display = 'none';
        if (proBtn) { proBtn.disabled = true; proBtn.textContent = '✅ Current Plan'; }
        if (eliteBtn) { eliteBtn.disabled = false; eliteBtn.textContent = '👑 Upgrade to Elite'; }
    } else if (userTier === 'Elite') {
        eliteCard?.classList.add('active-tier');
        if (freeLabel) freeLabel.style.display = 'none';
        if (proBtn) { proBtn.disabled = true; proBtn.textContent = '✅ Included'; }
        if (eliteBtn) { eliteBtn.disabled = true; eliteBtn.textContent = '👑 Current Plan'; }
    }
}

// ─── QRIS Payment System ──────────────────────────────────────

let _qrisPendingTier = null; // 'Pro' | 'Elite'

function upgradeTier(tier) {
    if (!currentUser) {
        openAuthModal('login');
        showAuthNotification('🔐 Login Required', 'Please log in to upgrade your plan.', 'info');
        return;
    }
    if ((tier === 'Pro' && userTier === 'Pro') || userTier === 'Elite') {
        showAuthNotification('✅ Already Upgraded', `You're already on the ${userTier} plan. You're good!`, 'info');
        return;
    }
    openQrisModal(tier);
}

function openQrisModal(tier) {
    _qrisPendingTier = tier;

    const modal = document.getElementById('qris-modal');
    const chip = document.getElementById('qris-tier-chip');
    const amount = document.getElementById('qris-amount-display');
    const banner = document.querySelector('.qris-amount-banner');

    if (chip) {
        chip.textContent = tier === 'Elite' ? '👑 ELITE' : '⚡ PRO';
        chip.className = 'qris-tier-chip' + (tier === 'Elite' ? ' elite' : '');
    }
    if (amount) amount.textContent = tier === 'Elite' ? 'Rp 35.000' : 'Rp 25.000';
    if (banner) {
        banner.className = 'qris-amount-banner' + (tier === 'Elite' ? ' elite-amount' : '');
    }

    // Reset form
    const form = document.getElementById('qris-payment-form');
    if (form) form.reset();
    const fileLabel = document.getElementById('qris-file-label');
    if (fileLabel) fileLabel.textContent = '📎 Click to upload screenshot';
    const fileDrop = document.getElementById('qris-file-drop');
    if (fileDrop) fileDrop.classList.remove('has-file');

    const btn = document.getElementById('qris-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = "📎 Upload Screenshot to Proceed"; }

    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeQrisModal() {
    const modal = document.getElementById('qris-modal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
    _qrisPendingTier = null;
}

function handleQrisOverlayClick(e) {
    if (e.target === document.getElementById('qris-modal')) closeQrisModal();
}

function handleFileSelect(input) {
    const label = document.getElementById('qris-file-label');
    const drop = document.getElementById('qris-file-drop');
    const submitBtn = document.getElementById('qris-submit-btn');
    if (input.files && input.files[0]) {
        if (label) label.textContent = `📸 ${input.files[0].name}`;
        if (drop) drop.classList.add('has-file');
        // Enable submit button now that proof is attached
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "✅ I've Paid — Submit Confirmation";
        }
    } else {
        if (label) label.textContent = '📎 Click to upload screenshot';
        if (drop) drop.classList.remove('has-file');
        // Disable again if file is cleared
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '📎 Upload Screenshot to Proceed';
        }
    }
}

async function submitPaymentProof(e) {
    e.preventDefault();
    if (!currentUser || !_qrisPendingTier) return;

    const txnId = document.getElementById('qris-txn-id')?.value.trim();
    const fileEl = document.getElementById('qris-receipt');
    const file = fileEl?.files?.[0] || null;
    const btn = document.getElementById('qris-submit-btn');

    if (!txnId) {
        showAuthNotification('⚠️ Missing Info', 'Please enter your Transaction ID.', 'info');
        return;
    }

    // Guard: proof of payment is now mandatory
    if (!file) {
        showAuthNotification('⚠️ Proof Required', 'Proof of payment is required to proceed.', 'error');
        return;
    }

    btn.disabled = true;
    btn.textContent = '⏳ Uploading proof...';

    try {
        // 1. Upload screenshot to Supabase Storage (mandatory — abort if it fails)
        const ext = file.name.split('.').pop();
        const path = `${currentUser.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await window.supabase.storage
            .from('payment-receipts')
            .upload(path, file, { upsert: false });

        if (uploadErr) {
            // Upload failed — stop here, do NOT notify admin via EmailJS
            console.error('[PLANOS] Receipt upload failed:', uploadErr.message);
            showAuthNotification('❌ Upload Failed', 'Proof of payment is required to proceed. Please try again.', 'error');
            btn.disabled = false;
            btn.textContent = "✅ I've Paid — Submit Confirmation";
            return;
        }

        // Upload succeeded — get public URL
        const { data: urlData } = window.supabase.storage
            .from('payment-receipts')
            .getPublicUrl(path);
        const receiptUrl = urlData?.publicUrl || null;

        btn.textContent = '⏳ Submitting...';

        // 2. Get username + email for admin visibility
        const username = currentUser.user_metadata?.username || 'Unknown';
        const email = currentUser.email || 'No email';
        const amount = _qrisPendingTier === 'Elite' ? 35000 : 25000;

        // 3. Insert payment record into Supabase
        const { error: insertErr } = await window.supabase
            .from('payments')
            .insert({
                user_id: currentUser.id,
                username,
                email,
                tier: _qrisPendingTier,
                amount,
                transaction_id: txnId,
                receipt_url: receiptUrl,
                status: 'pending'
            });

        if (insertErr) throw insertErr;

        // Grab the newly inserted payment ID for the approve link
        const { data: insertedPayment } = await window.supabase
            .from('payments')
            .select('id')
            .eq('user_id', currentUser.id)
            .eq('transaction_id', txnId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        const paymentId = insertedPayment?.id || 'unknown';

        // 4. Notify admin via EmailJS — ONLY runs because upload succeeded above
        try {
            if (typeof emailjs !== 'undefined') {
                await emailjs.send('service_cg1yhic', 'template_k3rkc88', {
                    user_name: username,
                    user_email: email,
                    user_tier: _qrisPendingTier,
                    transaction_ref: txnId,
                    date_submitted: new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' }),
                    payment_proof_url: receiptUrl,
                    approve_link: `${window.location.origin}/PLANOS/admin.html?payment=${paymentId}`
                });
                console.log('[PLANOS] Admin email sent via EmailJS.');
            }
        } catch (emailErr) {
            console.warn('[PLANOS] EmailJS failed (non-critical):', emailErr);
        }

        // 5. Close modal + show confirmation
        // Capture tier BEFORE closeQrisModal() nulls _qrisPendingTier
        const confirmedTier = _qrisPendingTier;
        closeQrisModal();
        showAuthNotification(
            '🎉 Payment Submitted!',
            `We received your confirmation for the ${confirmedTier} plan. Your tier will be unlocked within 30 minutes. Sit tight!`,
            'success'
        );

    } catch (err) {
        console.error('[PLANOS] submitPaymentProof error:', err);
        showAuthNotification('❌ Submission Failed', err.message || 'Something went wrong. Try again.', 'error');
        btn.disabled = false;
        btn.textContent = "✅ I've Paid — Submit Confirmation";
    }
}

// ─── Realtime: Auto-upgrade when admin approves ───────────────

// Holds the active Supabase Realtime channel so we can remove it before
// re-subscribing. Without this, re-authentication events (TOKEN_REFRESHED,
// SIGNED_IN fired twice, etc.) crash with:
// "cannot add postgres_changes callbacks after subscribe()"
let _paymentChannel = null;

function subscribeToPaymentUpdates() {
    if (!currentUser || !window.supabase) return;

    // Remove any existing subscription before creating a new one
    if (_paymentChannel) {
        window.supabase.removeChannel(_paymentChannel);
        _paymentChannel = null;
    }

    _paymentChannel = window.supabase
        .channel('payment-approvals')
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'payments',
            filter: `user_id=eq.${currentUser.id}`
        }, (payload) => {
            const { status, tier } = payload.new;
            console.log('[PLANOS] Payment update received:', status, tier);

            if (status === 'approved') {
                showAuthNotification(
                    '🎉 Payment Approved!',
                    `You've been upgraded to the ${tier} plan. Welcome aboard!`,
                    'success'
                );
                // Grant all themes for Elite locally too
                if (tier === 'Elite') {
                    const inv = getLootInventory();
                    inv.themes = LOOT_THEMES.map(t => t.id);
                    saveLootInventory(inv);
                }
                loadUserTier();

            } else if (status === 'rejected') {
                showAuthNotification(
                    '😔 Payment Not Verified',
                    'We couldn\'t verify your payment. Please DM us at PlanosPlanMake@gmail.com and we\'ll sort it out.',
                    'error'
                );
            }
        })
        .subscribe();
}

// ─── MUSIC PLAYER UPLOAD & LIBRARY ───────────────────────────

async function handleMusicUpload(input) {
    if (!currentUser || !window.supabase) {
        showAuthNotification('🔒 Login Required', 'Please login to upload your own music.', 'warning');
        return;
    }

    const file = input.files[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
        showAuthNotification('⚠️ Invalid File', 'Please upload a valid audio file (e.g. MP3).', 'warning');
        return;
    }

    const maxSizeBytes = 10 * 1024 * 1024; // 10MB limit
    if (file.size > maxSizeBytes) {
        showAuthNotification('⚠️ File Too Large', 'Maximum file size is 10MB.', 'warning');
        return;
    }

    const progressWrap = document.getElementById('upload-progress-wrap');
    const progressFill = document.getElementById('upload-progress-fill');
    
    progressWrap.style.display = 'block';
    progressFill.style.width = '10%';

    try {
        const fileExt = file.name.split('.').pop();
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const fileName = `${Date.now()}_${safeName}`;
        const filePath = `${currentUser.id}/${fileName}`;

        // Upload to Storage
        progressFill.style.width = '40%';
        const { data, error } = await window.supabase.storage
            .from('user-music')
            .upload(filePath, file);

        if (error) throw error;
        progressFill.style.width = '70%';

        // Get Public URL
        const { data: urlData } = window.supabase.storage
            .from('user-music')
            .getPublicUrl(filePath);
            
        const publicUrl = urlData.publicUrl;

        // Save to Database
        const { error: dbError } = await window.supabase
            .from('user_tracks')
            .insert({
                user_id: currentUser.id,
                title: file.name.replace(/\.[^/.]+$/, ""), // remove extension
                file_url: publicUrl,
                file_path: filePath
            });

        if (dbError) throw dbError;
        
        progressFill.style.width = '100%';
        showAuthNotification('🎵 Upload Success!', 'Your song has been added to your library.', 'info');
        
        // Refresh library
        await fetchUserTracks();
        
    } catch (err) {
        console.error('[PLANOS] Music upload error:', err);
        showAuthNotification('❌ Upload Failed', err.message, 'warning');
    } finally {
        setTimeout(() => {
            progressWrap.style.display = 'none';
            progressFill.style.width = '0%';
            input.value = ''; // reset
        }, 1500);
    }
}

async function fetchUserTracks() {
    const trackSelector = document.getElementById('track-selector');
    if (!trackSelector) return;

    // Reset to default tracks
    allTracks = [...defaultPlaylist];

    if (!currentUser || !window.supabase) {
        renderTrackSelector();
        return;
    }

    try {
        const { data, error } = await window.supabase
            .from('user_tracks')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: true }); // Older tracks first

        if (error) throw error;

        if (data && data.length > 0) {
            data.forEach(track => {
                allTracks.push({
                    title: track.title,
                    src: track.file_url,
                    type: 'user'
                });
            });
        }

        renderTrackSelector();
        
        // Auto-select the newly added track if it just got added
        if (allTracks.length > defaultPlaylist.length) {
            const newLastIndex = allTracks.length - 1;
            // Only auto-switch if we want to immediately play the new track
            // e.g. trackSelector.value = newLastIndex; selectTrack(newLastIndex);
        }

    } catch (err) {
        console.error('[PLANOS] Error fetching user tracks:', err);
        renderTrackSelector();
    }
}

function renderTrackSelector() {
    const trackSelector = document.getElementById('track-selector');
    if (!trackSelector) return;
    
    trackSelector.innerHTML = '';
    
    // Add default tracks group
    const defaultGroup = document.createElement('optgroup');
    defaultGroup.label = "PLANOS Mix";
    
    // Add user tracks group
    const userGroup = document.createElement('optgroup');
    userGroup.label = "My Uploads";
    
    let hasUserTracks = false;

    allTracks.forEach((track, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = track.title;
        
        if (track.type === 'default') {
            defaultGroup.appendChild(option);
        } else {
            hasUserTracks = true;
            userGroup.appendChild(option);
        }
    });

    trackSelector.appendChild(defaultGroup);
    if (hasUserTracks) {
        trackSelector.appendChild(userGroup);
    }
    
    // Keep current selection
    if (currentTrackIndex < allTracks.length) {
        trackSelector.value = currentTrackIndex;
    } else {
        currentTrackIndex = 0;
        trackSelector.value = 0;
        loadTrack(0);
    }
}

// ─── STATS & INSIGHTS ────────────────────────────────────────────────────────

/**
 * Compute personal statistics from the local task array and populate the
 * Insights panel cards.  Works entirely from already-loaded data so no extra
 * network call is needed; RLS on the Supabase side guarantees we only ever
 * received this user's own tasks.
 */
function computeInsights() {
    const tasks = loadTasks();

    // ── 1. Total Completed ────────────────────────────────────────────────────
    const finished   = tasks.filter(t => t.status === 'finished');
    const totalDone  = finished.length;

    // ── 2. The Marathoner (longest single finished task in minutes) ────────────
    let longestMinutes = 0;
    finished.forEach(t => {
        // Prefer the stored duration_minutes field; fall back to wall-clock diff
        if (t.duration_minutes && t.duration_minutes > 0) {
            if (t.duration_minutes > longestMinutes) longestMinutes = t.duration_minutes;
        } else if (t.end_time && t.created_at) {
            const diff = (new Date(t.end_time) - new Date(t.created_at)) / 60000;
            if (diff > 0 && diff > longestMinutes) longestMinutes = Math.round(diff);
        }
    });

    // ── 3. Productivity Score (finished / total tasks, as a percentage) ────────
    const totalTasks = tasks.length;
    const score = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;

    // ── 4. Total Focus Time (sum of duration_minutes for all finished tasks) ───
    let totalFocusMinutes = 0;
    finished.forEach(t => {
        if (t.duration_minutes && t.duration_minutes > 0) {
            totalFocusMinutes += t.duration_minutes;
        }
    });
    // Also add time already spent on currently-ongoing tasks
    tasks.filter(t => t.status === 'ongoing').forEach(t => {
        if (t.duration_minutes && t.duration_minutes > 0 && t.end_time) {
            const elapsed = t.duration_minutes - Math.max(0,
                (new Date(t.end_time) - Date.now()) / 60000);
            totalFocusMinutes += Math.round(Math.max(0, elapsed));
        }
    });

    // ── Helpers ───────────────────────────────────────────────────────────────
    const fmtTime = m => {
        if (m < 60)  return `${m}m`;
        const h = Math.floor(m / 60);
        const rem = m % 60;
        return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
    };

    // ── Update DOM (batched — single animation timer instead of 4) ────────────
    const updates = [
        ['insight-total-completed',    String(totalDone)],
        ['insight-longest-task',       fmtTime(longestMinutes)],
        ['insight-productivity-score', `${score}%`],
        ['insight-focus-time',         fmtTime(totalFocusMinutes)],
    ];
    updates.forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = val;
        el.classList.remove('insight-pop'); // reset so re-animation always fires
        void el.offsetWidth;               // force reflow
        el.classList.add('insight-pop');
    });
    // One shared timer cleans all pop classes
    setTimeout(() => {
        updates.forEach(([id]) => document.getElementById(id)?.classList.remove('insight-pop'));
    }, 600);
}

// Re-calculate whenever the leaderboard tab is opened.
// Debounced so rapid tab switching doesn't trigger multiple expensive renders.
let _insightsDebounce = null;
const _originalSwitchTab = window.switchTab;
window.switchTab = function(tabName) {
    if (_originalSwitchTab) _originalSwitchTab(tabName);
    // NOTE: the tab is named 'leaderboard', not 'insights'
    if (tabName === 'leaderboard') {
        clearTimeout(_insightsDebounce);
        _insightsDebounce = setTimeout(computeInsights, 120);
    }
};

// Expose to global so it can be called from other places if needed
window.computeInsights = computeInsights;

// Ensure fetchUserTracks runs after authentication
window.handleMusicUpload = handleMusicUpload;
window.fetchUserTracks = fetchUserTracks;

window.renderGlobalLeaderboard = renderGlobalLeaderboard;
window.upgradeTier = upgradeTier;
window.openQrisModal = openQrisModal;
window.closeQrisModal = closeQrisModal;
window.handleQrisOverlayClick = handleQrisOverlayClick;
window.handleFileSelect = handleFileSelect;
window.submitPaymentProof = submitPaymentProof;
window.loadUserTier = loadUserTier;
window.applyPremiumGating = applyPremiumGating;
window.updatePricingUI = updatePricingUI;
