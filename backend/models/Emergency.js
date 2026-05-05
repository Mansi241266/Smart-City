const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, default: 'Emergency alert from user' },
    location: { type: String },
    lat: Number,
    lng: Number,
    status: {
        type: String,
        enum: ['Sent', 'Notified', 'Failed'],
        default: 'Sent'
    },
    notifiedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('Emergency', emergencySchema);
