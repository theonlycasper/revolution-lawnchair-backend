require('dotenv').config();

const express = require('express'); // Express HTTP API
const session = require('express-session');
const argon2 = require('argon2');
const validator = require('validator'); //Validator library for string sanitation
const sqlite3 = require('sqlite3').verbose(); // Import SQLite
const crypto = require('crypto'); //Crypto module

const app = express();
const PORT = 3000;
// This creates a file named 'database.db' in your project folder
const db = new sqlite3.Database(process.env.DB_PATH || './database.db', (err) => {
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
            last_login TEXT,
            data_hash TEXT,
            display_name TEXT
        )`);
    }
});


// Middleware
app.use(express.json()); // If this is missing or below the routes, req.body will be undefined.
app.use(express.static('public')); // This tells Express to serve the files in the 'public' folder as if they were a normal website.
app.use(session({
    secret: process.env.SESSION_SECRET, // Reads from .env
    resave: false,
    saveUninitialized: false,
    cookie: { 
        // 3. Use NODE_ENV to determine if we are in production
        secure: process.env.NODE_ENV === 'production', 
        httpOnly: true,
        maxAge: 1000 * 60 * process.env.SESSION_TIME //1 Hour Session Time 
    }
}));


// Routes

/* TODO
- /api/register should require some kind of verification to prevent the mass creation of user accounts.
- /api/login should log the latest date of login.
- /api/login should store a session token that can be exchanged for information within 15-20 minutes of its creation.
*/


//Request profile information via API
app.get('/api/me', (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        return res.status(400).json({ error: "User has not logged in." });
    }
    db.all("SELECT * FROM users WHERE id = ? LIMIT 1", [userId], (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        console.log(rows[0]);
        res.json({data:rows});
    });
    res.json({text:sanitizedInput});
})


// GET all names
app.get('/api/names', (req, res) => {
    // Order by ID descending (newest first)
    db.all("SELECT * FROM users ORDER BY created_at DESC", [], (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({data:rows});
    });
});

// POST (Register User)
app.post('/api/register', async (req, res) => {
    const { name, password } = req.body;
    if (!name || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }
    const timestamp = new Date().toISOString();
    const sanitizedName = validator.whitelist(validator.escape(name.trim()),'^[a-zA-Z0-9_-]*$');
    const sanitizedPass = validator.whitelist(validator.escape(password.trim()),'^[a-zA-Z0-9_-]*$');
    try {
        // HASH: Generates an Argon2id hash with a random salt automatically.
        // The resulting string looks like: $argon2id$v=19$m=65536,t=3,p=4$SALT$HASH
        const hash = await argon2.hash(sanitizedPass);
        const integrityHash = crypto.createHash('sha256').update(sanitizedName + hash + timestamp).digest('hex');
        db.run("INSERT INTO users (username, password_hash, created_at, last_login, data_hash) VALUES (?, ?, ?, ?, ?)", [sanitizedName, hash, timestamp, timestamp, integrityHash], (err) => {
            if (err) return res.status(500).json({ error: "Could not register user" });
            res.json({ success: true, 
                message: `User ${sanitizedName} registered!`,
                id: this.lastID,
                created_at: timestamp
             });
        });
    } catch (err) {
        res.status(500).json({ error: "Error hashing password" });
    }
});


// POST (Login User)
app.post('/api/login', (req, res) => {
    const { name, password } = req.body;

    if (!name || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }
    const sanitizedName = validator.whitelist(validator.escape(name.trim()),'^[a-zA-Z0-9_-]*$');
    const sanitizedPass = validator.whitelist(validator.escape(password.trim()),'^[a-zA-Z0-9_-]*$');

    db.get("SELECT * FROM users WHERE username = ?", [sanitizedName], async (err, user) => {
        if (err) return res.status(500).json({ error: "Internal server error" });
        
        // Generic error to prevent username enumeration
        if (!user) return res.status(401).json({ error: "Invalid credentials" });

        try {
            // VERIFY: Argon2 verify checks the password against the hash.
            // It automatically extracts the salt and parameters from the stored hash string.
            const validPassword = await argon2.verify(user.password_hash, sanitizedPass);

            if (validPassword) {
                // SESSION: Store user ID in the session
                req.session.userId = user.id;
                req.session.username = user.username;
                req.session.displayname = user.display_name
                return res.json({ success: true, message: "Login Successful!" });
            } else {
                return res.status(401).json({ error: "Invalid credentials" });
            }
        } catch (e) {
            // Internal error (e.g., hash format was wrong)
            return res.status(500).json({ error: "Error processing login" });
        }
    });
});


app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});