const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
    if (admin.apps.length === 0) {
        try {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                }),
            });
            console.log('🔥 Firebase Admin initialized');
        } catch (error) {
            console.error('Firebase initialization error:', error.message);
            // Don't exit - allow app to run without Firebase for development
        }
    }
    return admin;
};

module.exports = initializeFirebase();
