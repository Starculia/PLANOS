// PLANOS Authentication System
// Add Supabase integration for authentication

const SUPABASE_URL = 'https://fwgjphiegsppfvbpoxwi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Z2pwaGllZ3NwcGZ2YnBveHdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NjkzNDYsImV4cCI6MjA4NzE0NTM0Nn0.6KpbC7QP9p1uEYndZzf_2cgbeATGUiTxLjjvr8fvY8A';

// Initialise Supabase only if it hasn't already been set up (e.g. by index.html).
// This prevents a race condition where two createClient() calls overwrite each other.
function _initSupabaseIfNeeded() {
    if (window.supabase && typeof window.supabase.auth !== 'undefined') {
        console.log('[PLANOS Auth] Supabase already initialised — skipping duplicate init.');
        return;
    }
    if (typeof window.supabase?.createClient === 'function') {
        // The CDN library is loaded but createClient hasn't been called yet
        window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('[PLANOS Auth] Supabase initialised from auth.js');
    } else {
        // Library not yet loaded — inject it then init
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.onload = () => {
            window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('[PLANOS Auth] Supabase loaded and initialised from auth.js');
        };
        document.head.appendChild(script);
    }
}

_initSupabaseIfNeeded();

// --- Password Visibility Toggle ---
function togglePasswordVisibility(inputId, button) {
    const input = document.getElementById(inputId);
    const icon = button.querySelector('.material-symbols-outlined');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.textContent = 'visibility_off';
    } else {
        input.type = 'password';
        icon.textContent = 'visibility';
    }
}

// --- Authentication Functions ---
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

// --- Helper Functions ---
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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

async function handleSignIn(event) {
    event.preventDefault(); // Prevent form submission
    
    const email = document.getElementById('signin-email')?.value?.trim();
    const password = document.getElementById('signin-password')?.value;
    
    if (!email || !password) {
        showAuthMessage('Please fill in all fields', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showAuthMessage('Please enter a valid email address', 'error');
        return;
    }
    
    try {
        showAuthMessage('Signing in...', 'info');
        const { data, error } = await window.supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        showAuthMessage('Sign in successful! Redirecting...', 'success');
        
    } catch (error) {
        console.error('Sign in error:', error);
        
        // Handle specific Supabase errors
        if (error.message?.includes('rate limit')) {
            showAuthMessage('Too many sign-in attempts. Please wait a few minutes and try again.', 'error');
        } else if (error.message?.includes('Invalid login credentials')) {
            showAuthMessage('Incorrect email or password. Please check your credentials.', 'error');
        } else if (error.message?.includes('Email not confirmed')) {
            showAuthMessage('Please verify your email before signing in. Check your inbox for the verification link.', 'error');
        } else if (error.message?.includes('Invalid email')) {
            showAuthMessage('Please enter a valid email address.', 'error');
        } else {
            showAuthMessage(error.message || 'Sign in failed. Please try again.', 'error');
        }
    }
}

async function handleSignUp(event) {
    event.preventDefault(); // Prevent form submission
    
    const username = document.getElementById('signup-name')?.value?.trim();
    const email = document.getElementById('signup-email')?.value?.trim();
    const password = document.getElementById('signup-password')?.value;
    const confirmPassword = document.getElementById('signup-confirm-password')?.value;
    
    if (!username || !email || !password || !confirmPassword) {
        showAuthMessage('Please fill in all fields', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showAuthMessage('Please enter a valid email address', 'error');
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
    
    try {
        showAuthMessage('Creating account...', 'info');
        const { data, error } = await window.supabase.auth.signUp({
            email,
            password,
            options: { 
                data: { 
                    username: username.toLowerCase().replace(/\s+/g, '_')
                }
            }
        });
        
        if (error) throw error;
        
        showAuthMessage('Account created! Please check your email to verify.', 'success');
        setTimeout(() => {
            switchAuthTab('signin');
        }, 2000);
        
    } catch (error) {
        console.error('Sign up error:', error);
        
        // Handle specific Supabase errors
        if (error.message?.includes('rate limit')) {
            showAuthMessage('Too many sign-up attempts. Please wait a few minutes and try again.', 'error');
        } else if (error.message?.includes('User already registered')) {
            showAuthMessage('This email is already registered. Try signing in instead.', 'error');
        } else if (error.message?.includes('Password should be at least')) {
            showAuthMessage('Password must be at least 6 characters.', 'error');
        } else if (error.message?.includes('Invalid email')) {
            showAuthMessage('Please enter a valid email address.', 'error');
        } else {
            showAuthMessage(error.message || 'Sign up failed. Please try again.', 'error');
        }
    }
}

async function handleGoogleSignIn() {
    try {
        showAuthMessage('Redirecting to Google...', 'info');
        const { data, error } = await window.supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/index.html'
            }
        });
        
        if (error) throw error;
        
    } catch (error) {
        console.error('Google sign in error:', error);
        showAuthMessage('Google sign in failed', 'error');
    }
}

// Make functions globally accessible
window.switchAuthTab = switchAuthTab;
window.handleSignIn = handleSignIn;
window.handleSignUp = handleSignUp;
window.handleGoogleSignIn = handleGoogleSignIn;
window.togglePasswordVisibility = togglePasswordVisibility;
document.addEventListener('DOMContentLoaded', function() {
    console.log('[PLANOS Auth] Authentication page loaded');
    
    // No auto-redirect - let users access login page
    // Users will be redirected after successful login only
});
