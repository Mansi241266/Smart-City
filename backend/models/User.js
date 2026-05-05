const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    mobile: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    passwordHash: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
    confirmed: {
        type: Boolean,
        default: true,
    },
    confirmToken: String,
    confirmExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    otpCode: String,
    otpExpires: Date,
    loginAttempts: {
        type: Number,
        default: 0,
    },
    lockUntil: Date,
    points: {
        type: Number,
        default: 0,
    },
    badge: {
        type: String,
        default: 'Active Citizen',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

userSchema.virtual('isLocked').get(function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.methods.incLoginAttempts = function () {
    const updates = { $inc: { loginAttempts: 1 } };
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + 30 * 60 * 1000 };
    }
    return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function () {
    return this.updateOne({ loginAttempts: 0, lockUntil: null });
};

module.exports = mongoose.model('User', userSchema);
