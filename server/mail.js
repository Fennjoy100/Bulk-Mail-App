const nodemailer = require('nodemailer');

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP configuration is incomplete.');
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === 'true',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
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
  };
}

module.exports = {
  sendBulkEmail,
};
