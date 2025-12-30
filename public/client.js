const button = document.getElementById('myButton');
const responseArea = document.getElementById('response-area');

button.addEventListener('click', async () => {
    // 1. Call the API we created in server.js
    const response = await fetch('/api/message');

    // 2. Convert the response to JSON
    const data = await response.json();

    // 3. Update the HTML with the data
    responseArea.innerText = data.text;
});
