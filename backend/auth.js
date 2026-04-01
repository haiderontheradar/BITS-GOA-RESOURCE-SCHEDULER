const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Dummy database connection placeholder for Vishwam to fill in later
const pool = require('./db'); // Vishwam will set up this db.js file

// ---------------------------------------------------------
// 1. THE LOGIN ROUTE (POST /api/login)
// ---------------------------------------------------------
router.post('/login', async (req, res) => {
    try {
        const { email } = req.body;

        // Query the database to see if the user's email exists
        const userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        // If no user matches that email, block them
        if (userQuery.rows.length === 0) {
            return res.status(401).json({ error: "User not found." });
        }

        const user = userQuery.rows[0];

        // Generate the JWT containing the user_id and role_id
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

// Export these so Vishwam can use them in his main server file
module.exports = { router, verifyToken };