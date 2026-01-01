import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, GraduationCap, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { universitiesAPI } from '../../services/api';
import toast from 'react-hot-toast';

const Register = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        universityId: ''
    });
    const [universities, setUniversities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingUnis, setLoadingUnis] = useState(true);
    const { register } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUniversities = async () => {
            try {
                const response = await universitiesAPI.getAll();
                setUniversities(response.data.data);
            } catch (error) {
                toast.error('Failed to load universities');
            } finally {
                setLoadingUnis(false);
            }
        };

        fetchUniversities();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.fullName || !formData.email || !formData.phone || !formData.universityId) {
            toast.error('Please fill in all fields');
            return;
        }

        if (!/^[6-9]\d{9}$/.test(formData.phone)) {
            toast.error('Please enter a valid 10-digit phone number');
            return;
        }

        if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
            toast.error('Please enter a valid email');
            return;
        }

        setLoading(true);

        try {
            const result = await register(formData);

            if (result.success) {
                toast.success('Registration successful! Please verify your account.');
                // TODO: Redirect to OTP verification
                navigate('/login');
            }
        } catch (error) {
            toast.error(error.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-header">
                <h1 className="auth-logo">CampusCravings</h1>
                <p className="auth-tagline">Create your account</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
                <div className="input-group">
                    <label className="input-label">Full Name</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            name="fullName"
                            className="input"
                            placeholder="Enter your full name"
                            value={formData.fullName}
                            onChange={handleChange}
                            style={{ paddingLeft: 48 }}
                        />
                        <User
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
                    <label className="input-label">University Email</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="email"
                            name="email"
                            className="input"
                            placeholder="your.email@university.edu"
                            value={formData.email}
                            onChange={handleChange}
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
                    <label className="input-label">Phone Number</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="tel"
                            name="phone"
                            className="input"
                            placeholder="10-digit phone number"
                            value={formData.phone}
                            onChange={handleChange}
                            maxLength={10}
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

                <div className="input-group">
                    <label className="input-label">University</label>
                    <div style={{ position: 'relative' }}>
                        <select
                            name="universityId"
                            className="input select"
                            value={formData.universityId}
                            onChange={handleChange}
                            style={{ paddingLeft: 48 }}
                            disabled={loadingUnis}
                        >
                            <option value="">Select your university</option>
                            {universities.map(uni => (
                                <option key={uni._id} value={uni._id}>
                                    {uni.name}
                                </option>
                            ))}
                        </select>
                        <GraduationCap
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
                    style={{ marginTop: 'var(--space-md)' }}
                >
                    {loading ? (
                        <span className="spinner" style={{ width: 20, height: 20 }}></span>
                    ) : (
                        <>
                            Create Account
                            <ArrowRight size={20} />
                        </>
                    )}
                </button>
            </form>

            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: 'var(--space-lg)' }}>
                Already have an account?{' '}
                <Link
                    to="/login"
                    style={{ color: 'var(--primary-500)', fontWeight: 600 }}
                >
                    Login
                </Link>
            </p>
        </div>
    );
};

export default Register;
