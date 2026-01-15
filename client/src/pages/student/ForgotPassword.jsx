import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft, Lock, Eye, EyeOff, Check } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
    const [searchParams] = useSearchParams();
    const [step, setStep] = useState(1); // 1: enter email, 2: enter token + new password
    const [identifier, setIdentifier] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Check for token in URL (from email link)
    useEffect(() => {
        const tokenFromUrl = searchParams.get('token');
        if (tokenFromUrl) {
            setResetToken(tokenFromUrl);
            setStep(2);
        }
    }, [searchParams]);

    const handleRequestReset = async (e) => {
        e.preventDefault();

        if (!identifier.trim()) {
            toast.error('Please enter your email or phone');
            return;
        }

        setLoading(true);

        try {
            const response = await api.post('/auth/forgot-password', { identifier });

            if (response.data.success) {
                toast.success('Check your email for reset instructions!');
                setStep(2);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to process request');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();

        if (!resetToken.trim()) {
            toast.error('Please enter the reset token');
            return;
        }

        if (password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const response = await api.post('/auth/reset-password', {
                token: resetToken,
                password
            });

            if (response.data.success) {
                toast.success('Password reset successful! Please login.');
                navigate('/login');
            }
        } catch (error) {
            toast.error(error.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="student-login-wrapper">
            <div className="student-login-card">
                <div className="auth-header">
                    <h1 className="auth-logo">CampusCravings</h1>
                    <p className="auth-tagline">
                        {step === 1 ? 'Reset your password' : 'Set new password'}
                    </p>
                </div>

                {step === 1 ? (
                    <form className="auth-form" onSubmit={handleRequestReset}>
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

                        <button
                            type="submit"
                            className="btn btn-primary btn-block"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="spinner" style={{ width: 20, height: 20 }}></span>
                            ) : (
                                <>
                                    Send Reset Code
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>
                ) : (
                    <form className="auth-form" onSubmit={handleResetPassword}>
                        <div className="input-group">
                            <label className="input-label">Reset Token</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Paste reset token from email"
                                value={resetToken}
                                onChange={(e) => setResetToken(e.target.value)}
                            />
                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                                Check your email for the reset token or use the link provided
                            </p>
                        </div>

                        <div className="input-group">
                            <label className="input-label">New Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="input"
                                    placeholder="Enter new password"
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

                        <div className="input-group">
                            <label className="input-label">Confirm Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="password"
                                    className="input"
                                    placeholder="Confirm new password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    style={{ paddingLeft: 48 }}
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
                                {password && confirmPassword && password === confirmPassword && (
                                    <Check
                                        size={20}
                                        style={{
                                            position: 'absolute',
                                            right: 16,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            color: 'var(--success)'
                                        }}
                                    />
                                )}
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
                                    Reset Password
                                    <Check size={20} />
                                </>
                            )}
                        </button>
                    </form>
                )}

                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: 'var(--space-lg)' }}>
                    <Link
                        to="/login"
                        style={{ color: 'var(--primary-500)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                        <ArrowLeft size={16} />
                        Back to Login
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default ForgotPassword;
