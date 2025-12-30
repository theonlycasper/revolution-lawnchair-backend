// 1. Import Express
const express = require('express');
const app = express();
const PORT = 3000;

// 2. Serve Static Files
// This tells Express to serve the files in the 'public' folder
// (HTML, CSS, JS) as if they were a normal website.
app.use(express.static('public'));

// 3. Create an API Endpoint
// When the frontend requests '/api/message', we run this function.
app.get('/api/message', (req, res) => {
    const messages = [
        "Hello from the server!",
        "Node.js is cool!",
        "You are doing great!",
        "Servers are fun."
    ];

    // Pick a random message
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    // Send it back to the frontend as JSON
    res.json({ text: randomMessage });
});

// 4. Start the Server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
