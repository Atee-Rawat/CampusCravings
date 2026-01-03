const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validate, verifyOutletAdmin } = require('../middleware');
const { Order, MenuItem, Outlet, User } = require('../models');

// @route   POST /api/admin/login
// @desc    Outlet admin login
// @access  Public
router.post('/login', [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
], async (req, res) => {
    try {
        const { email, password } = req.body;

        const outlet = await Outlet.findOne({ 'owner.email': email }).populate('university');

        if (!outlet) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const isMatch = await bcrypt.compare(password, outlet.owner.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        if (!outlet.isVerified) {
            return res.status(403).json({
                success: false,
                message: 'Outlet pending verification'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { outletId: outlet._id },
            process.env.JWT_SECRET || 'dev-secret',
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                outlet: {
                    id: outlet._id,
                    name: outlet.name,
                    slug: outlet.slug,
                    university: outlet.university
                }
            }
        });

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
});

// @route   GET /api/admin/dashboard
// @desc    Get dashboard stats
// @access  Private (Outlet Admin)
router.get('/dashboard', verifyOutletAdmin, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get today's orders
        const todayOrders = await Order.find({
            outlet: req.outlet._id,
            createdAt: { $gte: today },
            'payment.status': 'paid'
        });

        // Stats
        const stats = {
            todayOrders: todayOrders.length,
            todayRevenue: todayOrders.reduce((sum, o) => sum + o.totalAmount, 0),
            pendingOrders: todayOrders.filter(o => o.status === 'pending').length,
            activeOrders: todayOrders.filter(o => ['accepted', 'preparing'].includes(o.status)).length,
            readyOrders: todayOrders.filter(o => o.status === 'ready').length,
            completedOrders: todayOrders.filter(o => o.status === 'completed').length
        };

        res.json({
            success: true,
            data: {
                outlet: {
                    name: req.outlet.name,
                    isOpen: req.outlet.isOpen
                },
                stats
            }
        });

    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load dashboard'
        });
    }
});

// @route   GET /api/admin/orders
// @desc    Get outlet orders
// @access  Private (Outlet Admin)
router.get('/orders', verifyOutletAdmin, async (req, res) => {
    try {
        const { status, date } = req.query;

        const query = {
            outlet: req.outlet._id,
            'payment.status': 'paid'
        };

        if (status) {
            query.status = status;
        }

        if (date) {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: startDate, $lte: endDate };
        } else {
            // Default to today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            query.createdAt = { $gte: today };
        }

        const orders = await Order.find(query)
            .populate('user', 'fullName phone')
            .sort('-createdAt');

        res.json({
            success: true,
            count: orders.length,
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

// @route   PUT /api/admin/orders/:id/accept
// @desc    Accept order and start timer
// @access  Private (Outlet Admin)
router.put('/orders/:id/accept', verifyOutletAdmin, async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            outlet: req.outlet._id,
            status: 'pending'
        }).populate('user', 'fullName phone');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found or already processed'
            });
        }

        await order.accept();

        // Emit socket event to student
        const io = req.app.get('io');
        io.to(`order-${order._id}`).emit('order-accepted', {
            orderId: order._id,
            status: 'accepted',
            estimatedReadyAt: order.estimatedReadyAt,
            remainingSeconds: order.remainingSeconds
        });

        res.json({
            success: true,
            message: 'Order accepted',
            data: order
        });

    } catch (error) {
        console.error('Order accept error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to accept order'
        });
    }
});

// @route   PUT /api/admin/orders/:id/ready
// @desc    Mark order as ready
// @access  Private (Outlet Admin)
router.put('/orders/:id/ready', verifyOutletAdmin, async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            outlet: req.outlet._id,
            status: { $in: ['accepted', 'preparing'] }
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        await order.markReady();

        // Emit socket event
        const io = req.app.get('io');
        io.to(`order-${order._id}`).emit('order-ready', {
            orderId: order._id,
            status: 'ready',
            message: 'Your order is ready for pickup!'
        });

        res.json({
            success: true,
            message: 'Order marked as ready',
            data: order
        });

    } catch (error) {
        console.error('Order ready error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order'
        });
    }
});

// @route   PUT /api/admin/orders/:id/complete
// @desc    Mark order as completed (picked up)
// @access  Private (Outlet Admin)
router.put('/orders/:id/complete', verifyOutletAdmin, async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            outlet: req.outlet._id,
            status: 'ready'
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        await order.complete();

        // Update user's favorite items
        const user = await User.findById(order.user);
        for (const item of order.items) {
            await user.updateFavorite(item.menuItem);
        }

        // Update outlet stats
        await Outlet.findByIdAndUpdate(req.outlet._id, {
            $inc: {
                'stats.totalOrders': 1,
                'stats.totalRevenue': order.totalAmount
            }
        });

        res.json({
            success: true,
            message: 'Order completed',
            data: order
        });

    } catch (error) {
        console.error('Order complete error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to complete order'
        });
    }
});

// @route   PUT /api/admin/orders/:id/cancel
// @desc    Cancel order
// @access  Private (Outlet Admin)
router.put('/orders/:id/cancel', verifyOutletAdmin, [
    body('reason').optional().trim(),
    validate
], async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            outlet: req.outlet._id,
            status: { $nin: ['completed', 'cancelled'] }
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found or cannot be cancelled'
            });
        }

        await order.cancel(req.body.reason);

        // Emit socket event
        const io = req.app.get('io');
        io.to(`order-${order._id}`).emit('order-cancelled', {
            orderId: order._id,
            status: 'cancelled',
            reason: order.cancellationReason
        });

        // TODO: Initiate refund

        res.json({
            success: true,
            message: 'Order cancelled',
            data: order
        });

    } catch (error) {
        console.error('Order cancel error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel order'
        });
    }
});

// @route   POST /api/admin/menu
// @desc    Add menu item
// @access  Private (Outlet Admin)
router.post('/menu', verifyOutletAdmin, [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('price').isInt({ min: 100 }).withMessage('Price must be at least ₹1'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('prepTime').isInt({ min: 1 }).withMessage('Prep time is required'),
    validate
], async (req, res) => {
    try {
        const { name, description, price, category, prepTime, isVeg, tags, image } = req.body;

        const item = await MenuItem.create({
            outlet: req.outlet._id,
            name,
            description,
            price,
            category,
            prepTime,
            isVeg: isVeg !== false,
            tags: tags || [],
            image
        });

        res.status(201).json({
            success: true,
            message: 'Menu item added',
            data: item
        });

    } catch (error) {
        console.error('Menu add error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add menu item'
        });
    }
});

// @route   PUT /api/admin/menu/:id
// @desc    Update menu item
// @access  Private (Outlet Admin)
router.put('/menu/:id', verifyOutletAdmin, async (req, res) => {
    try {
        const allowedUpdates = ['name', 'description', 'price', 'category', 'prepTime', 'isVeg', 'isAvailable', 'tags', 'image'];
        const updates = {};

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const item = await MenuItem.findOneAndUpdate(
            { _id: req.params.id, outlet: req.outlet._id },
            updates,
            { new: true }
        );

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Menu item not found'
            });
        }

        res.json({
            success: true,
            message: 'Menu item updated',
            data: item
        });

    } catch (error) {
        console.error('Menu update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update menu item'
        });
    }
});

// @route   DELETE /api/admin/menu/:id
// @desc    Delete menu item
// @access  Private (Outlet Admin)
router.delete('/menu/:id', verifyOutletAdmin, async (req, res) => {
    try {
        const item = await MenuItem.findOneAndDelete({
            _id: req.params.id,
            outlet: req.outlet._id
        });

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Menu item not found'
            });
        }

        res.json({
            success: true,
            message: 'Menu item deleted'
        });

    } catch (error) {
        console.error('Menu delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete menu item'
        });
    }
});

// @route   PUT /api/admin/outlet/toggle-status
// @desc    Toggle outlet open/closed status
// @access  Private (Outlet Admin)
router.put('/outlet/toggle-status', verifyOutletAdmin, async (req, res) => {
    try {
        const outlet = await Outlet.findByIdAndUpdate(
            req.outlet._id,
            { isOpen: !req.outlet.isOpen },
            { new: true }
        );

        res.json({
            success: true,
            message: `Outlet is now ${outlet.isOpen ? 'open' : 'closed'}`,
            data: { isOpen: outlet.isOpen }
        });

    } catch (error) {
        console.error('Toggle status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update status'
        });
    }
});

// @route   GET /api/admin/menu
// @desc    Get all menu items for the outlet
// @access  Private (Outlet Admin)
router.get('/menu', verifyOutletAdmin, async (req, res) => {
    try {
        const items = await MenuItem.find({ outlet: req.outlet._id }).sort('category name');

        res.json({
            success: true,
            count: items.length,
            data: items
        });

    } catch (error) {
        console.error('Menu fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch menu'
        });
    }
});

// ============================================
// ANALYTICS ROUTES
// ============================================

// @route   GET /api/admin/analytics
// @desc    Get analytics data for different time periods
// @access  Private (Outlet Admin)
router.get('/analytics', verifyOutletAdmin, async (req, res) => {
    try {
        const { period = 'week' } = req.query;

        const now = new Date();
        let startDate, previousStartDate, previousEndDate;

        // Calculate date ranges based on period
        switch (period) {
            case 'week':
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                previousStartDate = new Date(startDate);
                previousStartDate.setDate(startDate.getDate() - 7);
                previousEndDate = new Date(startDate);
                break;
            case 'month':
                startDate = new Date(now);
                startDate.setMonth(now.getMonth() - 1);
                previousStartDate = new Date(startDate);
                previousStartDate.setMonth(startDate.getMonth() - 1);
                previousEndDate = new Date(startDate);
                break;
            case 'year':
                startDate = new Date(now);
                startDate.setFullYear(now.getFullYear() - 1);
                previousStartDate = new Date(startDate);
                previousStartDate.setFullYear(startDate.getFullYear() - 1);
                previousEndDate = new Date(startDate);
                break;
            default:
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
        }

        startDate.setHours(0, 0, 0, 0);

        // Current period orders
        const orders = await Order.find({
            outlet: req.outlet._id,
            createdAt: { $gte: startDate },
            'payment.status': 'paid',
            status: { $ne: 'cancelled' }
        });

        // Previous period orders for comparison
        const previousOrders = await Order.find({
            outlet: req.outlet._id,
            createdAt: { $gte: previousStartDate, $lt: previousEndDate },
            'payment.status': 'paid',
            status: { $ne: 'cancelled' }
        });

        // Calculate totals
        const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
        const previousRevenue = previousOrders.reduce((sum, o) => sum + o.totalAmount, 0);
        const totalOrders = orders.length;
        const previousOrderCount = previousOrders.length;

        // Revenue change percentage
        const revenueChange = previousRevenue > 0
            ? Math.round(((totalRevenue - previousRevenue) / previousRevenue) * 100)
            : 0;
        const ordersChange = previousOrderCount > 0
            ? Math.round(((totalOrders - previousOrderCount) / previousOrderCount) * 100)
            : 0;

        // Daily breakdown for chart
        const dailyData = {};
        orders.forEach(order => {
            const dateKey = order.createdAt.toISOString().split('T')[0];
            if (!dailyData[dateKey]) {
                dailyData[dateKey] = { revenue: 0, orders: 0 };
            }
            dailyData[dateKey].revenue += order.totalAmount;
            dailyData[dateKey].orders += 1;
        });

        // Convert to array and sort by date
        const chartData = Object.entries(dailyData)
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        // Top selling items
        const itemSales = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                const key = item.menuItem?.toString() || item.name;
                if (!itemSales[key]) {
                    itemSales[key] = { name: item.name, quantity: 0, revenue: 0 };
                }
                itemSales[key].quantity += item.quantity;
                itemSales[key].revenue += item.price * item.quantity;
            });
        });

        const topItems = Object.values(itemSales)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

        res.json({
            success: true,
            data: {
                period,
                summary: {
                    totalRevenue,
                    previousRevenue,
                    revenueChange,
                    totalOrders,
                    previousOrderCount,
                    ordersChange,
                    avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0
                },
                chartData,
                topItems
            }
        });

    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load analytics'
        });
    }
});

// ============================================
// COUPON ROUTES
// ============================================
const Coupon = require('../models/Coupon');

// @route   GET /api/admin/coupons
// @desc    Get all coupons for the outlet
// @access  Private (Outlet Admin)
router.get('/coupons', verifyOutletAdmin, async (req, res) => {
    try {
        const coupons = await Coupon.find({ outlet: req.outlet._id }).sort('-createdAt');

        res.json({
            success: true,
            count: coupons.length,
            data: coupons
        });

    } catch (error) {
        console.error('Coupons fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch coupons'
        });
    }
});

// @route   POST /api/admin/coupons
// @desc    Create a new coupon
// @access  Private (Outlet Admin)
router.post('/coupons', verifyOutletAdmin, [
    body('code').trim().notEmpty().withMessage('Coupon code is required'),
    body('discountType').isIn(['percentage', 'flat']).withMessage('Invalid discount type'),
    body('discountValue').isInt({ min: 1 }).withMessage('Discount value must be at least 1'),
    validate
], async (req, res) => {
    try {
        const { code, description, discountType, discountValue, minOrderAmount, maxDiscount, usageLimit, expiresAt } = req.body;

        // Check if code already exists for this outlet
        const existing = await Coupon.findOne({ outlet: req.outlet._id, code: code.toUpperCase() });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Coupon code already exists'
            });
        }

        const coupon = await Coupon.create({
            outlet: req.outlet._id,
            code: code.toUpperCase(),
            description,
            discountType,
            discountValue,
            minOrderAmount: minOrderAmount || 0,
            maxDiscount: discountType === 'percentage' ? maxDiscount : null,
            usageLimit: usageLimit || null,
            expiresAt: expiresAt ? new Date(expiresAt) : null
        });

        res.status(201).json({
            success: true,
            message: 'Coupon created',
            data: coupon
        });

    } catch (error) {
        console.error('Coupon create error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create coupon'
        });
    }
});

// @route   PUT /api/admin/coupons/:id
// @desc    Update a coupon
// @access  Private (Outlet Admin)
router.put('/coupons/:id', verifyOutletAdmin, async (req, res) => {
    try {
        const allowedUpdates = ['description', 'discountValue', 'minOrderAmount', 'maxDiscount', 'usageLimit', 'expiresAt', 'isActive'];
        const updates = {};

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        // Handle date conversion
        if (updates.expiresAt) {
            updates.expiresAt = new Date(updates.expiresAt);
        }

        const coupon = await Coupon.findOneAndUpdate(
            { _id: req.params.id, outlet: req.outlet._id },
            updates,
            { new: true }
        );

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        res.json({
            success: true,
            message: 'Coupon updated',
            data: coupon
        });

    } catch (error) {
        console.error('Coupon update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update coupon'
        });
    }
});

// @route   DELETE /api/admin/coupons/:id
// @desc    Delete a coupon
// @access  Private (Outlet Admin)
router.delete('/coupons/:id', verifyOutletAdmin, async (req, res) => {
    try {
        const coupon = await Coupon.findOneAndDelete({
            _id: req.params.id,
            outlet: req.outlet._id
        });

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        res.json({
            success: true,
            message: 'Coupon deleted'
        });

    } catch (error) {
        console.error('Coupon delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete coupon'
        });
    }
});

module.exports = router;
