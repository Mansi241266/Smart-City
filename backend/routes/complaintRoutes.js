const express = require("express");
const router = express.Router();
const path = require("path");
const Complaint = require("../models/Complaint");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const sendSMS = require("../utils/sendSMS");
const { authenticateToken } = require("../middleware/authMiddleware");
const multer = require("multer");

// Image upload setup
const storage = multer.diskStorage({
    destination: path.join(__dirname, "../uploads"),
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
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

function getBadge(points) {
    if (points >= 500) return 'City Hero';
    if (points >= 200) return 'Super Reporter';
    if (points >= 100) return 'Active Citizen';
    return 'Community Supporter';
}

// Add Complaint
router.post("/add", authenticateToken, upload.single("image"), async (req, res) => {
    try {
        const coords = parseCoordinates(req.body);
        const complaint = await Complaint.create({
            userId: req.user.id,
            title: req.body.title,
            description: req.body.description,
            location: req.body.location,
            lat: coords.lat,
            lng: coords.lng,
            image: req.file ? req.file.filename : null,
            category: req.body.category,
            priority: req.body.priority,
            status: 'Pending'
        });

        const admins = await User.find({ role: 'admin' }).select('name email mobile');
        const notifyMessage = `New complaint submitted by ${req.user.email || req.user.id}: ${complaint.title || 'No title'}\nCategory: ${complaint.category || 'General'}\nPriority: ${complaint.priority || 'Medium'}\nLocation: ${complaint.location || 'N/A'}`;

        const notifyResults = [];
        await Promise.all(admins.map(async admin => {
            if (admin.email) {
                const emailSent = await sendEmail(admin.email, 'New Complaint Submitted', notifyMessage);
                notifyResults.push({ method: 'email', admin: admin.email, success: emailSent });
            }
            if (admin.mobile) {
                const smsSent = await sendSMS(admin.mobile, notifyMessage);
                notifyResults.push({ method: 'sms', admin: admin.mobile, success: smsSent });
            }
        }));

        const updatedUser = await User.findByIdAndUpdate(req.user.id, { $inc: { points: 10 } }, { new: true });
        if (updatedUser) {
            const badge = getBadge(updatedUser.points || 0);
            if (updatedUser.badge !== badge) {
                updatedUser.badge = badge;
                await updatedUser.save();
            }
        }

        const io = req.app.get('io');
        if (io) {
            io.emit('notification', {
                type: 'complaint',
                title: 'New Complaint Submitted',
                message: `${req.user.name || req.user.email} submitted a new complaint: ${complaint.title || 'No title'}`
            });
        }

        res.json({ message: "Complaint added", complaint, notifyResults });
    } catch (error) {
        console.error('Add complaint error:', error);
        res.status(500).json({ error: 'Failed to add complaint' });
    }
});

// Get My Complaints
router.get("/my", authenticateToken, async (req, res) => {

    const data = await Complaint.find({ userId: req.user.id })
        .sort({ createdAt: -1 });

    res.json(data);
});

router.post('/vote/:id', authenticateToken, async (req, res) => {
    try {
        const complaint = await Complaint.findByIdAndUpdate(
            req.params.id,
            { $inc: { votes: 1 } },
            { new: true }
        );
        if (!complaint) {
            return res.status(404).json({ error: 'Complaint not found.' });
        }
        res.json({ message: 'Complaint upvoted.', votes: complaint.votes });
    } catch (error) {
        console.error('Vote error:', error);
        res.status(500).json({ error: 'Failed to register vote.' });
    }
});

router.get('/all', authenticateToken, async (req, res) => {
    try {
        const complaints = await Complaint.find().sort({ createdAt: -1 });
        res.json({ complaints });
    } catch (error) {
        console.error('Fetch all complaints error:', error);
        res.status(500).json({ error: 'Failed to load complaints.' });
    }
});

router.get('/trending', authenticateToken, async (req, res) => {
    try {
        const complaints = await Complaint.find().sort({ votes: -1, createdAt: -1 }).limit(5);
        res.json({ complaints });
    } catch (error) {
        console.error('Trending complaints error:', error);
        res.status(500).json({ error: 'Failed to load trending complaints.' });
    }
});

router.delete('/delete/:id', authenticateToken, async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) {
            return res.status(404).json({ error: 'Complaint not found.' });
        }

        if (complaint.userId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized to delete this complaint.' });
        }

        await complaint.deleteOne();

        const io = req.app.get('io');
        if (io) {
            io.emit('notification', {
                type: 'complaint',
                title: 'Complaint Deleted',
                message: `Complaint "${complaint.title || 'Untitled'}" was deleted.`
            });
        }

        res.json({ message: 'Complaint deleted successfully.' });
    } catch (error) {
        console.error('Delete complaint error:', error);
        res.status(500).json({ error: 'Failed to delete complaint.' });
    }
});

module.exports = router;