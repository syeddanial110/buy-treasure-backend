const db = require('../lib/db');

async function createPopupLead(req, res) {
  try {
    const { name, email, phone, interested_area } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'name and email are required' });
    }

    const [result] = await db.execute(
      `INSERT INTO popup_leads (name, email, phone, interested_area)
       VALUES (?, ?, ?, ?)`,
      [
        name,
        email,
        phone           || null,
        interested_area || null,
      ]
    );

    res.status(201).json({ success: true, id: result.insertId, message: 'Lead submitted successfully' });
  } catch (err) {
    console.error('[popupLeadsController] createPopupLead:', err.message);
    res.status(500).json({ error: 'Failed to save lead' });
  }
}

async function getPopupLeads(req, res) {
  try {
    const [rows] = await db.execute('SELECT * FROM popup_leads ORDER BY created_at DESC');
    res.json({ leads: rows });
  } catch (err) {
    console.error('[popupLeadsController] getPopupLeads:', err.message);
    res.status(500).json({ error: 'Failed to fetch popup leads' });
  }
}

async function deletePopupLead(req, res) {
  try {
    const { id } = req.params;
    const [result] = await db.execute('DELETE FROM popup_leads WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({ success: true, message: 'Lead deleted' });
  } catch (err) {
    console.error('[popupLeadsController] deletePopupLead:', err.message);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
}

module.exports = { createPopupLead, getPopupLeads, deletePopupLead };
