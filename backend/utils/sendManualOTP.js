const sendSMS = require('./sendSMS');

// ✅ Replace with your verified number (full E.164 format)
const recipient = '+918267802251';

// ✅ Manually set your OTP here
const manualOTP = '756984'; // your custom OTP

// Message to send
const message = `Your Smart City OTP is: ${manualOTP}`;

// Send SMS
sendSMS(recipient, message)
  .then(success => console.log(success ? 'OTP sent!' : 'Failed to send OTP'))
  .catch(console.error);