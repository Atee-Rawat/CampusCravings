const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware');
const { MenuItem, Outlet } = require('../models');

// @route   GET /api/menu/outlet/:outletId
// @desc    Get all menu items for an outlet
// @access  Private
router.get('/outlet/:outletId', verifyToken, async (req, res) => {
    try {
        const { category, search } = req.query;

        // Build query
        const query = {
            outlet: req.params.outletId,
            isAvailable: true
        };

        if (category) {
            query.category = category;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const items = await MenuItem.find(query).sort('category name');

        // Group by category
        const grouped = items.reduce((acc, item) => {
            const cat = item.category;
            if (!acc[cat]) {
                acc[cat] = [];
            }
            acc[cat].push(item);
            return acc;
        }, {});

        // Get categories ordered
        const categories = await MenuItem.getCategoriesForOutlet(req.params.outletId);

        res.json({
            success: true,
            count: items.length,
            categories,
            data: grouped
        });

    } catch (error) {
        console.error('Menu fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch menu'
        });
    }
});

// @route   GET /api/menu/item/:id
// @desc    Get single menu item
// @access  Private
router.get('/item/:id', verifyToken, async (req, res) => {
    try {
        const item = await MenuItem.findById(req.params.id).populate('outlet', 'name slug');

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        res.json({
            success: true,
            data: item
        });

    } catch (error) {
        console.error('Item fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch item'
        });
    }
});

// @route   GET /api/menu/search
// @desc    Search menu items across all outlets
// @access  Private
router.get('/search', verifyToken, async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 2 characters'
            });
        }

        // Get user's university outlets
        const outlets = await Outlet.find({
            university: req.user.university._id,
            isVerified: true
        }).select('_id');

        const outletIds = outlets.map(o => o._id);

        // Search items
        const items = await MenuItem.find({
            outlet: { $in: outletIds },
            isAvailable: true,
            $or: [
                { name: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } },
                { tags: { $regex: q, $options: 'i' } }
            ]
        })
            .populate('outlet', 'name slug isOpen')
            .limit(20);

        res.json({
            success: true,
            count: items.length,
            data: items
        });

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            message: 'Search failed'
        });
    }
});

module.exports = router;
