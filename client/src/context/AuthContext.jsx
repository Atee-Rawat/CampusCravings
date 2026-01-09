import { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import api from '../services/api';

// Firebase config - replace with your own
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "demo.appspot.com",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abc123"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [firebaseUser, setFirebaseUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('token'));

    // Listen for Firebase auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
            setFirebaseUser(fbUser);

            if (fbUser) {
                try {
                    const idToken = await fbUser.getIdToken();
                    localStorage.setItem('token', idToken);
                    setToken(idToken);

                    // Fetch user profile from backend
                    const response = await api.get('/auth/me');
                    setUser(response.data.data);
                } catch (error) {
                    console.error('Error fetching user:', error);
                    // User might not exist in our DB yet
                }
            } else {
                // Check if we have a dev token
                const storedToken = localStorage.getItem('token');
                if (storedToken === 'dev-token') {
                    try {
                        const response = await api.get('/auth/me');
                        setUser(response.data.data);
                    } catch (error) {
                        localStorage.removeItem('token');
                        setToken(null);
                    }
                }
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Register new user
    const register = async (userData) => {
        const response = await api.post('/auth/register', userData);
        return response.data;
    };

    // Check if user exists for login
    const checkUser = async (identifier) => {
        const response = await api.post('/auth/login-check', { identifier });
        return response.data;
    };

    // Setup recaptcha for phone auth
    const setupRecaptcha = (elementId) => {
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, elementId, {
                size: 'invisible',
                callback: () => {
                    // reCAPTCHA solved
                }
            });
        }
        return window.recaptchaVerifier;
    };

    // Send OTP to phone
    const sendOTP = async (phoneNumber) => {
        const formattedPhone = phoneNumber.startsWith('+91')
            ? phoneNumber
            : `+91${phoneNumber}`;

        const appVerifier = setupRecaptcha('recaptcha-container');
        const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
        window.confirmationResult = confirmationResult;
        return confirmationResult;
    };

    // Verify OTP
    const verifyOTP = async (otp, userId) => {
        const result = await window.confirmationResult.confirm(otp);

        // Update user with Firebase UID
        const response = await api.post('/auth/verify', {
            userId,
            firebaseUid: result.user.uid
        });

        setUser(response.data.data);
        return response.data;
    };

    // Login with dev mode (for development only - skips OTP)
    const devLogin = async (identifier = null) => {
        if (identifier) {
            // Login as specific user
            const response = await api.post('/auth/dev-login', { identifier });
            const userData = response.data.data;

            // Store a dev token with user ID
            const devToken = `dev-user-${userData._id}`;
            localStorage.setItem('token', devToken);
            setToken(devToken);
            setUser(userData);
            return response.data;
        } else {
            // Fallback to old behavior (first user)
            localStorage.setItem('token', 'dev-token');
            setToken('dev-token');
            const response = await api.get('/auth/me');
            setUser(response.data.data);
            return response.data;
        }
    };

    // Logout
    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            // Firebase might not be configured
        }
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setFirebaseUser(null);
    };

    // Update user profile
    const updateProfile = async (data) => {
        const response = await api.put('/auth/me', data);
        setUser(response.data.data);
        return response.data;
    };

    const value = {
        user,
        firebaseUser,
        token,
        loading,
        isAuthenticated: !!user,
        register,
        checkUser,
        sendOTP,
        verifyOTP,
        devLogin,
        logout,
        updateProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
