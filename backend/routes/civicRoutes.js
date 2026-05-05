const express = require('express');
const CivicRequest = require('../models/CivicRequest');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/request', authenticateToken, async (req, res) => {
    try {
        const { subject, department, message } = req.body;
        if (!subject || !department || !message) {
            return res.status(400).json({ error: 'Please provide subject, department, and message.' });
        }

        const civicRequest = await CivicRequest.create({
            userId: req.user.id,
            subject,
            department,
            message,
        });

        res.status(201).json({ message: 'Your request has been submitted to the government.', request: civicRequest });
    } catch (error) {
        console.error('Civic request error:', error);
        res.status(500).json({ error: 'Unable to submit civic request.' });
    }
});

router.get('/my', authenticateToken, async (req, res) => {
    try {
        const requests = await CivicRequest.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json({ requests });
    } catch (error) {
        console.error('Civic my requests error:', error);
        res.status(500).json({ error: 'Unable to load your requests.' });
    }
});

router.get('/all', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const requests = await CivicRequest.find().populate('userId', 'name email mobile').sort({ createdAt: -1 });
        res.json({ requests });
    } catch (error) {
        console.error('Civic all requests error:', error);
        res.status(500).json({ error: 'Unable to load civic requests.' });
    }
});

router.put('/update/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { status, response } = req.body;
        const request = await CivicRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ error: 'Request not found.' });
        }
        if (status) request.status = status;
        if (response) request.response = response;
        await request.save();
        res.json({ message: 'Civic request updated successfully.', request });
    } catch (error) {
        console.error('Civic update error:', error);
        res.status(500).json({ error: 'Unable to update civic request.' });
    }
});

module.exports = router;
