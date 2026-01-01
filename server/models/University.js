const mongoose = require('mongoose');

const universitySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'University name is required'],
        trim: true
    },
    code: {
        type: String,
        required: [true, 'University code is required'],
        unique: true,
        uppercase: true,
        trim: true
    },
    emailDomain: {
        type: String,
        required: [true, 'Email domain is required'],
        lowercase: true,
        trim: true
    },
    city: {
        type: String,
        trim: true
    },
    state: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for quick lookups (code already indexed via unique: true)
universitySchema.index({ isActive: 1 });

module.exports = mongoose.model('University', universitySchema);
