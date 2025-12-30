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
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            password_hash TEXT,
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

// POST (Register User)
app.post('/api/register', async (req, res) => {
    const { name, password } = req.body;

    if (!name || !password) {
        return res.status(400).json({ error: "Name and Password are required" });
    }
    const sanitizedName = validator.whitelist(validator.escape(name.trim()),'^[a-zA-Z0-9_-]*$');
    const sanitizedPass = validator.whitelist(validator.escape(password.trim()),'^[a-zA-Z0-9_-]*$');
    const timestamp = new Date().toISOString();

    // Hash the Password
    const hashedPassword = crypto.createHash('sha256').update(sanitizedName + sanitizedPass + timestamp).digest('hex');

    // Create the integrity hash (Name + Time) - we don't include password here usually
    const integrityHash = crypto.createHash('sha256').update(sanitizedName + timestamp).digest('hex');

    const sql = "INSERT INTO users (username, password_hash, created_at, data_hash) VALUES (?, ?, ?, ?)";
    const params = [sanitizedName, hashedPassword, timestamp, integrityHash];

    db.run(sql, params, function (err) {
        if (err) return res.status(400).json({ error: err.message });
        
        res.json({ 
            message: `User ${sanitizedName} registered!`,
            id: this.lastID
        });
    });
});

app.post('/api/login', (req, res) => {
    const { name, password } = req.body;
    
    // Find the user by name
    db.get("SELECT * FROM users WHERE username = ?", [name], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(400).json({ error: "User not found" });

        const sanitizedName = validator.whitelist(validator.escape(name.trim()),'^[a-zA-Z0-9_-]*$');
        const sanitizedPass = validator.whitelist(validator.escape(password.trim()),'^[a-zA-Z0-9_-]*$');
        // Compare the plain password with the stored hash
        const match = crypto.createHash('sha256').update(sanitizedName + sanitizedPass + user.created_at).digest('hex');
        if (match == user.password_hash){
            res.json({ success: true, message: "Login Successful! Welcome back." });
        } else {
            res.json({ success: false, message: "Invalid Password." });
        }
    });
});


app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});