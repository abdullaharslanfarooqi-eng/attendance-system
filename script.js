// Supabase configuration - REPLACE WITH YOUR VALUES
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

// Get these from Supabase: Settings → API
let supabaseClient = null;

async function initSupabase() {
    if (!supabaseClient) {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabaseClient;
}

// Handle login
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        const supabase = await initSupabase();
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            document.getElementById('errorMsg').innerText = 'Login failed: ' + error.message;
        } else {
            localStorage.setItem('teacherLoggedIn', 'true');
            localStorage.setItem('teacherEmail', email);
            window.location.href = 'teacher-dashboard.html';
        }
    });
}
