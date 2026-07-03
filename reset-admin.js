require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function resetAdmin() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const email         = 'admin@buytreasurecoastproperty.com';
  const plainPassword = 'ChangeMe123!';

  // Remove any plain-text / test entries
  await conn.execute("DELETE FROM admin_users WHERE email = 'admin@admin.com'");

  const hash = await bcrypt.hash(plainPassword, 12);

  const [existing] = await conn.execute('SELECT id FROM admin_users WHERE email = ?', [email]);
  if (existing.length > 0) {
    await conn.execute('UPDATE admin_users SET password = ? WHERE email = ?', [hash, email]);
    console.log('Admin password updated.');
  } else {
    await conn.execute('INSERT INTO admin_users (email, password) VALUES (?, ?)', [email, hash]);
    console.log('Admin user created.');
  }

  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${plainPassword}`);

  await conn.end();
}

resetAdmin().catch(err => { console.error('Failed:', err.message); process.exit(1); });
