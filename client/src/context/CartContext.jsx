import { createContext, useContext, useState, useEffect } from 'react';

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

    // Load cart from localStorage
    useEffect(() => {
        const savedCart = localStorage.getItem('cart');
        const savedOutlet = localStorage.getItem('cartOutlet');

        if (savedCart) {
            setItems(JSON.parse(savedCart));
        }
        if (savedOutlet) {
            setOutlet(JSON.parse(savedOutlet));
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

    // Add item to cart
    const addItem = (item, outletInfo) => {
        // If cart has items from different outlet, clear it first
        if (outlet && outlet._id !== outletInfo._id) {
            if (!window.confirm('Your cart has items from another outlet. Clear cart and add this item?')) {
                return false;
            }
            setItems([]);
        }

        setOutlet(outletInfo);

        setItems(prev => {
            const existingIndex = prev.findIndex(i => i._id === item._id);

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
        setItems(prev => {
            const updated = prev.filter(i => i._id !== itemId);

            if (updated.length === 0) {
                setOutlet(null);
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
                item._id === itemId
                    ? { ...item, quantity }
                    : item
            )
        );
    };

    // Increment quantity
    const incrementQuantity = (itemId) => {
        setItems(prev =>
            prev.map(item =>
                item._id === itemId
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            )
        );
    };

    // Decrement quantity
    const decrementQuantity = (itemId) => {
        const item = items.find(i => i._id === itemId);
        if (item && item.quantity === 1) {
            removeItem(itemId);
        } else {
            setItems(prev =>
                prev.map(item =>
                    item._id === itemId
                        ? { ...item, quantity: item.quantity - 1 }
                        : item
                )
            );
        }
    };

    // Clear cart
    const clearCart = () => {
        setItems([]);
        setOutlet(null);
        localStorage.removeItem('cart');
        localStorage.removeItem('cartOutlet');
    };

    // Get item quantity
    const getItemQuantity = (itemId) => {
        const item = items.find(i => i._id === itemId);
        return item ? item.quantity : 0;
    };

    // Calculate totals
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const formattedSubtotal = `₹${(subtotal / 100).toFixed(2)}`;

    // Get max prep time
    const maxPrepTime = items.length > 0
        ? Math.max(...items.map(item => item.prepTime))
        : 0;

    const value = {
        items,
        outlet,
        itemCount,
        subtotal,
        formattedSubtotal,
        maxPrepTime,
        addItem,
        removeItem,
        updateQuantity,
        incrementQuantity,
        decrementQuantity,
        getItemQuantity,
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
