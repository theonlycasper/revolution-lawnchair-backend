// --- Elements ---
const regName = document.getElementById('regName');
const regPass = document.getElementById('regPass');
const btnRegister = document.getElementById('btnRegister');
const regResponse = document.getElementById('regResponse');

const loginName = document.getElementById('loginName');
const loginPass = document.getElementById('loginPass');
const btnLogin = document.getElementById('btnLogin');
const loginResponse = document.getElementById('loginResponse');

const userList = document.getElementById('userList');
const btnLoad = document.getElementById('btnLoad');

// --- 1. Register ---
btnRegister.addEventListener('click', async () => {
    const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            name: regName.value, 
            password: regPass.value 
        })
    });
    const data = await response.json();
    regResponse.innerText = data.message || data.error;
});

// --- 2. Login ---
btnLogin.addEventListener('click', async () => {
    const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            name: loginName.value, 
            password: loginPass.value 
        })
    });
    const data = await response.json();
    
    if (data.success) {
        loginResponse.style.color = "green";
        loginResponse.innerText = "✅ " + data.message;
        loadUsers();
    } else {
        loginResponse.style.color = "red";
        loginResponse.innerText = "❌ " + (data.message || data.error);
    }
});

// --- 3. Load Users ---
btnLoad.addEventListener('click', async () => {
    loadUsers();
});

async function loadUsers() {
    const response = await fetch('/api/me');
    const result = await response.json();
    userList.innerHTML = '';

    result.data.forEach(user => {
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>${user.username}</strong> <br>
            <small>Joined: ${new Date(user.created_at).toLocaleString()}</small>
        `;
        li.style.borderBottom = "1px solid #ddd";
        li.style.marginBottom = "5px";
        userList.appendChild(li);
    });
}
/*
async function loadUserProfile() {
    // 1. Change the endpoint to one that returns the CURRENT user's info.
    // The backend should determine who this is based on the session cookie or token.
    const response = await fetch('/api/me'); 

    // Handle cases where the user isn't logged in
    if (!response.ok) {
        console.error("User not logged in or API error");
        userList.innerHTML = '<p>Please log in to view your profile.</p>';
        return;
    }

    const result = await response.json();
    
    // 2. No loop needed. We assume 'result' is the user object itself.
    // (If your API wraps it, you might need 'const user = result.data')
    const user = result; 

    userList.innerHTML = '';

    // 3. Create a container for the single user (e.g., a div instead of li)
    const profileCard = document.createElement('div');
    
    // Security Note: Ensure your API still does not send the password hash!
    profileCard.innerHTML = `
        <h3>Welcome, ${user.username}</h3>
        <p>Member since: ${new Date(user.created_at).toLocaleDateString()}</p>
    `;
    
    // Optional styling for the profile card
    profileCard.style.padding = "20px";
    profileCard.style.border = "1px solid #ddd";
    profileCard.style.borderRadius = "8px";

    userList.appendChild(profileCard);
}
*/