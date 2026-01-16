const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User is required']
    },
    menuItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MenuItem',
        required: [true, 'Menu item is required']
    },
    outlet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Outlet',
        required: [true, 'Outlet is required']
    },
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5']
    },
    comment: {
        type: String,
        trim: true,
        maxlength: [500, 'Review comment cannot exceed 500 characters']
    },
    orderVerified: {
        type: Boolean,
        default: false
        // Set to true if user has actually ordered this item
    },
    helpfulCount: {
        type: Number,
        default: 0
    },
    markedHelpfulBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

// Indexes for efficient querying
reviewSchema.index({ menuItem: 1, createdAt: -1 });
reviewSchema.index({ outlet: 1, createdAt: -1 });
reviewSchema.index({ user: 1, menuItem: 1 }, { unique: true }); // One review per user per item

// Static method to calculate average rating for a menu item
reviewSchema.statics.calculateAverageRating = async function (menuItemId) {
    const result = await this.aggregate([
        { $match: { menuItem: new mongoose.Types.ObjectId(menuItemId) } },
        {
            $group: {
                _id: '$menuItem',
                averageRating: { $avg: '$rating' },
                count: { $sum: 1 }
            }
        }
    ]);

    return result.length > 0
        ? { averageRating: Math.round(result[0].averageRating * 10) / 10, count: result[0].count }
        : { averageRating: 0, count: 0 };
};

module.exports = mongoose.model('Review', reviewSchema);
