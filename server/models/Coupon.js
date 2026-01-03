const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    outlet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Outlet',
        required: [true, 'Outlet is required']
    },
    code: {
        type: String,
        required: [true, 'Coupon code is required'],
        uppercase: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: [100, 'Description cannot exceed 100 characters']
    },
    discountType: {
        type: String,
        enum: ['percentage', 'flat'],
        required: [true, 'Discount type is required']
    },
    discountValue: {
        type: Number,
        required: [true, 'Discount value is required'],
        min: [1, 'Discount must be at least 1']
    },
    minOrderAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    maxDiscount: {
        type: Number,
        default: null // Only applicable for percentage discounts
    },
    usageLimit: {
        type: Number,
        default: null // null = unlimited
    },
    usedCount: {
        type: Number,
        default: 0
    },
    expiresAt: {
        type: Date,
        default: null // null = never expires
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Compound index for unique code per outlet
couponSchema.index({ outlet: 1, code: 1 }, { unique: true });
couponSchema.index({ outlet: 1, isActive: 1 });

// Virtual to check if coupon is valid
couponSchema.virtual('isValid').get(function () {
    if (!this.isActive) return false;
    if (this.expiresAt && new Date() > this.expiresAt) return false;
    if (this.usageLimit && this.usedCount >= this.usageLimit) return false;
    return true;
});

// Method to calculate discount for an order amount
couponSchema.methods.calculateDiscount = function (orderAmount) {
    if (!this.isValid) return 0;
    if (orderAmount < this.minOrderAmount) return 0;

    let discount = 0;
    if (this.discountType === 'percentage') {
        discount = Math.round((orderAmount * this.discountValue) / 100);
        if (this.maxDiscount) {
            discount = Math.min(discount, this.maxDiscount);
        }
    } else {
        discount = this.discountValue;
    }

    // Discount cannot exceed order amount
    return Math.min(discount, orderAmount);
};

// Ensure virtuals are included in JSON
couponSchema.set('toJSON', { virtuals: true });
couponSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Coupon', couponSchema);
