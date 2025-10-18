const nodemailer = require('nodemailer');

// Create test SMTP service account for testing
const createTestAccount = async () => {
  if (process.env.NODE_ENV === 'test') {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }
  return null;
};

// Create SMTP transporter
const createTransporter = async () => {
  // For production
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // For testing
  return await createTestAccount();
};

/**
 * Send email using configured SMTP transport
 * @param {Object} options Email options
 * @param {string} options.to Recipient email
 * @param {string} options.subject Email subject
 * @param {string} options.html Email HTML content
 * @returns {Promise<Object>} Email send result
 */
const sendEmail = async options => {
  const transporter = await createTransporter();
  if (!transporter) {
    throw new Error('Email transport not configured');
  }

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || '"Blog App" <noreply@blogapp.com>',
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  // For testing, return ethereal URL
  if (process.env.NODE_ENV === 'test') {
    return {
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info),
    };
  }

  return {
    messageId: info.messageId,
  };
};

module.exports = {
  sendEmail,
};