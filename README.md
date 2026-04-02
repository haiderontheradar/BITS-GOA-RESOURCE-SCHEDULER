# BITS Goa: Inventory & Resource Scheduler (IRS) 🎓

The **BITS Goa: Inventory & Resource Scheduler (IRS)** is a centralized, highly scalable database management system designed specifically for the BITS Pilani Goa Campus ecosystem. The foundation of IRS is built on a strict **Third Normal Form (3NF) relational architecture**. This 10-table schema meticulously eliminates data redundancy, prevents update anomalies, and ensures absolute data integrity by removing transitive dependencies—strictly separating independent organizational entities (Clubs, Roles, Departments) from complex transactional data (Bookings, Budgets, Maintenance). 

To elevate the system beyond standard CRUD operations, IRS integrates a **Python-based AI Predictive Agent**. Acting as a "Smart Clerk," this machine-learning layer actively queries the PostgreSQL database to analyze historical booking logs. It is designed to forecast resource crunches, predict peak equipment demand during major campus fests (like Waves or Quark), and suggest optimal buffer times between reservations to ensure maximum resource availability. Together with strict database-level concurrency controls, IRS provides a flawless, conflict-free booking experience for campus clubs and faculty.

---

## 👥 The Team & Roles

This system was developed by a 7-person team, with responsibilities distributed across a unified technical stack. 

| Member | Role | Core Responsibility |
| :--- | :--- | :--- |
| **Vishwam** | Backend Lead | RESTful API architecture using Node.js and Express. |
| **Kavya** | Frontend Lead | React (Vite) UI/UX, responsive booking calendar, and dashboard. |
| **Tanishq** | Database Architect | 10-table 3NF schema design, constraints, and data integrity. |
| **Aadi** | Concurrency Specialist | PL/pgSQL triggers and transaction isolation to prevent double-bookings. |
| **Arth** | Auth & Security Lead | JWT authentication, middleware (`verifyToken`), and Role-Based Access Control. |
| **Shreyas** | Finance Module Lead | SQL budget tracking, automated fine calculations, and Chart.js visualization. |
| **Haider** | AI & DevOps Lead | Docker containerization, Nginx reverse proxy, and Python AI Agent deployment. |

---

## 🛠️ Unified Tech Stack

* **Database Layer:** PostgreSQL 15 (Relational Data, ACID Transactions)
* **Backend API:** Node.js, Express.js
* **Frontend UI:** React.js (Vite), Tailwind CSS
* **Security & Auth:** JSON Web Tokens (JWT)
* **Visualization:** Chart.js
* **AI Agent Layer:** Python (FastAPI/Flask)
* **Infrastructure & DevOps:** Docker, Docker Compose, Nginx Reverse Proxy

---

## 📁 Repository Structure

    📦 bits-irs
     ┣ 📂 frontend/               # React + Vite Application
     ┃ ┣ 📂 src/
     ┃ ┗ 📜 package.json
     ┣ 📂 backend/                # Node.js + Express API
     ┃ ┣ 📂 middleware/           # verifyToken auth logic
     ┃ ┣ 📜 package.json          # express, jsonwebtoken, body-parser
     ┃ ┗ 📜 .package-lock.json
     ┣ 📂 ai_agent/               # Python AI Service
     ┃ ┣ 📂 src/                  # Smart Clerk prediction logic
     ┃ ┣ 📜 requirements.txt
     ┃ ┗ 📜 Dockerfile
     ┣ 📂 finance-module/         # Dedicated Budgeting Logic
     ┃ ┣ 📜 finance-logic.sql     # PL/pgSQL budget triggers & calculation
     ┃ ┗ 📜 finance-reports.js    # Chart.js visualization logic
     ┣ 📂 nginx/                  # Reverse Proxy Configuration
     ┃ ┗ 📜 nginx.conf            # Route mapping (/ -> frontend, /api/ -> backend)
     ┣ 📜 schema.sql              # Master DB schema, enums, & concurrency triggers (Run 1st)
     ┣ 📜 seed.sql                # Mock BITS Goa data for testing (Run 2nd)
     ┗ 📜 docker-compose.yml      # Master Multi-container orchestration config

---

## 🚀 Local Setup & Installation

The entire infrastructure is Dockerized, allowing the full stack to spin up with a single command. 

### Prerequisites
* Docker and Docker Compose installed.
* Ports `80` (Nginx), `5432` (Postgres), `3000` (Node), and `8000` (Python) available.

### Step 1: Environment Variables
Create a `.env` file in the root directory:

    POSTGRES_USER=irsadmin
    POSTGRES_PASSWORD=irspassword
    POSTGRES_DB=irsdb

### Step 2: Build & Deploy
Run the following command in the root directory:

    docker-compose up -d --build

*Note: On the first initialization, the `db` container will automatically execute `schema.sql` and `seed.sql` to initialize the database with tables, triggers, and mock data.*

### Step 3: Access the Application
* **Frontend UI (React):** http://localhost:80
* **Backend API (Node):** http://localhost/api/
* **AI Agent:** http://localhost:8000
* **Database:** localhost:5432

---

## 🏃‍♂️ Team Workflow: The MVP Sprint Protocol

To get the Minimum Viable Product (MVP) running efficiently, the team follows this parallel integration workflow:

### 1. Database & Infra Initialization (Haider & Tanishq)
* **Haider:** Spins up the live PostgreSQL database (via Supabase, Neon, or local Docker) and shares the `DATABASE_URL` with the team.
* **Tanishq:** Executes `schema.sql` to build the 10-table 3NF schema, followed by `seed.sql` to populate the database with dummy BITS Goa clubs, users, and resources. 

### 2. API & Security Layer (Vishwam & Arth)
* **Vishwam:** Initializes the Node/Express server and connects to the database using the provided URL. Builds the core `GET /api/resources` and `POST /api/bookings` endpoints.
* **Arth:** Builds the `POST /api/login` route to issue JWTs based on the `users` table. Applies the `verifyToken` middleware to Vishwam's booking routes to enforce Role-Based Access Control.

### 3. Frontend Dashboard (Kavya)
* Initializes the Vite/React app and sets up Tailwind CSS.
* Builds the UI components (Login Screen, Resource Grid) using temporary dummy data.
* Integrates `fetch()` calls to Vishwam's `GET /api/resources` endpoint to make the dashboard dynamically render the live database inventory.

### 4. Concurrency & Finance Triggers (Aadi & Shreyas)
* **Aadi:** Connects directly to the database to write the `BEFORE INSERT` trigger on the `bookings` table. This trigger checks the requested `start_time` and `end_time` against existing approved bookings to block overlapping schedules.
* **Shreyas:** Writes the SQL functions to calculate booking costs (`hourly_rate` * duration) and creates the trigger to deduct `total_cost` from the `current_balance` in the `clubs` table upon booking completion.

---

## ✨ Core Technical Highlights

### Advanced Database Architecture
* **3NF Normalization:** A robust separation of Independent entities (Roles, Departments, Clubs) from Dependent entities (Users, Resources, Bookings) to eliminate data redundancy.
* **Zero Double-Bookings:** Strict transaction isolation utilizing PostgreSQL's `OVERLAPS` function guarantees zero scheduling conflicts.
* **Automated Accountability:** `finance-logic.sql` automates late return penalties and usage fees using `EXTRACT(EPOCH...)` directly at the database layer.

### Microservices & AI Integration
* **Containerized Deployment:** Seamless orchestration of DB, Backend, Frontend, and AI layers behind an Nginx reverse proxy.
* **Predictive "Smart Clerk":** A dedicated Python service designed to analyze historical booking trends and forecast resource crunches during major college fests.

---
