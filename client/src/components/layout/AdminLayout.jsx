import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, UtensilsCrossed, LogOut, Store, BarChart3, Tag } from 'lucide-react';
import { useEffect, useState } from 'react';

const AdminLayout = () => {
    const navigate = useNavigate();
    const [outlet, setOutlet] = useState(null);

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
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <aside style={{
                width: 240,
                background: 'var(--bg-secondary)',
                borderRight: '1px solid var(--border-subtle)',
                padding: 'var(--space-md)',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{ marginBottom: 'var(--space-xl)' }}>
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
                    <NavLink to="/admin/dashboard" style={navLinkStyle}>
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </NavLink>

                    <NavLink to="/admin/menu" style={navLinkStyle}>
                        <UtensilsCrossed size={20} />
                        <span>Menu</span>
                    </NavLink>

                    <NavLink to="/admin/analytics" style={navLinkStyle}>
                        <BarChart3 size={20} />
                        <span>Analytics</span>
                    </NavLink>

                    <NavLink to="/admin/coupons" style={navLinkStyle}>
                        <Tag size={20} />
                        <span>Coupons</span>
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
            <main style={{ flex: 1, padding: 'var(--space-xl)' }}>
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
