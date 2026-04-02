const express = require('express');
const cors = require('cors');
const pool = require('./db');
const { router: authRouter, verifyToken } = require('./auth');

const app = express();
app.use(cors());
app.use(express.json());

// Hook up Arth's Auth Routes
app.use('/api', authRouter);

// ---------------------------------------------------------
// VISHWAM'S API 1: GET RESOURCES (Kavya's exact JSON format)
// ---------------------------------------------------------
app.get('/api/resources', verifyToken, async (req, res) => {
    try {
        // Joining tables to get exactly what Kavya asked for
        const query = `
            SELECT r.resource_id, r.resource_name, r.status, c.hourly_rate, c.is_fixed_asset 
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
app.post('/api/bookings', verifyToken, async (req, res) => {
    try {
        // Kavya sends these from her modal
        const { resource_id, start_time, end_time, purpose } = req.body;
        const user_id = req.user.user_id; // Arth's middleware gives us this securely!

        // CHECK 1: Double-booking prevention (Returns 409)
        const overlapCheck = await pool.query(`
            SELECT * FROM bookings 
            WHERE resource_id = $1 
            AND ($2 < end_time AND $3 > start_time)
            AND status != 'rejected'
        `, [resource_id, start_time, end_time]);

        if (overlapCheck.rows.length > 0) {
            return res.status(409).json({ error: "Conflict: Resource is already booked." });
        }

        // CHECK 2: Insert the booking safely
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

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});