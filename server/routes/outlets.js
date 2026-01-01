const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const bcrypt = require('bcryptjs');
const { validate, verifyToken } = require('../middleware');
const { Outlet, MenuItem } = require('../models');

// @route   GET /api/outlets
// @desc    Get outlets for user's university
// @access  Private
router.get('/', verifyToken, async (req, res) => {
    try {
        const outlets = await Outlet.find({
            university: req.user.university._id,
            isVerified: true
        })
            .select('name slug cuisineType coverImage logo isOpen operatingHours location')
            .sort('name');

        // Add isWithinHours check
        const outletsWithStatus = outlets.map(outlet => {
            const obj = outlet.toObject();
            obj.isWithinHours = outlet.isWithinHours;
            return obj;
        });

        res.json({
            success: true,
            count: outlets.length,
            data: outletsWithStatus
        });

    } catch (error) {
        console.error('Outlets fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch outlets'
        });
    }
});

// @route   GET /api/outlets/:slug
// @desc    Get outlet details with menu preview
// @access  Private
router.get('/:slug', verifyToken, async (req, res) => {
    try {
        const outlet = await Outlet.findOne({
            slug: req.params.slug,
            university: req.user.university._id,
            isVerified: true
        }).select('-owner.password -verificationDoc');

        if (!outlet) {
            return res.status(404).json({
                success: false,
                message: 'Outlet not found'
            });
        }

        // Get menu categories
        const categories = await MenuItem.getCategoriesForOutlet(outlet._id);

        // Get popular items (for preview)
        const popularItems = await MenuItem.find({
            outlet: outlet._id,
            isAvailable: true
        })
            .sort('-createdAt')
            .limit(6);

        res.json({
            success: true,
            data: {
                outlet: outlet.toObject(),
                categories,
                popularItems
            }
        });

    } catch (error) {
        console.error('Outlet fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch outlet'
        });
    }
});

// @route   POST /api/outlets/register
// @desc    Register new outlet (pending verification)
// @access  Public
router.post('/register', [
    body('name').trim().notEmpty().withMessage('Outlet name is required'),
    body('universityId').isMongoId().withMessage('Valid university is required'),
    body('cuisineType').trim().notEmpty().withMessage('Cuisine type is required'),
    body('ownerName').trim().notEmpty().withMessage('Owner name is required'),
    body('ownerPhone').matches(/^[6-9]\d{9}$/).withMessage('Valid phone is required'),
    body('ownerEmail').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validate
], async (req, res) => {
    try {
        const {
            name,
            universityId,
            cuisineType,
            description,
            building,
            landmark,
            ownerName,
            ownerPhone,
            ownerEmail,
            password
        } = req.body;

        // Check if outlet with same name exists at university
        const existingOutlet = await Outlet.findOne({
            name: { $regex: new RegExp(`^${name}$`, 'i') },
            university: universityId
        });

        if (existingOutlet) {
            return res.status(400).json({
                success: false,
                message: 'An outlet with this name already exists at your university'
            });
        }

        // Check if owner email already registered
        const existingOwner = await Outlet.findOne({ 'owner.email': ownerEmail });
        if (existingOwner) {
            return res.status(400).json({
                success: false,
                message: 'This email is already registered as an outlet owner'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const outlet = await Outlet.create({
            name,
            university: universityId,
            cuisineType,
            description,
            location: { building, landmark },
            contact: { phone: ownerPhone, email: ownerEmail },
            owner: {
                name: ownerName,
                phone: ownerPhone,
                email: ownerEmail,
                password: hashedPassword
            },
            isVerified: false,
            isOpen: false
        });

        res.status(201).json({
            success: true,
            message: 'Outlet registered! Pending verification by CampusCravings team.',
            data: {
                id: outlet._id,
                name: outlet.name,
                slug: outlet.slug
            }
        });

    } catch (error) {
        console.error('Outlet registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to register outlet'
        });
    }
});

module.exports = router;
