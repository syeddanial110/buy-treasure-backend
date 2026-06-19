const nodemailer = require('nodemailer');

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendBulkEmails(req, res) {
  try {
    const { recipients } = req.body;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'recipients must be a non-empty array' });
    }

    const invalid = recipients.find(r => !r.email || !r.subject || !r.Message);
    if (invalid) {
      return res.status(400).json({ error: 'Each recipient must have email, subject, and Message' });
    }

    const transporter = createTransporter();
    const results = await Promise.allSettled(
      recipients.map(({ email, subject, Message }) =>
        transporter.sendMail({
          from: `"${process.env.SMTP_FROM_NAME || 'Buy Treasure Coast'}" <${process.env.SMTP_USER}>`,
          to: email,
          subject,
          text: Message,
          html: `<div style="font-family:sans-serif;line-height:1.6">${Message.replace(/\n/g, '<br>')}</div>`,
        })
      )
    );

    const summary = results.map((r, i) => ({
      email: recipients[i].email,
      status: r.status === 'fulfilled' ? 'sent' : 'failed',
      ...(r.status === 'rejected' && { error: r.reason?.message }),
    }));

    const failed = summary.filter(s => s.status === 'failed');
    const statusCode = failed.length === recipients.length ? 500 : 200;

    res.status(statusCode).json({
      total: recipients.length,
      sent: summary.filter(s => s.status === 'sent').length,
      failed: failed.length,
      results: summary,
    });
  } catch (err) {
    console.error('[emailController] sendBulkEmails:', err.message);
    res.status(500).json({ error: 'Failed to send emails' });
  }
}

module.exports = { sendBulkEmails };
