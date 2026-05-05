const express = require('express');
const Emergency = require('../models/Emergency');
const User = require('../models/User');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');
const sendEmail = require('../utils/sendEmail');
const sendSMS = require('../utils/sendSMS');

const router = express.Router();

function parseCoordinates(body) {
    const lat = parseFloat(body.lat || '');
    const lng = parseFloat(body.lng || '');
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        return { lat, lng };
    }

    if (body.location) {
        const parts = body.location.split(',').map(part => part.trim());
        if (parts.length === 2) {
            const parsedLat = parseFloat(parts[0]);
            const parsedLng = parseFloat(parts[1]);
            if (!Number.isNaN(parsedLat) && !Number.isNaN(parsedLng)) {
                return { lat: parsedLat, lng: parsedLng };
            }
        }
    }

    return { lat: null, lng: null };
}

router.post('/emergency/send', authenticateToken, async (req, res) => {
    try {
        const message = req.body.message || 'Emergency SOS alert';
        const location = req.body.location || 'Location unavailable';
        const coords = parseCoordinates(req.body);

        const emergency = await Emergency.create({
            userId: req.user.id,
            message,
            location,
            lat: coords.lat,
            lng: coords.lng,
            status: 'Sent'
        });

        const admins = await User.find({ role: 'admin' }).select('name email mobile');
        const alertText = `🚨 Emergency SOS from ${req.user.email || req.user.id}\nLocation: ${location}\nMessage: ${message}`;
        const notifyResults = [];

        await Promise.all(admins.map(async admin => {
            if (admin.email) {
                const emailSent = await sendEmail(admin.email, 'Emergency SOS Alert', alertText);
                notifyResults.push({ method: 'email', admin: admin.email, success: emailSent });
            }
            if (admin.mobile) {
                const smsSent = await sendSMS(admin.mobile, alertText);
                notifyResults.push({ method: 'sms', admin: admin.mobile, success: smsSent });
            }
        }));

        const io = req.app.get('io');
        if (io) {
            io.emit('notification', {
                type: 'emergency',
                title: 'Emergency SOS Sent',
                message: `Emergency alert sent to authorities. ${notifyResults.length ? 'Notified admins.' : 'No notification channel available.'}`
            });
        }

        res.json({ message: 'Emergency alert sent', emergency, notifyResults });
    } catch (error) {
        console.error('Emergency send error:', error);
        res.status(500).json({ error: 'Failed to send emergency alert' });
    }
});

router.get('/emergency/all', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const alerts = await Emergency.find()
            .populate('userId', 'name email mobile')
            .sort({ createdAt: -1 })
            .limit(30);

        res.json({ alerts });
    } catch (error) {
        console.error('Emergency fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch emergency alerts' });
    }
});

module.exports = router;
