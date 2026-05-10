const nodemailer = require('nodemailer');

function isSmtpConfigured() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  return Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS);
}

function isDemoModeEnabled() {
  return process.env.SMTP_DEMO_MODE === 'true' || !isSmtpConfigured();
}

function getTransporter() {
  if (!isSmtpConfigured()) {
    throw new Error('SMTP configuration is incomplete.');
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function bodyToHtml(body) {
  return body
    .split('\n')
    .map((line) => line.trim())
    .map((line) => (line ? `<p>${escapeHtml(line)}</p>` : '<br />'))
    .join('');
}

async function sendBulkEmail({ subject, body, recipients }) {
  if (isDemoModeEnabled()) {
    return {
      status: 'sent',
      successCount: recipients.length,
      failureCount: 0,
      failedRecipients: [],
      errorMessages: [],
      deliveryMode: 'demo',
      preview: {
        subject,
        body,
        recipients,
      },
    };
  }

  const transporter = getTransporter();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;

  const settledResults = await Promise.allSettled(
    recipients.map((recipient) =>
      transporter.sendMail({
        from,
        to: recipient,
        subject,
        text: body,
        html: bodyToHtml(body),
      })
    )
  );

  const failedRecipients = [];
  const errorMessages = [];
  let successCount = 0;

  settledResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successCount += 1;
      return;
    }

    const failedRecipient = recipients[index];
    failedRecipients.push(failedRecipient);
    errorMessages.push(`${failedRecipient}: ${result.reason.message}`);
  });

  const failureCount = failedRecipients.length;
  const status = failureCount === 0 ? 'sent' : successCount > 0 ? 'partial' : 'failed';

  return {
    status,
    successCount,
    failureCount,
    failedRecipients,
    errorMessages,
    deliveryMode: 'smtp',
  };
}

module.exports = {
  isDemoModeEnabled,
  isSmtpConfigured,
  sendBulkEmail,
};
