import { useState, useEffect } from 'react';
import { User, Mail, Phone, GraduationCap, LogOut, Heart, Edit2, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

const Profile = () => {
    const { user, logout, updateProfile } = useAuth();
    const { theme, toggleTheme, isDark } = useTheme();
    const [editing, setEditing] = useState(false);
    const [fullName, setFullName] = useState(user?.fullName || '');

    useEffect(() => {
        if (user) {
            setFullName(user.fullName);
        }
    }, [user]);

    const handleSave = async () => {
        if (!fullName.trim()) {
            toast.error('Name cannot be empty');
            return;
        }

        try {
            await updateProfile({ fullName });
            setEditing(false);
            toast.success('Profile updated');
        } catch (error) {
            toast.error('Failed to update profile');
        }
    };

    const handleLogout = async () => {
        if (window.confirm('Are you sure you want to logout?')) {
            await logout();
            toast.success('Logged out successfully');
        }
    };

    const topFavorites = user?.favoriteItems
        ?.sort((a, b) => b.orderCount - a.orderCount)
        .slice(0, 3) || [];

    return (
        <div className="container" style={{ paddingTop: 'var(--space-lg)', paddingBottom: 100 }}>
            <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--space-lg)' }}>
                My Profile
            </h1>

            {/* Profile Card */}
            <div style={{
                padding: 'var(--space-xl)',
                background: 'linear-gradient(135deg, var(--primary-500), var(--secondary-500))',
                borderRadius: 'var(--radius-lg)',
                marginBottom: 'var(--space-lg)',
                textAlign: 'center'
            }}>
                <div style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto var(--space-md)',
                    fontSize: '2rem'
                }}>
                    {user?.fullName?.charAt(0).toUpperCase() || '👤'}
                </div>

                {editing ? (
                    <div style={{
                        display: 'flex',
                        gap: 'var(--space-sm)',
                        justifyContent: 'center',
                        marginBottom: 'var(--space-sm)'
                    }}>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="input"
                            style={{
                                maxWidth: 200,
                                textAlign: 'center',
                                background: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                color: 'white'
                            }}
                            autoFocus
                        />
                        <button className="btn btn-sm" onClick={handleSave} style={{ background: 'white', color: 'var(--primary-500)' }}>
                            Save
                        </button>
                    </div>
                ) : (
                    <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 4 }}>
                        {user?.fullName}
                        <button
                            onClick={() => setEditing(true)}
                            style={{ marginLeft: 8, opacity: 0.8 }}
                        >
                            <Edit2 size={16} />
                        </button>
                    </h2>
                )}

                <p style={{ opacity: 0.9 }}>{user?.university?.name}</p>
            </div>

            {/* Theme Toggle */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-md)',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-lg)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                    {isDark ? <Moon size={20} style={{ color: 'var(--text-muted)' }} /> : <Sun size={20} style={{ color: 'var(--warning)' }} />}
                    <div>
                        <p style={{ fontWeight: 600 }}>Appearance</p>
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                            {isDark ? 'Dark Mode' : 'Light Mode'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={toggleTheme}
                    style={{
                        width: 56,
                        height: 28,
                        borderRadius: 'var(--radius-full)',
                        background: isDark ? 'var(--primary-500)' : 'var(--bg-elevated)',
                        position: 'relative',
                        transition: 'background var(--transition-normal)',
                        border: '1px solid var(--border-light)'
                    }}
                >
                    <span style={{
                        position: 'absolute',
                        top: 2,
                        left: isDark ? 30 : 2,
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: 'white',
                        transition: 'left var(--transition-normal)',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {isDark ? <Moon size={12} style={{ color: 'var(--primary-500)' }} /> : <Sun size={12} style={{ color: 'var(--warning)' }} />}
                    </span>
                </button>
            </div>

            {/* Info Cards */}
            <div style={{ marginBottom: 'var(--space-lg)' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-md)',
                    padding: 'var(--space-md)',
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-sm)'
                }}>
                    <Mail size={20} style={{ color: 'var(--text-muted)' }} />
                    <div>
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Email</p>
                        <p>{user?.email}</p>
                    </div>
                </div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-md)',
                    padding: 'var(--space-md)',
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-sm)'
                }}>
                    <Phone size={20} style={{ color: 'var(--text-muted)' }} />
                    <div>
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Phone</p>
                        <p>{user?.phone}</p>
                    </div>
                </div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-md)',
                    padding: 'var(--space-md)',
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-md)'
                }}>
                    <GraduationCap size={20} style={{ color: 'var(--text-muted)' }} />
                    <div>
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>University</p>
                        <p>{user?.university?.name}</p>
                    </div>
                </div>
            </div>

            {/* Favorite Items */}
            {topFavorites.length > 0 && (
                <div style={{ marginBottom: 'var(--space-lg)' }}>
                    <h3 style={{
                        fontSize: 'var(--font-size-lg)',
                        fontWeight: 600,
                        marginBottom: 'var(--space-md)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-sm)'
                    }}>
                        <Heart size={20} style={{ color: 'var(--primary-500)' }} />
                        Your Top 3 Favorites
                    </h3>

                    {topFavorites.map((fav, idx) => (
                        <div
                            key={idx}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-md)',
                                padding: 'var(--space-md)',
                                background: 'var(--bg-card)',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: 'var(--space-sm)'
                            }}
                        >
                            <span style={{
                                fontSize: '1.5rem',
                                width: 40,
                                height: 40,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'var(--bg-elevated)',
                                borderRadius: 'var(--radius-sm)'
                            }}>
                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                            </span>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontWeight: 600 }}>{fav.item?.name || 'Unknown Item'}</p>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                    Ordered {fav.orderCount} times
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Logout Button */}
            <button
                onClick={handleLogout}
                className="btn btn-block"
                style={{
                    background: 'var(--error-bg)',
                    color: 'var(--error)',
                    border: '1px solid var(--error)'
                }}
            >
                <LogOut size={20} />
                Logout
            </button>
        </div>
    );
};

export default Profile;
