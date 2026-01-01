import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ChevronRight, ShoppingBag } from 'lucide-react';
import { ordersAPI } from '../../services/api';
import toast from 'react-hot-toast';

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [activeOrders, setActiveOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const [allRes, activeRes] = await Promise.all([
                    ordersAPI.getAll({ limit: 20 }),
                    ordersAPI.getActive()
                ]);

                setOrders(allRes.data.data);
                setActiveOrders(activeRes.data.data);
            } catch (error) {
                toast.error('Failed to load orders');
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    const getStatusBadge = (status) => {
        const badges = {
            pending: { class: 'badge-warning', text: 'Pending' },
            accepted: { class: 'badge-secondary', text: 'Preparing' },
            preparing: { class: 'badge-secondary', text: 'Preparing' },
            ready: { class: 'badge-success', text: 'Ready!' },
            completed: { class: 'badge-primary', text: 'Completed' },
            cancelled: { class: 'badge-error', text: 'Cancelled' }
        };
        return badges[status] || { class: '', text: status };
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="container" style={{ paddingTop: 'var(--space-lg)' }}>
                <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--space-lg)' }}>
                    My Orders
                </h1>
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="skeleton" style={{ height: 100, marginBottom: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}></div>
                ))}
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingTop: 'var(--space-lg)', paddingBottom: 100 }}>
            <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--space-lg)' }}>
                My Orders
            </h1>

            {/* Active Orders */}
            {activeOrders.length > 0 && (
                <div style={{ marginBottom: 'var(--space-xl)' }}>
                    <h2 style={{
                        fontSize: 'var(--font-size-lg)',
                        fontWeight: 600,
                        marginBottom: 'var(--space-md)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-sm)'
                    }}>
                        <Clock size={20} style={{ color: 'var(--secondary-500)' }} />
                        Active Orders
                    </h2>

                    {activeOrders.map(order => {
                        const badge = getStatusBadge(order.status);

                        return (
                            <Link
                                key={order._id}
                                to={`/order/${order._id}`}
                                className="card"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: 'var(--space-md)',
                                    marginBottom: 'var(--space-sm)',
                                    background: order.status === 'ready'
                                        ? 'linear-gradient(135deg, rgba(0, 230, 118, 0.1), rgba(0, 180, 162, 0.1))'
                                        : 'var(--bg-card)',
                                    border: order.status === 'ready' ? '1px solid var(--success)' : '1px solid var(--border-subtle)'
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 4 }}>
                                        <span style={{ fontWeight: 600 }}>{order.outlet?.name}</span>
                                        <span className={`badge ${badge.class}`}>{badge.text}</span>
                                    </div>
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                        {order.items?.length} {order.items?.length === 1 ? 'item' : 'items'} • ₹{(order.totalAmount / 100).toFixed(0)}
                                    </p>
                                </div>
                                <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} />
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Past Orders */}
            <div>
                <h2 style={{
                    fontSize: 'var(--font-size-lg)',
                    fontWeight: 600,
                    marginBottom: 'var(--space-md)'
                }}>
                    Order History
                </h2>

                {orders.length === 0 ? (
                    <div className="empty-state">
                        <ShoppingBag size={48} className="empty-state-icon" />
                        <h3 className="empty-state-title">No orders yet</h3>
                        <p className="empty-state-text">
                            Your completed orders will appear here
                        </p>
                        <Link to="/" className="btn btn-primary" style={{ marginTop: 'var(--space-lg)' }}>
                            Browse Outlets
                        </Link>
                    </div>
                ) : (
                    orders
                        .filter(o => !activeOrders.find(a => a._id === o._id))
                        .map(order => {
                            const badge = getStatusBadge(order.status);

                            return (
                                <Link
                                    key={order._id}
                                    to={`/order/${order._id}`}
                                    className="card"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: 'var(--space-md)',
                                        marginBottom: 'var(--space-sm)'
                                    }}
                                >
                                    <div style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 'var(--radius-md)',
                                        background: 'var(--bg-elevated)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: 'var(--space-md)',
                                        fontSize: '1.5rem'
                                    }}>
                                        🍽️
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 4 }}>
                                            <span style={{ fontWeight: 600 }}>{order.outlet?.name}</span>
                                            <span className={`badge ${badge.class}`}>{badge.text}</span>
                                        </div>
                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                            {formatDate(order.createdAt)} • ₹{(order.totalAmount / 100).toFixed(0)}
                                        </p>
                                    </div>

                                    <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} />
                                </Link>
                            );
                        })
                )}
            </div>
        </div>
    );
};

export default Orders;
