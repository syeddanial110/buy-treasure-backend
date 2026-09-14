const db = require('../lib/db');

async function createContactLead(req, res) {
  try {
    const { name, email, phone, message } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'name and email are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const [result] = await db.execute(
      `INSERT INTO contact_leads (name, email, phone, message) VALUES (?, ?, ?, ?)`,
      [name, email, phone || null, message || null]
    );

    res.status(201).json({ success: true, id: result.insertId, message: 'Message sent successfully' });
  } catch (err) {
    console.error('[contactLeadsController] createContactLead:', err.message);
    res.status(500).json({ error: 'Failed to save contact message' });
  }
}

async function getContactLeads(req, res) {
  try {
    const [rows] = await db.execute('SELECT * FROM contact_leads ORDER BY created_at DESC');
    res.json({ leads: rows });
  } catch (err) {
    console.error('[contactLeadsController] getContactLeads:', err.message);
    res.status(500).json({ error: 'Failed to fetch contact leads' });
  }
}

async function deleteContactLead(req, res) {
  try {
    const { id } = req.params;
    const [result] = await db.execute('DELETE FROM contact_leads WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({ success: true, message: 'Lead deleted' });
  } catch (err) {
    console.error('[contactLeadsController] deleteContactLead:', err.message);
    res.status(500).json({ error: 'Failed to delete contact lead' });
  }
}

module.exports = { createContactLead, getContactLeads, deleteContactLead };
