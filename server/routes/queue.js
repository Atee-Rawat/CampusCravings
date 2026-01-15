const express = require('express');
const router = express.Router();
const { Order } = require('../models');

// @route   GET /api/queue/:outletId
// @desc    Get public queue status for an outlet (for students to see)
// @access  Public
router.get('/:outletId', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get today's paid orders with token numbers
        const orders = await Order.find({
            outlet: req.params.outletId,
            createdAt: { $gte: today },
            'payment.status': 'paid',
            tokenNumber: { $exists: true }
        }).select('tokenNumber status').sort('tokenNumber');

        // Ready tokens (now serving)
        const readyTokens = orders
            .filter(o => o.status === 'ready')
            .map(o => o.tokenNumber);

        // Currently being prepared
        const preparingTokens = orders
            .filter(o => ['accepted', 'preparing'].includes(o.status))
            .map(o => o.tokenNumber);

        // Total served today
        const completedCount = orders.filter(o => o.status === 'completed').length;

        // Current highest token
        const lastTokenNumber = orders.length > 0
            ? Math.max(...orders.map(o => o.tokenNumber))
            : 0;

        res.json({
            success: true,
            data: {
                readyTokens,      // "Now Serving" - these are ready for pickup
                preparingTokens,  // Being prepared
                completedCount,   // How many served today
                lastTokenNumber   // Latest token number issued
            }
        });

    } catch (error) {
        console.error('Queue fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch queue status'
        });
    }
});

module.exports = router;
