const { Pool } = require('pg');

const pool = new Pool({
  user: 'irsadmin',
  password: 'irspassword', 
  host: 'db',
  port: 5432,
  database: 'irsdb'
});

module.exports = pool;