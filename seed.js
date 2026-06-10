require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function seed() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const email         = 'admin@buytreasurecoastproperty.com';
  const plainPassword = 'ChangeMe123!';

  const [existing] = await conn.execute('SELECT id FROM admin_users WHERE email = ?', [email]);
  if (existing.length > 0) {
    console.log('Admin user already exists — skipping.');
    await conn.end();
    return;
  }

  const hash = await bcrypt.hash(plainPassword, 12);
  await conn.execute('INSERT INTO admin_users (email, password) VALUES (?, ?)', [email, hash]);

  console.log('Admin user created:');
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${plainPassword}`);
  console.log('IMPORTANT: Change the password after first login.');

  await conn.end();
}

seed().catch(err => { console.error('Seed failed:', err.message); process.exit(1); });
