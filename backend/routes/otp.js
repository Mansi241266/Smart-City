const express = require('express');
const Otp = require('../models/Otp');
const User = require('../models/User');
const sendOTP = require('../utils/sendOTP');
const { hashPassword } = require('../utils/password');

const router = express.Router();

function normalizeEmail(email) {
  return email ? email.trim().toLowerCase() : null;
}

function normalizePhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  // If no country code (10 digits), assume +91 (India)
  // Adjust this based on your primary region
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length > 10 && !phone.startsWith('+')) {
    return `+${digits}`;
  }
  return phone.startsWith('+') ? phone : `+${digits}`;
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP to email or phone
router.post('/send-otp', async (req, res) => {
  try {
    const { email, phone } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedEmail && !normalizedPhone) {
      return res.status(400).json({ message: 'Email or phone is required.' });
    }

    const user = await User.findOne({
      $or: [
        normalizedEmail ? { email: normalizedEmail } : null,
        normalizedPhone ? { mobile: normalizedPhone } : null,
      ].filter(Boolean),
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const result = await sendOTP({ email, phone });

    if (!result.success) {
      return res.status(500).json({ message: result.messages.join(' ') });
    }

    res.json({ message: result.messages.join(' ') });
  } catch (error) {
    console.error('send-otp error:', error);
    res.status(500).json({ message: 'Failed to generate OTP.' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, phone, otp } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedEmail && !normalizedPhone) {
      return res.status(400).json({ message: 'Email or phone is required.' });
    }

    if (!otp) {
      return res.status(400).json({ message: 'OTP is required.' });
    }

    const record = await Otp.findOne({
      $or: [
        normalizedEmail ? { email: normalizedEmail } : null,
        normalizedPhone ? { phone: normalizedPhone } : null,
      ].filter(Boolean),
      otp,
    });

    if (!record) {
      return res.status(400).json({ message: 'Invalid OTP.' });
    }

    if (record.expiresAt < new Date()) {
      return res.status(400).json({ message: 'OTP expired.' });
    }

    res.json({ message: 'OTP verified.' });
  } catch (error) {
    console.error('verify-otp error:', error);
    res.status(500).json({ message: 'Failed to verify OTP.' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, phone, otp, newPassword } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedEmail && !normalizedPhone) {
      return res.status(400).json({ message: 'Email or phone is required.' });
    }

    if (!otp) {
      return res.status(400).json({ message: 'OTP is required.' });
    }

    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required.' });
    }

    if (!normalizedEmail && !normalizedPhone) {
      return res.status(400).json({ message: 'Email or phone is required.' });
    }

    const record = await Otp.findOne({
      $or: [
        normalizedEmail ? { email: normalizedEmail } : null,
        normalizedPhone ? { phone: normalizedPhone } : null,
      ].filter(Boolean),
      otp,
    });

    if (!record) {
      return res.status(400).json({ message: 'Invalid OTP.' });
    }

    if (record.expiresAt < new Date()) {
      return res.status(400).json({ message: 'OTP expired.' });
    }

    const user = await User.findOne({
      $or: [
        normalizedEmail ? { email: normalizedEmail } : null,
        normalizedPhone ? { mobile: normalizedPhone } : null,
      ].filter(Boolean),
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.passwordHash = await hashPassword(newPassword);
    await user.save();

    await Otp.deleteMany({
      $or: [
        normalizedEmail ? { email: normalizedEmail } : null,
        normalizedPhone ? { phone: normalizedPhone } : null,
      ].filter(Boolean),
    });

    res.json({ message: 'Password reset successful. You can now login.' });
  } catch (error) {
    console.error('reset-password error:', error);
    res.status(500).json({ message: 'Failed to reset password.' });
  }
});

module.exports = router;
