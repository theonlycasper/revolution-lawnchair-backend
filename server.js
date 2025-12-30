const express = require('express'); // Express HTTP API
const validator = require('validator'); //Validator library for string sanitation
const app = express();
const PORT = 3000;

// This tells Express to serve the files in the 'public' folder
// (HTML, CSS, JS) as if they were a normal website.
app.use(express.static('public'));

// API Endpoint
// When the frontend requests '/api/message', we run this function.
app.get('/api/message', (req, res) => {
    const messages = [
        "Hello from the server!",
        "Node.js is cool!",
        "You are doing great!",
        "Servers are fun."
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    res.json({text:randomMessage});
});

/*
//Request profile information via API
app.get('/api/profile', (req, res) => {
    const userInput = req.body.name;
    if (!userInput) {
        return res.status(400).json({ error: "ProfileID is required" });
    }
    const sanitizedInput = validator.escape(userInput.trim());
    res.json({text:sanitizedInput});
})*/

app.post('/api/greet', (req, res) => {
    const userInput = req.body.name;
    if (!userInput) {
        return res.status(400).json({ error: "ProfileID is required" });
    }
    const sanitizedInput = validator.escape(userInput.trim());
    const allowedInput = validator.whitelist(sanitizedInput,'^[a-zA-Z0-9_-]*$') //RegExp for Most Chars
    res.json({text:allowedInput});
})

// Start the Server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
