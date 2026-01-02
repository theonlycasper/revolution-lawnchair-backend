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
            username TEXT UNIQUE,
            password_hash TEXT,
            created_at TEXT,
            last_login TEXT,
            data_hash TEXT,
            display_name TEXT,
            status TEXT,
            session_token TEXT
        )`);
    }
});

//Status JSON Reference {"status":"ACTIVE","admin":false,"vip":false,"verified":false}


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

//GET profile information via API with Session Token
app.get('/api/me', requireAuth, (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        return res.status(400).json({ error: "User has not logged in." });
    }
    db.all("SELECT * FROM users WHERE id = ? LIMIT 1", [userId], (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        const output = rows[0]
        delete output['password_hash']
        delete output['data_hash']
        res.json({ data: output });
        //DEBUG console.log(output);
    });
})


// POST (Update User Properties)
app.post('/api/me/update', requireAuth, (req, res) => {
    const { changetype } = req.body;
    const userId = req.session.userId;

    if (!changetype) {
        return res.status(400).json({ error: "Missing changetype parameter." });
    }

    // Fetch current user data to perform updates or calculate hashes
    db.get("SELECT * FROM users WHERE id = ?", [userId], async (err, user) => {
        if (err) return res.status(500).json({ error: "Database error." });
        if (!user) return res.status(404).json({ error: "User not found." });

        try {
            // --- CASE 1: Password Update ---
            if (changetype === 'password') {
                const { password } = req.body;
                
                // 1. Sanitize (Using your strict whitelist pattern)
                const sanitizedPass = validator.whitelist(validator.escape(password || ''), '^[a-zA-Z0-9_-]*$');
                
                if (!sanitizedPass || sanitizedPass.length < 1) {
                    return res.status(400).json({ error: "Invalid password format." });
                }

                // 2. Hash new password
                const newPassHash = await argon2.hash(sanitizedPass);

                // 3. Recalculate Integrity Hash (Username + Hash + CreatedAt)
                // We must do this because the password hash part of the formula has changed.
                const hashingJson = {"username":user.username,"password_hash":newPassHash,"timestamp":user.created_at,"status":user.status}
                const newIntegrityHash = integrityHash(hashingJson)
            
                // 4. Update Database
                db.run("UPDATE users SET password_hash = ?, data_hash = ? WHERE id = ?", 
                    [newPassHash, newIntegrityHash, userId], 
                    (updateErr) => {
                        if (updateErr) return res.status(500).json({ error: "Failed to update password." });
                        res.json({ success: true, message: "Password updated successfully." });
                    }
                );

            // --- CASE 2: Display Name Update ---
            } else if (changetype === 'displayname') {
                const { display_name } = req.body;

                // 1. Sanitize (Escape HTML, but allow spaces/text)
                const sanitizedDisplay = validator.escape((display_name || '').trim());

                if (!sanitizedDisplay) {
                    return res.status(400).json({ error: "Display name cannot be empty." });
                }

                // 2. Update Database (No need to update data_hash)
                db.run("UPDATE users SET display_name = ? WHERE id = ?", 
                    [sanitizedDisplay, userId], 
                    (updateErr) => {
                        if (updateErr) return res.status(500).json({ error: "Failed to update display name." });
                        
                        // 3. Update Session immediately so the user sees the change
                        req.session.displayname = sanitizedDisplay;
                        
                        res.json({ success: true, message: "Display name updated." });
                    }
                );

            } else {
                return res.status(400).json({ error: "Invalid changetype provided." });
            }

        } catch (e) {
            console.error(e);
            res.status(500).json({ error: "Server error processing update." });
        }
    });
});


// POST (Register User)
app.post('/api/register', (req, res) => {
    const { name, password } = req.body;
    if (!name || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }
    const timestamp = new Date().toISOString();
    const sanitizedName = validator.whitelist(validator.escape(name.trim()),'^[a-zA-Z0-9_-]*$');
    const sanitizedPass = validator.whitelist(validator.escape(password.trim()),'^[a-zA-Z0-9_-]*$');

    db.get("SELECT id FROM users WHERE username = ?", [sanitizedName], async (err, row) => {
        if (err) {
            return res.status(500).json({ error: "Database error during check" });
        }
        if (row) {
            return res.status(409).json({ error: "Username already taken" });
        }

        //IF USER DOES NOT EXIST -> PROCEED WITH REGISTRATION
        try {
            const hash = await argon2.hash(sanitizedPass);
            const status = JSON.stringify({"status":"ACTIVE","admin":false,"vip":false,"verified":false})
            const hashingJson = {"username":sanitizedName,"password_hash":hash,"timestamp":timestamp,"status":status}
            const newIntegrityHash = integrityHash(hashingJson)
            db.run("INSERT INTO users (username, password_hash, created_at, last_login, data_hash, display_name, status) VALUES (?, ?, ?, ?, ?, ?, ?)", 
            [sanitizedName, hash, timestamp, timestamp, newIntegrityHash, sanitizedName, status], 
            function (err) {
                if (err) return res.status(500).json({ error: "Could not register user" });
                res.json({message: `User ${sanitizedName} registered!`});
            });
        } catch (err) {
            res.status(500).json({ error: "Error hashing password" });
        }
    });
});

// POST (Login User)
app.post('/api/login', (req, res) => {
    const { name, password } = req.body;

    if (!name || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }
    const sani_name = validator.whitelist(validator.escape(name.trim()), '^[a-zA-Z0-9_-]*$');
    const sani_pass = validator.whitelist(validator.escape(password.trim()), '^[a-zA-Z0-9_-]*$');

    db.get("SELECT * FROM users WHERE username = ?", [sani_name], async (err, user) => {
        if (err) return res.status(500).json({ error: "Internal server error" });
        if (!user) return res.status(401).json({ error: "Invalid credentials" });

        verifyUserIntegrity(user.id, async (err, wasPruned) => {
            if (err) {
                if (wasPruned)
                {
                    return res.status(500).json({ error: err });
                }
                else{
                    return res.status(500).json({ error: "Error checking integrity" });
                }
            }

            // If the function returned true, the user is gone. Stop logging in.
            if (wasPruned) {
                return res.status(401).json({ error: "Account compromised and deleted." });
            }

            try {
                // VERIFY: Argon2 verify checks the password against the hash.
                // It automatically extracts the salt and parameters from the stored hash string.
                const validPassword = await argon2.verify(user.password_hash, sani_pass);
                if (validPassword) {
                    req.session.regenerate(async (err) => {
                        if (err) return res.status(500).json({ error: "Could not create session" });
                        const sessionToken = crypto.randomBytes(32).toString('hex');
                        const timestamp = new Date().toISOString();
                        db.run("UPDATE users SET session_token = ?, last_login = ? WHERE id = ?",[sessionToken, timestamp, user.id],(updateErr) => {
                            if (updateErr) return res.status(500).json({ error: "Login failed during token save" });
                            //Store Token in Session Cookie
                            req.session.userId = user.id;
                            req.session.username = user.username;
                            req.session.displayname = user.display_name;
                            req.session.status = user.status;
                            req.session.token = sessionToken;
                            return res.json({ success: true, message: "Login Successful!" });
                        })
                    });
                } else {
                    return res.status(401).json({ error: "Invalid credentials" });
                }
            } catch (e) {
                // Internal error (e.g., hash format was wrong)
                return res.status(500).json({ error: "Error processing login" });
            }
        });
    });
});

// GET (Admin: Fetch specific user details for editing)
app.get('/api/admin/user/:username', requireAuth, (req, res) => {
    const requesterId = req.session.userId;
    const targetUsername = req.params.username;

    // 1. Verify Requester is Admin
    db.get("SELECT status FROM users WHERE id = ?", [requesterId], (err, row) => {
        if (err || !row) return res.status(500).json({ error: "Auth check failed." });

        const requesterStatus = JSON.parse(row.status);
        if (requesterStatus.admin !== true) {
            return res.status(403).json({ error: "Access Denied: Admins only." });
        }

        // 2. Fetch Target User
        const sani_target = validator.whitelist(validator.escape(targetUsername), '^[a-zA-Z0-9_-]*$');
        
        db.get("SELECT username, status, created_at FROM users WHERE username = ?", [sani_target], (err, targetRow) => {
            if (err) return res.status(500).json({ error: "Database error." });
            if (!targetRow) return res.status(404).json({ error: "User not found." });

            // Return the raw status string so the admin can edit it
            res.json({ user: targetRow });
        });
    });
});

// POST (Admin Update User Status)
app.post('/api/update', requireAuth, (req, res) => {
    const requesterId = req.session.userId;
    const { target_username, new_status } = req.body;

    // 1. Basic Validation
    if (!target_username || !new_status) {
        return res.status(400).json({ error: "Target username and new status object are required." });
    }

    // 2. Check if the REQUESTER is an Admin
    db.get("SELECT status FROM users WHERE id = ?", [requesterId], (err, row) => {
        if (err) return res.status(500).json({ error: "Database error checking permissions." });
        if (!row) return res.status(401).json({ error: "User not found." });

        try {
            const requesterStatus = JSON.parse(row.status);
            
            // If strictly checks for boolean true
            if (requesterStatus.admin !== true && user.id !== 1) {
                return res.status(403).json({ error: "Forbidden: You do not have admin privileges." });
            }

            // 3. Admin verified. Now fetch the TARGET user.
            const sani_target = validator.whitelist(validator.escape(target_username.trim()), '^[a-zA-Z0-9_-]*$');

            db.get("SELECT * FROM users WHERE username = ?", [sani_target], (err, targetUser) => {
                if (err) return res.status(500).json({ error: "Database error finding target." });
                if (!targetUser) return res.status(404).json({ error: "Target user not found." });

                // 4. Prepare data for Integrity Hash Recalculation
                // We must stringify the new status object to store it
                let statusString;
                try {
                    statusString = JSON.stringify(new_status);
                } catch (e) {
                    return res.status(400).json({ error: "Invalid JSON format for status." });
                }

                const hashingJson = {"username": targetUser.username,"password_hash": targetUser.password_hash,"timestamp": targetUser.created_at,"status": statusString};
                const newIntegrityHash = integrityHash(hashingJson);

                // 5. Update the Database
                db.run("UPDATE users SET status = ?, data_hash = ? WHERE id = ?", 
                    [statusString, newIntegrityHash, targetUser.id], 
                    (updateErr) => {
                        if (updateErr) return res.status(500).json({ error: "Failed to update user status." });
                        
                        console.log(`Admin ${requesterId} updated status for user ${targetUser.username}`);
                        res.json({ success: true, message: `User ${targetUser.username} status updated successfully.` });
                    }
                );
            });

        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: "Server error processing admin request." });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});

// Functions

const verifyUserIntegrity = (userId, callback) => {
    db.get("SELECT id, username, password_hash, created_at, data_hash, status FROM users WHERE id = ?", [userId], (err, row) => {
        if (err) {
            // If DB error, pass it to the callback
            return callback(err, false); 
        }
        if (!row) {
            // User doesn't exist, so they aren't corrupt. Pass 'false' (not pruned).
            return callback(null, false); 
        }
        const userstatus = JSON.parse(row.status)
        if (userstatus.status !== "ACTIVE"){
            const babble = "User was deactivated"
            return callback(babble, true); 
        }
        //Construct Hash
        const hashingJson = {"username":row.username,"password_hash":row.password_hash,"timestamp":row.created_at,"status":row.status}
        const calculatedHash = integrityHash(hashingJson)

        if (calculatedHash !== row.data_hash) {
            console.warn(`Integrity check failed for User ID ${userId}. Deleting...`);
            
            // Delete the user
            db.run("DELETE FROM users WHERE id = ?", [userId], (delErr) => {
                if (delErr) return callback(delErr);
                // Done deleting. Pass 'true' (user was pruned)
                callback(null, true); 
            });
        } else {
            // Hash matches. Pass 'false' (user was not pruned)
            callback(null, false);
        }
    });
};


function requireAuth(req, res, next) {
    // 1. Check if session exists
    if (!req.session || !req.session.userId || !req.session.token) {
        return res.status(401).json({ error: "Unauthorized. Please log in." });
    }

    // 2. Fetch the user's current valid token from the DB
    db.get("SELECT session_token FROM users WHERE id = ?", [req.session.userId], (err, row) => {
        if (err) return res.status(500).json({ error: "Database error during auth." });
        
        // 3. User might have been deleted or token cleared
        if (!row || !row.session_token) {
            req.session.destroy();
            return res.status(401).json({ error: "Session invalid. Please login again." });
        }

        // 4. Constant-Time Comparison (Prevents Timing Attacks)
        const sessionTokenBuffer = Buffer.from(req.session.token);
        const dbTokenBuffer = Buffer.from(row.session_token);

        // Ensure buffers are same length before comparing to prevent errors
        if (sessionTokenBuffer.length !== dbTokenBuffer.length || 
            !crypto.timingSafeEqual(sessionTokenBuffer, dbTokenBuffer)) {
            
            // Token mismatch (Possible hijack attempt or user logged in elsewhere)
            req.session.destroy(); 
            return res.status(401).json({ error: "Invalid session token." });
        }
        // 5. Auth Success
        next();
    });
}

function integrityHash(valuejson){
    const data_hash = crypto.createHash('sha256')
        .update(process.env.SESSION_SECRET + valuejson.username + valuejson.password_hash + valuejson.timestamp + valuejson.status)
        .digest('hex');
    return data_hash
}