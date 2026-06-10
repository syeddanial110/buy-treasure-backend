# Buy Treasure Coast Property — Backend API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready Express.js REST API that proxies the Spark RESO Web API for real estate listings and manages leads + admin auth via MySQL.

**Architecture:** Thin Express server with three route groups (`/api/listings`, `/api/leads`, `/api/auth`). Spark API calls are centralised in `src/lib/spark.js`; all DB access goes through the `mysql2/promise` pool in `src/lib/db.js`. JWT guards admin-only routes via a shared middleware.

**Tech Stack:** Node.js 18+, Express 4, mysql2/promise, axios, bcryptjs, jsonwebtoken, dotenv, cors, nodemon (dev), PM2 (prod on cPanel VPS)

---

## File Map

| File | Responsibility |
|---|---|
| `package.json` | Dependency manifest + npm scripts |
| `.env.example` | Environment variable template |
| `src/lib/db.js` | mysql2 connection pool (singleton) |
| `src/lib/spark.js` | All Spark RESO API calls |
| `src/middleware/authMiddleware.js` | JWT verification for protected routes |
| `src/controllers/listingsController.js` | Listings route handlers |
| `src/controllers/leadsController.js` | Leads route handlers |
| `src/controllers/authController.js` | Login + token verify handlers |
| `src/routes/listings.js` | GET /api/listings, GET /api/listings/:key, GET /api/listings/:key/photos |
| `src/routes/leads.js` | POST /api/leads, GET /api/leads (auth), DELETE /api/leads/:id (auth) |
| `src/routes/auth.js` | POST /api/auth/login, GET /api/auth/verify |
| `src/server.js` | Express app bootstrap, CORS, middleware, route mounting |
| `seed.js` | Create first admin user in DB |
| `schema.sql` | CREATE TABLE statements for leads + admin_users |
| `README.md` | cPanel VPS deployment guide using PM2 |

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "buy-treasure-backend",
  "version": "1.0.0",
  "description": "REST API for Buy Treasure Coast Property",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "seed": "node seed.js"
  },
  "dependencies": {
    "axios": "^1.7.2",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "mysql2": "^3.9.8"
  },
  "devDependencies": {
    "nodemon": "^3.1.4"
  }
}
```

- [ ] **Step 2: Create `.env.example`**

```
PORT=5000
SPARK_ACCESS_TOKEN=8qzlnp2p7fqo91g27vpahnkn8
DB_HOST=localhost
DB_USER=your_cpanel_mysql_username
DB_PASSWORD=your_cpanel_mysql_password
DB_NAME=buytreasure
JWT_SECRET=pick_a_long_random_string_at_least_64_chars
FRONTEND_URL=https://buytreasurecoastproperty.com
ADMIN_URL=https://admin.buytreasurecoastproperty.com
```

- [ ] **Step 3: Create `.gitignore`**

```
node_modules/
.env
*.log
```

- [ ] **Step 4: Create directory structure**

```
mkdir -p src/lib src/middleware src/controllers src/routes
```

- [ ] **Step 5: Install dependencies**

```bash
npm install
```

Expected output: `added N packages` with no errors.

- [ ] **Step 6: Commit**

```bash
git add package.json .env.example .gitignore
git commit -m "feat: project scaffold — package.json, env template, gitignore"
```

---

## Task 2: Database Connection Module

**Files:**
- Create: `src/lib/db.js`

- [ ] **Step 1: Create `src/lib/db.js`**

```javascript
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

module.exports = pool;
```

- [ ] **Step 2: Verify module loads without error**

Create a throwaway test file `test-db.js`:
```javascript
require('dotenv').config();
const pool = require('./src/lib/db');
pool.getConnection()
  .then(conn => { console.log('DB connected OK'); conn.release(); process.exit(0); })
  .catch(err => { console.error('DB connection failed:', err.message); process.exit(1); });
```

Run: `node test-db.js`

Expected output: `DB connected OK`

If it fails, check `.env` values against cPanel MySQL credentials.

- [ ] **Step 3: Remove test file + commit**

```bash
rm test-db.js
git add src/lib/db.js
git commit -m "feat: MySQL connection pool module"
```

---

## Task 3: Spark API Client

**Files:**
- Create: `src/lib/spark.js`

- [ ] **Step 1: Create `src/lib/spark.js`**

```javascript
const axios = require('axios');

const BASE_URL = 'https://replication.sparkapi.com/Version/3/Reso/OData';

function sparkHeaders() {
  return {
    Authorization: `Bearer ${process.env.SPARK_ACCESS_TOKEN}`,
    Accept: 'application/json',
  };
}

async function getListings({ page = 1, limit = 20, minPrice, maxPrice, beds, baths, city, propertyType } = {}) {
  const skip = (page - 1) * Math.min(limit, 100);
  const top = Math.min(Number(limit), 100);

  const filters = ["StandardStatus eq 'Active'"];
  if (minPrice)       filters.push(`ListPrice ge ${Number(minPrice)}`);
  if (maxPrice)       filters.push(`ListPrice le ${Number(maxPrice)}`);
  if (beds)           filters.push(`BedroomsTotal ge ${Number(beds)}`);
  if (baths)          filters.push(`BathroomsTotalInteger ge ${Number(baths)}`);
  if (city)           filters.push(`City eq '${city}'`);
  if (propertyType)   filters.push(`PropertyType eq '${propertyType}'`);

  const response = await axios.get(`${BASE_URL}/Property`, {
    headers: sparkHeaders(),
    params: {
      $top: top,
      $skip: skip,
      $filter: filters.join(' and '),
      $orderby: 'ListingContractDate desc',
      $count: true,
    },
  });

  return response.data;
}

async function getListing(listingKey) {
  const response = await axios.get(`${BASE_URL}/Property('${listingKey}')`, {
    headers: sparkHeaders(),
  });
  return response.data;
}

async function getListingPhotos(listingKey) {
  const response = await axios.get(`${BASE_URL}/Media`, {
    headers: sparkHeaders(),
    params: {
      $filter: `ResourceRecordKey eq '${listingKey}'`,
      $orderby: 'Order asc',
    },
  });
  return response.data;
}

module.exports = { getListings, getListing, getListingPhotos };
```

- [ ] **Step 2: Verify Spark connectivity**

Create throwaway `test-spark.js`:
```javascript
require('dotenv').config();
const spark = require('./src/lib/spark');
spark.getListings({ limit: 1 })
  .then(data => { console.log('Spark OK — total:', data['@odata.count']); process.exit(0); })
  .catch(err => { console.error('Spark error:', err.message); process.exit(1); });
```

Run: `node test-spark.js`

Expected output: `Spark OK — total: <some number>`

- [ ] **Step 3: Remove test file + commit**

```bash
rm test-spark.js
git add src/lib/spark.js
git commit -m "feat: Spark RESO API client module"
```

---

## Task 4: Auth Middleware

**Files:**
- Create: `src/middleware/authMiddleware.js`

- [ ] **Step 1: Create `src/middleware/authMiddleware.js`**

```javascript
const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { requireAuth };
```

- [ ] **Step 2: Verify middleware logic manually**

Create throwaway `test-auth.js`:
```javascript
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { requireAuth } = require('./src/middleware/authMiddleware');

// Mock req/res/next
const token = jwt.sign({ id: 1, email: 'admin@test.com' }, process.env.JWT_SECRET, { expiresIn: '1h' });
const req = { headers: { authorization: `Bearer ${token}` } };
const res = { status: () => ({ json: (v) => console.error('FAIL:', v) }) };
const next = () => console.log('PASS: admin =', req.admin);

requireAuth(req, res, next);

// Also test rejection
const badReq = { headers: {} };
const badRes = { status: (code) => ({ json: (v) => console.log(`PASS: rejected with ${code}:`, v) }) };
requireAuth(badReq, badRes, () => {});
```

Run: `node test-auth.js`

Expected output:
```
PASS: admin = { id: 1, email: 'admin@test.com', iat: ..., exp: ... }
PASS: rejected with 401: { error: 'Missing or invalid Authorization header' }
```

- [ ] **Step 3: Remove test file + commit**

```bash
rm test-auth.js
git add src/middleware/authMiddleware.js
git commit -m "feat: JWT auth middleware"
```

---

## Task 5: Listings Controller

**Files:**
- Create: `src/controllers/listingsController.js`

- [ ] **Step 1: Create `src/controllers/listingsController.js`**

```javascript
const spark = require('../lib/spark');

async function getListings(req, res) {
  try {
    const { page = 1, limit = 20, minPrice, maxPrice, beds, baths, city, propertyType } = req.query;

    const data = await spark.getListings({ page, limit, minPrice, maxPrice, beds, baths, city, propertyType });

    res.json({
      listings: data.value || [],
      total: data['@odata.count'] || 0,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    console.error('[listingsController] getListings:', err.message);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
}

async function getListing(req, res) {
  try {
    const { listingKey } = req.params;
    const data = await spark.getListing(listingKey);
    res.json(data);
  } catch (err) {
    console.error('[listingsController] getListing:', err.message);
    if (err.response?.status === 404) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
}

async function getListingPhotos(req, res) {
  try {
    const { listingKey } = req.params;
    const data = await spark.getListingPhotos(listingKey);
    res.json({ photos: data.value || [] });
  } catch (err) {
    console.error('[listingsController] getListingPhotos:', err.message);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
}

module.exports = { getListings, getListing, getListingPhotos };
```

- [ ] **Step 2: Commit**

```bash
git add src/controllers/listingsController.js
git commit -m "feat: listings controller — getListings, getListing, getListingPhotos"
```

---

## Task 6: Leads Controller

**Files:**
- Create: `src/controllers/leadsController.js`

- [ ] **Step 1: Create `src/controllers/leadsController.js`**

```javascript
const db = require('../lib/db');

async function createLead(req, res) {
  try {
    const { name, email, phone, message, listing_key, listing_address, listing_price } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'name and email are required' });
    }

    const [result] = await db.execute(
      `INSERT INTO leads (name, email, phone, message, listing_key, listing_address, listing_price)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        email,
        phone        || null,
        message      || null,
        listing_key  || null,
        listing_address || null,
        listing_price   || null,
      ]
    );

    res.status(201).json({ success: true, id: result.insertId, message: 'Lead submitted successfully' });
  } catch (err) {
    console.error('[leadsController] createLead:', err.message);
    res.status(500).json({ error: 'Failed to save lead' });
  }
}

async function getLeads(req, res) {
  try {
    const [rows] = await db.execute('SELECT * FROM leads ORDER BY created_at DESC');
    res.json({ leads: rows });
  } catch (err) {
    console.error('[leadsController] getLeads:', err.message);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
}

async function deleteLead(req, res) {
  try {
    const { id } = req.params;
    const [result] = await db.execute('DELETE FROM leads WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({ success: true, message: 'Lead deleted' });
  } catch (err) {
    console.error('[leadsController] deleteLead:', err.message);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
}

module.exports = { createLead, getLeads, deleteLead };
```

- [ ] **Step 2: Commit**

```bash
git add src/controllers/leadsController.js
git commit -m "feat: leads controller — createLead, getLeads, deleteLead"
```

---

## Task 7: Auth Controller

**Files:**
- Create: `src/controllers/authController.js`

- [ ] **Step 1: Create `src/controllers/authController.js`**

```javascript
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../lib/db');

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const [rows] = await db.execute('SELECT * FROM admin_users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, rows[0].password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: rows[0].id, email: rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token });
  } catch (err) {
    console.error('[authController] login:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
}

async function verify(req, res) {
  res.json({ valid: true, admin: req.admin });
}

module.exports = { login, verify };
```

- [ ] **Step 2: Commit**

```bash
git add src/controllers/authController.js
git commit -m "feat: auth controller — login with bcrypt + JWT, verify"
```

---

## Task 8: Route Files

**Files:**
- Create: `src/routes/listings.js`
- Create: `src/routes/leads.js`
- Create: `src/routes/auth.js`

- [ ] **Step 1: Create `src/routes/listings.js`**

```javascript
const express = require('express');
const router = express.Router();
const { getListings, getListing, getListingPhotos } = require('../controllers/listingsController');

router.get('/', getListings);
router.get('/:listingKey/photos', getListingPhotos);
router.get('/:listingKey', getListing);

module.exports = router;
```

> Note: `/photos` route must be defined before `/:listingKey` to avoid Express matching "photos" as a listingKey.

- [ ] **Step 2: Create `src/routes/leads.js`**

```javascript
const express = require('express');
const router = express.Router();
const { createLead, getLeads, deleteLead } = require('../controllers/leadsController');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/', createLead);
router.get('/', requireAuth, getLeads);
router.delete('/:id', requireAuth, deleteLead);

module.exports = router;
```

- [ ] **Step 3: Create `src/routes/auth.js`**

```javascript
const express = require('express');
const router = express.Router();
const { login, verify } = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/login', login);
router.get('/verify', requireAuth, verify);

module.exports = router;
```

- [ ] **Step 4: Commit**

```bash
git add src/routes/
git commit -m "feat: route definitions — listings, leads, auth"
```

---

## Task 9: Express Server

**Files:**
- Create: `src/server.js`

- [ ] **Step 1: Create `src/server.js`**

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const listingsRouter = require('./routes/listings');
const leadsRouter    = require('./routes/leads');
const authRouter     = require('./routes/auth');

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.use('/api/listings', listingsRouter);
app.use('/api/leads',    leadsRouter);
app.use('/api/auth',     authRouter);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[server] unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Buy Treasure API running on port ${PORT}`));

module.exports = app;
```

- [ ] **Step 2: Create `.env` from template and fill in values**

```bash
cp .env.example .env
# Edit .env with your actual DB credentials and JWT secret
```

Generate a strong JWT secret with:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

- [ ] **Step 3: Start server locally**

```bash
npm run dev
```

Expected console output:
```
Buy Treasure API running on port 5000
```

- [ ] **Step 4: Smoke test health endpoint**

```bash
curl http://localhost:5000/api/health
```

Expected:
```json
{"status":"ok","ts":"2026-06-10T..."}
```

- [ ] **Step 5: Smoke test listings endpoint**

```bash
curl "http://localhost:5000/api/listings?limit=2"
```

Expected: JSON with `listings` array and `total` count.

- [ ] **Step 6: Commit**

```bash
git add src/server.js .env.example
git commit -m "feat: Express server bootstrap with CORS, routing, health endpoint"
```

---

## Task 10: Database Schema

**Files:**
- Create: `schema.sql`

- [ ] **Step 1: Create `schema.sql`**

```sql
-- Run this in phpMyAdmin SQL tab on the `buytreasure` database

CREATE TABLE IF NOT EXISTS leads (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(255) NOT NULL,
  email            VARCHAR(255) NOT NULL,
  phone            VARCHAR(50),
  message          TEXT,
  listing_key      VARCHAR(255),
  listing_address  VARCHAR(255),
  listing_price    VARCHAR(50),
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

- [ ] **Step 2: Run schema in phpMyAdmin**

1. Log into cPanel → phpMyAdmin
2. Select database `buytreasure` (create it first if it doesn't exist)
3. Click the SQL tab
4. Paste the contents of `schema.sql`
5. Click "Go"

Expected: Two green success messages for each CREATE TABLE.

- [ ] **Step 3: Commit**

```bash
git add schema.sql
git commit -m "feat: MySQL schema — leads and admin_users tables"
```

---

## Task 11: Admin Seed Script

**Files:**
- Create: `seed.js`

- [ ] **Step 1: Create `seed.js`**

```javascript
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
```

- [ ] **Step 2: Run seed (requires DB tables to exist from Task 10)**

```bash
npm run seed
```

Expected:
```
Admin user created:
  Email:    admin@buytreasurecoastproperty.com
  Password: ChangeMe123!
IMPORTANT: Change the password after first login.
```

- [ ] **Step 3: Verify login endpoint works**

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@buytreasurecoastproperty.com","password":"ChangeMe123!"}'
```

Expected:
```json
{"token":"eyJ..."}
```

- [ ] **Step 4: Verify token with /api/auth/verify**

```bash
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@buytreasurecoastproperty.com","password":"ChangeMe123!"}' | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).token))")

curl http://localhost:5000/api/auth/verify \
  -H "Authorization: Bearer $TOKEN"
```

Expected:
```json
{"valid":true,"admin":{"id":1,"email":"admin@buytreasurecoastproperty.com",...}}
```

- [ ] **Step 5: Test leads CRUD**

```bash
# Create a lead
curl -X POST http://localhost:5000/api/leads \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","phone":"555-1234","message":"Interested","listing_key":"ABC123","listing_address":"123 Main St","listing_price":"$250,000"}'

# Get leads (requires token from above)
curl http://localhost:5000/api/leads \
  -H "Authorization: Bearer $TOKEN"

# Delete lead with id=1
curl -X DELETE http://localhost:5000/api/leads/1 \
  -H "Authorization: Bearer $TOKEN"
```

- [ ] **Step 6: Commit**

```bash
git add seed.js
git commit -m "feat: admin seed script — creates first admin_users row"
```

---

## Task 12: README — cPanel VPS Deployment Guide

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create `README.md`**

```markdown
# Buy Treasure Coast Property — Backend API

REST API for real estate listings (Spark RESO Web API v3), lead capture, and admin auth.

## Tech Stack

- Node.js 18+, Express 4
- MySQL via cPanel phpMyAdmin
- PM2 (process manager in production)

---

## Local Development

### 1. Clone and install

```bash
git clone <repo-url> backend && cd backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in DB credentials and generate a JWT_SECRET:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Set up database

1. Log into cPanel → phpMyAdmin
2. Create database `buytreasure` (cPanel → MySQL Databases → Create Database)
3. Create a DB user and grant ALL privileges on `buytreasure`
4. Run `schema.sql` in phpMyAdmin SQL tab

### 4. Seed admin user

```bash
npm run seed
```

### 5. Start dev server

```bash
npm run dev
# API running at http://localhost:5000
```

---

## cPanel VPS Deployment (PM2)

### Prerequisites

- Node.js 18+ installed on the VPS (`node -v` to check)
- PM2 installed globally: `npm install -g pm2`
- cPanel access to MySQL Databases

### Step 1 — Upload project files

Option A — Git (recommended):
```bash
ssh user@yourserver.com
cd ~/public_html  # or a non-public dir like ~/apps/backend
git clone <repo-url> backend
cd backend
npm install --omit=dev
```

Option B — cPanel File Manager:
Upload all files except `node_modules/` and `.env`, then run `npm install --omit=dev` via SSH Terminal.

### Step 2 — Create `.env` on the server

Via SSH:
```bash
cp .env.example .env
nano .env  # fill in production values
```

Key values to set:
| Variable | Value |
|---|---|
| `DB_HOST` | `localhost` (cPanel MySQL is local) |
| `DB_USER` | cPanel MySQL username (e.g. `buytreasure_user`) |
| `DB_PASSWORD` | MySQL user password |
| `DB_NAME` | `buytreasure` |
| `JWT_SECRET` | 64+ char random string |
| `FRONTEND_URL` | `https://buytreasurecoastproperty.com` |
| `ADMIN_URL` | `https://admin.buytreasurecoastproperty.com` |
| `PORT` | `5000` (or any free port) |

### Step 3 — Run database schema

In cPanel → phpMyAdmin → SQL tab, paste and run `schema.sql`.

### Step 4 — Seed admin user

```bash
npm run seed
```

### Step 5 — Start with PM2

```bash
pm2 start src/server.js --name buy-treasure-api
pm2 save
pm2 startup  # follow the printed command to enable auto-start on reboot
```

Useful PM2 commands:
```bash
pm2 status              # check running processes
pm2 logs buy-treasure-api   # tail logs
pm2 restart buy-treasure-api
pm2 stop buy-treasure-api
```

### Step 6 — Proxy through Apache/Nginx (cPanel)

In cPanel, use the **Node.js App** or **Passenger** interface, OR configure an Apache reverse proxy via `.htaccess` in your domain's `public_html`:

```apache
# public_html/.htaccess  (if API lives at /api subdirectory)
RewriteEngine On
RewriteRule ^api/(.*) http://localhost:5000/api/$1 [P,L]
```

If using a subdomain (e.g. `api.buytreasurecoastproperty.com`), configure it in cPanel Subdomains and point its document root proxy to port 5000.

---

## API Reference

### Listings

```
GET /api/listings?page=1&limit=20&minPrice=200000&maxPrice=500000&beds=3&baths=2&city=Stuart&propertyType=Residential
GET /api/listings/:listingKey
GET /api/listings/:listingKey/photos
```

### Leads

```
POST /api/leads              — public
GET  /api/leads              — requires JWT
DELETE /api/leads/:id        — requires JWT
```

POST body:
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "772-555-0100",
  "message": "Interested in viewing",
  "listing_key": "20240101ABC",
  "listing_address": "1234 Treasure Blvd, Stuart FL 34994",
  "listing_price": "$425,000"
}
```

### Auth

```
POST /api/auth/login   — body: { email, password } → { token }
GET  /api/auth/verify  — header: Authorization: Bearer <token> → { valid: true }
```

---

## Health Check

```bash
curl https://api.buytreasurecoastproperty.com/api/health
# {"status":"ok","ts":"2026-06-10T..."}
```
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: cPanel VPS deployment guide with PM2"
```

---

## Self-Review Checklist

- [x] GET /api/listings with all filter params — Task 5 (listingsController.getListings)
- [x] GET /api/listings/:listingKey — Task 5 (listingsController.getListing)
- [x] GET /api/listings/:listingKey/photos — Task 5 (listingsController.getListingPhotos); route order guarded in Task 8
- [x] POST /api/leads — Task 6 (leadsController.createLead)
- [x] GET /api/leads (JWT) — Task 6 (leadsController.getLeads) + Task 4 middleware
- [x] DELETE /api/leads/:id (JWT) — Task 6 (leadsController.deleteLead) + Task 4 middleware
- [x] POST /api/auth/login — Task 7 (authController.login)
- [x] GET /api/auth/verify — Task 7 (authController.verify) + Task 4 middleware
- [x] bcrypt for password — bcryptjs used in authController and seed.js
- [x] JWT auth — jsonwebtoken in authController + authMiddleware
- [x] MySQL leads table — schema.sql Task 10
- [x] MySQL admin_users table — schema.sql Task 10
- [x] Seed script — Task 11
- [x] Full SQL CREATE TABLE statements — Task 10 / schema.sql
- [x] cPanel VPS + PM2 deployment README — Task 12
- [x] .env.example with all required vars — Task 1
- [x] CORS configured for FRONTEND_URL + ADMIN_URL — Task 9
- [x] $top capped at 100 (Spark API limit) — spark.js Task 3
- [x] /photos route before /:listingKey to prevent route shadowing — Task 8 Step 1 note
