const db = require('../lib/db');

async function createHomeValueLead(req, res) {
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
      `INSERT INTO home_value_leads (name, email, phone, message)
       VALUES (?, ?, ?, ?)`,
      [
        name,
        email,
        phone   || null,
        message || null,
      ]
    );

    res.status(201).json({ success: true, id: result.insertId, message: 'Home value request submitted successfully' });
  } catch (err) {
    console.error('[homeValueController] createHomeValueLead:', err.message);
    res.status(500).json({ error: 'Failed to save home value request' });
  }
}

async function getHomeValueLeads(req, res) {
  try {
    const [rows] = await db.execute('SELECT * FROM home_value_leads ORDER BY created_at DESC');
    res.json({ leads: rows });
  } catch (err) {
    console.error('[homeValueController] getHomeValueLeads:', err.message);
    res.status(500).json({ error: 'Failed to fetch home value leads' });
  }
}

async function deleteHomeValueLead(req, res) {
  try {
    const { id } = req.params;
    const [result] = await db.execute('DELETE FROM home_value_leads WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({ success: true, message: 'Lead deleted' });
  } catch (err) {
    console.error('[homeValueController] deleteHomeValueLead:', err.message);
    res.status(500).json({ error: 'Failed to delete home value lead' });
  }
}

module.exports = { createHomeValueLead, getHomeValueLeads, deleteHomeValueLead };
