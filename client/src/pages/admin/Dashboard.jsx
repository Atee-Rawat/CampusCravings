import { useState, useEffect, useCallback } from 'react';
import { ShoppingBag, Clock, CheckCircle, XCircle, DollarSign, Power } from 'lucide-react';
import api from '../../services/api';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [socket, setSocket] = useState(null);

    const outlet = JSON.parse(localStorage.getItem('adminOutlet') || '{}');

    // Fetch dashboard data
    const fetchData = useCallback(async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const [dashRes, ordersRes] = await Promise.all([
                api.get('/admin/dashboard', config),
                api.get('/admin/orders', config)
            ]);

            setStats(dashRes.data.data.stats);
            setIsOpen(dashRes.data.data.outlet.isOpen);
            setOrders(ordersRes.data.data);
        } catch (error) {
            toast.error('Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Socket connection for real-time orders
    useEffect(() => {
        const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const newSocket = io(socketUrl);

        newSocket.on('connect', () => {
            console.log('Admin socket connected');
            if (outlet.id) {
                newSocket.emit('join-outlet-room', { outletId: outlet.id });
            }
        });

        newSocket.on('new-order', (data) => {
            toast.success('🔔 New order received!');
            // Play sound
            try {
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJiGfWZqf4KDeXV6enx2cXR4eHN0dnh4dXJzd3d1c3V3d3VzdXd3dXN1d3d1c3V3d3VzdXd3dXN1d3c=');
                audio.play();
            } catch (e) { }
            setOrders(prev => [data.order, ...prev]);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [outlet.id]);

    // Toggle outlet status
    const toggleStatus = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await api.put('/admin/outlet/toggle-status', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setIsOpen(response.data.data.isOpen);
            toast.success(response.data.message);
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    // Accept order
    const acceptOrder = async (orderId) => {
        try {
            const token = localStorage.getItem('adminToken');
            await api.put(`/admin/orders/${orderId}/accept`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setOrders(prev => prev.map(o =>
                o._id === orderId ? { ...o, status: 'accepted' } : o
            ));
            toast.success('Order accepted! Timer started.');
        } catch (error) {
            toast.error('Failed to accept order');
        }
    };

    // Mark order ready
    const markReady = async (orderId) => {
        try {
            const token = localStorage.getItem('adminToken');
            await api.put(`/admin/orders/${orderId}/ready`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setOrders(prev => prev.map(o =>
                o._id === orderId ? { ...o, status: 'ready' } : o
            ));
            toast.success('Order marked as ready!');
        } catch (error) {
            toast.error('Failed to update order');
        }
    };

    // Complete order
    const completeOrder = async (orderId) => {
        try {
            const token = localStorage.getItem('adminToken');
            await api.put(`/admin/orders/${orderId}/complete`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setOrders(prev => prev.map(o =>
                o._id === orderId ? { ...o, status: 'completed' } : o
            ));
            toast.success('Order completed!');
        } catch (error) {
            toast.error('Failed to complete order');
        }
    };

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner"></div>
            </div>
        );
    }

    const pendingOrders = orders.filter(o => o.status === 'pending');
    const activeOrders = orders.filter(o => ['accepted', 'preparing'].includes(o.status));
    const readyOrders = orders.filter(o => o.status === 'ready');

    return (
        <div>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-xl)'
            }}>
                <div>
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 4 }}>Dashboard</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Welcome back!</p>
                </div>

                <button
                    onClick={toggleStatus}
                    className={`btn ${isOpen ? 'btn-primary' : 'btn-ghost'}`}
                    style={{
                        gap: 'var(--space-sm)',
                        background: isOpen ? 'var(--success)' : undefined
                    }}
                >
                    <Power size={20} />
                    {isOpen ? 'Open' : 'Closed'}
                </button>
            </div>

            {/* Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 'var(--space-md)',
                marginBottom: 'var(--space-xl)'
            }}>
                <StatCard
                    icon={<ShoppingBag size={24} />}
                    label="Today's Orders"
                    value={stats?.todayOrders || 0}
                    color="var(--primary-500)"
                />
                <StatCard
                    icon={<DollarSign size={24} />}
                    label="Today's Revenue"
                    value={`₹${((stats?.todayRevenue || 0) / 100).toFixed(0)}`}
                    color="var(--success)"
                />
                <StatCard
                    icon={<Clock size={24} />}
                    label="Pending"
                    value={stats?.pendingOrders || 0}
                    color="var(--warning)"
                />
                <StatCard
                    icon={<CheckCircle size={24} />}
                    label="Completed"
                    value={stats?.completedOrders || 0}
                    color="var(--secondary-500)"
                />
            </div>

            {/* Orders Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-lg)' }}>
                {/* Pending Orders */}
                <OrderColumn
                    title="New Orders"
                    orders={pendingOrders}
                    badgeClass="badge-warning"
                    action={{
                        label: 'Accept',
                        onClick: acceptOrder,
                        className: 'btn-primary'
                    }}
                />

                {/* Active Orders */}
                <OrderColumn
                    title="Preparing"
                    orders={activeOrders}
                    badgeClass="badge-secondary"
                    action={{
                        label: 'Mark Ready',
                        onClick: markReady,
                        className: 'btn-secondary'
                    }}
                />

                {/* Ready Orders */}
                <OrderColumn
                    title="Ready for Pickup"
                    orders={readyOrders}
                    badgeClass="badge-success"
                    action={{
                        label: 'Complete',
                        onClick: completeOrder,
                        className: 'btn-ghost'
                    }}
                />
            </div>
        </div>
    );
};

// Stat Card Component
const StatCard = ({ icon, label, value, color }) => (
    <div style={{
        padding: 'var(--space-lg)',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)'
    }}>
        <div style={{ color, marginBottom: 'var(--space-sm)' }}>{icon}</div>
        <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>{value}</p>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{label}</p>
    </div>
);

// Order Column Component
const OrderColumn = ({ title, orders, badgeClass, action }) => (
    <div>
        <h2 style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 600,
            marginBottom: 'var(--space-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)'
        }}>
            {title}
            <span className={`badge ${badgeClass}`}>{orders.length}</span>
        </h2>

        {orders.length === 0 ? (
            <div style={{
                padding: 'var(--space-xl)',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'center',
                color: 'var(--text-muted)'
            }}>
                No orders
            </div>
        ) : (
            orders.map(order => (
                <div
                    key={order._id}
                    style={{
                        padding: 'var(--space-md)',
                        background: 'var(--bg-card)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--space-sm)',
                        border: '1px solid var(--border-subtle)'
                    }}
                >
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 'var(--space-sm)'
                    }}>
                        <span style={{ fontWeight: 600 }}>#{order.orderNumber?.split('-').pop()}</span>
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                            {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>

                    <div style={{ marginBottom: 'var(--space-sm)' }}>
                        {order.items?.map((item, idx) => (
                            <p key={idx} style={{ fontSize: 'var(--font-size-sm)' }}>
                                {item.quantity}× {item.name}
                            </p>
                        ))}
                    </div>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: 'var(--space-sm)',
                        borderTop: '1px solid var(--border-subtle)'
                    }}>
                        <span style={{ fontWeight: 600 }}>₹{(order.totalAmount / 100).toFixed(0)}</span>
                        <button
                            className={`btn btn-sm ${action.className}`}
                            onClick={() => action.onClick(order._id)}
                        >
                            {action.label}
                        </button>
                    </div>

                    {order.user && (
                        <p style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--text-muted)',
                            marginTop: 'var(--space-sm)'
                        }}>
                            {order.user.fullName} • {order.user.phone}
                        </p>
                    )}
                </div>
            ))
        )}
    </div>
);

export default Dashboard;
