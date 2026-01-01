const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    menuItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MenuItem',
        required: true
    },
    name: String,
    price: Number,
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    prepTime: Number
}, { _id: false });

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User is required']
    },
    outlet: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Outlet',
        required: [true, 'Outlet is required']
    },
    items: [orderItemSchema],
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    totalPrepTime: {
        type: Number,
        default: 10
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'],
        default: 'pending'
    },
    payment: {
        razorpayOrderId: String,
        razorpayPaymentId: String,
        status: {
            type: String,
            enum: ['pending', 'paid', 'failed', 'refunded'],
            default: 'pending'
        },
        paidAt: Date
    },
    timerStartedAt: Date,
    estimatedReadyAt: Date,
    readyAt: Date,
    completedAt: Date,
    cancellationReason: String,
    specialInstructions: {
        type: String,
        maxlength: [200, 'Instructions cannot exceed 200 characters']
    }
}, {
    timestamps: true
});

// Indexes (orderNumber already indexed via unique: true)
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ outlet: 1, status: 1, createdAt: -1 });
orderSchema.index({ 'payment.razorpayOrderId': 1 });

// Generate order number before saving
orderSchema.pre('save', async function (next) {
    if (!this.orderNumber) {
        // Get outlet and university codes
        const Outlet = mongoose.model('Outlet');
        const University = mongoose.model('University');

        const outlet = await Outlet.findById(this.outlet).populate('university');
        const uniCode = outlet?.university?.code || 'CC';

        // Get count for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const count = await mongoose.model('Order').countDocuments({
            outlet: this.outlet,
            createdAt: { $gte: today }
        });

        // Format: CC-DU-001234
        this.orderNumber = `CC-${uniCode}-${String(count + 1).padStart(6, '0')}`;
    }
    next();
});

// Method to accept order and start timer
orderSchema.methods.accept = function () {
    this.status = 'accepted';
    this.timerStartedAt = new Date();
    this.estimatedReadyAt = new Date(Date.now() + this.totalPrepTime * 60 * 1000);
    return this.save();
};

// Method to mark as ready
orderSchema.methods.markReady = function () {
    this.status = 'ready';
    this.readyAt = new Date();
    return this.save();
};

// Method to complete order
orderSchema.methods.complete = function () {
    this.status = 'completed';
    this.completedAt = new Date();
    return this.save();
};

// Method to cancel order
orderSchema.methods.cancel = function (reason) {
    this.status = 'cancelled';
    this.cancellationReason = reason || 'Cancelled by outlet';
    return this.save();
};

// Virtual for remaining time in seconds
orderSchema.virtual('remainingSeconds').get(function () {
    if (!this.estimatedReadyAt || this.status === 'ready' || this.status === 'completed') {
        return 0;
    }
    const remaining = Math.max(0, this.estimatedReadyAt - Date.now());
    return Math.ceil(remaining / 1000);
});

// Ensure virtuals are included in JSON
orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Order', orderSchema);
