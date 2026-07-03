const express = require('express');
const router = express.Router();
const { createPopupLead, getPopupLeads, deletePopupLead } = require('../controllers/popupLeadsController');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/', createPopupLead);
router.get('/', requireAuth, getPopupLeads);
router.delete('/:id', requireAuth, deletePopupLead);

module.exports = router;
