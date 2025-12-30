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
    loadUsers(); // Refresh list
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
    } else {
        loginResponse.style.color = "red";
        loginResponse.innerText = "❌ " + (data.message || data.error);
    }
});

// --- 3. Load Users ---
async function loadUsers() {
    const response = await fetch('/api/names');
    const result = await response.json();
    userList.innerHTML = '';

    result.data.forEach(user => {
        const li = document.createElement('li');
        // NOTE: We do NOT send the password hash to the frontend.
        // It's a security best practice to keep hashes on the server only.
        li.innerHTML = `
            <strong>${user.username}</strong> <br>
            <small>Joined: ${new Date(user.created_at).toLocaleString()}</small>
        `;
        li.style.borderBottom = "1px solid #ddd";
        li.style.marginBottom = "5px";
        userList.appendChild(li);
    });
}

// Initial Load
loadUsers();