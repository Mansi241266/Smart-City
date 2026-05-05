const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (!process.env.OPENWEATHER_API_KEY) {
    console.warn('⚠️ OPENWEATHER_API_KEY is not set. Live AQI data will use fallback values until configured.');
}

const http = require('http');
const { Server } = require('socket.io');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const otpRoutes = require('./routes/otp');
const aqiRoutes = require('./routes/aqiRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const trafficRoutes = require('./routes/trafficRoutes');
const emergencyRoutes = require('./routes/emergencyRoutes');
const civicRoutes = require('./routes/civicRoutes');
const User = require('./models/User');
const { hashPassword } = require('./utils/password');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_city';

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static files from frontend directory
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

const normalizePhone = (phone) => {
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
};

async function ensureAdminUser() {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@smartcity.local').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
    const adminPhone = process.env.ADMIN_PHONE;

    const normalizedPhone = normalizePhone(adminPhone);

    const existingAdmin = await User.findOne({
        role: 'admin',
        $or: [
            { email: adminEmail },
            ...(normalizedPhone ? [{ mobile: normalizedPhone }] : []),
        ],
    });

    if (existingAdmin) {
        console.log('Admin user already exists.');
        return;
    }

    const passwordHash = await hashPassword(adminPassword);
    const adminData = {
        name: 'Administrator',
        email: adminEmail,
        mobile: normalizedPhone || `000${Date.now()}`,
        passwordHash,
        role: 'admin',
        confirmed: true,
    };

    await User.create(adminData);
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
        console.log('Admin user created from environment variables:', adminEmail);
    } else {
        console.log('Default admin user created:', adminEmail);
        console.log('Use password:', adminPassword);
    }
}

// MongoDB Connection
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(async () => {
    console.log('✓ Connected to MongoDB');
    try {
        await ensureAdminUser();
    } catch (err) {
        console.error('Admin setup error:', err);
    }
})
.catch(err => {
    console.error('✗ MongoDB connection error:', err);
});

// Routes
app.use('/api', authRoutes);
app.use('/api', otpRoutes);
app.use('/api', aqiRoutes);
app.use('/api', trafficRoutes);
app.use('/api', emergencyRoutes);
app.use('/api/civic', civicRoutes);
app.use('/api/complaint', complaintRoutes);

// Alias for user profile at both paths
app.get('/user/profile', (req, res) => {
    res.redirect('/api/profile');
});

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'Server is running' });
});

// Root endpoint (serve frontend index)
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start Server
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    }
});
app.set('io', io);

io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
    });
});

const server = httpServer.listen(PORT, () => {
    console.log(`\n🚀 Backend server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`💾 MongoDB: ${MONGODB_URI}\n`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Stop the running server or change PORT in .env.`);
        process.exit(1);
    }
    console.error('Server error:', err);
    process.exit(1);
});

module.exports = app;
