# Buy Treasure Coast Property — Backend API

REST API for the Buy Treasure Coast Property real estate website. Proxies active MLS listings from the Spark RESO OData API, stores and serves lead form submissions, and provides JWT-based admin authentication.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express 4 |
| Database | MySQL 8 (mysql2/promise connection pool) |
| Auth | jsonwebtoken (JWT) + bcryptjs |
| MLS Data | Spark RESO OData API (via axios) |
| Process manager | PM2 |
| Hosting | cPanel VPS with phpMyAdmin |

---

## Project Structure

```
backend/
├── src/
│   ├── server.js              # Express app entry point
│   ├── routes/
│   │   ├── listings.js
│   │   ├── leads.js
│   │   └── auth.js
│   ├── controllers/
│   │   ├── listingsController.js
│   │   ├── leadsController.js
│   │   └── authController.js
│   ├── lib/
│   │   ├── db.js              # MySQL connection pool
│   │   └── spark.js           # Spark RESO OData client
│   └── middleware/
│       └── authMiddleware.js  # JWT guard
├── schema.sql                 # Database schema
├── seed.js                    # Seeds default admin user
├── package.json
└── .env                       # Not committed — see below
```

---

## Environment Variables

Create a `.env` file in the project root (never commit this file):

```dotenv
# Server
PORT=5000
NODE_ENV=production

# MySQL
DB_HOST=localhost
DB_USER=cpanel_db_username
DB_PASSWORD=your_db_password
DB_NAME=buytreasure

# JWT
JWT_SECRET=replace_with_a_long_random_string
JWT_EXPIRES_IN=7d

# Spark RESO API
SPARK_ACCESS_TOKEN=your_spark_api_bearer_token

# CORS — comma-separated allowed origins
FRONTEND_URL=https://buytreasurecoastproperty.com
ADMIN_URL=https://admin.buytreasurecoastproperty.com
```

### Generating a secure JWT_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the printed string into `JWT_SECRET`.

---

## Local Development Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd backend
npm install
```

### 2. Create `.env`

Copy the template above into a `.env` file and fill in your values. For local development use:

```dotenv
PORT=5000
NODE_ENV=development
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=
DB_NAME=buytreasure
JWT_SECRET=dev_secret_change_in_production
JWT_EXPIRES_IN=7d
SPARK_ACCESS_TOKEN=your_spark_token
FRONTEND_URL=http://localhost:3000
ADMIN_URL=http://localhost:3001
```

### 3. Create the database and run the schema

In MySQL (or any MySQL client):

```sql
CREATE DATABASE IF NOT EXISTS buytreasure CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Then run the schema:

```bash
mysql -u root -p buytreasure < schema.sql
```

### 4. Seed the admin user

```bash
npm run seed
```

This creates:
- **Email:** `admin@buytreasurecoastproperty.com`
- **Password:** `ChangeMe123!`

Change the password immediately after first login.

### 5. Start the dev server

```bash
npm run dev
```

The API will be available at `http://localhost:5000`.

---

## cPanel VPS Deployment with PM2

### Step 1 — Upload the code

**Option A — git clone (recommended)**

SSH into your server and clone into the correct directory:

```bash
cd ~/public_html   # or whichever directory your cPanel account uses
git clone <repo-url> backend
cd backend
npm install --omit=dev
```

**Option B — File Manager**

1. Zip the project locally (exclude `node_modules` and `.env`).
2. Upload via cPanel File Manager.
3. Extract, then SSH in and run `npm install --omit=dev`.

---

### Step 2 — Create `.env` on the server

SSH in and create the file:

```bash
nano ~/public_html/backend/.env
```

Paste the production `.env` block (see Environment Variables section above) and save. The file must **not** be web-accessible; keep it outside `public_html` if your host allows, or protect it with `.htaccess` (see below).

---

### Step 3 — Run schema.sql in phpMyAdmin

1. Log in to cPanel > phpMyAdmin.
2. Select (or create) the `buytreasure` database.
3. Click the **SQL** tab.
4. Paste the contents of `schema.sql` and click **Go**.

---

### Step 4 — Seed the admin user

```bash
cd ~/public_html/backend
npm run seed
```

---

### Step 5 — Start the API with PM2

Install PM2 globally if not already installed:

```bash
npm install -g pm2
```

Start the app:

```bash
cd ~/public_html/backend
pm2 start src/server.js --name buy-treasure-api
```

Persist the process list across server reboots:

```bash
pm2 save
pm2 startup
```

Follow the command that `pm2 startup` prints (it will look like `sudo env PATH=... pm2 startup systemd -u <user> --hp /home/<user>`). Run it exactly as shown.

---

### Step 6 — Apache reverse proxy via `.htaccess`

Place this `.htaccess` in the directory you want to proxy (e.g. `public_html/api` or directly in `public_html` if the whole domain serves the API):

```apache
# Proxy /api requests to the Node.js process on port 5000
RewriteEngine On
RewriteRule ^(.*)$ http://127.0.0.1:5000/$1 [P,L]
```

If only `/api` should be proxied (and the rest of the domain serves a static front-end):

```apache
RewriteEngine On

# Proxy /api/* to the Node.js API
RewriteCond %{REQUEST_URI} ^/api
RewriteRule ^(.*)$ http://127.0.0.1:5000/$1 [P,L]

# Serve static front-end for everything else
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
```

Make sure `mod_proxy` and `mod_proxy_http` are enabled on your Apache. Most cPanel hosts have them active by default.

**Protect `.env` from web access** (add to the same `.htaccess` in `public_html/backend` if that folder is web-accessible):

```apache
<Files ".env">
  Order allow,deny
  Deny from all
</Files>
```

---

### Useful PM2 Commands

```bash
pm2 list                        # Show all running processes
pm2 logs buy-treasure-api       # Tail live logs
pm2 logs buy-treasure-api --lines 200   # Last 200 log lines
pm2 restart buy-treasure-api    # Restart after code changes
pm2 reload buy-treasure-api     # Zero-downtime reload
pm2 stop buy-treasure-api       # Stop the process
pm2 delete buy-treasure-api     # Remove from PM2 list
pm2 monit                       # Real-time CPU/memory dashboard
```

---

## API Reference

Base URL (production): `https://buytreasurecoastproperty.com/api`
Base URL (local dev): `http://localhost:5000/api`

---

### Health Check

**`GET /api/health`**

No authentication required.

```bash
curl https://buytreasurecoastproperty.com/api/health
```

Response `200 OK`:

```json
{
  "status": "ok",
  "ts": "2026-06-10T12:00:00.000Z"
}
```

---

### Listings

#### `GET /api/listings`

Returns paginated active MLS listings from the Spark RESO API.

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `page` | integer | Page number (default: `1`) |
| `limit` | integer | Results per page, max 100 (default: `20`) |
| `minPrice` | number | Minimum list price |
| `maxPrice` | number | Maximum list price |
| `beds` | integer | Minimum bedrooms |
| `baths` | integer | Minimum bathrooms |
| `city` | string | Filter by city name (exact match) |
| `propertyType` | string | e.g. `Residential`, `Condominium` |

**Example:**

```bash
curl "https://buytreasurecoastproperty.com/api/listings?page=1&limit=12&city=Stuart&minPrice=300000&beds=3"
```

Response `200 OK`:

```json
{
  "listings": [
    {
      "ListingKey": "12345678",
      "ListPrice": 475000,
      "StreetNumber": "101",
      "StreetName": "Ocean Blvd",
      "City": "Stuart",
      "StateOrProvince": "FL",
      "PostalCode": "34994",
      "BedroomsTotal": 3,
      "BathroomsTotalInteger": 2,
      "LivingArea": 1850,
      "PropertyType": "Residential",
      "StandardStatus": "Active"
    }
  ],
  "total": 142,
  "page": 1,
  "limit": 12
}
```

---

#### `GET /api/listings/:listingKey`

Returns full detail for a single listing.

**Example:**

```bash
curl "https://buytreasurecoastproperty.com/api/listings/12345678"
```

Response `200 OK`: Full RESO Property object from Spark.

Response `404 Not Found`:

```json
{ "error": "Listing not found" }
```

---

#### `GET /api/listings/:listingKey/photos`

Returns all photos for a listing, ordered by `Order` ascending.

**Example:**

```bash
curl "https://buytreasurecoastproperty.com/api/listings/12345678/photos"
```

Response `200 OK`:

```json
{
  "photos": [
    {
      "MediaKey": "98765",
      "MediaURL": "https://cdn.sparkplatform.com/...",
      "Order": 0
    }
  ]
}
```

---

### Leads

#### `POST /api/leads` — Public

Saves a contact/inquiry lead from a visitor. No authentication required.

**Request body (JSON):**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Visitor's name |
| `email` | string | Yes | Visitor's email |
| `phone` | string | No | Phone number |
| `message` | string | No | Inquiry message |
| `listing_key` | string | No | MLS listing key if inquiry is about a specific listing |
| `listing_address` | string | No | Human-readable address |
| `listing_price` | string | No | List price at time of inquiry |

**Example:**

```bash
curl -X POST https://buytreasurecoastproperty.com/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "772-555-1234",
    "message": "I would like to schedule a showing.",
    "listing_key": "12345678",
    "listing_address": "101 Ocean Blvd, Stuart, FL 34994",
    "listing_price": "$475,000"
  }'
```

Response `201 Created`:

```json
{
  "success": true,
  "id": 42,
  "message": "Lead submitted successfully"
}
```

Response `400 Bad Request` (missing required fields):

```json
{ "error": "name and email are required" }
```

---

#### `GET /api/leads` — JWT Protected

Returns all leads ordered by newest first.

**Headers:** `Authorization: Bearer <token>`

**Example:**

```bash
curl https://buytreasurecoastproperty.com/api/leads \
  -H "Authorization: Bearer eyJhbGci..."
```

Response `200 OK`:

```json
{
  "leads": [
    {
      "id": 42,
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "772-555-1234",
      "message": "I would like to schedule a showing.",
      "listing_key": "12345678",
      "listing_address": "101 Ocean Blvd, Stuart, FL 34994",
      "listing_price": "$475,000",
      "created_at": "2026-06-10T14:30:00.000Z"
    }
  ]
}
```

---

#### `DELETE /api/leads/:id` — JWT Protected

Deletes a single lead by ID.

**Headers:** `Authorization: Bearer <token>`

**Example:**

```bash
curl -X DELETE https://buytreasurecoastproperty.com/api/leads/42 \
  -H "Authorization: Bearer eyJhbGci..."
```

Response `200 OK`:

```json
{ "success": true, "message": "Lead deleted" }
```

Response `404 Not Found`:

```json
{ "error": "Lead not found" }
```

---

### Authentication

#### `POST /api/auth/login`

Returns a signed JWT for the admin user.

**Request body (JSON):**

```json
{
  "email": "admin@buytreasurecoastproperty.com",
  "password": "ChangeMe123!"
}
```

**Example:**

```bash
curl -X POST https://buytreasurecoastproperty.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@buytreasurecoastproperty.com","password":"ChangeMe123!"}'
```

Response `200 OK`:

```json
{ "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

Response `401 Unauthorized`:

```json
{ "error": "Invalid credentials" }
```

Store the token in the admin dashboard and send it as `Authorization: Bearer <token>` on all protected requests. Tokens expire after `JWT_EXPIRES_IN` (default 7 days).

---

#### `GET /api/auth/verify` — JWT Protected

Verifies that a stored token is still valid.

**Headers:** `Authorization: Bearer <token>`

**Example:**

```bash
curl https://buytreasurecoastproperty.com/api/auth/verify \
  -H "Authorization: Bearer eyJhbGci..."
```

Response `200 OK`:

```json
{
  "valid": true,
  "admin": {
    "id": 1,
    "email": "admin@buytreasurecoastproperty.com",
    "iat": 1749560000,
    "exp": 1750164800
  }
}
```

Response `401 Unauthorized`:

```json
{ "error": "Invalid or expired token" }
```

---

## Error Responses

All error responses use standard HTTP status codes with a JSON body:

```json
{ "error": "Human-readable error message" }
```

| Status | Meaning |
|---|---|
| 400 | Bad request — missing or invalid fields |
| 401 | Unauthorized — missing, invalid, or expired JWT |
| 404 | Resource not found |
| 500 | Internal server error |

---

## Database Schema

Defined in `schema.sql`. Two tables:

### `leads`

Stores contact form submissions from site visitors.

| Column | Type | Notes |
|---|---|---|
| `id` | INT AUTO_INCREMENT | Primary key |
| `name` | VARCHAR(255) | Required |
| `email` | VARCHAR(255) | Required |
| `phone` | VARCHAR(50) | Optional |
| `message` | TEXT | Optional |
| `listing_key` | VARCHAR(255) | MLS listing key, optional |
| `listing_address` | VARCHAR(255) | Optional |
| `listing_price` | VARCHAR(50) | Optional |
| `created_at` | TIMESTAMP | Auto-set on insert |

### `admin_users`

Stores hashed credentials for admin dashboard access.

| Column | Type | Notes |
|---|---|---|
| `id` | INT AUTO_INCREMENT | Primary key |
| `email` | VARCHAR(255) | Unique |
| `password` | VARCHAR(255) | bcrypt hash (cost 12) |
| `created_at` | TIMESTAMP | Auto-set on insert |

---

## Scripts

| Script | Command | Description |
|---|---|---|
| Start (production) | `npm start` | Runs `node src/server.js` |
| Start (development) | `npm run dev` | Runs with nodemon for auto-restart |
| Seed admin user | `npm run seed` | Creates default admin if not present |
