const express = require('express');
const cors = require('cors');
const pool = require('./db');
const { router: authRouter, verifyToken } = require('./auth');


const app = express();
app.use(cors());

// Removed conflicting upstream http-proxy-middleware that breaks Docker bridge network
app.use(express.json());

// Hook up Arth's Auth Routes
app.use('/api', authRouter);

// ---------------------------------------------------------
// VISHWAM'S API 1: GET RESOURCES (Kavya's exact JSON format)
// ---------------------------------------------------------
app.get('/api/resources', async (req, res) => {
    try {
        const query = `
            SELECT r.resource_id, r.resource_name, r.status, r.hourly_rate, r.is_fixed_asset 
            FROM resources r
            JOIN resource_categories c ON r.category_id = c.category_id;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// ---------------------------------------------------------
// VISHWAM'S API 2: CREATE BOOKING (With 409 Conflict check)
// ---------------------------------------------------------
app.post('/api/bookings', async (req, res) => {
    try {
        const { resource_id, start_time, end_time, purpose } = req.body;
        const user_id = 1; // HARDCODED FOR DEMO (Since Login UI is a mock)
        const overlapCheck = await pool.query(`
            SELECT * FROM bookings 
            WHERE resource_id = $1 
            AND ($2 < end_time AND $3 > start_time)
            AND status != 'rejected'
        `, [resource_id, start_time, end_time]);

        if (overlapCheck.rows.length > 0) {
            return res.status(409).json({ error: "Conflict: Resource is already booked." });
        }

        const newBooking = await pool.query(`
            INSERT INTO bookings (user_id, resource_id, request_time, start_time, end_time, purpose, status)
            VALUES ($1, $2, NOW(), $3, $4, $5, 'pending')
            RETURNING *;
        `, [user_id, resource_id, start_time, end_time, purpose]);

        res.status(201).json(newBooking.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// ---------------------------------------------------------
// VISHWAM'S API 3: AI FORECASTING
// ---------------------------------------------------------
app.get('/api/analytics/forecast', async (req, res) => {
    try {
        const { category_name } = req.query;
        // Make request to AI Agent container (using native fetch in Node 22)
        const response = await fetch(`http://ai-agent:8000/forecast?category_name=${encodeURIComponent(category_name)}&periods=7&granularity=daily`);
        if (!response.ok) {
            throw new Error(`AI Agent returned ${response.status}`);
        }
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error("Forecasting Error:", err.message);
        res.status(500).json({ error: "Failed to connect to AI Agent" });
    }
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});