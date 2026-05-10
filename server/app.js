const cors = require('cors');
const dotenv = require('dotenv');
const express = require('express');
const morgan = require('morgan');

const { connectToDatabase, isDatabaseConfigured } = require('./db');
const { isDemoModeEnabled, sendBulkEmail } = require('./mail');
const EmailLog = require('./models/EmailLog');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

function sanitizeRecipients(rawRecipients) {
  const unique = new Set();

  rawRecipients.forEach((recipient) => {
    if (typeof recipient !== 'string') {
      return;
    }

    const normalized = recipient.trim().toLowerCase();

    if (!normalized) {
      return;
    }

    unique.add(normalized);
  });

  return Array.from(unique);
}

function validateEmailPayload({ subject, body, recipients }) {
  if (!subject || !subject.trim()) {
    return 'Subject is required.';
  }

  if (!body || !body.trim()) {
    return 'Email body is required.';
  }

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return 'At least one recipient email is required.';
  }

  const invalidRecipients = recipients.filter(
    (email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );

  if (invalidRecipients.length > 0) {
    return `Invalid recipient emails: ${invalidRecipients.join(', ')}`;
  }

  return null;
}

app.get('/api/health', async (_req, res) => {
  try {
    if (!isDatabaseConfigured()) {
      return res.json({
        ok: true,
        message: 'API is healthy. MongoDB is not configured, so email history is disabled.',
        databaseEnabled: false,
        mailMode: isDemoModeEnabled() ? 'demo' : 'smtp',
      });
    }

    await connectToDatabase();
    res.json({
      ok: true,
      message: 'API and database connection are healthy.',
      databaseEnabled: true,
      mailMode: isDemoModeEnabled() ? 'demo' : 'smtp',
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.get('/api/emails/history', async (_req, res) => {
  try {
    if (!isDatabaseConfigured()) {
      return res.json({
        ok: true,
        history: [],
        message: 'MongoDB is not configured, so email history is unavailable.',
      });
    }

    await connectToDatabase();

    const history = await EmailLog.find().sort({ createdAt: -1 }).limit(20).lean();

    res.json({ ok: true, history });
  } catch (error) {
    console.error('Failed to load email history', error);
    res.status(500).json({ ok: false, message: error.message || 'Failed to load email history.' });
  }
});

app.post('/api/emails/send', async (req, res) => {
  try {
    const recipients = sanitizeRecipients(req.body.recipients || []);
    const payload = {
      subject: req.body.subject,
      body: req.body.body,
      recipients,
    };

    const validationMessage = validateEmailPayload(payload);

    if (validationMessage) {
      return res.status(400).json({ ok: false, message: validationMessage });
    }

    const result = await sendBulkEmail(payload);

    let savedEmail = {
      ...payload,
      ...result,
      _id: 'local-only',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let responseMessage =
      result.status === 'sent'
        ? `Email delivered to ${result.successCount} recipients.`
        : result.status === 'partial'
          ? `Email delivered to ${result.successCount} recipients with ${result.failureCount} failures.`
          : 'Email delivery failed for all recipients.';

    if (result.deliveryMode === 'demo') {
      responseMessage = `${responseMessage} Demo mode is active, so no real emails were sent.`;
    }

    if (isDatabaseConfigured()) {
      await connectToDatabase();
      savedEmail = await EmailLog.create({
        ...payload,
        ...result,
      });
    } else {
      responseMessage = `${responseMessage} MongoDB is not configured, so this email was not saved to history.`;
    }

    return res.status(result.status === 'failed' ? 500 : 200).json({
      ok: result.status !== 'failed',
      message: responseMessage,
      deliveryMode: result.deliveryMode,
      email: savedEmail,
    });
  } catch (error) {
    console.error('Failed to send bulk email', error);

    return res.status(500).json({
      ok: false,
      message: error.message || 'Failed to send email.',
    });
  }
});

module.exports = app;
