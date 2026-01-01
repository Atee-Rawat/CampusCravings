import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, AlertCircle } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { ordersAPI, paymentsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const Checkout = () => {
    const navigate = useNavigate();
    const { items, outlet, subtotal, formattedSubtotal, maxPrepTime, clearCart, isEmpty } = useCart();
    const [loading, setLoading] = useState(false);
    const [specialInstructions, setSpecialInstructions] = useState('');

    if (isEmpty) {
        navigate('/cart');
        return null;
    }

    const handlePayment = async () => {
        setLoading(true);

        try {
            // 1. Create order
            const orderData = {
                outletId: outlet._id,
                items: items.map(item => ({
                    menuItemId: item._id,
                    quantity: item.quantity
                })),
                specialInstructions
            };

            const orderRes = await ordersAPI.create(orderData);
            const order = orderRes.data.data;

            // 2. Create Razorpay order
            const paymentRes = await paymentsAPI.createOrder(order._id);
            const { orderId, amount, currency, key } = paymentRes.data.data;

            // 3. Open Razorpay checkout
            const options = {
                key,
                amount,
                currency,
                name: 'CampusCravings',
                description: `Order at ${outlet.name}`,
                order_id: orderId,
                handler: async function (response) {
                    try {
                        // 4. Verify payment
                        const verifyRes = await paymentsAPI.verify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        });

                        if (verifyRes.data.success) {
                            toast.success('Payment successful!');
                            clearCart();
                            navigate(`/order/${order._id}`);
                        }
                    } catch (error) {
                        toast.error('Payment verification failed');
                    }
                },
                prefill: {
                    name: '',
                    email: '',
                    contact: ''
                },
                theme: {
                    color: '#FF6B35'
                },
                modal: {
                    ondismiss: function () {
                        setLoading(false);
                        toast.error('Payment cancelled');
                    }
                }
            };

            // Check if Razorpay is loaded
            if (window.Razorpay) {
                const razorpay = new window.Razorpay(options);
                razorpay.open();
            } else {
                // For development without Razorpay
                toast.success('Demo: Order placed successfully!');
                clearCart();
                navigate(`/order/${order._id}`);
            }

        } catch (error) {
            toast.error(error.message || 'Failed to create order');
            setLoading(false);
        }
    };

    // Demo payment for testing
    const handleDemoPayment = async () => {
        setLoading(true);

        try {
            const orderData = {
                outletId: outlet._id,
                items: items.map(item => ({
                    menuItemId: item._id,
                    quantity: item.quantity
                })),
                specialInstructions
            };

            const orderRes = await ordersAPI.create(orderData);
            const order = orderRes.data.data;

            // Simulate payment success
            toast.success('Demo payment successful!');
            clearCart();
            navigate(`/order/${order._id}`);

        } catch (error) {
            toast.error(error.message || 'Failed to create order');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ paddingTop: 'var(--space-lg)', paddingBottom: 180 }}>
            {/* Header */}
            <button
                onClick={() => navigate(-1)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    color: 'var(--text-secondary)',
                    marginBottom: 'var(--space-lg)'
                }}
            >
                <ArrowLeft size={20} />
                Back to Cart
            </button>

            <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--space-lg)' }}>
                Checkout
            </h1>

            {/* Order Summary */}
            <div style={{
                padding: 'var(--space-lg)',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                marginBottom: 'var(--space-lg)'
            }}>
                <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-md)' }}>
                    Order Summary
                </h2>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-md)',
                    paddingBottom: 'var(--space-md)',
                    borderBottom: '1px solid var(--border-subtle)',
                    marginBottom: 'var(--space-md)'
                }}>
                    <span style={{ fontSize: '1.5rem' }}>🍽️</span>
                    <div>
                        <p style={{ fontWeight: 600 }}>{outlet.name}</p>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                            {items.length} {items.length === 1 ? 'item' : 'items'}
                        </p>
                    </div>
                </div>

                {items.map(item => (
                    <div
                        key={item._id}
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: 'var(--space-sm) 0',
                            fontSize: 'var(--font-size-sm)'
                        }}
                    >
                        <span>
                            {item.name} × {item.quantity}
                        </span>
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
                    <span>Total</span>
                    <span style={{ color: 'var(--primary-500)' }}>{formattedSubtotal}</span>
                </div>
            </div>

            {/* Prep Time */}
            <div style={{
                padding: 'var(--space-md)',
                background: 'rgba(0, 180, 162, 0.15)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-lg)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-md)'
            }}>
                <span style={{ fontSize: '1.5rem' }}>⏱️</span>
                <div>
                    <p style={{ fontWeight: 600, color: 'var(--secondary-500)' }}>
                        Expected ready in ~{maxPrepTime} mins
                    </p>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                        Timer starts when outlet accepts your order
                    </p>
                </div>
            </div>

            {/* Special Instructions */}
            <div className="input-group" style={{ marginBottom: 'var(--space-lg)' }}>
                <label className="input-label">Special Instructions (Optional)</label>
                <textarea
                    className="input"
                    rows={3}
                    placeholder="Any special requests? (e.g., less spicy, no onions)"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    maxLength={200}
                    style={{ resize: 'none' }}
                />
            </div>

            {/* Payment Warning */}
            <div style={{
                padding: 'var(--space-md)',
                background: 'var(--warning-bg)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--warning)',
                marginBottom: 'var(--space-lg)',
                display: 'flex',
                gap: 'var(--space-sm)'
            }}>
                <AlertCircle size={20} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                    Payment is non-refundable once the outlet accepts your order.
                    Make sure all items are correct before proceeding.
                </p>
            </div>

            {/* Payment Button */}
            <div className="cart-summary">
                <button
                    className="btn btn-primary btn-block btn-lg"
                    onClick={handleDemoPayment}
                    disabled={loading}
                >
                    {loading ? (
                        <span className="spinner" style={{ width: 24, height: 24 }}></span>
                    ) : (
                        <>
                            <CreditCard size={20} />
                            Pay {formattedSubtotal}
                        </>
                    )}
                </button>

                <p style={{
                    textAlign: 'center',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-muted)',
                    marginTop: 'var(--space-sm)'
                }}>
                    Secure payment powered by Razorpay (Demo Mode)
                </p>
            </div>
        </div>
    );
};

export default Checkout;
