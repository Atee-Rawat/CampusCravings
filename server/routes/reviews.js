const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { verifyToken } = require('../middleware');

// All routes require authentication
router.use(verifyToken);

// Create a new review
router.post('/', reviewController.createReview);

// Get reviews for a specific menu item
router.get('/item/:menuItemId', reviewController.getItemReviews);

// Get user's review for a specific item
router.get('/item/:menuItemId/user', reviewController.getUserItemReview);

// Get all reviews for an outlet
router.get('/outlet/:outletId', reviewController.getOutletReviews);

// Update a review
router.put('/:id', reviewController.updateReview);

// Delete a review
router.delete('/:id', reviewController.deleteReview);

// Mark review as helpful/unhelpful
router.post('/:id/helpful', reviewController.markHelpful);

module.exports = router;
