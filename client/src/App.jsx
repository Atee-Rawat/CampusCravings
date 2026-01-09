import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layout
import Layout from './components/layout/Layout';
import AdminLayout from './components/layout/AdminLayout';

// Auth Pages
import Login from './pages/student/Login';
import Register from './pages/student/Register';

// Student Pages
import Home from './pages/student/Home';
import Outlet from './pages/student/Outlet';
import Cart from './pages/student/Cart';
import Checkout from './pages/student/Checkout';
import OrderTracking from './pages/student/OrderTracking';
import Orders from './pages/student/Orders';
import Profile from './pages/student/Profile';

// Admin Pages
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import MenuManager from './pages/admin/MenuManager';
import Analytics from './pages/admin/Analytics';
import Coupons from './pages/admin/Coupons';

// Loading component
const LoadingScreen = () => (
    <div className="loading-screen">
        <div className="spinner" style={{ width: 40, height: 40 }}></div>
        <p className="text-secondary">Loading...</p>
    </div>
);

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return <LoadingScreen />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

// Public route wrapper (redirect if authenticated)
const PublicRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return <LoadingScreen />;
    }

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return children;
};

function App() {
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/login" element={
                <PublicRoute>
                    <Login />
                </PublicRoute>
            } />
            <Route path="/register" element={
                <PublicRoute>
                    <Register />
                </PublicRoute>
            } />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="menu" element={<MenuManager />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="coupons" element={<Coupons />} />
            </Route>

            {/* Protected Student Routes */}
            <Route path="/" element={
                <ProtectedRoute>
                    <Layout />
                </ProtectedRoute>
            }>
                <Route index element={<Home />} />
                <Route path="outlet/:slug" element={<Outlet />} />
                <Route path="cart" element={<Cart />} />
                <Route path="checkout" element={<Checkout />} />
                <Route path="order/:id" element={<OrderTracking />} />
                <Route path="orders" element={<Orders />} />
                <Route path="profile" element={<Profile />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;
