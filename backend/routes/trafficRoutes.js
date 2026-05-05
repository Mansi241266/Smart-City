const express = require('express');
const multer = require('multer');
const Traffic = require('../models/Traffic');
const User = require('../models/User');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

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

router.post('/traffic/add', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { issueType, description, location } = req.body;
        if (!issueType || !description || !location) {
            return res.status(400).json({ error: 'Issue type, description and location are required.' });
        }

        const coords = parseCoordinates(req.body);

        const traffic = await Traffic.create({
            user: req.user.id,
            issueType,
            description,
            location,
            lat: coords.lat,
            lng: coords.lng,
            image: req.file ? req.file.filename : null,
        });

        await User.findByIdAndUpdate(req.user.id, { $inc: { points: 5 } });

        const io = req.app.get('io');
        if (io) {
            io.emit('notification', {
                type: 'traffic',
                title: 'New Traffic Report',
                message: `${req.user.name || req.user.email} reported ${traffic.issueType} at ${traffic.location}`
            });
        }

        res.json({ message: 'Traffic issue reported', traffic });
    } catch (error) {
        console.error('Add traffic error:', error);
        res.status(500).json({ error: 'Failed to report traffic issue' });
    }
});

router.get('/traffic/my', authenticateToken, async (req, res) => {
    try {
        const traffic = await Traffic.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json({ traffic });
    } catch (error) {
        console.error('Fetch user traffic error:', error);
        res.status(500).json({ error: 'Failed to fetch traffic reports' });
    }
});

router.get('/traffic/all', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const traffic = await Traffic.find().populate('user', 'name email mobile').sort({ createdAt: -1 });
        res.json({ traffic });
    } catch (error) {
        console.error('Fetch all traffic error:', error);
        res.status(500).json({ error: 'Failed to fetch traffic reports' });
    }
});

router.put('/traffic/update/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ error: 'Status is required.' });
        }

        const traffic = await Traffic.findById(req.params.id);
        if (!traffic) {
            return res.status(404).json({ error: 'Traffic report not found.' });
        }

        traffic.status = status;
        await traffic.save();

        res.json({ message: 'Traffic status updated.', traffic });
    } catch (error) {
        console.error('Update traffic status error:', error);
        res.status(500).json({ error: 'Failed to update traffic status' });
    }
});

router.get('/traffic/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const total = await Traffic.countDocuments();
        const pending = await Traffic.countDocuments({ status: 'Pending' });
        const inProgress = await Traffic.countDocuments({ status: 'In Progress' });
        const resolved = await Traffic.countDocuments({ status: 'Resolved' });

        const issueGroups = await Traffic.aggregate([
            { $group: { _id: '$issueType', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        res.json({ total, pending, inProgress, resolved, issueGroups });
    } catch (error) {
        console.error('Traffic stats error:', error);
        res.status(500).json({ error: 'Failed to fetch traffic stats' });
    }
});

router.get('/traffic/heatmap', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const traffic = await Traffic.find({ lat: { $ne: null }, lng: { $ne: null } }).lean();
        const markers = traffic.map(item => ({
            id: item._id,
            issueType: item.issueType,
            status: item.status,
            location: item.location,
            lat: item.lat,
            lng: item.lng,
            severity: item.issueType === 'Accident' || item.issueType === 'Road Block' || item.issueType === 'Signal Issue' ? 'heavy' : 'medium',
            createdAt: item.createdAt,
        }));

        res.json({ markers });
    } catch (error) {
        console.error('Traffic heatmap error:', error);
        res.status(500).json({ error: 'Failed to fetch traffic heatmap' });
    }
});

module.exports = router;
