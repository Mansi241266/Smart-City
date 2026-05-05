require('dotenv').config();
const twilio = require('twilio');

const sendSMS = async (to, message) => {
  if (!process.env.TWILIO_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    console.warn('⚠️ SMS not configured. Skipping SMS delivery.');
    return false;
  }

  const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

  if (!to) {
    console.error('❌ Recipient number missing!');
    return false;
  }

  // Normalize phone number: ensure it has + and country code
  let phoneNumber = to;
  if (!phoneNumber.startsWith('+')) {
    // If it's just digits, try to add country code
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length === 10) {
      phoneNumber = `+91${digits}`; // Assuming India, adjust as needed
    } else {
      phoneNumber = `+${digits}`;
    }
  }

  const isValid = /^\+\d{10,15}$/.test(phoneNumber);

  if (!isValid) {
    console.error('❌ SMS error: Invalid phone format:', phoneNumber);
    return false;
  }

  try {
    const res = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });
    console.log('✓ SMS sent successfully. SID:', res.sid);
    return true;
  } catch (err) {
    console.error('❌ SMS error:', err.message);
    return false;
  }
};

module.exports = sendSMS;