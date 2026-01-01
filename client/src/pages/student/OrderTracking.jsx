import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, CheckCircle } from 'lucide-react';
import { ordersAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';

const OrderTracking = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { joinOrderRoom, leaveOrderRoom, on } = useSocket();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [remainingSeconds, setRemainingSeconds] = useState(0);

    // Fetch order details
    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const response = await ordersAPI.getById(id);
                setOrder(response.data.data);

                if (response.data.data.remainingSeconds) {
                    setRemainingSeconds(response.data.data.remainingSeconds);
                }
            } catch (error) {
                toast.error('Failed to load order');
                navigate('/orders');
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [id, navigate]);

    // Socket connection for real-time updates
    useEffect(() => {
        if (order) {
            joinOrderRoom(order._id);

            return () => {
                leaveOrderRoom(order._id);
            };
        }
    }, [order, joinOrderRoom, leaveOrderRoom]);

    // Socket event listeners
    useEffect(() => {
        const unsubAccepted = on('order-accepted', (data) => {
            if (data.orderId === id) {
                setOrder(prev => ({ ...prev, status: 'accepted', estimatedReadyAt: data.estimatedReadyAt }));
                setRemainingSeconds(data.remainingSeconds);
                toast.success('Order accepted! Timer started.');
            }
        });

        const unsubReady = on('order-ready', (data) => {
            if (data.orderId === id) {
                setOrder(prev => ({ ...prev, status: 'ready' }));
                setRemainingSeconds(0);
                toast.success('🎉 Your order is ready for pickup!');
                // Play sound
                try {
                    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJiGfWZqf4KDeXV6enx2cXR4eHN0dnh4dXJzd3d1c3V3d3VzdXd3dXN1d3d1c3V3d3VzdXd3dXN1d3c=');
                    audio.play();
                } catch (e) { }
            }
        });

        const unsubSync = on('timer-sync', (data) => {
            if (data.orderId === id) {
                setRemainingSeconds(data.remainingSeconds);
            }
        });

        const unsubCancelled = on('order-cancelled', (data) => {
            if (data.orderId === id) {
                setOrder(prev => ({ ...prev, status: 'cancelled', cancellationReason: data.reason }));
                toast.error('Order was cancelled by outlet');
            }
        });

        return () => {
            unsubAccepted();
            unsubReady();
            unsubSync();
            unsubCancelled();
        };
    }, [id, on]);

    // Countdown timer
    useEffect(() => {
        if (remainingSeconds <= 0) return;

        const interval = setInterval(() => {
            setRemainingSeconds(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [remainingSeconds]);

    // Format time
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate progress
    const getProgress = () => {
        if (!order?.totalPrepTime || !remainingSeconds) return 0;
        const totalSeconds = order.totalPrepTime * 60;
        const elapsed = totalSeconds - remainingSeconds;
        return Math.min(100, (elapsed / totalSeconds) * 100);
    };

    // Get status info
    const getStatusInfo = () => {
        // Check if order is delayed (timer finished but still preparing)
        const isDelayed = remainingSeconds === 0 && ['accepted', 'preparing'].includes(order?.status);

        switch (order?.status) {
            case 'pending':
                return {
                    label: 'Waiting for outlet',
                    color: 'var(--warning)',
                    description: 'Your order is being reviewed by the outlet'
                };
            case 'accepted':
            case 'preparing':
                if (isDelayed) {
                    return {
                        label: 'Running Late',
                        color: 'var(--warning)',
                        description: "Sorry, your order is getting a little delayed. The outlet is working on it!"
                    };
                }
                return {
                    label: 'Preparing',
                    color: 'var(--secondary-500)',
                    description: 'Your food is being prepared'
                };
            case 'ready':
                return {
                    label: 'Ready for Pickup!',
                    color: 'var(--success)',
                    description: 'Head to the outlet to collect your order'
                };
            case 'completed':
                return {
                    label: 'Completed',
                    color: 'var(--text-muted)',
                    description: 'Order completed'
                };
            case 'cancelled':
                return {
                    label: 'Cancelled',
                    color: 'var(--error)',
                    description: order.cancellationReason || 'Order was cancelled'
                };
            default:
                return {
                    label: 'Processing',
                    color: 'var(--text-secondary)',
                    description: ''
                };
        }
    };

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!order) return null;

    const statusInfo = getStatusInfo();
    const progress = getProgress();
    const isActive = ['accepted', 'preparing'].includes(order.status);
    const isReady = order.status === 'ready';
    const isDelayed = remainingSeconds === 0 && isActive;
    const circumference = 2 * Math.PI * 90;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="container" style={{ paddingTop: 'var(--space-lg)', paddingBottom: 'var(--space-lg)' }}>
            {/* Header */}
            <button
                onClick={() => navigate('/orders')}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    color: 'var(--text-secondary)',
                    marginBottom: 'var(--space-lg)'
                }}
            >
                <ArrowLeft size={20} />
                All Orders
            </button>

            <div className={`order-tracking ${isReady ? 'animate-bounce' : ''}`}>
                {/* Timer */}
                <div className="timer-ring">
                    <svg width="200" height="200">
                        <circle
                            className="bg-circle"
                            cx="100"
                            cy="100"
                            r="90"
                        />
                        <circle
                            className="progress-circle"
                            cx="100"
                            cy="100"
                            r="90"
                            strokeDasharray={circumference}
                            strokeDashoffset={isActive ? strokeDashoffset : circumference}
                            style={{
                                stroke: isReady ? 'var(--success)' : 'var(--secondary-500)',
                                transition: 'stroke-dashoffset 1s linear'
                            }}
                        />
                    </svg>
                    <div className="timer-inner">
                        {isReady ? (
                            <CheckCircle size={48} style={{ color: 'var(--success)' }} />
                        ) : isActive ? (
                            <>
                                <span className="timer-time">{formatTime(remainingSeconds)}</span>
                                <span className="timer-label">remaining</span>
                            </>
                        ) : (
                            <span className="timer-time" style={{ fontSize: 'var(--font-size-3xl)' }}>
                                {order.status === 'pending' ? '⏳' : order.status === 'cancelled' ? '❌' : '✓'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Status Badge */}
                <div
                    className="order-status-badge badge"
                    style={{
                        background: `${statusInfo.color}20`,
                        color: statusInfo.color,
                        padding: '8px 16px',
                        fontSize: 'var(--font-size-base)'
                    }}
                >
                    {statusInfo.label}
                </div>

                <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-sm)' }}>
                    {statusInfo.description}
                </p>

                {/* Delay Notification with Contact */}
                {isDelayed && order.outlet?.contact?.phone && (
                    <div style={{
                        marginTop: 'var(--space-lg)',
                        padding: 'var(--space-md)',
                        background: 'var(--warning-bg)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--warning)',
                        textAlign: 'center'
                    }}>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
                            Need help? Contact the outlet directly:
                        </p>
                        <a
                            href={`tel:${order.outlet.contact.phone}`}
                            className="btn btn-secondary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)' }}
                        >
                            <Phone size={18} />
                            Call {order.outlet.contact.phone}
                        </a>
                    </div>
                )}

                {/* Order Ready Celebration */}
                {isReady && (
                    <div style={{
                        marginTop: 'var(--space-lg)',
                        padding: 'var(--space-md)',
                        background: 'var(--success-bg)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--success)',
                        textAlign: 'center'
                    }}>
                        <p style={{
                            fontSize: 'var(--font-size-lg)',
                            fontWeight: 700,
                            color: 'var(--success)',
                            marginBottom: 'var(--space-xs)'
                        }}>
                            🎉 Your order is ready!
                        </p>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                            Please come to collect it at the outlet counter.
                        </p>
                    </div>
                )}

                {/* Order Number */}
                <p style={{
                    marginTop: 'var(--space-lg)',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-muted)'
                }}>
                    Order #{order.orderNumber}
                </p>
            </div>

            {/* Order Details */}
            <div className={`order-details ${isReady ? 'order-ready' : ''}`}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: 'var(--space-md)'
                }}>
                    <div>
                        <h3 style={{ fontWeight: 600 }}>{order.outlet?.name}</h3>
                        {order.outlet?.location?.building && (
                            <p style={{
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                marginTop: 4
                            }}>
                                <MapPin size={14} />
                                {order.outlet.location.building}
                            </p>
                        )}
                    </div>

                    {order.outlet?.contact?.phone && (
                        <a
                            href={`tel:${order.outlet.contact.phone}`}
                            className="btn btn-ghost btn-icon"
                        >
                            <Phone size={20} />
                        </a>
                    )}
                </div>

                <div style={{
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: 'var(--space-md)'
                }}>
                    {order.items?.map((item, idx) => (
                        <div
                            key={idx}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: 'var(--space-xs) 0',
                                fontSize: 'var(--font-size-sm)'
                            }}
                        >
                            <span>{item.name} × {item.quantity}</span>
                            <span>₹{((item.price * item.quantity) / 100).toFixed(0)}</span>
                        </div>
                    ))}

                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginTop: 'var(--space-md)',
                        paddingTop: 'var(--space-md)',
                        borderTop: '1px solid var(--border-subtle)',
                        fontWeight: 700
                    }}>
                        <span>Total Paid</span>
                        <span style={{ color: 'var(--success)' }}>₹{(order.totalAmount / 100).toFixed(0)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderTracking;
