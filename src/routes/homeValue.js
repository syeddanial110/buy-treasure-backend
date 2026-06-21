const express = require('express');
const router = express.Router();
const { createHomeValueLead, getHomeValueLeads, deleteHomeValueLead } = require('../controllers/homeValueController');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/', createHomeValueLead);
router.get('/', requireAuth, getHomeValueLeads);
router.delete('/:id', requireAuth, deleteHomeValueLead);

module.exports = router;
