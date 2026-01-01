const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
    outlet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Outlet',
        required: [true, 'Outlet is required']
    },
    name: {
        type: String,
        required: [true, 'Item name is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: [200, 'Description cannot exceed 200 characters']
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative']
        // Stored in paise (smallest unit) - 2500 = ₹25.00
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        trim: true
    },
    image: {
        type: String,
        default: null
    },
    prepTime: {
        type: Number,
        required: [true, 'Preparation time is required'],
        min: [1, 'Prep time must be at least 1 minute'],
        default: 10
        // In minutes
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    isVeg: {
        type: Boolean,
        default: true
    },
    tags: [{
        type: String,
        trim: true
    }]
}, {
    timestamps: true
});

// Indexes
menuItemSchema.index({ outlet: 1, isAvailable: 1 });
menuItemSchema.index({ outlet: 1, category: 1 });
menuItemSchema.index({ name: 'text', description: 'text' });

// Virtual for formatted price
menuItemSchema.virtual('formattedPrice').get(function () {
    return `₹${(this.price / 100).toFixed(2)}`;
});

// Static method to get categories for an outlet
menuItemSchema.statics.getCategoriesForOutlet = async function (outletId) {
    const categories = await this.distinct('category', {
        outlet: outletId,
        isAvailable: true
    });
    return categories.sort();
};

module.exports = mongoose.model('MenuItem', menuItemSchema);
