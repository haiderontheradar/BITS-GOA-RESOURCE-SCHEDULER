-- 1) Automated Financial Logic

CREATE OR REPLACE FUNCTION calculate_booking_finance(p_booking_id INT)
RETURNS VOID AS $$
DECLARE
    v_hours_used FLOAT;
    v_overdue_hours FLOAT;
    v_hourly_rate DECIMAL(10,2);
    v_fine_rate DECIMAL(10,2);
    v_total_cost DECIMAL(15,2);
    v_club_id INT;
BEGIN
    -- Fetch rates and duration details
    SELECT 
        rc.hourly_rate, 
        rc.fine_per_hour,
        b.user_id, -- Used to find the club associated with the user
        EXTRACT(EPOCH FROM (b.end_time - b.start_time))/3600,
        CASE 
            WHEN b.actual_return_time > b.end_time 
            THEN EXTRACT(EPOCH FROM (b.actual_return_time - b.end_time))/3600
            ELSE 0 
        END
    INTO v_hourly_rate, v_fine_rate, v_club_id, v_hours_used, v_overdue_hours
    FROM bookings b
    JOIN resources r ON b.resource_id = r.resource_id
    JOIN resource_categories rc ON r.category_id = rc.category_id
    WHERE b.booking_id = p_booking_id;

    -- Calculate Total Cost
    v_total_cost := (v_hours_used * v_hourly_rate) + (v_overdue_hours * v_fine_rate);

    -- Update Club Balance (Financial Linking)
    UPDATE clubs 
    SET current_balance = current_balance - v_total_cost
    WHERE club_id = (SELECT club_id FROM users WHERE user_id = v_club_id);

    -- Update Booking Payment Status
    UPDATE bookings 
    SET payment_status = 'deducted_from_budget' 
    WHERE booking_id = p_booking_id;
END;
$$ LANGUAGE plpgsql;

-- 2) Financial Reporting View

CREATE VIEW detailed_financial_report AS
SELECT 
    c.club_name,
    COUNT(b.booking_id) AS total_bookings,
    SUM(CASE 
        WHEN b.actual_return_time > b.end_time 
        THEN (EXTRACT(EPOCH FROM (b.actual_return_time - b.end_time))/3600 * rc.fine_per_hour)
        ELSE 0 
    END) AS total_fines_incurred,
    c.current_balance AS remaining_funds
FROM clubs c
LEFT JOIN users u ON c.club_id = u.club_id
LEFT JOIN bookings b ON u.user_id = b.user_id
LEFT JOIN resources r ON b.resource_id = r.resource_id
LEFT JOIN resource_categories rc ON r.category_id = rc.category_id
GROUP BY c.club_name, c.current_balance; -- [cite: 149, 163, 165]

-- 3) Constraints & Assertions

CREATE OR REPLACE FUNCTION check_club_funds()
RETURNS TRIGGER AS $$
DECLARE
    v_club_balance DECIMAL(15,2);
BEGIN
    SELECT current_balance INTO v_club_balance 
    FROM clubs 
    WHERE club_id = (SELECT club_id FROM users WHERE user_id = NEW.user_id);

    IF v_club_balance <= 0 THEN
        RAISE EXCEPTION 'Booking denied: Club balance is insufficient.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER trg_check_funds_before_booking
BEFORE INSERT ON bookings
FOR EACH ROW EXECUTE FUNCTION check_club_funds();

-- If a member of a club with ₹0 in their account tries to book a DSLR:
-- The INSERT command is sent.
-- This Trigger "wakes up" and runs check_club_funds().
-- The function sees the balance is zero and raises an Exception (an error).
-- The database kills the transaction and sends an error message back to the user: "Booking denied: Club balance is insufficient."
