const mongoose = require('mongoose');

const aqiSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lat: Number,
    lng: Number,
    location: String,
    aqi: Number,
    aqiIndex: Number,
    category: String,
    status: String,
    suggestion: String,
    components: {
        co: Number,
        no: Number,
        no2: Number,
        o3: Number,
        so2: Number,
        pm2_5: Number,
        pm10: Number,
        nh3: Number,
    },
}, { timestamps: true });

module.exports = mongoose.model('AqiRecord', aqiSchema);
