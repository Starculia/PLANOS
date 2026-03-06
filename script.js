
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
document.addEventListener('click', function(event) {
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
            });
            
            // Listen for auth changes
            window.supabase.auth.onAuthStateChange((event, session) => {
                const previousUser = currentUser;
                currentUser = session?.user || null;
                updateAuthUI(currentUser);
                
                if (event === 'SIGNED_IN' && currentUser) {
                    // Load user-specific data from Supabase
                    loadUserDataFromSupabase();
                    showAuthNotification('🎉 Welcome Back!', 'You are now logged in as ' + (currentUser.user_metadata?.username || 'User'), 'success');
                } else if (event === 'SIGNED_OUT') {
                    // Clear local data and show empty state
                    localStorage.removeItem('tasks');
                    localStorage.removeItem('points');
                    localStorage.removeItem('achievements');
                    clearTaskDisplay();
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

function loadUserDataFromSupabase() {
    if (!currentUser) return;
    
    // Load user's tasks from Supabase
    window.supabase
        .from('tasks')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
            if (error) {
                console.error('[PLANOS] Error loading user tasks:', error);
                return;
            }
            
            if (data && data.length > 0) {
                localStorage.setItem('tasks', JSON.stringify(data));
                updateTaskDisplay();
            } else {
                // Clear any existing tasks
                localStorage.setItem('tasks', JSON.stringify([]));
                updateTaskDisplay();
            }
        });
    
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
let timerTickInterval = null;

// --- Playlist ---
const playlist = [
    { title: "Feels Like Yesterday", src: "audios/Feels Like Yesterday.mp3" },
    { title: "Deep Focus", src: "audios/Fret Fade.mp3" },
    { title: "Night Work", src: " //coming soon" }
];

function loadTrack(index) {
    if (!audio) return;

    audio.src = playlist[index].src;
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

function loadTasks() {
    return JSON.parse(localStorage.getItem('tasks')) || [];
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
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    const tabContent = document.getElementById(tabName + '-task');
    if (tabContent) tabContent.classList.add('active');

    const buttons = document.querySelectorAll('.nav-btn');
    const tabMap = { 'create': 0, 'ongoing': 1, 'finished': 2, 'planning': 3, 'badges': 4 };
    const btnIndex = tabMap[tabName];
    if (btnIndex !== undefined && buttons[btnIndex]) buttons[btnIndex].classList.add('active');
    
    // Display badges when switching to badges tab
    if (tabName === 'badges') {
        displayAllBadges();
    }
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

                    // Update in Supabase if user is logged in
                    if (currentUser && window.supabase) {
                        window.supabase
                            .from('tasks')
                            .update({
                                status: 'finished',
                                end_time: null
                            })
                            .eq('id', task.id)
                            .eq('user_id', currentUser.id)
                            .then(({ error }) => {
                                if (error) {
                                    console.error('[PLANOS] Error updating expired task in Supabase:', error);
                                }
                            });
                    }

                    const currentPoints = parseInt(localStorage.getItem('points')) || 0;
                    const newPoints = currentPoints + 50;
                    localStorage.setItem('points', newPoints);
                    updatePointsAndLevel();
                    
                    showNotification(task.title);
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

function showNotification(taskTitle) {
    const modal = document.getElementById('notification-modal');
    const text = document.getElementById('notification-text');
    if (text) text.textContent = `Time's up for "${taskTitle}"!`;
    if (modal) modal.classList.add('show');

    playNotificationSound(); // Play the beep

    // Browser notification with sound (manual - requires user interaction)
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification("PLANOS - Task Complete!", {
            body: `Time's up for "${taskTitle}"!`,
            icon: "data:image/x-icon;base64,AAABAAEAEBAAAAAAAABoBQAAFgAAACg...", // Your favicon
            requireInteraction: true  // This makes browser notification manual
        });
    }

    // Body animation
    document.body.style.animation = 'none';
    void document.body.offsetWidth;
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
function createTask() {
    const titleEl = document.getElementById('task-title');
    const descEl = document.getElementById('task-description');
    const hoursEl = document.getElementById('task-hours');
    const minutesEl = document.getElementById('task-minutes');

    const title = titleEl ? titleEl.value.trim() : '';
    const description = descEl ? descEl.value.trim() : '';
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

    addTask(title, description, 'ongoing', totalMinutes);

    if (titleEl) titleEl.value = '';
    if (descEl) descEl.value = '';
    if (hoursEl) hoursEl.value = '0';
    if (minutesEl) minutesEl.value = '0';

    switchTab('ongoing');
}

function addTask(title, description, status, durationMinutes = 0) {
    const tasks = loadTasks();
    
    // Generate UUID for Supabase compatibility
    const taskId = crypto.randomUUID();
    const newTask = {
        id: taskId,
        title: title,
        description: description,
        status: status,
        duration_minutes: durationMinutes,
        created_at: new Date().toISOString(),
        end_time: durationMinutes > 0 ? new Date(Date.now() + durationMinutes * 60000).toISOString() : null
    };
    
    // Save to localStorage first
    tasks.push(newTask);
    localStorage.setItem('tasks', JSON.stringify(tasks));
    
    // Also save to Supabase if user is logged in
    if (currentUser && window.supabase) {
        const taskToSave = {
            ...newTask,
            user_id: currentUser.id
        };
        
        window.supabase
            .from('tasks')
            .insert(taskToSave)
            .then(({ data, error }) => {
                if (error) {
                    console.error('[PLANOS] Error saving task to Supabase:', error);
                }
            });
    }
    
    playNotificationSound('add');
    updateTaskDisplay();
}

function markAsFinished(taskId) {
    const tasks = loadTasks();
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex !== -1) {
        // Update in localStorage first
        tasks[taskIndex].status = 'finished';
        tasks[taskIndex].end_time = null;
        localStorage.setItem('tasks', JSON.stringify(tasks));
        
        // Also update in Supabase if user is logged in
        if (currentUser && window.supabase) {
            window.supabase
                .from('tasks')
                .update({
                    status: 'finished',
                    end_time: null
                })
                .eq('id', taskId)
                .eq('user_id', currentUser.id)
                .then(({ error }) => {
                    if (error) {
                        console.error('[PLANOS] Error updating task status in Supabase:', error);
                    }
                });
        }
        
        // Award points
        const currentPoints = parseInt(localStorage.getItem('points')) || 0;
        const newPoints = currentPoints + 50;
        localStorage.setItem('points', newPoints);
        updatePointsAndLevel();
        
        playNotificationSound('complete');
        showNotification(tasks[taskIndex].title);
        updateTaskDisplay();
    }
}

function deleteTask(taskId) {
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
    
    updateTaskDisplay();
}

// --- UI rendering ---
function updateTaskDisplay() {
    const tasks = loadTasks();
    const ongoingList = document.getElementById('ongoing-tasks');
    const finishedList = document.getElementById('finished-tasks');
    
    // Try alternative IDs if main ones don't exist
    const ongoingListAlt = ongoingList || document.getElementById('ongoing-task');
    const finishedListAlt = finishedList || document.getElementById('finished-task');
    
    const ongoingTasks = tasks.filter(task => task.status === 'ongoing');
    const finishedTasks = tasks.filter(task => task.status === 'finished');

    if (ongoingListAlt) ongoingListAlt.querySelector('.task-list, ul') ? 
        ongoingListAlt.querySelector('.task-list, ul').innerHTML = ongoingTasks.length > 0 ? '' : '<li class="empty-state">No ongoing tasks yet</li>' :
        ongoingListAlt.innerHTML = ongoingTasks.length > 0 ? '' : '<li class="empty-state">No ongoing tasks yet</li>';
        
    if (finishedListAlt) finishedListAlt.querySelector('.task-list, ul') ? 
        finishedListAlt.querySelector('.task-list, ul').innerHTML = finishedTasks.length > 0 ? '' : '<li class="empty-state">No finished tasks yet</li>' :
        finishedListAlt.innerHTML = finishedTasks.length > 0 ? '' : '<li class="empty-state">No finished tasks yet</li>';

    const ongoingContainer = ongoingListAlt.querySelector('.task-list, ul') || ongoingListAlt;
    const finishedContainer = finishedListAlt.querySelector('.task-list, ul') || finishedListAlt;

    ongoingTasks.forEach(task => {
        if (ongoingContainer) ongoingContainer.appendChild(createTaskElement(task));
    });
    finishedTasks.forEach(task => {
        if (finishedContainer) finishedContainer.appendChild(createTaskElement(task));
    });

    updateTimerDisplays();
}

function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = 'task-item';
    li.dataset.taskId = task.id;

    let timerDisplay = '';
    if (task.status === 'ongoing' && task.end_time) {
        timerDisplay = `<div class="task-timer" data-end-time="${task.end_time}">
            <span class="timer-label">⏱️ Time remaining:</span>
            <span class="timer-display">Calculating...</span>
        </div>`;
    }

    li.innerHTML = `
        <div class="task-header"><span class="task-title">${escapeHtml(task.title)}</span></div>
        <div class="task-description">${escapeHtml(task.description || 'No description')}</div>
        ${timerDisplay}
        <div class="task-actions">
            ${task.status === 'ongoing'
            ? `<button class="btn-small btn-success" onclick="markAsFinished('${task.id}')">Mark as Finished</button>
               <button class="btn-small btn-danger" onclick="deleteTask('${task.id}')">Delete</button>`
            : `<button class="btn-small btn-secondary" onclick="deleteTask('${task.id}')">Delete</button>`}
        </div>`;
    return li;
}

function updateTimerDisplays() {
    const timers = document.querySelectorAll('.timer-display');
    const now = Date.now();
    timers.forEach(timer => {
        const timerContainer = timer.closest('.task-timer');
        if (!timerContainer) return;
        const endTimeAttr = timerContainer.dataset.endTime;
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
        } else {
            timer.textContent = 'Time expired!';
            timer.style.color = 'rgba(220, 53, 69, 1)';
        }
    });
}

// --- Points & Level UI ---
function updatePointsAndLevel() {
    const points = parseInt(localStorage.getItem('points')) || 0;
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

    // FORMAT point: 120 / 255
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
        audio.play().catch(() => {});
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
    currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
    loadTrack(currentTrackIndex);
    // Auto-play if requested or if currently playing
    if (autoPlay || isPlaying) {
        audio.play().catch(() => {});
        isPlaying = true;
        document.getElementById('play-pause-btn').textContent = '⏸';
    }
}

function prevTrack() {
    currentTrackIndex =
        (currentTrackIndex - 1 + playlist.length) % playlist.length;
    loadTrack(currentTrackIndex);
    // Auto-play if currently playing
    if (isPlaying) {
        audio.play().catch(() => {});
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

// --- Planning System ---
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
        showNotification('Please enter a title and select a date');
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
    showNotification('Plan created successfully!');
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
    if (!badgeCount) return;
    
    const now = new Date();
    const activePlans = allPlans.filter(plan => {
        if (!plan.date) return false;
        const planDate = new Date(plan.date);
        return planDate >= now;
    });
    
    badgeCount.textContent = activePlans.length;
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
        showNotification('Plan deleted');
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
                showNotification(`📅 Plan Reminder: ${plan.title}`, `Don't forget: ${plan.description}`);
                playNotificationSound('notification');
            }, timeUntilReminder);
        }
    }
}

// Check for due plans periodically
setInterval(checkPlanReminders, 60000); // Check every minute

function checkPlanReminders() {
    const plans = JSON.parse(localStorage.getItem('plans')) || [];
    const now = new Date();
    
    plans.forEach(plan => {
        if (plan.date && plan.time) {
            const reminderDateTime = new Date(plan.date + 'T' + plan.time);
            const timeUntilReminder = reminderDateTime - now;
            
            // Check if reminder is due in the next minute
            if (timeUntilReminder > 0 && timeUntilReminder <= 60000) {
                showNotification(`📅 Plan Due: ${plan.title}`, `Time for: ${plan.description}`);
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
    selectTrack
};
