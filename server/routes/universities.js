const express = require('express');
const router = express.Router();
const { University } = require('../models');

// @route   GET /api/universities
// @desc    Get all active universities
// @access  Public
router.get('/', async (req, res) => {
    try {
        const universities = await University.find({ isActive: true })
            .select('name code city state')
            .sort('name');

        res.json({
            success: true,
            count: universities.length,
            data: universities
        });

    } catch (error) {
        console.error('Universities fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch universities'
        });
    }
});

// @route   GET /api/universities/:id
// @desc    Get university by ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const university = await University.findById(req.params.id);

        if (!university) {
            return res.status(404).json({
                success: false,
                message: 'University not found'
            });
        }

        res.json({
            success: true,
            data: university
        });

    } catch (error) {
        console.error('University fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch university'
        });
    }
});

module.exports = router;
