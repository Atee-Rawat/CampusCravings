import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Store } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email || !password) {
            toast.error('Please fill in all fields');
            return;
        }

        setLoading(true);

        try {
            const response = await api.post('/admin/login', { email, password });

            if (response.data.success) {
                localStorage.setItem('adminToken', response.data.data.token);
                localStorage.setItem('adminOutlet', JSON.stringify(response.data.data.outlet));
                toast.success('Welcome back!');
                navigate('/admin/dashboard');
            }
        } catch (error) {
            toast.error(error.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    // Demo login
    const handleDemoLogin = async () => {
        setLoading(true);
        try {
            const response = await api.post('/admin/login', {
                email: 'owner@demo.com',
                password: 'demo1234'
            });

            if (response.data.success) {
                localStorage.setItem('adminToken', response.data.data.token);
                localStorage.setItem('adminOutlet', JSON.stringify(response.data.data.outlet));
                toast.success('Demo login successful!');
                navigate('/admin/dashboard');
            }
        } catch (error) {
            toast.error('Demo login failed. Make sure to run the seed script first.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page" style={{ maxWidth: 400, margin: '0 auto' }}>
            <div className="auth-header">
                <Store size={48} style={{ color: 'var(--primary-500)', marginBottom: 'var(--space-md)' }} />
                <h1 className="auth-logo">CampusCravings</h1>
                <p className="auth-tagline">Outlet Admin Portal</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
                <div className="input-group">
                    <label className="input-label">Email</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="email"
                            className="input"
                            placeholder="owner@outlet.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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
                            type="password"
                            className="input"
                            placeholder="Enter password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
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
            >
                Demo Login (owner@demo.com)
            </button>

            <p style={{
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 'var(--font-size-sm)',
                marginTop: 'var(--space-lg)'
            }}>
                Not an outlet owner?{' '}
                <a href="/" style={{ color: 'var(--primary-500)' }}>Go to Student App</a>
            </p>
        </div>
    );
};

export default AdminLogin;
