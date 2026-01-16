const Review = require('../models/Review');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const mongoose = require('mongoose');

// Create a new review
exports.createReview = async (req, res) => {
    try {
        const { menuItemId, rating, comment } = req.body;
        const userId = req.user._id;

        // Validate input
        if (!menuItemId || !rating) {
            return res.status(400).json({
                success: false,
                message: 'Menu item and rating are required'
            });
        }

        // Check if menu item exists
        const menuItem = await MenuItem.findById(menuItemId);
        if (!menuItem) {
            return res.status(404).json({
                success: false,
                message: 'Menu item not found'
            });
        }

        // Check if user has ordered this item
        const hasOrdered = await Order.exists({
            user: userId,
            'items.menuItem': menuItemId,
            status: { $in: ['delivered', 'completed'] }
        });

        // Check if user already reviewed this item
        const existingReview = await Review.findOne({
            user: userId,
            menuItem: menuItemId
        });

        if (existingReview) {
            return res.status(400).json({
                success: false,
                message: 'You have already reviewed this item. Please update your existing review.'
            });
        }

        // Create review
        const review = await Review.create({
            user: userId,
            menuItem: menuItemId,
            outlet: menuItem.outlet,
            rating,
            comment: comment || '',
            orderVerified: !!hasOrdered
        });

        // Update menu item rating statistics
        const stats = await Review.calculateAverageRating(menuItemId);
        await MenuItem.findByIdAndUpdate(menuItemId, {
            averageRating: stats.averageRating,
            reviewCount: stats.count
        });

        // Populate user info before sending response
        await review.populate('user', 'name email');

        res.status(201).json({
            success: true,
            message: 'Review created successfully',
            data: review
        });
    } catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create review',
            error: error.message
        });
    }
};

// Get all reviews for a menu item
exports.getItemReviews = async (req, res) => {
    try {
        const { menuItemId } = req.params;
        const { sortBy = 'newest', page = 1, limit = 10 } = req.query;

        // Determine sort order
        let sortOption = { createdAt: -1 }; // newest
        if (sortBy === 'oldest') sortOption = { createdAt: 1 };
        if (sortBy === 'highest') sortOption = { rating: -1, createdAt: -1 };
        if (sortBy === 'lowest') sortOption = { rating: 1, createdAt: -1 };
        if (sortBy === 'helpful') sortOption = { helpfulCount: -1, createdAt: -1 };

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const reviews = await Review.find({ menuItem: menuItemId })
            .populate('user', 'name email')
            .sort(sortOption)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Review.countDocuments({ menuItem: menuItemId });

        // Get rating distribution
        const distribution = await Review.aggregate([
            { $match: { menuItem: new mongoose.Types.ObjectId(menuItemId) } },
            {
                $group: {
                    _id: '$rating',
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: -1 } }
        ]);

        res.json({
            success: true,
            data: {
                reviews,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                },
                distribution
            }
        });
    } catch (error) {
        console.error('Get item reviews error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reviews',
            error: error.message
        });
    }
};

// Get all reviews for an outlet
exports.getOutletReviews = async (req, res) => {
    try {
        const { outletId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const reviews = await Review.find({ outlet: outletId })
            .populate('user', 'name email')
            .populate('menuItem', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Review.countDocuments({ outlet: outletId });

        res.json({
            success: true,
            data: {
                reviews,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });
    } catch (error) {
        console.error('Get outlet reviews error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reviews',
            error: error.message
        });
    }
};

// Update a review
exports.updateReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;
        const userId = req.user._id;

        const review = await Review.findById(id);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Check if user owns this review
        if (review.user.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only update your own reviews'
            });
        }

        // Update fields
        if (rating) review.rating = rating;
        if (comment !== undefined) review.comment = comment;

        await review.save();

        // Update menu item rating statistics
        const stats = await Review.calculateAverageRating(review.menuItem);
        await MenuItem.findByIdAndUpdate(review.menuItem, {
            averageRating: stats.averageRating,
            reviewCount: stats.count
        });

        await review.populate('user', 'name email');

        res.json({
            success: true,
            message: 'Review updated successfully',
            data: review
        });
    } catch (error) {
        console.error('Update review error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update review',
            error: error.message
        });
    }
};

// Delete a review
exports.deleteReview = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const review = await Review.findById(id);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Check if user owns this review
        if (review.user.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own reviews'
            });
        }

        const menuItemId = review.menuItem;
        await review.deleteOne();

        // Update menu item rating statistics
        const stats = await Review.calculateAverageRating(menuItemId);
        await MenuItem.findByIdAndUpdate(menuItemId, {
            averageRating: stats.averageRating,
            reviewCount: stats.count
        });

        res.json({
            success: true,
            message: 'Review deleted successfully'
        });
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete review',
            error: error.message
        });
    }
};

// Mark review as helpful
exports.markHelpful = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const review = await Review.findById(id);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }

        // Check if already marked as helpful
        const alreadyMarked = review.markedHelpfulBy.includes(userId);

        if (alreadyMarked) {
            // Remove from helpful
            review.markedHelpfulBy = review.markedHelpfulBy.filter(
                id => id.toString() !== userId.toString()
            );
            review.helpfulCount = Math.max(0, review.helpfulCount - 1);
        } else {
            // Add to helpful
            review.markedHelpfulBy.push(userId);
            review.helpfulCount += 1;
        }

        await review.save();

        res.json({
            success: true,
            message: alreadyMarked ? 'Unmarked as helpful' : 'Marked as helpful',
            data: {
                helpfulCount: review.helpfulCount,
                isMarkedHelpful: !alreadyMarked
            }
        });
    } catch (error) {
        console.error('Mark helpful error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark review as helpful',
            error: error.message
        });
    }
};

// Get user's review for a specific item
exports.getUserItemReview = async (req, res) => {
    try {
        const { menuItemId } = req.params;
        const userId = req.user._id;

        const review = await Review.findOne({
            user: userId,
            menuItem: menuItemId
        }).populate('user', 'name email');

        res.json({
            success: true,
            data: review
        });
    } catch (error) {
        console.error('Get user item review error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch review',
            error: error.message
        });
    }
};
