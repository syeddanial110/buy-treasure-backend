const db = require('../lib/db');

async function createLead(req, res) {
  try {
    const { name, email, phone, message, listing_key, listing_address, listing_price, leadType } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'name and email are required' });
    }

    const VALID_LEAD_TYPES = ['listing-detail', 'popup-form'];
    if (leadType && !VALID_LEAD_TYPES.includes(leadType)) {
      return res.status(400).json({ error: `leadType must be one of: ${VALID_LEAD_TYPES.join(', ')}` });
    }

    const [result] = await db.execute(
      `INSERT INTO leads (name, email, phone, message, listing_key, listing_address, listing_price, lead_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        email,
        phone           || null,
        message         || null,
        listing_key     || null,
        listing_address || null,
        listing_price   || null,
        leadType        || null,
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
