import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag, Tag, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';

const getId = (value) => value?._id || value?.id || value || null;

const Cart = () => {
    const navigate = useNavigate();
    const {
        items,
        outlet,
        formattedSubtotal,
        formattedDiscount,
        formattedTotal,
        discount,
        maxPrepTime,
        appliedCoupon,
        incrementQuantity,
        decrementQuantity,
        removeItem,
        clearCart,
        applyCoupon,
        removeCoupon,
        isEmpty
    } = useCart();

    const [couponCode, setCouponCode] = useState('');
    const [applying, setApplying] = useState(false);

    const formatPrice = (price) => `₹${(price / 100).toFixed(0)}`;

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;

        setApplying(true);
        const success = await applyCoupon(couponCode.trim());
        setApplying(false);

        if (success) {
            setCouponCode('');
        }
    };

    if (isEmpty) {
        return (
            <div className="container" style={{ paddingTop: 'var(--space-lg)' }}>
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
                    Back
                </button>

                <div className="empty-state" style={{ marginTop: 'var(--space-2xl)' }}>
                    <ShoppingBag size={64} className="empty-state-icon" />
                    <h2 className="empty-state-title">Your cart is empty</h2>
                    <p className="empty-state-text">
                        Add some delicious items from your favorite outlets!
                    </p>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/')}
                        style={{ marginTop: 'var(--space-lg)' }}
                    >
                        Browse Outlets
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingTop: 'var(--space-lg)', paddingBottom: 140 }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-lg)'
            }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-sm)',
                        color: 'var(--text-secondary)'
                    }}
                >
                    <ArrowLeft size={20} />
                    Back
                </button>

                <button
                    onClick={clearCart}
                    style={{ color: 'var(--error)', fontSize: 'var(--font-size-sm)' }}
                >
                    Clear Cart
                </button>
            </div>

            <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--space-lg)' }}>
                Your Cart
            </h1>

            {/* Outlet Info */}
            {outlet && (
                <div style={{
                    padding: 'var(--space-md)',
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-md)'
                }}>
                    <span style={{ fontSize: '2rem' }}>🍽️</span>
                    <div>
                        <p style={{ fontWeight: 600 }}>{outlet.name}</p>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                            {outlet.cuisineType}
                        </p>
                    </div>
                </div>
            )}

            {/* Cart Items */}
            <div style={{ marginBottom: 'var(--space-lg)' }}>
                {items.map(item => (
                    <div key={getId(item)} className="cart-item">
                        <div className="cart-item-info">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                <span className={`veg-indicator ${item.isVeg ? 'veg' : 'non-veg'}`}></span>
                                <span className="cart-item-name">{item.name}</span>
                            </div>
                            <p className="cart-item-price">
                                {formatPrice(item.price)} × {item.quantity} = {formatPrice(item.price * item.quantity)}
                            </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                            <div className="quantity-control">
                                <button
                                    className="quantity-btn"
                                    onClick={() => decrementQuantity(getId(item))}
                                >
                                    <Minus size={16} />
                                </button>
                                <span className="quantity-value">{item.quantity}</span>
                                <button
                                    className="quantity-btn"
                                    onClick={() => incrementQuantity(getId(item))}
                                >
                                    <Plus size={16} />
                                </button>
                            </div>

                            <button
                                onClick={() => removeItem(getId(item))}
                                style={{ color: 'var(--error)', padding: 8 }}
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Coupon Section */}
            <div style={{
                padding: 'var(--space-md)',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-lg)',
                border: '1px solid var(--border-subtle)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                    <Tag size={18} style={{ color: 'var(--primary-500)' }} />
                    <span style={{ fontWeight: 600 }}>Apply Coupon</span>
                </div>

                {appliedCoupon ? (
                    <div style={{
                        padding: 'var(--space-sm) var(--space-md)',
                        background: 'var(--success-bg)',
                        border: '1px solid var(--success)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <p style={{ fontWeight: 600, color: 'var(--success)' }}>{appliedCoupon.code}</p>
                            {appliedCoupon.description && (
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                    {appliedCoupon.description}
                                </p>
                            )}
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--success)', marginTop: 4 }}>
                                Saved {formatPrice(discount)}!
                            </p>
                        </div>
                        <button
                            onClick={removeCoupon}
                            style={{ color: 'var(--error)', padding: 8 }}
                        >
                            <X size={20} />
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                        <input
                            type="text"
                            className="input"
                            placeholder="Enter coupon code"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            onKeyPress={(e) => e.key === 'Enter' && handleApplyCoupon()}
                            style={{ flex: 1, textTransform: 'uppercase' }}
                        />
                        <button
                            className="btn btn-primary"
                            onClick={handleApplyCoupon}
                            disabled={!couponCode.trim() || applying}
                        >
                            {applying ? 'Applying...' : 'Apply'}
                        </button>
                    </div>
                )}
            </div>

            {/* Prep Time Note */}
            <div style={{
                padding: 'var(--space-md)',
                background: 'var(--warning-bg)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--warning)',
                marginBottom: 'var(--space-lg)'
            }}>
                <p style={{ color: 'var(--warning)', fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>
                    ⏱️ Estimated preparation time: ~{maxPrepTime} minutes
                </p>
            </div>

            {/* Cart Summary - Fixed at bottom */}
            <div className="cart-summary">
                <div style={{ marginBottom: 'var(--space-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                        <span>{formattedSubtotal}</span>
                    </div>
                    {discount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
                            <span style={{ color: 'var(--success)' }}>Discount</span>
                            <span style={{ color: 'var(--success)' }}>- {formattedDiscount}</span>
                        </div>
                    )}
                    <div className="cart-total" style={{ paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--border-subtle)' }}>
                        <span className="cart-total-label">Total</span>
                        <span className="cart-total-value">{formattedTotal}</span>
                    </div>
                </div>

                <button
                    className="btn btn-primary btn-block btn-lg"
                    onClick={() => navigate('/checkout')}
                >
                    Proceed to Checkout
                </button>
            </div>
        </div>
    );
};

export default Cart;
