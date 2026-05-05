const bcrypt = require('bcryptjs');

const DEFAULT_SALT_ROUNDS = 12;

const hashPassword = async (password, saltRounds = DEFAULT_SALT_ROUNDS) => {
  if (!password) {
    throw new Error('Password is required for hashing.');
  }
  return bcrypt.hash(password, saltRounds);
};

const comparePassword = async (password, hash) => {
  if (!password || !hash) {
    return false;
  }
  return bcrypt.compare(password, hash);
};

const passwordStrength = (password) => {
  if (!password || typeof password !== 'string') {
    return {
      score: 0,
      valid: false,
      message: 'Password must be a non-empty string.',
    };
  }

  const lengthScore = Math.min(Math.max(password.length - 8, 0), 4);
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  const complexityScore = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
  const score = lengthScore + complexityScore;

  let message = 'Weak password.';
  if (score >= 6) {
    message = 'Strong password.';
  } else if (score >= 4) {
    message = 'Medium password.';
  }

  return {
    score,
    valid: score >= 4,
    message,
    requirements: {
      minLength: password.length >= 8,
      hasLower,
      hasUpper,
      hasDigit,
      hasSymbol,
    },
  };
};

module.exports = {
  hashPassword,
  comparePassword,
  passwordStrength,
};
