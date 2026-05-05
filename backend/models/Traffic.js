const mongoose = require('mongoose');

const trafficSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    issueType: {
        type: String,
        required: true,
        trim: true,
    },
    description: String,
    location: String,
    lat: Number,
    lng: Number,
    image: String,
    status: {
        type: String,
        enum: ['Pending', 'In Progress', 'Resolved'],
        default: 'Pending'
    }
}, { timestamps: true });

module.exports = mongoose.model('Traffic', trafficSchema);
