require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool.getConnection()
  .then(conn => {
    console.log(`[db] Connected to MySQL — database: ${process.env.DB_NAME}`);
    conn.release();
  })
  .catch(err => {
    console.error(`[db] Failed to connect to MySQL — ${err.message}`);
    console.error(`[db] Check DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in .env`);
  });

module.exports = pool;
