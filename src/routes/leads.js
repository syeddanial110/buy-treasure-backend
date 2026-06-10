const express = require('express');
const router = express.Router();
const { createLead, getLeads, deleteLead } = require('../controllers/leadsController');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/', createLead);
router.get('/', requireAuth, getLeads);
router.delete('/:id', requireAuth, deleteLead);

module.exports = router;
