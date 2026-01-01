const mongoose = require('mongoose');

const outletSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Outlet name is required'],
        trim: true
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    university: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'University',
        required: [true, 'University is required']
    },
    cuisineType: {
        type: String,
        required: [true, 'Cuisine type is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    coverImage: {
        type: String,
        default: null
    },
    logo: {
        type: String,
        default: null
    },
    location: {
        building: String,
        landmark: String
    },
    contact: {
        phone: {
            type: String,
            required: [true, 'Contact phone is required']
        },
        email: String
    },
    operatingHours: {
        open: {
            type: String,
            default: '09:00'
        },
        close: {
            type: String,
            default: '21:00'
        }
    },
    isOpen: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationDoc: String,
    owner: {
        name: {
            type: String,
            required: [true, 'Owner name is required']
        },
        phone: {
            type: String,
            required: [true, 'Owner phone is required']
        },
        email: {
            type: String,
            required: [true, 'Owner email is required']
        },
        firebaseUid: String,
        password: String // Hashed password for admin login
    },
    razorpayAccountId: String,
    stats: {
        totalOrders: { type: Number, default: 0 },
        totalRevenue: { type: Number, default: 0 },
        avgRating: { type: Number, default: 0 }
    }
}, {
    timestamps: true
});

// Indexes (slug already indexed via unique: true)
outletSchema.index({ university: 1, isVerified: 1 });
outletSchema.index({ 'owner.firebaseUid': 1 });
outletSchema.index({ 'owner.email': 1 });

// Generate slug from name before saving
outletSchema.pre('save', function (next) {
    if (this.isModified('name') || !this.slug) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    next();
});

// Virtual for checking if currently within operating hours
outletSchema.virtual('isWithinHours').get(function () {
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();

    const [openHour, openMin] = this.operatingHours.open.split(':').map(Number);
    const [closeHour, closeMin] = this.operatingHours.close.split(':').map(Number);

    const openTime = openHour * 100 + openMin;
    const closeTime = closeHour * 100 + closeMin;

    return currentTime >= openTime && currentTime <= closeTime;
});

module.exports = mongoose.model('Outlet', outletSchema);
