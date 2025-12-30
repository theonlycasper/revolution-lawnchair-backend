const sendButton = document.getElementById('sendButton');
const nameInput = document.getElementById('nameInput');
const inputResponse = document.getElementById('input-response');
const loadButton = document.getElementById('loadButton');
const namesList = document.getElementById('names-list');

async function loadNames() {
    const response = await fetch('/api/names');
    const result = await response.json();
    
    namesList.innerHTML = '';

    result.data.forEach(user => {
        const li = document.createElement('li');
        
        // Make the date look nice for the user (readable), 
        // but remember the DB stores the strict ISO string.
        const readableDate = new Date(user.created_at).toLocaleString();

        li.innerHTML = `
            <strong>${user.name}</strong> <br>
            <small>Date: ${readableDate}</small> <br>
            <small>ID: ${user.id}</small> <br>
            <small style="color: #666; font-family: monospace;">Hash: ${user.data_hash}</small>
        `;
        li.style.marginBottom = "10px";
        li.style.borderBottom = "1px solid #ddd";
        namesList.appendChild(li);
    });
}

sendButton.addEventListener('click', async () => {
    const nameText = nameInput.value;

    const response = await fetch('/api/greet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameText })
    });

    const data = await response.json();
    inputResponse.innerText = data.message;
    loadNames();
});

loadButton.addEventListener('click', loadNames);
loadNames();