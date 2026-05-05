const sendEmail = require('./sendEmail');
const sendSMS = require('./sendSMS');
const Otp = require('../models/Otp');

const normalizeEmail = (email) => {
  if (!email) return null;
  return email.trim().toLowerCase();
};

const normalizePhone = (phone) => {
  if (!phone) return null;
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  // If no country code (10 digits for US), assume +91 (India)
  // Adjust this based on your primary region
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length > 10 && !phone.startsWith('+')) {
    return `+${digits}`;
  }
  return phone.startsWith('+') ? phone : `+${digits}`;
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTP = async ({ email, phone }) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedEmail && !normalizedPhone) {
    throw new Error('Email or phone is required.');
  }

  await Otp.deleteMany({
    $or: [
      normalizedEmail ? { email: normalizedEmail } : null,
      normalizedPhone ? { phone: normalizedPhone } : null,
    ].filter(Boolean),
  });

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await new Otp({
    email: normalizedEmail,
    phone: normalizedPhone,
    otp,
    expiresAt,
  }).save();

  console.log('Generated OTP for', normalizedEmail || normalizedPhone, otp);

  const messages = [];
  let sentEmail = false;
  let sentSms = false;

  if (normalizedEmail) {
    sentEmail = await sendEmail(normalizedEmail, 'Smart City OTP Verification', `Your OTP is ${otp}`);
    messages.push(sentEmail ? '✓ Email OTP sent.' : '⚠️ Email delivery failed.');
  }

  if (normalizedPhone) {
    sentSms = await sendSMS(normalizedPhone, `Your OTP is ${otp}`);
    messages.push(sentSms ? '✓ SMS OTP sent.' : '⚠️ SMS delivery failed.');
  }

  if (!sentEmail && !sentSms) {
    messages.push('❌ No delivery provider configured or message failed to send.');
  }

  return {
    otp,
    expiresAt,
    sentEmail,
    sentSms,
    success: sentEmail || sentSms,
    messages,
  };
};

module.exports = sendOTP;
