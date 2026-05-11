/**
 * AI Recommendation Routes
 * Handles personalized meal recommendations and AI profile management
 */

const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { verifyToken } = require('../middleware');
const {
    getRecommendations,
    updateUserProfile,
    getUserProfile,
    getStats,
    reindexMenuItems,
    chatNutritionist
} = require('../controllers/aiController');

/**
 * Middleware: Require authentication for all AI routes
 */
router.use(verifyToken);

/**
 * @route   POST /api/ai/recommend/:userId
 * @desc    Get personalized meal recommendations
 * @access  Private
 * @body    {
 *            limit: number (optional, default: 8, max: 20),
 *            outlet: string (optional, outlet ID to filter by)
 *          }
 * @returns {Array} Recommendations with scores and reasoning
 */
router.post(
    '/recommend/:userId',
    [
        param('userId').isMongoId().withMessage('Invalid user ID'),
        body('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20'),
        body('outlet').optional().isMongoId().withMessage('Invalid outlet ID')
    ],
    getRecommendations
);

/**
 * @route   POST /api/ai/chat
 * @desc    Smart nutritionist chatbot with RAG and session memory
 * @access  Private
 * @body    {
 *            message: string,
 *            userId: string,
 *            sessionId?: string,
 *            currentMenuItemId?: string
 *          }
 */
router.post(
    '/chat',
    [
        body('message').trim().notEmpty().withMessage('Message is required'),
        body('userId').isMongoId().withMessage('Valid user ID is required'),
        body('sessionId').optional().isString().withMessage('Session ID must be a string'),
        body('currentMenuItemId').optional().isMongoId().withMessage('Valid menu item ID is required')
    ],
    chatNutritionist
);

/**
 * @route   PUT /api/ai/profile/:userId
 * @desc    Update user health profile for recommendations
 * @access  Private
 * @body    {
 *            healthGoals: ["weight_loss", "muscle_gain", etc],
 *            dietaryPreferences: ["string"],
 *            allergies: ["string"],
 *            budgetPerMeal: number (in paise),
 *            dailyCalorieTarget: number,
 *            preferredCuisines: ["string"]
 *          }
 * @returns {Object} Updated user profile
 */
router.put(
    '/profile/:userId',
    [
        param('userId').isMongoId().withMessage('Invalid user ID'),
        body('healthGoals')
            .optional()
            .isArray()
            .withMessage('Health goals must be an array'),
        body('dietaryPreferences')
            .optional()
            .isArray()
            .withMessage('Dietary preferences must be an array'),
        body('allergies')
            .optional()
            .isArray()
            .withMessage('Allergies must be an array'),
        body('budgetPerMeal')
            .optional()
            .isInt({ min: 0, max: 1000000 })
            .withMessage('Budget must be a valid amount'),
        body('dailyCalorieTarget')
            .optional()
            .isInt({ min: 1000, max: 5000 })
            .withMessage('Daily calorie target must be between 1000 and 5000'),
        body('preferredCuisines')
            .optional()
            .isArray()
            .withMessage('Preferred cuisines must be an array')
    ],
    updateUserProfile
);

/**
 * @route   GET /api/ai/profile/:userId
 * @desc    Get user AI profile
 * @access  Private
 * @returns {Object} User's health and preference profile
 */
router.get(
    '/profile/:userId',
    [
        param('userId').isMongoId().withMessage('Invalid user ID')
    ],
    getUserProfile
);

/**
 * @route   GET /api/ai/stats
 * @desc    Get recommendation engine statistics (Admin only)
 * @access  Private (Admin)
 * @returns {Object} Statistics about recommendations and profiles
 */
router.get('/stats', getStats);

/**
 * @route   POST /api/ai/reindex
 * @desc    Reindex all menu items into vector store (Admin only)
 * @access  Private (Admin)
 * @returns {Object} Status message
 */
router.post('/reindex', reindexMenuItems);

module.exports = router;
