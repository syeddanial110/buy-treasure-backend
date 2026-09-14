const express = require('express');
const router = express.Router();
const { createContactLead, getContactLeads, deleteContactLead } = require('../controllers/contactLeadsController');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/',     createContactLead);
router.get('/',      requireAuth, getContactLeads);
router.delete('/:id', requireAuth, deleteContactLead);

module.exports = router;
