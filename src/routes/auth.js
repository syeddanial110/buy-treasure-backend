const express = require('express');
const router = express.Router();
const { login, verify } = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/login', login);
router.get('/verify', requireAuth, verify);

module.exports = router;
