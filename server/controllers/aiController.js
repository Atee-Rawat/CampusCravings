/**
 * AI Recommendation Controller
 * Handles personalized meal recommendations and user profile management for AI features
 */

const { validationResult } = require('express-validator');
const { recommendMeals, getRecommendationStats, indexMenuItems } = require('../services/ai/aiService');
const cache = require('../services/cache');
const { generateNutritionistReply } = require('../services/ai/chatService');
const { User } = require('../models');

/**
 * @route   POST /api/ai/recommend
 * @desc    Get personalized meal recommendations for a user
 * @access  Private (requires authentication)
 */
const getRecommendations = async (req, res) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
        }

        const { userId } = req.params;
        const { limit = 8, outlet = null } = req.body;

        // Verify user is requesting their own recommendations or is admin
        if (req.user.id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized: Can only request your own recommendations' });
        }

        // Try server-side cache first
        const safeLimit = Math.min(limit, 20);
        const cacheKey = `recommend:${userId}:${safeLimit}:${outlet || 'any'}`;
        let recommendations = await cache.get(cacheKey);
        if (!recommendations) {
            // Generate recommendations and cache result
            recommendations = await recommendMeals(userId, { limit: safeLimit, outlet });
            try {
                // Cache for 1 hour by default
                await cache.set(cacheKey, recommendations, Number(process.env.AI_RECOMMEND_CACHE_TTL_MS) || 60 * 60 * 1000);
            } catch (e) {
                console.warn('Failed to set recommendations cache:', e.message);
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Personalized recommendations generated',
            data: {
                recommendations,
                count: recommendations.length,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error in getRecommendations:', error);
        return res.status(500).json({
            message: 'Error generating recommendations',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @route   PUT /api/ai/profile/:userId
 * @desc    Update user health and preference profile for recommendations
 * @access  Private
 */
const updateUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const {
            healthGoals,
            dietaryPreferences,
            allergies,
            budgetPerMeal,
            dailyCalorieTarget,
            preferredCuisines
        } = req.body;

        // Verify user is updating their own profile or is admin
        if (req.user.id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized: Can only update your own profile' });
        }

        // Validate inputs
        if (budgetPerMeal && (budgetPerMeal < 0 || budgetPerMeal > 10000 * 100)) {
            return res.status(400).json({ message: 'Invalid budget range' });
        }

        if (dailyCalorieTarget && (dailyCalorieTarget < 1000 || dailyCalorieTarget > 5000)) {
            return res.status(400).json({ message: 'Daily calorie target must be between 1000 and 5000' });
        }

        // Validate health goals
        const validHealthGoals = ['weight_loss', 'muscle_gain', 'diabetic', 'balanced', 'vegan', 'vegetarian', 'pescatarian', 'keto', 'gluten_free'];
        if (healthGoals && healthGoals.some(goal => !validHealthGoals.includes(goal))) {
            return res.status(400).json({ message: 'Invalid health goals provided' });
        }

        // Update user profile
        const updateData = {};
        if (healthGoals) updateData.healthGoals = healthGoals;
        if (dietaryPreferences) updateData.dietaryPreferences = dietaryPreferences;
        if (allergies) updateData.allergies = allergies;
        if (budgetPerMeal) updateData.budgetPerMeal = budgetPerMeal;
        if (dailyCalorieTarget) updateData.dailyCalorieTarget = dailyCalorieTarget;
        if (preferredCuisines) updateData.preferredCuisines = preferredCuisines;
        
        // Mark profile as complete if all fields are provided
        if (healthGoals?.length && dietaryPreferences?.length) {
            updateData.profileCompleted = true;
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password -firebaseUid -passwordResetToken -passwordResetExpires');

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Invalidate recommendation cache for this user so new preferences are used
        try {
            await _invalidateUserRecommendationCache(userId);
        } catch (e) {
            console.warn('Cache invalidation after profile update failed for', userId);
        }

        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: updatedUser,
                profileCompleted: updatedUser.profileCompleted
            }
        });
    } catch (error) {
        console.error('Error in updateUserProfile:', error);
        return res.status(500).json({
            message: 'Error updating profile',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// After updating profile we should invalidate recommendation cache for this user
// so that new preferences are picked up on next request.
const _invalidateUserRecommendationCache = async (userId) => {
    try {
        await cache.delPrefix(`recommend:${userId}:`);
    } catch (e) {
        console.warn('Failed to invalidate recommendation cache for user', userId, e.message);
    }
};

/**
 * @route   GET /api/ai/profile/:userId
 * @desc    Get user AI profile for recommendations
 * @access  Private
 */
const getUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;

        // Verify user is viewing their own profile or is admin
        if (req.user.id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const user = await User.findById(userId).select(
            'healthGoals dietaryPreferences allergies budgetPerMeal dailyCalorieTarget preferredCuisines profileCompleted'
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Error in getUserProfile:', error);
        return res.status(500).json({
            message: 'Error fetching profile',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @route   GET /api/ai/stats
 * @desc    Get recommendation engine statistics (Admin only)
 * @access  Private (Admin)
 */
const getStats = async (req, res) => {
    try {
        // Check admin role
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized: Admin access required' });
        }

        const stats = await getRecommendationStats();

        return res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error in getStats:', error);
        return res.status(500).json({
            message: 'Error fetching stats',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @route   POST /api/ai/reindex
 * @desc    Reindex all menu items into vector store (Admin only, can be scheduled)
 * @access  Private (Admin)
 */
const reindexMenuItems = async (req, res) => {
    try {
        // Check admin role
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized: Admin access required' });
        }

        // This can take a while, so we'll start it asynchronously
        res.status(202).json({
            success: true,
            message: 'Reindexing started',
            data: { timestamp: new Date().toISOString() }
        });

        // Run indexing in background
        indexMenuItems()
            .then(count => {
                console.log(`✓ Successfully reindexed ${count} menu items`);
            })
            .catch(error => {
                console.error('✗ Error during background reindexing:', error);
            });
    } catch (error) {
        console.error('Error in reindexMenuItems:', error);
        return res.status(500).json({
            message: 'Error starting reindex',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * @route   POST /api/ai/chat
 * @desc    Conversational AI nutritionist chatbot with RAG + session memory
 * @access  Private
 */
const chatNutritionist = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
        }

        const { message, userId, sessionId, currentMenuItemId } = req.body;
        const authUserId = String(req.user?._id || req.user?.id || '');

        if (req.user.role !== 'admin' && authUserId !== String(userId)) {
            return res.status(403).json({ message: 'Unauthorized: Can only chat for your own account' });
        }

        const reply = await generateNutritionistReply({
            message,
            userId,
            sessionId,
            currentMenuItemId
        });

        return res.status(200).json({
            success: true,
            data: reply
        });
    } catch (error) {
        console.error('Error in chatNutritionist:', error);

        return res.status(error.statusCode || 500).json({
            message: error.statusCode === 429 ? 'Too many chat requests' : 'Error processing nutrition chat',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            ...(error.retryAfterSeconds ? { retryAfterSeconds: error.retryAfterSeconds } : {})
        });
    }
};

module.exports = {
    getRecommendations,
    updateUserProfile,
    getUserProfile,
    getStats,
    reindexMenuItems,
    chatNutritionist
};
