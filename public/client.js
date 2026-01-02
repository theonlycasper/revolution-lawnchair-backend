// --- Elements ---
const regName = document.getElementById('regName');
const regPass = document.getElementById('regPass');
const btnRegister = document.getElementById('btnRegister');
const regResponse = document.getElementById('regResponse');

const loginName = document.getElementById('loginName');
const loginPass = document.getElementById('loginPass');
const btnLogin = document.getElementById('btnLogin');
const loginResponse = document.getElementById('loginResponse');

// -- New Profile Elements --
const profileSection = document.getElementById('profileSection');
const btnRefreshProfile = document.getElementById('btnRefreshProfile');
const pUsername = document.getElementById('pUsername');
const pStatus = document.getElementById('pStatus');
const pJoined = document.getElementById('pJoined');

const updateDisplayName = document.getElementById('updateDisplayName');
const btnUpdateName = document.getElementById('btnUpdateName');

const updatePassword = document.getElementById('updatePassword');
const btnUpdatePass = document.getElementById('btnUpdatePass');

const profileMessage = document.getElementById('profileMessage');


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
        // Load profile immediately upon success
        loadUserProfile();
    } else {
        loginResponse.style.color = "red";
        loginResponse.innerText = "❌ " + (data.message || data.error);
        profileSection.style.display = 'none';
    }
});


// --- 3. Load User Profile ---
btnRefreshProfile.addEventListener('click', loadUserProfile);

async function loadUserProfile() {
    profileMessage.innerText = ""; // Clear old messages
    const response = await fetch('/api/me'); 

    if (!response.ok) {
        console.error("User not logged in or API error");
        profileSection.style.display = 'none';
        return;
    }

    const result = await response.json();
    const user = result.data; 

    // Show the section
    profileSection.style.display = 'block';

    // Populate Fields
    pUsername.innerText = user.display_name || user.username;
    pJoined.innerText = new Date(user.created_at).toLocaleDateString();
    updateDisplayName.value = user.display_name; // Pre-fill input

    // Parse and Display Status
    try {
        const statusObj = JSON.parse(user.status);
        const statusText = statusObj.status || "UNKNOWN";
        
        // Add visual styling
        pStatus.innerText = statusText;
        pStatus.className = "status-badge " + (statusText === 'ACTIVE' ? "status-active" : "status-inactive");
    } catch (e) {
        pStatus.innerText = user.status;
    }
}


// --- 4. Update Display Name ---
btnUpdateName.addEventListener('click', async () => {
    const newName = updateDisplayName.value;
    if(!newName) return;

    profileMessage.style.color = 'black';
    profileMessage.innerText = "Updating name...";

    const response = await fetch('/api/me/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            changetype: 'displayname',
            display_name: newName 
        })
    });
    const data = await response.json();

    if (response.ok) {
        profileMessage.style.color = 'green';
        profileMessage.innerText = "✅ " + data.message;
        loadUserProfile(); // Refresh to see changes
    } else {
        profileMessage.style.color = 'red';
        profileMessage.innerText = "❌ " + data.error;
    }
});


// --- 5. Update Password ---
btnUpdatePass.addEventListener('click', async () => {
    const newPass = updatePassword.value;
    if(!newPass) {
        profileMessage.style.color = 'red';
        profileMessage.innerText = "Password cannot be empty.";
        return;
    }

    profileMessage.style.color = 'black';
    profileMessage.innerText = "Updating password...";

    const response = await fetch('/api/me/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            changetype: 'password',
            password: newPass 
        })
    });
    const data = await response.json();

    if (response.ok) {
        profileMessage.style.color = 'green';
        profileMessage.innerText = "✅ " + data.message;
        updatePassword.value = ""; // Clear the input for security
    } else {
        profileMessage.style.color = 'red';
        profileMessage.innerText = "❌ " + data.error;
    }
});