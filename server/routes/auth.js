const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate, verifyToken } = require('../middleware');
const { User, University } = require('../models');

// @route   POST /api/auth/register
// @desc    Register a new student
// @access  Public
router.post('/register', [
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit phone is required'),
    body('universityId').isMongoId().withMessage('Valid university is required'),
    validate
], async (req, res) => {
    try {
        const { fullName, email, phone, universityId, firebaseUid } = req.body;

        // Check if email or phone already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { phone }]
        });

        if (existingUser) {
            const field = existingUser.email === email ? 'email' : 'phone';
            return res.status(400).json({
                success: false,
                message: `An account with this ${field} already exists`
            });
        }

        // Verify university exists
        const university = await University.findById(universityId);
        if (!university || !university.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or inactive university'
            });
        }

        // Create user
        const user = await User.create({
            fullName,
            email,
            phone,
            university: universityId,
            firebaseUid,
            isVerified: false
        });

        await user.populate('university');

        res.status(201).json({
            success: true,
            message: 'Registration successful. Please verify your account.',
            data: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                university: user.university,
                isVerified: user.isVerified
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
});

// @route   POST /api/auth/verify
// @desc    Mark user as verified after OTP verification
// @access  Public
router.post('/verify', [
    body('userId').isMongoId().withMessage('Valid user ID is required'),
    body('firebaseUid').notEmpty().withMessage('Firebase UID is required'),
    validate
], async (req, res) => {
    try {
        const { userId, firebaseUid } = req.body;

        const user = await User.findByIdAndUpdate(
            userId,
            { isVerified: true, firebaseUid },
            { new: true }
        ).populate('university');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'Account verified successfully',
            data: user
        });

    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Verification failed'
        });
    }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('university')
            .populate('favoriteItems.item');

        res.json({
            success: true,
            data: user
        });

    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile'
        });
    }
});

// @route   PUT /api/auth/me
// @desc    Update user profile
// @access  Private
router.put('/me', verifyToken, [
    body('fullName').optional().trim().notEmpty(),
    validate
], async (req, res) => {
    try {
        const allowedUpdates = ['fullName', 'profileImage'];
        const updates = {};

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updates,
            { new: true }
        ).populate('university');

        res.json({
            success: true,
            message: 'Profile updated',
            data: user
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});

// @route   POST /api/auth/login-check
// @desc    Check if user exists by phone/email for login
// @access  Public
router.post('/login-check', [
    body('identifier').notEmpty().withMessage('Phone or email is required'),
    validate
], async (req, res) => {
    try {
        const { identifier } = req.body;

        const user = await User.findOne({
            $or: [{ email: identifier }, { phone: identifier }]
        }).populate('university');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No account found with this email/phone'
            });
        }

        if (!user.isVerified) {
            return res.status(403).json({
                success: false,
                message: 'Account not verified',
                data: { userId: user._id }
            });
        }

        res.json({
            success: true,
            message: 'Account found',
            data: {
                id: user._id,
                phone: user.phone,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Login check error:', error);
        res.status(500).json({
            success: false,
            message: 'Login check failed'
        });
    }
});

// @route   POST /api/auth/dev-login
// @desc    Development login - skip OTP and login directly (DEV ONLY)
// @access  Public (development only)
router.post('/dev-login', [
    body('identifier').notEmpty().withMessage('Phone or email is required'),
    validate
], async (req, res) => {
    try {
        const { identifier } = req.body;

        // Find user by email or phone
        const user = await User.findOne({
            $or: [{ email: identifier }, { phone: identifier }]
        }).populate('university');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No account found with this email/phone'
            });
        }

        if (!user.isVerified) {
            // Auto-verify for dev
            user.isVerified = true;
            await user.save();
        }

        res.json({
            success: true,
            message: 'Dev login successful',
            data: user
        });

    } catch (error) {
        console.error('Dev login error:', error);
        res.status(500).json({
            success: false,
            message: 'Dev login failed'
        });
    }
});

module.exports = router;
