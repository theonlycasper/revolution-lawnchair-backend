// User Input
const sendButton = document.getElementById('sendButton');
const nameInput = document.getElementById('nameInput');
const inputResponse = document.getElementById('input-response');
const loadButton = document.getElementById('loadButton');
const namesList = document.getElementById('names-list');

// Function to fetch and display names
async function loadNames() {
    const response = await fetch('/api/names');
    const result = await response.json();
    
    // Clear current list
    namesList.innerHTML = '';

    // Loop through the data and create list items
    result.data.forEach(user => {
        const li = document.createElement('li');
        li.textContent = `${user.id}: ${user.name}`;
        namesList.appendChild(li);
    });
}

// Event: Save Name
sendButton.addEventListener('click', async () => {
    const nameText = nameInput.value;

    const response = await fetch('/api/greet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameText })
    });

    const data = await response.json();
    inputResponse.innerText = data.message;
    
    // Reload the list automatically after saving
    loadNames();
});

// Event: Load Names Manually
loadButton.addEventListener('click', loadNames);

// Load names immediately when page opens
loadNames();