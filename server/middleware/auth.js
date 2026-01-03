const admin = require('../config/firebase');
const { User } = require('../models');

// Verify Firebase token middleware
const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const token = authHeader.split(' ')[1];

        // For development, allow mock tokens
        if (token === 'dev-token') {
            // Find first user for development (legacy)
            const user = await User.findOne().populate('university');
            if (user) {
                req.user = user;
                return next();
            }
        }

        // Dev token with specific user ID: dev-user-{userId}
        if (token.startsWith('dev-user-')) {
            const userId = token.replace('dev-user-', '');
            const user = await User.findById(userId).populate('university');
            if (user) {
                req.user = user;
                return next();
            }
        }

        // Verify Firebase token
        const decodedToken = await admin.auth().verifyIdToken(token);

        // Find user by Firebase UID
        const user = await User.findOne({ firebaseUid: decodedToken.uid }).populate('university');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        req.user = user;
        req.firebaseUser = decodedToken;
        next();

    } catch (error) {
        console.error('Auth error:', error.message);
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

// Optional auth - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decodedToken = await admin.auth().verifyIdToken(token);
            const user = await User.findOne({ firebaseUid: decodedToken.uid }).populate('university');
            req.user = user;
        }

        next();
    } catch (error) {
        // Continue without user
        next();
    }
};

// Verify outlet admin (uses JWT, not Firebase)
const verifyOutletAdmin = async (req, res, next) => {
    try {
        const { Outlet } = require('../models');
        const jwt = require('jsonwebtoken');

        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const token = authHeader.split(' ')[1];

        // For development, allow a mock token
        if (process.env.NODE_ENV === 'development' && token.startsWith('dev-outlet-')) {
            const outletId = token.replace('dev-outlet-', '');
            const outlet = await Outlet.findById(outletId).populate('university');
            if (outlet) {
                req.outlet = outlet;
                return next();
            }
        }

        // Verify JWT token (created by admin login)
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');

        // Find outlet by ID from token
        const outlet = await Outlet.findById(decoded.outletId).populate('university');

        if (!outlet) {
            return res.status(401).json({
                success: false,
                message: 'Outlet not found or not authorized'
            });
        }

        if (!outlet.isVerified) {
            return res.status(403).json({
                success: false,
                message: 'Outlet pending verification'
            });
        }

        req.outlet = outlet;
        next();

    } catch (error) {
        console.error('Outlet auth error:', error.message);
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

module.exports = {
    verifyToken,
    optionalAuth,
    verifyOutletAdmin
};
