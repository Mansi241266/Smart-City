const mongoose = require('mongoose');

const civicRequestSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    department: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'In Progress', 'Resolved'], default: 'Pending' },
    response: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('CivicRequest', civicRequestSchema);
