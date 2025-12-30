const express = require('express'); // Express HTTP API
const validator = require('validator'); //Validator library for string sanitation
const sqlite3 = require('sqlite3').verbose(); // Import SQLite
const crypto = require('crypto'); //Crypto module

const app = express();
const PORT = 3000;
// This creates a file named 'database.db' in your project folder
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error("Error opening database " + err.message);
    } else {
        console.log("Connected to the SQLite database.");
        
        // Create a table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            created_at TEXT,
            data_hash TEXT
        )`);
    }
});


// Middleware
app.use(express.json()); // If this is missing or below the routes, req.body will be undefined.
app.use(express.static('public')); // This tells Express to serve the files in the 'public' folder as if they were a normal website.

// Routes
/*
//Request profile information via API
app.get('/api/profile', (req, res) => {
    const userInput = req.body.name;
    if (!userInput) {
        return res.status(400).json({ error: "ProfileID is required" });
    }
    const sanitizedInput = validator.escape(userInput.trim());
    res.json({text:sanitizedInput});
})
*/

// GET all names
app.get('/api/names', (req, res) => {
    // Order by ID descending (newest first)
    db.all("SELECT * FROM users ORDER BY created_at DESC", [], (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ data: rows });
    });
});

// POST (Save Name)
app.post('/api/greet', (req, res) => {
    const userInput = req.body.name;

    // Collect values
    if (!userInput) return res.status(400).json({ error: "Name is required" });

    let uuid = crypto.randomUUID();
    const sanitizedName = validator.whitelist(validator.escape(userInput.trim()),'^[a-zA-Z0-9_-]*$');
    const timestamp = new Date().toISOString();

    // Create a Cryptographic Hash
    const combinedString = sanitizedName + timestamp;
    const hash = crypto.createHash('sha256').update(combinedString).digest('hex');

    // 5. Insert into Database
    const sql = "INSERT INTO users (id, name, created_at, data_hash) VALUES (?, ?, ?, ?)";
    //const sql = "INSERT INTO users (userid, name, created_at, data_hash) VALUES (?, ?, ?, ?)";
    const params = [uuid, sanitizedName, timestamp, hash];

    db.run(sql, params, function (err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        
        res.json({ 
            message: `Saved ${sanitizedName} to database!`,
            id: this.lastID,
            created_at: timestamp,
            hash: hash
        });
    });
});


app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});