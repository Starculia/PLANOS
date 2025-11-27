// script.js — patched for timer debugging + reliability

// --- State ---
let audio = null;
let isPlaying = false;

// persistent data
let points = parseInt(localStorage.getItem('points')) || 0;
let achievements = JSON.parse(localStorage.getItem('achievements')) || [
    { level: 2, name: "Getting Started", unlocked: false }
];

// timer tick handle
let timerTickInterval = null;

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

// create missing points node gracefully (if not present)
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
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    const tabContent = document.getElementById(tabName + '-task');
    if (tabContent) tabContent.classList.add('active');

    const buttons = document.querySelectorAll('.tab-btn');
    const tabMap = { 'create': 0, 'ongoing': 1, 'finished': 2 };
    const btnIndex = tabMap[tabName];
    if (btnIndex !== undefined && buttons[btnIndex]) buttons[btnIndex].classList.add('active');
}

// --- Animated background (unchanged) ---
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

// --- DOMContentLoaded init ---
document.addEventListener('DOMContentLoaded', function () {
    console.log('[PLANOS] DOMContentLoaded — init starting');

    createAnimatedBackground();
    ensurePointsDisplayExists();
    updatePointsAndLevel();
    displayAchievements();
    updateTaskDisplay();

    audio = document.getElementById('audio-player');
    if (audio) {
        setupAudioPlayer();
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

    // ALWAYS start the tick interval (no accidental skip)
    if (timerTickInterval) clearInterval(timerTickInterval);
    timerTickInterval = setInterval(tickTimers, 1000);
    console.log('[PLANOS] tickTimers interval started');

    // immediate tick to update displays now
    tickTimers();
});

// --- Timer tick system ---
function tickTimers() {
    try {
        const tasks = loadTasks();
        const now = Date.now();
        let changed = false;
        // debug: log active tasks with endTime
        // console.debug('[PLANOS] tickTimers running — tasks count:', tasks.length);

        tasks.forEach(task => {
            if (task.status === 'ongoing' && task.endTime) {
                const end = new Date(task.endTime).getTime();
                // If end is invalid date, skip
                if (isNaN(end)) return;
                if (end <= now) {
                    // Timer expired -> mark finished and award points
                    console.log(`[PLANOS] Task expired: ${task.title} (id:${task.id})`);
                    task.status = 'finished';
                    task.endTime = null;
                    changed = true;

                    // award points
                    points = parseInt(localStorage.getItem('points')) || 0;
                    points += 100;
                    localStorage.setItem('points', points);
                    updatePointsAndLevel();
                    showNotification(task.title);
                    checkAchievements();
                }
            }
        });

        if (changed) {
            saveTasks(tasks);
            updateTaskDisplay();
        } else {
            updateTimerDisplays();
        }
    } catch (err) {
        console.error('[PLANOS] tickTimers error:', err);
    }
}

// --- Task Notification Sound ---
function playNotificationSound() {
    const audioContext = new (window.AudioContext || window.AudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 2000; // Frequency in Hz
    oscillator.type = 'square'; // 'sine', 'square', 'sawtooth', 'triangle'
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

function showNotification(taskTitle) {
    const modal = document.getElementById('notification-modal');
    const text = document.getElementById('notification-text');
    if (text) text.textContent = `Time's up for "${taskTitle}"!`;
    if (modal) modal.classList.add('show');

    playNotificationSound(); // Play the beep

    document.body.style.animation = 'none';
    void document.body.offsetWidth;
    document.body.style.animation = 'pulse 0.5s';
}

function showNotification(taskTitle) {
    const modal = document.getElementById('notification-modal');
    const text = document.getElementById('notification-text');
    if (text) text.textContent = `Time's up for "${taskTitle}"!`;
    if (modal) modal.classList.add('show');

    // Browser notification with sound
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification("PLANOS - Task Complete!", {
            body: `Time's up for "${taskTitle}"!`,
            icon: "data:image/x-icon;base64,AAABAAEAEBAAAAAAAABoBQAAFgAAACg...", // Your favicon
            requireInteraction: true
        });
    }

    document.body.style.animation = 'none';
    void document.body.offsetWidth;
    document.body.style.animation = 'pulse 0.5s';
}

// Request permission on page load
if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
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

    // guard: if user input 0 minutes, warn — this looks like "not running" because it's already expired
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
    const taskId = getNextTaskId();
    const newTask = {
        id: taskId,
        title: title,
        description: description,
        status: status,
        durationMinutes: durationMinutes,
        createdAt: new Date().toISOString(),
        endTime: durationMinutes > 0 ? new Date(Date.now() + durationMinutes * 60000).toISOString() : null
    };
    tasks.push(newTask);
    saveTasks(tasks);
    console.log('[PLANOS] added task:', newTask);
    updateTaskDisplay();
}

// Mark finished explicitly by user (also awards points)
function markAsFinished(taskId) {
    const tasks = loadTasks();
    const index = tasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
        if (tasks[index].status !== 'finished') {
            tasks[index].status = 'finished';
            tasks[index].endTime = null;
            saveTasks(tasks);

            // award points
            points = parseInt(localStorage.getItem('points')) || 0;
            points += 100;
            localStorage.setItem('points', points);
            updatePointsAndLevel();
            checkAchievements();

            updateTaskDisplay();
        }
    }
}

// Delete a task
function deleteTask(taskId) {
    const tasks = loadTasks();
    const filtered = tasks.filter(t => t.id !== taskId);
    saveTasks(filtered);
    updateTaskDisplay();
}

// --- UI rendering ---
function updateTaskDisplay() {
    const tasks = loadTasks();
    const ongoingList = document.getElementById('ongoing-tasks');
    const finishedList = document.getElementById('finished-tasks');
    const ongoingTasks = tasks.filter(task => task.status === 'ongoing');
    const finishedTasks = tasks.filter(task => task.status === 'finished');

    if (ongoingList) ongoingList.innerHTML = ongoingTasks.length > 0 ? '' : '<li class="empty-state">No ongoing tasks yet</li>';
    if (finishedList) finishedList.innerHTML = finishedTasks.length > 0 ? '' : '<li class="empty-state">No finished tasks yet</li>';

    ongoingTasks.forEach(task => {
        if (ongoingList) ongoingList.appendChild(createTaskElement(task));
    });
    finishedTasks.forEach(task => {
        if (finishedList) finishedList.appendChild(createTaskElement(task));
    });

    updateTimerDisplays();
}

function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = 'task-item';
    li.dataset.taskId = task.id;

    let timerDisplay = '';
    if (task.status === 'ongoing' && task.endTime) {
        timerDisplay = `<div class="task-timer" data-end-time="${task.endTime}">
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
            ? `<button class="btn-small btn-success" onclick="markAsFinished(${task.id})">Mark as Finished</button>
               <button class="btn-small btn-danger" onclick="deleteTask(${task.id})">Delete</button>`
            : `<button class="btn-small btn-secondary" onclick="deleteTask(${task.id})">Delete</button>`}
        </div>`;
    return li;
}

// update remaining time on all timers
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

// --- Notifications & achievements ---
function showNotification(taskTitle) {
    const modal = document.getElementById('notification-modal');
    const text = document.getElementById('notification-text');
    if (text) text.textContent = `Time's up for "${taskTitle}"!`;
    if (modal) modal.classList.add('show');

    document.body.style.animation = 'none';
    void document.body.offsetWidth;
    document.body.style.animation = 'pulse 0.5s';
}

function closeNotification() {
    const modal = document.getElementById('notification-modal');
    if (modal) modal.classList.remove('show');
    document.body.style.animation = '';
}

function showAchievementNotification(achievementName) {
    const modal = document.getElementById('achievement-modal');
    const text = document.getElementById('achievement-text');
    if (text) text.textContent = `Achievement Unlocked: ${achievementName}!`;
    if (modal) {
        modal.classList.add('show');
    }
}

function closeAchievementModal() {
    const modal = document.getElementById('achievement-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function displayAchievements() {
    const badgeContainer = document.getElementById('achievement-badges');
    if (!badgeContainer) return;
    badgeContainer.innerHTML = '';
    achievements.filter(a => a.unlocked).forEach(achievement => {
        const badge = document.createElement('div');
        badge.className = 'achievement-badge';
        badge.textContent = achievement.name;
        badgeContainer.appendChild(badge);
    });
}

function checkAchievements() {
    achievements = JSON.parse(localStorage.getItem('achievements')) || achievements;
    let changed = false;
    const currentLevel = Math.floor(points / 100) + 1;

    achievements.forEach(a => {
        if (!a.unlocked && a.level <= currentLevel) {
            a.unlocked = true;
            changed = true;
            showAchievementNotification(a.name);
        }
    });

    if (changed) {
        localStorage.setItem('achievements', JSON.stringify(achievements));
        displayAchievements();
    }
}

// --- Points & Level UI ---
function updatePointsAndLevel() {
    points = parseInt(localStorage.getItem('points')) || points || 0;
    ensurePointsDisplayExists();
    const pointsDisplay = document.getElementById('pointsDisplay');
    const levelDisplay = document.getElementById('level-display');
    const progressBar = document.getElementById('level-progress');

    const level = Math.floor(points / 100) + 1;
    const nextLevelPoints = level * 100;
    const currentLevelStart = (level - 1) * 100;
    const progressPercent = ((points - currentLevelStart) / (nextLevelPoints - currentLevelStart)) * 100;

    if (pointsDisplay) pointsDisplay.innerText = `Points: ${points}`;
    if (levelDisplay) levelDisplay.textContent = level;
    if (progressBar) progressBar.style.width = `${progressPercent}%`;

    localStorage.setItem('points', points);
    checkAchievements();
}

// --- Helpers ---
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// --- Audio player behavior ---
function togglePlayPause() {
    if (!audio) {
        audio = document.getElementById('audio-player');
        if (!audio) return;
        setupAudioPlayer();
    }
    if (isPlaying) {
        audio.pause();
        isPlaying = false;
        const btn = document.getElementById('play-pause-btn');
        if (btn) btn.textContent = '▶';
    } else {
        audio.play().catch(() => {});
        isPlaying = true;
        const btn = document.getElementById('play-pause-btn');
        if (btn) btn.textContent = '⏸';
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