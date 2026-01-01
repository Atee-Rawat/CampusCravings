import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const Login = () => {
    const [identifier, setIdentifier] = useState('');
    const [loading, setLoading] = useState(false);
    const { checkUser, devLogin } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!identifier.trim()) {
            toast.error('Please enter your email or phone');
            return;
        }

        setLoading(true);

        try {
            const result = await checkUser(identifier);

            if (result.success) {
                // TODO: Implement OTP flow
                toast.success('Account found! OTP verification coming soon.');
                // For now, use dev login
                await devLogin();
                navigate('/');
            }
        } catch (error) {
            if (error.status === 404) {
                toast.error('No account found. Please register first.');
            } else if (error.status === 403) {
                toast.error('Account not verified. Please verify your account.');
            } else {
                toast.error(error.message || 'Login failed');
            }
        } finally {
            setLoading(false);
        }
    };

    // Dev login for testing
    const handleDevLogin = async () => {
        setLoading(true);
        try {
            await devLogin();
            toast.success('Logged in as demo user');
            navigate('/');
        } catch (error) {
            toast.error('Dev login failed. Make sure backend is running.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-header">
                <h1 className="auth-logo">CampusCravings</h1>
                <p className="auth-tagline">Skip the queue, save time!</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
                <div className="input-group">
                    <label className="input-label">Email or Phone</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            className="input"
                            placeholder="Enter your email or phone"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            style={{ paddingLeft: 48 }}
                        />
                        <Phone
                            size={20}
                            style={{
                                position: 'absolute',
                                left: 16,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-muted)'
                            }}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    className="btn btn-primary btn-block"
                    disabled={loading}
                >
                    {loading ? (
                        <span className="spinner" style={{ width: 20, height: 20 }}></span>
                    ) : (
                        <>
                            Continue
                            <ArrowRight size={20} />
                        </>
                    )}
                </button>
            </form>

            <div className="auth-divider">or</div>

            <button
                className="btn btn-ghost btn-block"
                onClick={handleDevLogin}
                disabled={loading}
                style={{ marginBottom: 'var(--space-md)' }}
            >
                Demo Login (Development)
            </button>

            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                Don't have an account?{' '}
                <Link
                    to="/register"
                    style={{ color: 'var(--primary-500)', fontWeight: 600 }}
                >
                    Register
                </Link>
            </p>

            {/* Recaptcha container for Firebase */}
            <div id="recaptcha-container"></div>
        </div>
    );
};

export default Login;
