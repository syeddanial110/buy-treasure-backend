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
    callback(null, false);
  },
  credentials: true,
}));

app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.use('/api/listings', listingsRouter);
app.use('/api/leads',    leadsRouter);
app.use('/api/auth',     authRouter);

app.use((err, _req, res, _next) => {
  console.error('[server] unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Buy Treasure API running on port http://localhost:${PORT}`));

module.exports = app;
