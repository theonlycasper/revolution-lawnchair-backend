const express = require('express'); // Express HTTP API
const validator = require('validator'); //Validator library for string sanitation
const sqlite3 = require('sqlite3').verbose(); // Import SQLite

const app = express();
const PORT = 3000;

// DB
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error("Error opening database " + err.message);
    } else {
        console.log("Connected to the SQLite database.");
        
        // Create a table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT
        )`);
    }
});

// Middleware
// This line tells Express to read the "body" of the request (JSON)
// If this is missing or below the routes, req.body will be undefined.
app.use(express.json());
// This tells Express to serve the files in the 'public' folder
// (HTML, CSS, JS) as if they were a normal website.
app.use(express.static('public'));

// Routes
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

app.get('/api/names', (req, res) => {
    const sql = "SELECT * FROM users ORDER BY id DESC";
    // db.all runs the query and returns all rows
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ data: rows });
    });
});

app.post('/api/greet', (req, res) => {
    var userInput = '';
    try{
        userInput = req.body.name;
    } catch(e){
        console.error(e)
    }

    if (!userInput) {
        return res.status(400).json({ error: "Name is required" });
        //return res.status(400).json({ error: "ProfileID is required" });
    }

    const sanitizedInput = validator.whitelist(validator.escape(userInput.trim()),'^[a-zA-Z0-9_-]*$') //RegExp for Most Chars
    const sql = "INSERT INTO users (name) VALUES (?)";
    const params = [sanitizedInput];

    // db.run executes the SQL
    db.run(sql, params, function (err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        
        // 'this.lastID' gives us the ID of the row we just created
        res.json({ 
            message: `Saved ${sanitizedInput} to database!`,
            id: this.lastID,
            sanitized: sanitizedInput
        });
    });
    //DEBUG console.log(`Input received: ${sanitizedInput}`)
    res.json({message:sanitizedInput}); //Response
})

// Start the Server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
