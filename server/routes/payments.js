const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { body } = require('express-validator');
const { validate, verifyToken } = require('../middleware');
const { Order } = require('../models');
const { getRazorpay } = require('../config/razorpay');

// @route   POST /api/payments/create-order
// @desc    Create Razorpay order for payment
// @access  Private
router.post('/create-order', verifyToken, [
    body('orderId').isMongoId().withMessage('Valid order ID is required'),
    validate
], async (req, res) => {
    try {
        const { orderId } = req.body;

        // Find the order
        const order = await Order.findOne({
            _id: orderId,
            user: req.user._id,
            'payment.status': 'pending'
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found or already paid'
            });
        }

        const razorpay = getRazorpay();

        // If Razorpay not configured, simulate payment
        if (!razorpay) {
            // Generate a fake order ID for demo mode
            const fakeOrderId = `demo_${Date.now()}`;
            order.payment.razorpayOrderId = fakeOrderId;
            await order.save();

            return res.json({
                success: true,
                demoMode: true,
                data: {
                    orderId: fakeOrderId,
                    amount: order.totalAmount,
                    currency: 'INR',
                    key: 'demo_key'
                }
            });
        }

        // Create Razorpay order
        const razorpayOrder = await razorpay.orders.create({
            amount: order.totalAmount, // Already in paise
            currency: 'INR',
            receipt: order.orderNumber,
            notes: {
                orderId: order._id.toString(),
                userId: req.user._id.toString()
            }
        });

        // Update order with Razorpay order ID
        order.payment.razorpayOrderId = razorpayOrder.id;
        await order.save();

        res.json({
            success: true,
            data: {
                orderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                key: process.env.RAZORPAY_KEY_ID
            }
        });

    } catch (error) {
        console.error('Razorpay order creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create payment order'
        });
    }
});

// @route   POST /api/payments/verify
// @desc    Verify Razorpay payment
// @access  Private
router.post('/verify', verifyToken, [
    body('razorpay_order_id').notEmpty(),
    body('razorpay_payment_id').notEmpty(),
    body('razorpay_signature').notEmpty(),
    validate
], async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        // Demo mode - accept any payment
        if (razorpay_order_id.startsWith('demo_')) {
            const order = await Order.findOneAndUpdate(
                { 'payment.razorpayOrderId': razorpay_order_id },
                {
                    'payment.razorpayPaymentId': `demo_pay_${Date.now()}`,
                    'payment.status': 'paid',
                    'payment.paidAt': new Date()
                },
                { new: true }
            ).populate('outlet', 'name slug');

            if (order) {
                const io = req.app.get('io');
                io.to(`outlet-${order.outlet._id}`).emit('new-order', {
                    order: order.toObject()
                });
            }

            return res.json({
                success: true,
                message: 'Demo payment successful!',
                data: order
            });
        }

        // Verify signature
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');

        const isAuthentic = expectedSignature === razorpay_signature;

        if (!isAuthentic) {
            return res.status(400).json({
                success: false,
                message: 'Payment verification failed'
            });
        }

        // Update order
        const order = await Order.findOneAndUpdate(
            { 'payment.razorpayOrderId': razorpay_order_id },
            {
                'payment.razorpayPaymentId': razorpay_payment_id,
                'payment.status': 'paid',
                'payment.paidAt': new Date()
            },
            { new: true }
        ).populate('outlet', 'name slug');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Emit socket event for new order to outlet
        const io = req.app.get('io');
        io.to(`outlet-${order.outlet._id}`).emit('new-order', {
            order: order.toObject()
        });

        res.json({
            success: true,
            message: 'Payment successful!',
            data: order
        });

    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment verification failed'
        });
    }
});

// @route   POST /api/payments/refund/:orderId
// @desc    Initiate refund for cancelled order
// @access  Private (Admin only in real app)
router.post('/refund/:orderId', verifyToken, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (order.payment.status !== 'paid') {
            return res.status(400).json({
                success: false,
                message: 'Order not paid'
            });
        }

        const razorpay = getRazorpay();

        // Demo mode refund
        if (!razorpay || order.payment.razorpayPaymentId?.startsWith('demo_')) {
            order.payment.status = 'refunded';
            await order.save();

            return res.json({
                success: true,
                message: 'Demo refund processed',
                data: {
                    refundId: `demo_refund_${Date.now()}`,
                    amount: order.totalAmount / 100
                }
            });
        }

        // Create refund in Razorpay
        const refund = await razorpay.payments.refund(order.payment.razorpayPaymentId, {
            amount: order.totalAmount,
            notes: {
                reason: order.cancellationReason || 'Order cancelled'
            }
        });

        // Update order
        order.payment.status = 'refunded';
        await order.save();

        res.json({
            success: true,
            message: 'Refund initiated',
            data: {
                refundId: refund.id,
                amount: refund.amount / 100
            }
        });

    } catch (error) {
        console.error('Refund error:', error);
        res.status(500).json({
            success: false,
            message: 'Refund failed'
        });
    }
});

module.exports = router;
