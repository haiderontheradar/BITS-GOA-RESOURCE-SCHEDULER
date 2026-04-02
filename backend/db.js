const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'allahlovesjesus', 
  host: 'localhost',
  port: 5432,
  database: 'bits_db'
});

module.exports = pool;