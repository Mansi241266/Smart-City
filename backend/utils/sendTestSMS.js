// sendTestSMS.js
const sendSMS = require('./sendSMS'); // import the SMS function

// Replace with the real recipient number in E.164 format (example: +919876543210)
const recipientNumber = '+918267802251';
const messageText = 'Hello from Smart City Project!';

function isValidE164(number) {
  return /^\+[1-9]\d{10,14}$/.test(number);
}

const run = async () => {
  if (!isValidE164(recipientNumber)) {
    console.error('Invalid recipient number. Use a full E.164 phone number like +14788007441.');
    return;
  }

  const success = await sendSMS(recipientNumber, messageText);
  if (success) {
    console.log('Message sent successfully!');
  } else {
    console.log('Failed to send SMS.');
  }
};

run();