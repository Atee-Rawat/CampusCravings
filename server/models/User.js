const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: true,
        trim: true,
        match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number']
    },
    firebaseUid: {
        type: String,
        unique: true,
        sparse: true
    },
    university: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'University',
        required: [true, 'University is required']
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    profileImage: {
        type: String,
        default: null
    },
    favoriteItems: [{
        item: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MenuItem'
        },
        orderCount: {
            type: Number,
            default: 0
        }
    }],
    role: {
        type: String,
        enum: ['student', 'admin'],
        default: 'student'
    }
}, {
    timestamps: true
});

// Indexes for efficient queries (email, phone, firebaseUid already indexed via unique: true)
userSchema.index({ university: 1 });

// Virtual for getting top 3 favorites
userSchema.virtual('topFavorites').get(function () {
    return this.favoriteItems
        .sort((a, b) => b.orderCount - a.orderCount)
        .slice(0, 3);
});

// Method to update favorite items
userSchema.methods.updateFavorite = async function (menuItemId) {
    const existingIndex = this.favoriteItems.findIndex(
        fav => fav.item.toString() === menuItemId.toString()
    );

    if (existingIndex > -1) {
        this.favoriteItems[existingIndex].orderCount += 1;
    } else {
        this.favoriteItems.push({ item: menuItemId, orderCount: 1 });
    }

    await this.save();
};

module.exports = mongoose.model('User', userSchema);
