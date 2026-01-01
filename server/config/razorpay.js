const Razorpay = require('razorpay');

let razorpay = null;

// Lazy initialization to prevent crashes when keys aren't configured
const getRazorpay = () => {
    if (razorpay) return razorpay;

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Check if real keys are configured (not placeholders)
    if (!keyId || !keySecret || keyId.includes('xxxx') || keySecret === 'your-test-secret') {
        console.warn('⚠️  Razorpay not configured. Payments will be simulated.');
        return null;
    }

    try {
        razorpay = new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
        });
        console.log('💳 Razorpay initialized');
        return razorpay;
    } catch (error) {
        console.warn('⚠️  Razorpay initialization failed:', error.message);
        return null;
    }
};

module.exports = { getRazorpay };
