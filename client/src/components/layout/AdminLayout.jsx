import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, UtensilsCrossed, LogOut, Store, BarChart3, Tag, Menu, X, Settings, Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import '../../styles/AdminAnimations.css';

const AdminLayout = () => {
    const navigate = useNavigate();
    const { theme, toggleTheme, isDark } = useTheme();
    const [outlet, setOutlet] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        const outletData = localStorage.getItem('adminOutlet');

        if (!token) {
            navigate('/admin/login');
            return;
        }

        if (outletData) {
            setOutlet(JSON.parse(outletData));
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminOutlet');
        navigate('/admin/login');
    };

    const closeSidebar = () => setSidebarOpen(false);

    const navLinkStyle = ({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
        padding: 'var(--space-md)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--space-xs)',
        background: isActive ? 'var(--primary-500)' : 'transparent',
        color: isActive ? 'white' : 'var(--text-secondary)',
        transition: 'all var(--transition-fast)'
    });

    return (
        <div>
            {/* Mobile Menu Toggle */}
            <button
                className="admin-menu-toggle"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Toggle menu"
            >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Overlay for mobile */}
            <div
                className={`admin-overlay ${sidebarOpen ? 'open' : ''}`}
                onClick={closeSidebar}
            />

            {/* Sidebar */}
            <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div style={{ marginBottom: 'var(--space-xl)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
                        <div>
                            <h2 style={{
                                fontSize: 'var(--font-size-lg)',
                                fontWeight: 700,
                                color: 'var(--primary-500)'
                            }}>
                                CampusCravings
                            </h2>
                            <p style={{
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--text-secondary)',
                                marginTop: 'var(--space-xs)'
                            }}>
                                Admin Portal
                            </p>
                        </div>
                        <button
                            onClick={toggleTheme}
                            className="btn btn-ghost btn-icon"
                            style={{
                                width: 40,
                                height: 40,
                                minHeight: 'auto',
                                padding: 0,
                                transition: 'all var(--transition-normal)'
                            }}
                            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {isDark ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                    </div>
                </div>

                {outlet && (
                    <div style={{
                        padding: 'var(--space-md)',
                        background: 'var(--bg-card)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--space-lg)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <Store size={20} />
                            <span style={{ fontWeight: 600 }}>{outlet.name}</span>
                        </div>
                        {outlet.university && (
                            <p style={{
                                fontSize: 'var(--font-size-xs)',
                                color: 'var(--text-muted)',
                                marginTop: 'var(--space-xs)',
                                marginLeft: 28
                            }}>
                                {outlet.university.name || outlet.university}
                            </p>
                        )}
                    </div>
                )}

                <nav style={{ flex: 1 }}>
                    <NavLink to="/admin/dashboard" style={navLinkStyle} onClick={closeSidebar}>
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </NavLink>

                    <NavLink to="/admin/menu" style={navLinkStyle} onClick={closeSidebar}>
                        <UtensilsCrossed size={20} />
                        <span>Menu</span>
                    </NavLink>

                    <NavLink to="/admin/analytics" style={navLinkStyle} onClick={closeSidebar}>
                        <BarChart3 size={20} />
                        <span>Analytics</span>
                    </NavLink>

                    <NavLink to="/admin/coupons" style={navLinkStyle} onClick={closeSidebar}>
                        <Tag size={20} />
                        <span>Coupons</span>
                    </NavLink>

                    <NavLink to="/admin/settings" style={navLinkStyle} onClick={closeSidebar}>
                        <Settings size={20} />
                        <span>Settings</span>
                    </NavLink>
                </nav>

                <button
                    onClick={handleLogout}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-sm)',
                        padding: 'var(--space-md)',
                        color: 'var(--error)',
                        width: '100%'
                    }}
                >
                    <LogOut size={20} />
                    <span>Logout</span>
                </button>
            </aside>

            {/* Main Content */}
            <main className="admin-main admin-page-enter">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;

