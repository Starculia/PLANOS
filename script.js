let taskIdCounter = 0;
let activeTimers = {};
let audio = null;
let isPlaying = false;

// Tab Switching Function
function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab content
    const tabContent = document.getElementById(tabName + '-task');
    if (tabContent) {
        tabContent.classList.add('active');
    }
    
    // Add active class to the corresponding button
    const buttons = document.querySelectorAll('.tab-btn');
    const tabMap = { 'create': 0, 'ongoing': 1, 'finished': 2 };
    const btnIndex = tabMap[tabName];
    if (btnIndex !== undefined && buttons[btnIndex]) {
        buttons[btnIndex].classList.add('active');
    }
}

// Create Animated Background Shapes
function createAnimatedBackground() {
    const background = document.getElementById('animated-background');
    
    // Create shapes
    for (let i = 0; i < 15; i++) {
        // Create circles
        const circle = document.createElement('div');
        circle.className = 'shape circle';
        circle.style.width = Math.random() * 50 + 30 + 'px';
        circle.style.height = circle.style.width;
        circle.style.left = Math.random() * 100 + '%';
        circle.style.top = Math.random() * 100 + '%';
        circle.style.animationDuration = (Math.random() * 10 + 15) + 's';
        circle.style.animationDelay = Math.random() * 5 + 's';
        if (i % 2 === 0) {
            circle.style.animationName = 'float-reverse';
        }
        background.appendChild(circle);
        
        // Create squares
        const square = document.createElement('div');
        square.className = 'shape square';
        const size = Math.random() * 40 + 25;
        square.style.width = size + 'px';
        square.style.height = size + 'px';
        square.style.left = Math.random() * 100 + '%';
        square.style.top = Math.random() * 100 + '%';
        square.style.animationDuration = (Math.random() * 10 + 18) + 's';
        square.style.animationDelay = Math.random() * 5 + 's';
        if (i % 3 === 0) {
            square.style.animationName = 'float-reverse';
        }
        background.appendChild(square);
        
        // Create triangles
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
        if (i % 4 === 0) {
            triangle.style.animationName = 'float-reverse';
        }
        background.appendChild(triangle);
    }
}

// Initialize background on page load
document.addEventListener('DOMContentLoaded', function() {
    createAnimatedBackground();
    
    // Update task display on page load
    updateTaskDisplay();
    
    // Setup audio player
    audio = document.getElementById('audio-player');
    if (audio) {
        setupAudioPlayer();
        
        // Seek on progress bar click
        document.querySelector('.progress-bar').addEventListener('click', function(e) {
            const width = this.offsetWidth;
            const clickX = e.offsetX;
            const duration = audio.duration;
            audio.currentTime = (clickX / width) * duration;
        });
    }

    // Handle Enter key in form inputs
    document.getElementById('task-title').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            createTask();
        }
    });

    document.getElementById('task-description').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            createTask();
        }
    });
    
    // Check for expired timers on page load
    checkTimers();
});

// Check Timers (restore timers for ongoing tasks)
function checkTimers() {
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    const now = new Date();
    
    tasks.forEach(task => {
        if (task.status === 'ongoing' && task.endTime && task.durationMinutes) {
            const endTime = new Date(task.endTime);
            if (endTime > now) {
                const remainingMs = endTime - now;
                const remainingMinutes = remainingMs / 60000;
                startTimer(task.id, remainingMinutes, task.title);
            }
        }
    });
}

// Create Task Function
function createTask() {
    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-description').value.trim();
    const hours = parseInt(document.getElementById('task-hours').value) || 0;
    const minutes = parseInt(document.getElementById('task-minutes').value) || 0;

    if (!title) {
        alert('Please enter a task title');
        return;
    }

    const totalMinutes = hours * 60 + minutes;
    addTask(title, description, 'ongoing', totalMinutes);
    
    // Clear form
    document.getElementById('task-title').value = '';
    document.getElementById('task-description').value = '';
    document.getElementById('task-hours').value = '0';
    document.getElementById('task-minutes').value = '0';
    
    // Switch to ongoing tasks tab
    switchTab('ongoing');
}

// Add Task to List
function addTask(title, description, status, durationMinutes = 0) {
    const taskId = taskIdCounter++;
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
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
    localStorage.setItem('tasks', JSON.stringify(tasks));
    
    updateTaskDisplay();
    
    // Start timer if duration is set
    if (durationMinutes > 0) {
        startTimer(taskId, durationMinutes, title);
    }
}

// Start Timer
function startTimer(taskId, durationMinutes, taskTitle) {
    if (activeTimers[taskId]) {
        clearTimeout(activeTimers[taskId]);
    }
    
    const duration = durationMinutes * 60 * 1000; // Convert to milliseconds
    
    activeTimers[taskId] = setTimeout(() => {
        showNotification(taskTitle);
        delete activeTimers[taskId];
    }, duration);
}

// Show Notification
function showNotification(taskTitle) {
    const modal = document.getElementById('notification-modal');
    const text = document.getElementById('notification-text');
    text.textContent = `Time's up for "${taskTitle}"!`;
    modal.classList.add('show');
    
    // Play a notification sound (if audio is available)
    if (audio && !audio.paused) {
        // Flash or pulse effect
        document.body.style.animation = 'pulse 0.5s';
    }
}

// Close Notification
function closeNotification() {
    const modal = document.getElementById('notification-modal');
    modal.classList.remove('show');
    document.body.style.animation = '';
}

// Toggle Play/Pause for audio player
function togglePlayPause() {
    if (!audio) {
        audio = document.getElementById('audio-player');
        setupAudioPlayer();
    }
    
    if (isPlaying) {
        audio.pause();
        isPlaying = false;
        document.getElementById('play-pause-btn').textContent = '▶';
    } else {
        audio.play();
        isPlaying = true;
        document.getElementById('play-pause-btn').textContent = '⏸';
    }
}

// Setup Audio Player
function setupAudioPlayer() {
    audio.addEventListener('loadedmetadata', () => {
        updateTotalTime();
    });
    
    audio.addEventListener('timeupdate', () => {
        updateProgress();
        updateCurrentTime();
    });
    
    audio.addEventListener('ended', () => {
        isPlaying = false;
        document.getElementById('play-pause-btn').textContent = '▶';
    });
}

// Update audio progress
function updateProgress() {
    if (audio.duration) {
        const progress = (audio.currentTime / audio.duration) * 100;
        document.getElementById('progress').style.width = progress + '%';
    }
}

// Update current time
function updateCurrentTime() {
    const current = formatTime(audio.currentTime);
    document.getElementById('current-time').textContent = current;
}

// Update total time
function updateTotalTime() {
    const total = formatTime(audio.duration);
    document.getElementById('total-time').textContent = total;
}

// Format time helper
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Update Task Display
function updateTaskDisplay() {
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    
    const ongoingList = document.getElementById('ongoing-tasks');
    const finishedList = document.getElementById('finished-tasks');
    
    const ongoingTasks = tasks.filter(task => task.status === 'ongoing');
    const finishedTasks = tasks.filter(task => task.status === 'finished');
    
    // Clear empty states
    if (ongoingTasks.length > 0) {
        ongoingList.innerHTML = '';
    } else {
        ongoingList.innerHTML = '<li class="empty-state">No ongoing tasks yet</li>';
    }
    
    if (finishedTasks.length > 0) {
        finishedList.innerHTML = '';
    } else {
        finishedList.innerHTML = '<li class="empty-state">No finished tasks yet</li>';
    }
    
    // Render ongoing tasks
    ongoingTasks.forEach(task => {
        const taskElement = createTaskElement(task);
        ongoingList.appendChild(taskElement);
    });
    
    // Render finished tasks
    finishedTasks.forEach(task => {
        const taskElement = createTaskElement(task);
        finishedList.appendChild(taskElement);
    });
    
    // Start timer updates
    startTimerUpdates();
    // Update immediately to avoid showing "Calculating..."
    updateTimerDisplays();
}

// Create Task Element
function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = 'task-item';
    li.dataset.taskId = task.id;
    
    // Calculate remaining time if timer exists
    let timerDisplay = '';
    if (task.status === 'ongoing' && task.endTime) {
        timerDisplay = `<div class="task-timer" data-end-time="${task.endTime}">
            <span class="timer-label">⏱️ Time remaining:</span>
            <span class="timer-display">Calculating...</span>
        </div>`;
    }
    
    li.innerHTML = `
        <div class="task-header">
            <span class="task-title">${escapeHtml(task.title)}</span>
        </div>
        <div class="task-description">${escapeHtml(task.description || 'No description')}</div>
        ${timerDisplay}
        <div class="task-actions">
            ${task.status === 'ongoing' 
                ? `<button class="btn-small btn-success" onclick="markAsFinished(${task.id})">Mark as Finished</button>
                   <button class="btn-small btn-danger" onclick="deleteTask(${task.id})">Delete</button>`
                : `<button class="btn-small btn-secondary" onclick="deleteTask(${task.id})">Delete</button>`
            }
        </div>
    `;
    return li;
}

// Update Timer Displays
function updateTimerDisplays() {
    const timers = document.querySelectorAll('.timer-display');
    const now = new Date();
    
    timers.forEach(timer => {
        const timerContainer = timer.closest('.task-timer');
        if (!timerContainer) return;
        
        const endTime = new Date(timerContainer.dataset.endTime);
        const remaining = endTime - now;
        
        if (remaining > 0) {
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
            
            // Format display nicely
            if (hours > 0) {
                timer.textContent = `${hours}h ${minutes}m ${seconds}s`;
            } else if (minutes > 0) {
                timer.textContent = `${minutes}m ${seconds}s`;
            } else {
                timer.textContent = `${seconds}s`;
            }
            timer.style.color = 'rgba(50, 133, 217, 1)';
        } else {
            timer.textContent = 'Time expired!';
            timer.style.color = 'rgba(220, 53, 69, 1)';
            
            // Trigger notification if timer just expired
            const taskId = parseInt(timerContainer.closest('.task-item').dataset.taskId);
            if (activeTimers[taskId]) {
                const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
                const task = tasks.find(t => t.id === taskId);
                if (task && task.status === 'ongoing') {
                    showNotification(task.title);
                    clearTimeout(activeTimers[taskId]);
                    delete activeTimers[taskId];
                }
            }
        }
    });
}

// Start timer update interval
let timerInterval = null;

function startTimerUpdates() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    timerInterval = setInterval(() => {
        updateTimerDisplays();
    }, 1000); // Update every second
}

// Mark Task as Finished
function markAsFinished(taskId) {
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    
    if (taskIndex !== -1) {
        tasks[taskIndex].status = 'finished';
        localStorage.setItem('tasks', JSON.stringify(tasks));
        updateTaskDisplay();
    }
}

// Delete Task
function deleteTask(taskId) {
    const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    const filteredTasks = tasks.filter(task => task.id !== taskId);
    localStorage.setItem('tasks', JSON.stringify(filteredTasks));
    updateTaskDisplay();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
