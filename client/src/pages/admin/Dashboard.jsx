import { useState, useEffect, useCallback } from 'react';
import { ShoppingBag, Clock, CheckCircle, XCircle, DollarSign, Power, Hash, Search, Plus, X } from 'lucide-react';
import api, { adminAPI } from '../../services/api';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import OfflineOrderModal from '../../components/admin/OfflineOrderModal';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [socket, setSocket] = useState(null);
    const [queueStatus, setQueueStatus] = useState(null);
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [showOfflineModal, setShowOfflineModal] = useState(false);
    const [verifyPIN, setVerifyPIN] = useState('');
    const [verifying, setVerifying] = useState(false);

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

    // Fetch queue status
    const fetchQueueStatus = useCallback(async () => {
        try {
            const response = await adminAPI.getQueueStatus();
            setQueueStatus(response.data.data);
        } catch (error) {
            console.log('Queue status unavailable');
        }
    }, []);

    useEffect(() => {
        fetchData();
        fetchQueueStatus();
        // Refresh queue every 15 seconds
        const queueInterval = setInterval(fetchQueueStatus, 15000);
        return () => clearInterval(queueInterval);
    }, [fetchData, fetchQueueStatus]);

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
            fetchQueueStatus(); // Refresh queue status
        });

        // Listen for order status changes
        newSocket.on('order-status-changed', (data) => {
            console.log('Order status changed:', data);
            setOrders(prev => prev.map(o =>
                o._id === data.orderId ? { ...o, status: data.status } : o
            ));
            fetchQueueStatus(); // Refresh queue status
        });

        // Listen for order ready events
        newSocket.on('order-ready', (data) => {
            console.log('Order ready:', data);
            setOrders(prev => prev.map(o =>
                o._id === data.orderId ? { ...o, status: 'ready' } : o
            ));
            fetchQueueStatus(); // Refresh queue status
        });

        // Listen for order completed events
        newSocket.on('order-completed', (data) => {
            console.log('Order completed:', data);
            setOrders(prev => prev.map(o =>
                o._id === data.orderId ? { ...o, status: 'completed' } : o
            ));
            fetchData(); // Refresh stats as completed count changed
            fetchQueueStatus(); // Refresh queue status
        });

        // Listen for queue updates
        newSocket.on('queue-update', (data) => {
            console.log('Queue update:', data);
            fetchQueueStatus(); // Refresh queue status
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [outlet.id, fetchData, fetchQueueStatus]);

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

    // Verify by PIN
    const handleVerifyByPIN = async () => {
        if (verifyPIN.length !== 4) {
            toast.error('Please enter a 4-digit PIN');
            return;
        }
        setVerifying(true);
        try {
            const response = await adminAPI.verifyByPin(verifyPIN);
            toast.success(`✓ Order #${response.data.data.tokenNumber} completed for ${response.data.data.customerName}`);
            setShowVerifyModal(false);
            setVerifyPIN('');
            // Refresh orders and queue
            fetchData();
            fetchQueueStatus();
        } catch (error) {
            toast.error(error.message || 'Invalid PIN or order not ready');
        } finally {
            setVerifying(false);
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
                <div className="admin-card-stagger">
                    <StatCard
                        icon={<ShoppingBag size={24} />}
                        label="Today's Orders"
                        value={stats?.todayOrders || 0}
                        color="var(--primary-500)"
                    />
                </div>
                <div className="admin-card-stagger">
                    <StatCard
                        icon={<DollarSign size={24} />}
                        label="Today's Revenue"
                        value={`₹${((stats?.todayRevenue || 0) / 100).toFixed(0)}`}
                        color="var(--success)"
                    />
                </div>
                <div className="admin-card-stagger">
                    <StatCard
                        icon={<Clock size={24} />}
                        label="Pending"
                        value={stats?.pendingOrders || 0}
                        color="var(--warning)"
                    />
                </div>
                <div className="admin-card-stagger">
                    <StatCard
                        icon={<CheckCircle size={24} />}
                        label="Completed"
                        value={stats?.completedOrders || 0}
                        color="var(--secondary-500)"
                    />
                </div>
            </div>

            {/* Queue Display & Quick Actions */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: 'var(--space-md)',
                marginBottom: 'var(--space-xl)'
            }}>
                {/* Now Serving Panel */}
                <div style={{
                    padding: 'var(--space-lg)',
                    background: 'linear-gradient(135deg, var(--success), var(--secondary-500))',
                    borderRadius: 'var(--radius-lg)',
                    color: 'white'
                }}>
                    <h3 style={{ fontSize: 'var(--font-size-sm)', opacity: 0.9, marginBottom: 'var(--space-sm)' }}>
                        🔔 Now Serving
                    </h3>
                    {queueStatus?.readyTokens?.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                            {queueStatus.readyTokens.map((t, i) => (
                                <span key={i} style={{
                                    fontSize: 'var(--font-size-2xl)',
                                    fontWeight: 700,
                                    background: 'rgba(255,255,255,0.2)',
                                    padding: '4px 12px',
                                    borderRadius: 'var(--radius-md)'
                                }}>
                                    #{t.tokenNumber}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p style={{ fontSize: 'var(--font-size-lg)', opacity: 0.8 }}>No orders ready</p>
                    )}
                </div>

                {/* Quick Verify by PIN */}
                <div style={{
                    padding: 'var(--space-lg)',
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-subtle)'
                }}>
                    <h3 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
                        🔍 Quick Verify
                    </h3>
                    <button
                        onClick={() => setShowVerifyModal(true)}
                        className="btn btn-primary"
                        style={{ width: '100%', gap: 'var(--space-sm)' }}
                    >
                        <Hash size={18} />
                        Verify by PIN
                    </button>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-sm)', textAlign: 'center' }}>
                        Enter customer's 4-digit pickup PIN
                    </p>
                </div>

                {/* Queue Stats */}
                <div style={{
                    padding: 'var(--space-lg)',
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-subtle)'
                }}>
                    <h3 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
                        📊 Queue Status
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--warning)' }}>
                                {queueStatus?.preparingTokens?.length || 0}
                            </p>
                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Preparing</p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--success)' }}>
                                {queueStatus?.completedCount || 0}
                            </p>
                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Served Today</p>
                        </div>
                    </div>
                </div>

                {/* New Offline Order */}
                <div style={{
                    padding: 'var(--space-lg)',
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-subtle)'
                }}>
                    <h3 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
                        🛒 Walk-in Order
                    </h3>
                    <button
                        onClick={() => setShowOfflineModal(true)}
                        className="btn btn-secondary"
                        style={{ width: '100%', gap: 'var(--space-sm)' }}
                    >
                        <Plus size={18} />
                        New Offline Order
                    </button>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-sm)', textAlign: 'center' }}>
                        For customers ordering at counter
                    </p>
                </div>
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

            {/* Verify PIN Modal */}
            {showVerifyModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: 'var(--space-lg)'
                }} onClick={() => setShowVerifyModal(false)}>
                    <div style={{
                        background: 'var(--bg-card)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 'var(--space-xl)',
                        maxWidth: 400,
                        width: '100%',
                        textAlign: 'center'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600 }}>Verify Pickup PIN</h2>
                            <button onClick={() => setShowVerifyModal(false)} className="btn btn-ghost btn-icon">
                                <X size={20} />
                            </button>
                        </div>

                        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
                            Enter the 4-digit PIN shown on the customer's phone
                        </p>

                        <input
                            type="text"
                            value={verifyPIN}
                            onChange={e => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                setVerifyPIN(val);
                            }}
                            placeholder="0000"
                            style={{
                                fontSize: 'var(--font-size-4xl)',
                                fontWeight: 700,
                                fontFamily: 'monospace',
                                letterSpacing: 16,
                                textAlign: 'center',
                                width: '100%',
                                padding: 'var(--space-lg)',
                                border: '2px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-lg)',
                                background: 'var(--bg-elevated)',
                                marginBottom: 'var(--space-lg)'
                            }}
                            autoFocus
                            onKeyDown={e => e.key === 'Enter' && handleVerifyByPIN()}
                        />

                        <button
                            onClick={handleVerifyByPIN}
                            disabled={verifyPIN.length !== 4 || verifying}
                            className="btn btn-primary"
                            style={{ width: '100%', padding: 'var(--space-md)' }}
                        >
                            {verifying ? 'Verifying...' : 'Verify & Complete'}
                        </button>
                    </div>
                </div>
            )}

            {/* Offline Order Modal */}
            <OfflineOrderModal
                isOpen={showOfflineModal}
                onClose={() => setShowOfflineModal(false)}
                onOrderCreated={() => {
                    fetchData();
                    fetchQueueStatus();
                }}
            />
        </div>
    );
};

// Stat Card Component
const StatCard = ({ icon, label, value, color }) => (
    <div className="hover-lift" style={{
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
