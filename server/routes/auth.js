const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Resend } = require('resend');
const { validate, verifyToken } = require('../middleware');
const { User, University } = require('../models');

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// @route   POST /api/auth/register
// @desc    Register a new student with password
// @access  Public
router.post('/register', [
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit phone is required'),
    body('universityId').isMongoId().withMessage('Valid university is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validate
], async (req, res) => {
    try {
        const { fullName, email, phone, universityId, password, firebaseUid } = req.body;

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

        // Create user with password
        const user = await User.create({
            fullName,
            email,
            phone,
            password,
            university: universityId,
            firebaseUid,
            isVerified: true // Auto-verify since we have password
        });

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'dev-secret',
            { expiresIn: '7d' }
        );

        await user.populate('university');

        res.status(201).json({
            success: true,
            message: 'Registration successful!',
            data: {
                token,
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    phone: user.phone,
                    university: user.university,
                    isVerified: user.isVerified
                }
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

// @route   POST /api/auth/login
// @desc    Login with email/phone and password
// @access  Public
router.post('/login', [
    body('identifier').notEmpty().withMessage('Email or phone is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
], async (req, res) => {
    try {
        const { identifier, password, rememberMe } = req.body;

        // Find user by email or phone
        const user = await User.findOne({
            $or: [{ email: identifier }, { phone: identifier }]
        }).populate('university');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email/phone or password'
            });
        }

        // Check if user has password set
        if (!user.password) {
            return res.status(400).json({
                success: false,
                message: 'Please set a password first. Use forgot password to set one.',
                needsPassword: true
            });
        }

        // Verify password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email/phone or password'
            });
        }

        // Generate JWT token
        const tokenExpiry = rememberMe ? '30d' : '7d';
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'dev-secret',
            { expiresIn: tokenExpiry }
        );

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    phone: user.phone,
                    university: user.university,
                    isVerified: user.isVerified
                }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
});

// @route   POST /api/auth/forgot-password
// @desc    Request password reset
// @access  Public
router.post('/forgot-password', [
    body('identifier').notEmpty().withMessage('Email or phone is required'),
    validate
], async (req, res) => {
    try {
        const { identifier } = req.body;

        const user = await User.findOne({
            $or: [{ email: identifier }, { phone: identifier }]
        });

        if (!user) {
            // Don't reveal if user exists
            return res.json({
                success: true,
                message: 'If an account exists, you will receive reset instructions.'
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        user.passwordResetToken = hashedToken;
        user.passwordResetExpires = Date.now() + 3600000; // 1 hour
        await user.save({ validateBeforeSave: false });

        // Build reset URL
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const resetUrl = `${clientUrl}/forgot-password?token=${resetToken}`;

        // Send email via Resend
        try {
            await resend.emails.send({
                from: process.env.RESEND_FROM_EMAIL || 'CampusCravings <onboarding@resend.dev>',
                to: user.email,
                subject: 'Reset Your Password - CampusCravings',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #6366f1;">Password Reset Request</h2>
                        <p>Hi ${user.fullName},</p>
                        <p>You requested to reset your password. Click the button below to set a new password:</p>
                        <a href="${resetUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">Reset Password</a>
                        <p>Or copy and paste this token:</p>
                        <code style="background: #f3f4f6; padding: 8px 12px; border-radius: 4px; display: block; margin: 8px 0;">${resetToken}</code>
                        <p style="color: #6b7280; font-size: 14px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                        <p style="color: #9ca3af; font-size: 12px;">CampusCravings - Skip the queue, save time!</p>
                    </div>
                `
            });
            console.log('Password reset email sent to:', user.email);
        } catch (emailError) {
            console.error('Failed to send email:', emailError);
            // Don't fail the request, just log the error
        }

        res.json({
            success: true,
            message: 'If an account exists with that email, you will receive reset instructions.'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process request'
        });
    }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validate
], async (req, res) => {
    try {
        const { token, password } = req.body;

        // Hash the received token to compare with stored hash
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        // Set new password
        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        user.isVerified = true;
        await user.save();

        // Generate new login token
        const jwtToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'dev-secret',
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Password reset successful',
            data: { token: jwtToken }
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password'
        });
    }
});

// @route   POST /api/auth/set-password
// @desc    Set password for existing users (who registered without one)
// @access  Public
router.post('/set-password', [
    body('identifier').notEmpty().withMessage('Email or phone is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validate
], async (req, res) => {
    try {
        const { identifier, password } = req.body;

        const user = await User.findOne({
            $or: [{ email: identifier }, { phone: identifier }]
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.password) {
            return res.status(400).json({
                success: false,
                message: 'Password already set. Use forgot password to reset.'
            });
        }

        user.password = password;
        user.isVerified = true;
        await user.save();

        // Generate token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'dev-secret',
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Password set successfully',
            data: { token }
        });

    } catch (error) {
        console.error('Set password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to set password'
        });
    }
});

module.exports = router;
