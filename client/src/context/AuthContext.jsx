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

// Initialize Firebase (with error suppression for demo environment)
let app, auth;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
} catch (error) {
    console.warn('⚠️ Firebase initialization error (expected in demo mode):', error.message);
    // Gracefully handle Firebase initialization errors
}

const AuthContext = createContext(null);

// Cross-platform storage utilities for WebView compatibility
const storage = {
    setItem: (key, value, rememberMe = null) => {
        try {
            // If rememberMe is explicitly set, use it; otherwise check stored preference
            const shouldPersist = rememberMe !== null
                ? rememberMe
                : localStorage.getItem('rememberMe') === 'true';

            const store = shouldPersist ? localStorage : sessionStorage;
            store.setItem(key, value);

            // Also post to React Native parent if in WebView
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'SAVE_TOKEN',
                    key,
                    value
                }));
            }
        } catch (error) {
            console.error('Storage setItem error:', error);
        }
    },
    getItem: (key) => {
        try {
            // Check both storages
            return localStorage.getItem(key) || sessionStorage.getItem(key);
        } catch (error) {
            console.error('Storage getItem error:', error);
            return null;
        }
    },
    removeItem: (key) => {
        try {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
            // Also notify React Native parent if in WebView
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'REMOVE_TOKEN',
                    key
                }));
            }
        } catch (error) {
            console.error('Storage removeItem error:', error);
        }
    }
};

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
    const [token, setToken] = useState(storage.getItem('token'));

    // Listen for Firebase auth state changes (only if Firebase initialized)
    useEffect(() => {
        if (!auth) {
            setLoading(false);
            return;
        }
        
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
            setFirebaseUser(fbUser);

            if (fbUser) {
                try {
                    const idToken = await fbUser.getIdToken();
                    const rememberMe = localStorage.getItem('rememberMe') === 'true';
                    storage.setItem('token', idToken, rememberMe);
                    setToken(idToken);

                    // Fetch user profile from backend
                    const response = await api.get('/auth/me');
                    setUser(response.data.data);
                } catch (error) {
                    console.error('Error fetching user:', error);
                    // User might not exist in our DB yet
                }
            } else {
                // Check if we have a stored token
                const storedToken = storage.getItem('token');
                if (storedToken) {
                    try {
                        const response = await api.get('/auth/me');
                        setUser(response.data.data);
                    } catch (error) {
                        storage.removeItem('token');
                        setToken(null);
                    }
                }
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Register new user (now returns token)
    const register = async (userData) => {
        const response = await api.post('/auth/register', userData);
        if (response.data.success && response.data.data.token) {
            // Default to remember for new registrations
            localStorage.setItem('rememberMe', 'true');
            storage.setItem('token', response.data.data.token, true);
            setToken(response.data.data.token);
            setUser(response.data.data.user);
        }
        return response.data;
    };

    // Login with password
    const login = async (identifier, password, rememberMe = false) => {
        const response = await api.post('/auth/login', { identifier, password, rememberMe });
        if (response.data.success && response.data.data.token) {
            // Store the remember me preference
            localStorage.setItem('rememberMe', rememberMe.toString());
            // Store token in appropriate storage
            storage.setItem('token', response.data.data.token, rememberMe);
            setToken(response.data.data.token);
            setUser(response.data.data.user);
        }
        return response.data;
    };

    // Check if user exists for login
    const checkUser = async (identifier) => {
        const response = await api.post('/auth/login-check', { identifier });
        return response.data;
    };

    // Setup recaptcha for phone auth (only if Firebase initialized)
    const setupRecaptcha = (elementId) => {
        if (!auth) {
            console.warn('⚠️ Firebase not initialized - phone auth unavailable');
            return null;
        }
        
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
        if (!auth) {
            throw new Error('Firebase not initialized - phone auth unavailable');
        }
        
        const formattedPhone = phoneNumber.startsWith('+91')
            ? phoneNumber
            : `+91${phoneNumber}`;

        const appVerifier = setupRecaptcha('recaptcha-container');
        if (!appVerifier) {
            throw new Error('reCAPTCHA setup failed');
        }
        
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
        // Dev mode always remembers
        localStorage.setItem('rememberMe', 'true');

        if (identifier) {
            // Login as specific user
            const response = await api.post('/auth/dev-login', { identifier });
            const userData = response.data.data;

            // Store a dev token with user ID
            const devToken = `dev-user-${userData._id}`;
            storage.setItem('token', devToken, true);
            setToken(devToken);
            setUser(userData);
            return response.data;
        } else {
            // Fallback to old behavior (first user)
            storage.setItem('token', 'dev-token', true);
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
        storage.removeItem('token');
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
        login,
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
