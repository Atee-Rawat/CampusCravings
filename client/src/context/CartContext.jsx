import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const CartContext = createContext(null);

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};

export const CartProvider = ({ children }) => {
    const [items, setItems] = useState([]);
    const [outlet, setOutlet] = useState(null);
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [discount, setDiscount] = useState(0);

    // Load cart from localStorage
    useEffect(() => {
        const savedCart = localStorage.getItem('cart');
        const savedOutlet = localStorage.getItem('cartOutlet');
        const savedCoupon = localStorage.getItem('cartCoupon');

        if (savedCart) {
            setItems(JSON.parse(savedCart));
        }
        if (savedOutlet) {
            setOutlet(JSON.parse(savedOutlet));
        }
        if (savedCoupon) {
            const couponData = JSON.parse(savedCoupon);
            setAppliedCoupon(couponData.coupon);
            setDiscount(couponData.discount);
        }
    }, []);

    // Save cart to localStorage
    useEffect(() => {
        if (items.length > 0) {
            localStorage.setItem('cart', JSON.stringify(items));
        } else {
            localStorage.removeItem('cart');
        }
    }, [items]);

    useEffect(() => {
        if (outlet) {
            localStorage.setItem('cartOutlet', JSON.stringify(outlet));
        } else {
            localStorage.removeItem('cartOutlet');
        }
    }, [outlet]);

    useEffect(() => {
        if (appliedCoupon && discount > 0) {
            localStorage.setItem('cartCoupon', JSON.stringify({ coupon: appliedCoupon, discount }));
        } else {
            localStorage.removeItem('cartCoupon');
        }
    }, [appliedCoupon, discount]);

    // Add item to cart
    const _getId = (x) => (x?._id || x?.id || (typeof x === 'string' ? x : null));

    const addItem = (item, outletInfo) => {
        const normalizedOutlet = outletInfo || item?.outlet || null;

        // If cart has items from different outlet, clear it first
        if (outlet && normalizedOutlet && _getId(outlet) !== _getId(normalizedOutlet)) {
            if (!window.confirm('Your cart has items from another outlet. Clear cart and add this item?')) {
                return false;
            }
            setItems([]);
            setAppliedCoupon(null);
            setDiscount(0);
        }

        setOutlet(normalizedOutlet);

        setItems(prev => {
            const existingIndex = prev.findIndex(i => _getId(i) === _getId(item));

            if (existingIndex > -1) {
                const updated = [...prev];
                updated[existingIndex] = {
                    ...updated[existingIndex],
                    quantity: updated[existingIndex].quantity + 1
                };
                return updated;
            }

            return [...prev, { ...item, quantity: 1 }];
        });

        return true;
    };

    // Remove item from cart
    const removeItem = (itemId) => {
        const idToRemove = _getId({ _id: itemId });
        setItems(prev => {
            const updated = prev.filter(i => _getId(i) !== idToRemove);

            if (updated.length === 0) {
                setOutlet(null);
                setAppliedCoupon(null);
                setDiscount(0);
            }

            return updated;
        });
    };

    // Update item quantity
    const updateQuantity = (itemId, quantity) => {
        if (quantity < 1) {
            removeItem(itemId);
            return;
        }

        setItems(prev =>
            prev.map(item =>
                _getId(item) === _getId({ _id: itemId })
                    ? { ...item, quantity }
                    : item
            )
        );
    };

    // Increment quantity
    const incrementQuantity = (itemId) => {
        setItems(prev =>
            prev.map(item =>
                _getId(item) === _getId({ _id: itemId })
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            )
        );
    };

    // Decrement quantity
    const decrementQuantity = (itemId) => {
        const item = items.find(i => _getId(i) === _getId({ _id: itemId }));
        if (item && item.quantity === 1) {
            removeItem(itemId);
        } else {
            setItems(prev =>
                prev.map(item =>
                    _getId(item) === _getId({ _id: itemId })
                        ? { ...item, quantity: item.quantity - 1 }
                        : item
                )
            );
        }
    };

    // Apply coupon
    const applyCoupon = async (code) => {
        if (!outlet) {
            toast.error('Cart is empty');
            return false;
        }

        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        try {
            const response = await api.get(`/menu/coupons/validate/${code}?outletId=${outlet._id}&orderAmount=${subtotal}`);

            setAppliedCoupon(response.data.data.coupon);
            setDiscount(response.data.data.discount);
            toast.success(`Coupon applied! You saved ₹${(response.data.data.discount / 100).toFixed(0)}`);
            return true;
        } catch (error) {
            toast.error(error.response?.data?.message || 'Invalid coupon code');
            return false;
        }
    };

    // Remove coupon
    const removeCoupon = () => {
        setAppliedCoupon(null);
        setDiscount(0);
        toast.success('Coupon removed');
    };

    // Clear cart
    const clearCart = () => {
        setItems([]);
        setOutlet(null);
        setAppliedCoupon(null);
        setDiscount(0);
        localStorage.removeItem('cart');
        localStorage.removeItem('cartOutlet');
        localStorage.removeItem('cartCoupon');
    };

    // Get item quantity
    const getItemQuantity = (itemId) => {
        const item = items.find(i => _getId(i) === _getId({ _id: itemId }));
        return item ? item.quantity : 0;
    };

    // Calculate totals
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const total = subtotal - discount;

    const formattedSubtotal = `₹${(subtotal / 100).toFixed(2)}`;
    const formattedDiscount = `₹${(discount / 100).toFixed(2)}`;
    const formattedTotal = `₹${(total / 100).toFixed(2)}`;

    // Get max prep time
    const maxPrepTime = items.length > 0
        ? Math.max(...items.map(item => item.prepTime))
        : 0;

    const value = {
        items,
        outlet,
        itemCount,
        subtotal,
        discount,
        total,
        formattedSubtotal,
        formattedDiscount,
        formattedTotal,
        maxPrepTime,
        appliedCoupon,
        addItem,
        removeItem,
        updateQuantity,
        incrementQuantity,
        decrementQuantity,
        getItemQuantity,
        applyCoupon,
        removeCoupon,
        clearCart,
        isEmpty: items.length === 0
    };

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
};

export default CartContext;
