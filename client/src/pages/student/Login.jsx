import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const Login = () => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!identifier.trim()) {
            toast.error('Please enter your email or phone');
            return;
        }

        if (!password.trim()) {
            toast.error('Please enter your password');
            return;
        }

        setLoading(true);

        try {
            const result = await login(identifier, password, rememberMe);

            if (result.success) {
                toast.success('Welcome back!');
                navigate('/');
            }
        } catch (error) {
            if (error.needsPassword) {
                toast.error('Please set a password first');
                navigate('/forgot-password');
            } else {
                toast.error(error.message || 'Login failed');
            }
        } finally {
            setLoading(false);
        }
    };

    // Demo login - uses the demo account
    const handleDemoLogin = async () => {
        setLoading(true);
        try {
            const result = await login('rawatateeshay@gmail.com', '70785@Ar', true);
            if (result.success) {
                toast.success('Welcome back!');
                navigate('/');
            }
        } catch (error) {
            toast.error(error.message || 'Demo login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="student-login-wrapper">
            <div className="student-login-card">
                <div className="auth-header">
                    <h1 className="auth-logo">CampusCravings</h1>
                    <p className="auth-tagline">We will satisfy your every craving</p>
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
                            <Mail
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

                    <div className="input-group">
                        <label className="input-label">Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="input"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{ paddingLeft: 48, paddingRight: 48 }}
                            />
                            <Lock
                                size={20}
                                style={{
                                    position: 'absolute',
                                    left: 16,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--text-muted)'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: 12,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--text-muted)',
                                    padding: 4
                                }}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 'var(--space-md)'
                    }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-xs)',
                            cursor: 'pointer',
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--text-secondary)'
                        }}>
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                style={{
                                    width: 18,
                                    height: 18,
                                    accentColor: 'var(--primary-500)'
                                }}
                            />
                            Remember me
                        </label>

                        <Link
                            to="/forgot-password"
                            style={{
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--primary-500)',
                                fontWeight: 500
                            }}
                        >
                            Forgot Password?
                        </Link>
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
                                Login
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>

                <div className="auth-divider">or</div>

                <button
                    className="btn btn-ghost btn-block"
                    onClick={handleDemoLogin}
                    disabled={loading}
                    style={{ marginBottom: 'var(--space-md)' }}
                >
                    Demo Login
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
        </div>
    );
};

export default Login;
