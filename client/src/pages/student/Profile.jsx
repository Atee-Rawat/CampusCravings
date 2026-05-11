import { useState, useEffect } from 'react';
import { User, Mail, Phone, GraduationCap, LogOut, Heart, Edit2, Sun, Moon, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ConfirmModal from '../../components/ConfirmModal';
import api from '../../services/api';
import toast from 'react-hot-toast';

const Profile = () => {
    const { user, logout, updateProfile } = useAuth();
    const { theme, toggleTheme, isDark } = useTheme();
    const [editing, setEditing] = useState(false);
    const [fullName, setFullName] = useState(user?.fullName || '');
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    // AI Preferences State
    const [aiFormOpen, setAiFormOpen] = useState(false);
    const [healthGoals, setHealthGoals] = useState(user?.healthGoals || ['balanced']);
    const [dietaryPreferences, setDietaryPreferences] = useState(user?.dietaryPreferences || []);
    const [dailyCalorieTarget, setDailyCalorieTarget] = useState(user?.dailyCalorieTarget || 2000);
    const [savingAi, setSavingAi] = useState(false);

    const healthGoalOptions = ['weight_loss', 'muscle_gain', 'balanced', 'vegan', 'vegetarian', 'keto', 'gluten_free'];
    const dietaryOptions = ['Spicy', 'Low Sodium', 'High Protein', 'Low Carb', 'Dairy Free'];

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

    const handleSaveAIPrefs = async () => {
        setSavingAi(true);
        try {
            await api.put(`/ai/profile/${user._id || user.id}`, {
                healthGoals,
                dietaryPreferences,
                dailyCalorieTarget
            });
            // Refresh user context
            await updateProfile({});
            toast.success('AI Preferences updated!');
            setAiFormOpen(false);
        } catch (error) {
            toast.error('Failed to update AI preferences');
        } finally {
            setSavingAi(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        toast.success('Logged out successfully');
        setShowLogoutModal(false);
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

            {/* AI Preferences Section */}
            <div style={{ marginBottom: 'var(--space-lg)' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-md)',
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    border: user?.profileCompleted ? '1px solid transparent' : '1px dashed var(--primary-500)'
                }} onClick={() => setAiFormOpen(!aiFormOpen)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                        <Sparkles size={20} style={{ color: 'var(--primary-500)' }} />
                        <div>
                            <p style={{ fontWeight: 600 }}>AI Food Preferences</p>
                            <p style={{ fontSize: 'var(--font-size-xs)', color: user?.profileCompleted ? 'var(--text-muted)' : 'var(--primary-500)' }}>
                                {user?.profileCompleted ? 'Personalized recommendations active' : 'Complete setup for recommendations'}
                            </p>
                        </div>
                    </div>
                    <Edit2 size={16} style={{ color: 'var(--text-muted)' }} />
                </div>

                {aiFormOpen && (
                    <div style={{
                        marginTop: 'var(--space-sm)',
                        padding: 'var(--space-md)',
                        background: 'var(--bg-card)',
                        borderRadius: 'var(--radius-md)',
                        animation: 'slideUp 0.3s ease'
                    }}>
                        {/* Health Goals */}
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                            <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 8 }}>Health Goals</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {healthGoalOptions.map(goal => (
                                    <span 
                                        key={goal}
                                        onClick={() => {
                                            if (healthGoals.includes(goal)) setHealthGoals(healthGoals.filter(g => g !== goal));
                                            else setHealthGoals([...healthGoals, goal]);
                                        }}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: 999,
                                            fontSize: 'var(--font-size-xs)',
                                            background: healthGoals.includes(goal) ? 'var(--primary-500)' : 'var(--bg-elevated)',
                                            color: healthGoals.includes(goal) ? 'white' : 'var(--text-primary)',
                                            cursor: 'pointer',
                                            textTransform: 'capitalize'
                                        }}
                                    >
                                        {goal.replace('_', ' ')}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Dietary Preferences */}
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                            <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 8 }}>Dietary Preferences</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {dietaryOptions.map(pref => (
                                    <span 
                                        key={pref}
                                        onClick={() => {
                                            if (dietaryPreferences.includes(pref)) setDietaryPreferences(dietaryPreferences.filter(p => p !== pref));
                                            else setDietaryPreferences([...dietaryPreferences, pref]);
                                        }}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: 999,
                                            fontSize: 'var(--font-size-xs)',
                                            background: dietaryPreferences.includes(pref) ? 'var(--secondary-500)' : 'var(--bg-elevated)',
                                            color: dietaryPreferences.includes(pref) ? 'white' : 'var(--text-primary)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {pref}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Calorie Target */}
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Daily Calorie Target</p>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{dailyCalorieTarget} kcal</p>
                            </div>
                            <input 
                                type="range" 
                                min="1000" 
                                max="5000" 
                                step="100" 
                                value={dailyCalorieTarget} 
                                onChange={(e) => setDailyCalorieTarget(parseInt(e.target.value))}
                                style={{ width: '100%', accentColor: 'var(--primary-500)' }}
                            />
                        </div>

                        <button 
                            onClick={handleSaveAIPrefs} 
                            disabled={savingAi || healthGoals.length === 0 || dietaryPreferences.length === 0}
                            className="btn btn-primary btn-block"
                        >
                            {savingAi ? 'Saving...' : 'Save AI Preferences'}
                        </button>
                        {(healthGoals.length === 0 || dietaryPreferences.length === 0) && (
                            <p style={{ fontSize: '10px', color: 'var(--error)', marginTop: 4, textAlign: 'center' }}>
                                Select at least one health goal and dietary preference.
                            </p>
                        )}
                    </div>
                )}
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
                onClick={() => setShowLogoutModal(true)}
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

            {/* Logout Confirmation Modal */}
            <ConfirmModal
                isOpen={showLogoutModal}
                title="Logout"
                message="Are you sure you want to logout? You'll need to login again to access your account."
                confirmText="Yes, Logout"
                cancelText="Cancel"
                onConfirm={handleLogout}
                onCancel={() => setShowLogoutModal(false)}
                isDanger={true}
            />
        </div>
    );
};

export default Profile;
