require('dotenv').config();
const nodemailer = require('nodemailer');

const emailConfigured = Boolean(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);
if (!emailConfigured) {
  console.warn('Email provider not configured. Check EMAIL_HOST, EMAIL_USER, EMAIL_PASS in .env.');
}

const transporter = emailConfigured
  ? nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  : null;

const sendEmail = async (to, subject, text) => {
  if (!transporter) {
    console.warn('Email service not configured. Skipping sendEmail.');
    return false;
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      text,
    });

    return true;
  } catch (err) {
    console.error('sendEmail error:', err.message);
    return false;
  }
};

module.exports = sendEmail;
