# Finance & Budgeting Module
**Lead:** Shreyas

This directory contains the database logic and frontend visualization components for managing club budgets, resource costs, and automated penalty calculations for the BITS Goa Inventory & Resource Scheduler.

---

## 📁 Files in this Module

### 1. `finance-logic.sql`
This script implements the core financial backend:
* **Budget Tracking:** Manages `allocated_budget` and `current_balance` within the `clubs` table.
* **Automated Fine Logic:** A PL/pgSQL function `calculate_booking_finance()` that uses `EXTRACT(EPOCH...)` to calculate hourly usage fees and late return penalties.
* **Integrity Triggers:** A `BEFORE INSERT` trigger that prevents bookings if a club's `current_balance` is insufficient.
* **Detailed Reporting View:** `detailed_financial_report` which aggregates spending data for dashboarding.

### 2. `finance-reports.js`
This file contains the **Chart.js** implementation for the Finance Dashboard:
* **Budget Breakdown:** A Pie Chart showing "Remaining Balance" vs. "Total Spent."
* **Spending Analytics:** Logic to map SQL view data into the chart datasets.

---

## 🚀 How to Integrate

### Database Setup (for Tanishq)
Run the `finance-logic.sql` script after the core schema is initialized. It relies on the `bookings`, `resources`, and `users` tables.
```sql
\i finance-module/finance-logic.sql