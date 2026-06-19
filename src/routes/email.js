const express = require('express');
const router = express.Router();
const { sendBulkEmails } = require('../controllers/emailController');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/send', requireAuth, sendBulkEmails);

module.exports = router;
