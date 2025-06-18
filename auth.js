// IMPORTANT: Replace with your actual Supabase URL and Anon Key
const SUPABASE_URL = "https://eazniarblwaueyhvjasc.supabase.co"; // Replace with your Supabase project URL
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhem5pYXJibHdhdWV5aHZqYXNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3NDk2NjIsImV4cCI6MjA1NjMyNTY2Mn0.3K_Wml5gExADzVswe7RpTpxy2Cv_SY8qyR1R76Ht0PY"; // Replace with your Supabase project anon key

// Declare supabaseClient in a scope accessible for global assignment
let supabaseClient;

try {
    // The global 'supabase' object is provided by the Supabase CDN script
    const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    // Assign to a global variable for access in other scripts
    window.supabaseClient = client;
    supabaseClient = client; // Also keep it for local use within this file if preferred
} catch (error) {
    console.error('Error initializing Supabase client:', error);
    alert('Failed to initialize Supabase. Please check your Supabase URL and Key in auth.js and ensure the Supabase SDK is loaded.');
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const signUpForm = document.getElementById('signUpForm');
    const showSignUpLink = document.getElementById('showSignUp');
    const showLoginLink = document.getElementById('showLogin');
    const authMessage = document.getElementById('authMessage');

    // Check if user is already logged in
    checkUserSession();

    async function checkUserSession() {
        if (!supabaseClient) return;
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            // If on login page (now index.html) and logged in, redirect to pcr_form.html
            if (window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html')) {
                window.location.href = 'pcr_form.html';
            }
        } else {
            // If on a page other than login (index.html) and not logged in, redirect to login (index.html)
            if (!window.location.pathname.endsWith('/') && !window.location.pathname.endsWith('index.html')) {
                window.location.href = 'index.html'; // Redirect to the new login page
            }
        }
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!supabaseClient) { authMessage.textContent = 'Supabase client not initialized.'; return; }
            const email = loginForm.email.value;
            const password = loginForm.password.value;
            authMessage.textContent = '';

            try {
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password,
                });
                if (error) throw error;
                console.log('Login successful:', data);
                window.location.href = 'pcr_form.html'; // Redirect to the main app page
            } catch (error) {
                console.error('Login error:', error);
                authMessage.textContent = error.message || 'Failed to login.';
            }
        });
    }

    if (signUpForm) {
        signUpForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!supabaseClient) { authMessage.textContent = 'Supabase client not initialized.'; return; }
            const email = signUpForm.signUpEmail.value;
            const password = signUpForm.signUpPassword.value;
            authMessage.textContent = '';

            try {
                const { data, error } = await supabaseClient.auth.signUp({
                    email: email,
                    password: password,
                });
                if (error) {
                    // Check if error is due to user already registered
                    if (error.message.includes('User already registered')) {
                         authMessage.textContent = 'User already registered. Please login or use a different email.';
                    } else {
                        throw error;
                    }
                } else {
                    console.log('Sign up successful, confirmation email sent (if enabled):', data);
                    authMessage.textContent = 'Sign up successful! Please check your email to confirm your account (if email confirmation is enabled in Supabase). You can now try to login.';
                    // Optionally hide signup and show login
                    signUpForm.style.display = 'none';
                    loginForm.style.display = 'block';
                }
            } catch (error) {
                console.error('Sign up error:', error);
                authMessage.textContent = error.message || 'Failed to sign up.';
            }
        });
    }

    if (showSignUpLink) {
        showSignUpLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.style.display = 'none';
            signUpForm.style.display = 'block';
            authMessage.textContent = '';
        });
    }

    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            signUpForm.style.display = 'none';
            loginForm.style.display = 'block';
            authMessage.textContent = '';
        });
    }

    // Listen for auth state changes (e.g., logout from another tab)
    if (supabaseClient) {
        supabaseClient.auth.onAuthStateChange((event, session) => {
            console.log('Auth event:', event, session);
            if (event === 'SIGNED_OUT') {
                // If signed out, redirect to login page (index.html)
                if (!window.location.pathname.endsWith('/') && !window.location.pathname.endsWith('index.html')) {
                    window.location.href = 'index.html';
                }
            } else if (event === 'SIGNED_IN') {
                // If signed in and on login page (index.html), redirect to pcr_form.html
                if (window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html')) {
                     window.location.href = 'pcr_form.html';
                }
            }
        });
    }
});

async function logout() {
    if (!supabaseClient) { console.error('Supabase client not initialized.'); return; }
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        console.log('Logged out successfully');
        window.location.href = 'index.html'; // Redirect to the new login page
    } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to logout: ' + error.message);
    }
}