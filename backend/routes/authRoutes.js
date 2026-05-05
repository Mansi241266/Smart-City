const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');
const { hashPassword, comparePassword } = require('../utils/password');
const sendEmail = require('../utils/sendEmail');
const sendSMS = require('../utils/sendSMS');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'smartcitysecret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'smartcityrefresh';
const EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@smartcity.local';


function makeToken(user) {
    return jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
}

function makeRefreshToken(user) {
    return jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

function normalizeEmail(email) {
    return email ? email.trim().toLowerCase() : null;
}

function normalizePhone(phone) {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    // If no country code (10 digits), assume +91 (India)
    // Adjust this based on your primary region
    if (digits.length === 10) {
        return `+91${digits}`;
    }
    if (digits.length > 10 && !phone.startsWith('+')) {
        return `+${digits}`;
    }
    return phone.startsWith('+') ? phone : `+${digits}`;
}

function generatePlaceholderEmail() {
    return `user-${Date.now()}@smartcity.local`;
}

function generatePlaceholderMobile() {
    return `000${Date.now()}`;
}

function generateOtpCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}


router.post('/signup', async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        const normalizedEmail = normalizeEmail(email);
        const normalizedPhone = normalizePhone(phone);

        if (!name || !password) {
            return res.status(400).json({ error: 'Name and password are required.' });
        }

        if (!normalizedEmail && !normalizedPhone) {
            return res.status(400).json({ error: 'Email or phone is required.' });
        }

        const existingUser = await User.findOne({
            $or: [
                normalizedEmail ? { email: normalizedEmail } : null,
                normalizedPhone ? { mobile: normalizedPhone } : null,
            ].filter(Boolean),
        });

        if (existingUser) {
            return res.status(409).json({ error: 'Email or phone already registered.' });
        }

        const passwordHash = await hashPassword(password);
        const userEmail = normalizedEmail || generatePlaceholderEmail();
        const userMobile = normalizedPhone || generatePlaceholderMobile();
        const otpCode = generateOtpCode();

        const user = new User({
            name: name.trim(),
            email: userEmail,
            mobile: userMobile,
            passwordHash,
            role: 'user',
            confirmed: true,
            otpCode,
            otpExpires: Date.now() + 10 * 60 * 1000,
        });

        await user.save();

        if (normalizedEmail) {
            await sendEmail(user.email, 'Welcome to Smart City', `Your account has been created successfully.`);
        }

        if (normalizedPhone) {
            await sendSMS(normalizedPhone, `Smart City: Your account has been created.`);
        }

        const token = makeToken(user);
        const refreshToken = makeRefreshToken(user);

        res.status(201).json({
            message: 'Signup successful',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                role: user.role,
                points: user.points || 0,
                badge: user.badge || 'Active Citizen',
            },
            token,
            refreshToken,
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, phone, password } = req.body;
        const normalizedEmail = normalizeEmail(email);
        const normalizedPhone = normalizePhone(phone);

        if (!password) {
            return res.status(400).json({ error: 'Password is required.' });
        }

        if (!normalizedEmail && !normalizedPhone) {
            return res.status(400).json({ error: 'Email or phone is required.' });
        }

        const user = await User.findOne({
            $or: [
                normalizedEmail ? { email: normalizedEmail } : null,
                normalizedPhone ? { mobile: normalizedPhone } : null,
            ].filter(Boolean),
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        if (user.isLocked) {
            return res.status(423).json({ error: 'Account locked. Try again later.' });
        }

        const passwordMatch = await comparePassword(password, user.passwordHash);
        if (!passwordMatch) {
            await user.incLoginAttempts();
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        await user.resetLoginAttempts();

        const token = makeToken(user);
        const refreshToken = makeRefreshToken(user);

        res.json({
            message: 'Login successful',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                role: user.role,
                points: user.points || 0,
                badge: user.badge || 'Active Citizen',
            },
            token,
            refreshToken,
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

router.post('/admin/login', async (req, res) => {
    try {
        const { email, phone, password } = req.body;
        const normalizedEmail = normalizeEmail(email);
        const normalizedPhone = normalizePhone(phone);

        if (!password) {
            return res.status(400).json({ error: 'Password is required.' });
        }

        if (!normalizedEmail && !normalizedPhone) {
            return res.status(400).json({ error: 'Email or phone is required.' });
        }

        const user = await User.findOne({
            $or: [
                normalizedEmail ? { email: normalizedEmail } : null,
                normalizedPhone ? { mobile: normalizedPhone } : null,
            ].filter(Boolean),
            role: 'admin',
        });

        if (!user) {
            return res.status(403).json({ error: 'Admin credentials not found.' });
        }

        const passwordMatch = await comparePassword(password, user.passwordHash);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const token = makeToken(user);
        const refreshToken = makeRefreshToken(user);

        res.json({
            message: 'Admin login successful',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                role: user.role,
                points: user.points || 0,
                badge: user.badge || 'Active Citizen',
            },
            token,
            refreshToken,
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Admin login failed' });
    }
});

router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('name email mobile role points badge');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

router.get('/admin/complaints', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const complaints = await Complaint.find()
            .populate('userId', 'name email mobile')
            .sort({ createdAt: -1 });
        res.json({ complaints });
    } catch (error) {
        console.error('Admin complaints fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch complaints' });
    }
});

router.get('/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const total = await Complaint.countDocuments();
        const resolved = await Complaint.countDocuments({ status: 'Resolved' });
        const pending = await Complaint.countDocuments({ status: 'Pending' });
        const users = await User.countDocuments({ role: 'user' });
        const admins = await User.countDocuments({ role: 'admin' });

        res.json({ total, resolved, pending, users, admins });
    } catch (error) {
        console.error('Admin stats fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
});

router.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await User.find({ role: 'user' }).select('name email mobile role createdAt');
        res.json({ users });
    } catch (error) {
        console.error('Admin users fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

router.put('/admin/complaints/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ error: 'Status is required.' });
        }

        const complaint = await Complaint.findById(id);
        if (!complaint) {
            return res.status(404).json({ error: 'Complaint not found.' });
        }

        complaint.status = status;
        await complaint.save();
        res.json({ message: 'Complaint status updated.', complaint });
    } catch (error) {
        console.error('Admin update status error:', error);
        res.status(500).json({ error: 'Failed to update complaint status' });
    }
});

router.post('/admin/notify', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId, complaintId, type, subject, message } = req.body;
        if (!message || !type) {
            return res.status(400).json({ error: 'Type and message are required.' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        let emailResult = false;
        let smsResult = false;
        const results = [];

        if (type === 'email' || type === 'both') {
            if (!user.email) {
                results.push('User email not available.');
            } else {
                emailResult = await sendEmail(user.email, subject || 'Smart City Update', message);
                results.push(emailResult ? 'Email sent.' : 'Email failed.');
            }
        }

        if (type === 'sms' || type === 'both') {
            if (!user.mobile) {
                results.push('User phone not available.');
            } else {
                smsResult = await sendSMS(user.mobile, message);
                results.push(smsResult ? 'SMS sent.' : 'SMS failed.');
            }
        }

        return res.json({ success: emailResult || smsResult, results });
    } catch (error) {
        console.error('Admin notify error:', error);
        res.status(500).json({ error: 'Failed to send notification' });
    }
});

// Dashboard Stats
router.get('/user/dashboard', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const total = await Complaint.countDocuments({ userId });
        const resolved = await Complaint.countDocuments({ userId, status: 'Resolved' });
        const pending = await Complaint.countDocuments({ userId, status: 'Pending' });
        const user = await User.findById(userId).select('points badge');

        res.json({
            total,
            resolved,
            pending,
            points: user?.points || 0,
            badge: user?.badge || 'Active Citizen',
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats.' });
    }
});


module.exports = router;
