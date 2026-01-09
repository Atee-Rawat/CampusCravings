const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate, verifyToken } = require('../middleware');
const { Order, MenuItem, Outlet, User } = require('../models');

// @route   POST /api/orders
// @desc    Create a new order
// @access  Private
router.post('/', verifyToken, [
    body('outletId').isMongoId().withMessage('Valid outlet is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.menuItemId').isMongoId().withMessage('Valid menu item is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    validate
], async (req, res) => {
    try {
        const { outletId, items, specialInstructions } = req.body;

        // Verify outlet exists and is open
        const outlet = await Outlet.findById(outletId);
        if (!outlet || !outlet.isVerified) {
            return res.status(404).json({
                success: false,
                message: 'Outlet not found'
            });
        }

        if (!outlet.isOpen) {
            return res.status(400).json({
                success: false,
                message: 'Outlet is currently closed'
            });
        }

        // Process order items
        const orderItems = [];
        let totalAmount = 0;
        let maxPrepTime = 0;

        for (const item of items) {
            const menuItem = await MenuItem.findById(item.menuItemId);

            if (!menuItem || !menuItem.isAvailable) {
                return res.status(400).json({
                    success: false,
                    message: `Item not available: ${item.menuItemId}`
                });
            }

            const itemTotal = menuItem.price * item.quantity;
            totalAmount += itemTotal;
            maxPrepTime = Math.max(maxPrepTime, menuItem.prepTime);

            orderItems.push({
                menuItem: menuItem._id,
                name: menuItem.name,
                price: menuItem.price,
                quantity: item.quantity,
                prepTime: menuItem.prepTime
            });
        }

        // Create order
        const order = await Order.create({
            user: req.user._id,
            outlet: outletId,
            items: orderItems,
            totalAmount,
            totalPrepTime: maxPrepTime,
            specialInstructions,
            status: 'pending',
            payment: { status: 'pending' }
        });

        await order.populate('outlet', 'name slug');

        res.status(201).json({
            success: true,
            message: 'Order created. Please complete payment.',
            data: order
        });

    } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order'
        });
    }
});

// @route   GET /api/orders
// @desc    Get user's orders
// @access  Private
router.get('/', verifyToken, async (req, res) => {
    try {
        const { status, limit = 10, page = 1 } = req.query;

        const query = { user: req.user._id };

        if (status) {
            query.status = status;
        }

        const orders = await Order.find(query)
            .populate('outlet', 'name slug logo')
            .sort('-createdAt')
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Order.countDocuments(query);

        res.json({
            success: true,
            count: orders.length,
            total,
            pages: Math.ceil(total / limit),
            data: orders
        });

    } catch (error) {
        console.error('Orders fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders'
        });
    }
});

// @route   GET /api/orders/active
// @desc    Get user's active orders
// @access  Private
router.get('/active', verifyToken, async (req, res) => {
    try {
        const orders = await Order.find({
            user: req.user._id,
            status: { $in: ['pending', 'accepted', 'preparing', 'ready'] },
            'payment.status': 'paid'
        })
            .populate('outlet', 'name slug logo')
            .sort('-createdAt');

        res.json({
            success: true,
            count: orders.length,
            data: orders
        });

    } catch (error) {
        console.error('Active orders fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch active orders'
        });
    }
});

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            user: req.user._id
        })
            .populate('outlet', 'name slug logo contact location')
            .populate('items.menuItem', 'image');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            data: order
        });

    } catch (error) {
        console.error('Order fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order'
        });
    }
});

// @route   POST /api/orders/:id/dev-pay
// @desc    Development only - simulate payment success
// @access  Private (Development only)
router.post('/:id/dev-pay', verifyToken, async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            user: req.user._id,
            'payment.status': 'pending'
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found or already paid'
            });
        }

        // Simulate payment
        order.payment = {
            status: 'paid',
            method: 'dev-bypass',
            paidAt: new Date(),
            transactionId: `DEV-${Date.now()}`
        };
        await order.save();

        // Emit socket event for new order to admin
        const io = req.app.get('io');
        if (io) {
            await order.populate('user', 'fullName phone');
            io.to(`outlet-${order.outlet}`).emit('new-order', { order });
        }

        await order.populate('outlet', 'name slug');

        res.json({
            success: true,
            message: 'Dev payment successful',
            data: order
        });

    } catch (error) {
        console.error('Dev payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Dev payment failed'
        });
    }
});

module.exports = router;
