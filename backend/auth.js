const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // 1. WE IMPORT BCRYPT
const router = express.Router();

const pool = require('./db'); 

// ---------------------------------------------------------
// 1. THE SECURE LOGIN ROUTE (POST /api/login)
// ---------------------------------------------------------
router.post('/login', async (req, res) => {
    try {
        // 2. WE GRAB THE PASSWORD FROM THE FRONTEND NOW
        const { email, password } = req.body; 

        // Query the database to see if the user's email exists
        const userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        // If no user matches that email, block them
        if (userQuery.rows.length === 0) {
            // We use a generic error so hackers don't know which emails exist
            return res.status(401).json({ error: "Invalid email or password." }); 
        }

        const user = userQuery.rows[0];

        // 3. THE PASSWORD CHECK
        // We compare the typed password against the scrambled hash in the database
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        // If they don't match, block them
        if (!validPassword) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        // Generate the VIP Pass (JWT)
        const token = jwt.sign(
            { user_id: user.user_id, role_id: user.role_id }, 
            'YOUR_SUPER_SECRET_KEY', 
            { expiresIn: '2h' }
        );

        // Send the token to the frontend
        res.json({ message: "Login successful", token: token });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// ---------------------------------------------------------
// 2. THE LOCK MIDDLEWARE (verifyToken)
// ---------------------------------------------------------
const verifyToken = (req, res, next) => {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
        return res.status(403).json({ error: "Access denied. No token provided." });
    }

    const token = authHeader.split(' ')[1];

    try {
        const verified = jwt.verify(token, 'YOUR_SUPER_SECRET_KEY');
        req.user = verified; 
        next(); 
    } catch (err) {
        res.status(401).json({ error: "Invalid token." });
    }
};

module.exports = { router, verifyToken };