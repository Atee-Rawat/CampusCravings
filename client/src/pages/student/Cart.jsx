import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '../../context/CartContext';

const Cart = () => {
    const navigate = useNavigate();
    const {
        items,
        outlet,
        formattedSubtotal,
        subtotal,
        maxPrepTime,
        incrementQuantity,
        decrementQuantity,
        removeItem,
        clearCart,
        isEmpty
    } = useCart();

    const formatPrice = (price) => `₹${(price / 100).toFixed(0)}`;

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
        <div className="container" style={{ paddingTop: 'var(--space-lg)', paddingBottom: 180 }}>
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
                    <div key={item._id} className="cart-item">
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
                                    onClick={() => decrementQuantity(item._id)}
                                >
                                    <Minus size={16} />
                                </button>
                                <span className="quantity-value">{item.quantity}</span>
                                <button
                                    className="quantity-btn"
                                    onClick={() => incrementQuantity(item._id)}
                                >
                                    <Plus size={16} />
                                </button>
                            </div>

                            <button
                                onClick={() => removeItem(item._id)}
                                style={{ color: 'var(--error)', padding: 8 }}
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
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
                <div className="cart-total">
                    <span className="cart-total-label">Total</span>
                    <span className="cart-total-value">{formattedSubtotal}</span>
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
