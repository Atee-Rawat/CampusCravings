import { useState, useEffect } from 'react';
import { X, Plus, Minus, ShoppingBag } from 'lucide-react';
import api, { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

const OfflineOrderModal = ({ isOpen, onClose, onOrderCreated }) => {
    const [menuItems, setMenuItems] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);

    // Fetch menu items
    useEffect(() => {
        if (isOpen) {
            const fetchMenu = async () => {
                setLoading(true);
                try {
                    const token = localStorage.getItem('adminToken');
                    const response = await api.get('/admin/menu', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setMenuItems(response.data.data.filter(item => item.isAvailable));
                } catch (error) {
                    toast.error('Failed to load menu');
                } finally {
                    setLoading(false);
                }
            };
            fetchMenu();
        }
    }, [isOpen]);

    // Add item to order
    const addItem = (item) => {
        const existing = selectedItems.find(i => i.menuItemId === item._id);
        if (existing) {
            setSelectedItems(prev => prev.map(i =>
                i.menuItemId === item._id
                    ? { ...i, quantity: i.quantity + 1 }
                    : i
            ));
        } else {
            setSelectedItems(prev => [...prev, {
                menuItemId: item._id,
                name: item.name,
                price: item.price,
                quantity: 1
            }]);
        }
    };

    // Remove item from order
    const removeItem = (menuItemId) => {
        const existing = selectedItems.find(i => i.menuItemId === menuItemId);
        if (existing && existing.quantity > 1) {
            setSelectedItems(prev => prev.map(i =>
                i.menuItemId === menuItemId
                    ? { ...i, quantity: i.quantity - 1 }
                    : i
            ));
        } else {
            setSelectedItems(prev => prev.filter(i => i.menuItemId !== menuItemId));
        }
    };

    // Calculate total
    const total = selectedItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    // Create offline order
    const handleCreate = async () => {
        if (selectedItems.length === 0) {
            toast.error('Please add at least one item');
            return;
        }
        setCreating(true);
        try {
            const response = await adminAPI.createOfflineOrder({
                items: selectedItems.map(i => ({
                    menuItemId: i.menuItemId,
                    quantity: i.quantity
                })),
                customerName: customerName || 'Walk-in',
                customerPhone
            });

            toast.success(
                <div>
                    <strong>Offline Order Created!</strong>
                    <br />
                    Token: #{response.data.data.tokenNumber}
                    <br />
                    PIN: {response.data.data.pickupPIN}
                </div>,
                { duration: 5000 }
            );

            // Reset form
            setSelectedItems([]);
            setCustomerName('');
            setCustomerPhone('');
            onOrderCreated?.();
            onClose();
        } catch (error) {
            toast.error(error.message || 'Failed to create order');
        } finally {
            setCreating(false);
        }
    };

    if (!isOpen) return null;

    // Group menu items by category
    const categories = [...new Set(menuItems.map(i => i.category))];

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--space-lg)'
        }} onClick={onClose}>
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                maxWidth: 600,
                width: '100%',
                maxHeight: '90vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{
                    padding: 'var(--space-lg)',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <ShoppingBag size={24} style={{ color: 'var(--primary-500)' }} />
                        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600 }}>New Offline Order</h2>
                    </div>
                    <button onClick={onClose} className="btn btn-ghost btn-icon">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-lg)' }}>
                    {/* Customer Info (Optional) */}
                    <div style={{ marginBottom: 'var(--space-lg)' }}>
                        <h3 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
                            Customer Info (Optional)
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                            <input
                                type="text"
                                placeholder="Name"
                                value={customerName}
                                onChange={e => setCustomerName(e.target.value)}
                                style={{
                                    padding: 'var(--space-sm)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: 'var(--radius-md)',
                                    background: 'var(--bg-elevated)'
                                }}
                            />
                            <input
                                type="tel"
                                placeholder="Phone"
                                value={customerPhone}
                                onChange={e => setCustomerPhone(e.target.value)}
                                style={{
                                    padding: 'var(--space-sm)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: 'var(--radius-md)',
                                    background: 'var(--bg-elevated)'
                                }}
                            />
                        </div>
                    </div>

                    {/* Menu Items */}
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                            <div className="spinner"></div>
                        </div>
                    ) : (
                        categories.map(category => (
                            <div key={category} style={{ marginBottom: 'var(--space-lg)' }}>
                                <h3 style={{
                                    fontSize: 'var(--font-size-sm)',
                                    color: 'var(--text-secondary)',
                                    marginBottom: 'var(--space-sm)',
                                    textTransform: 'uppercase',
                                    letterSpacing: 1
                                }}>{category}</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                                    {menuItems.filter(i => i.category === category).map(item => {
                                        const selected = selectedItems.find(s => s.menuItemId === item._id);
                                        return (
                                            <div key={item._id} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: 'var(--space-sm)',
                                                background: selected ? 'var(--primary-500)10' : 'var(--bg-elevated)',
                                                borderRadius: 'var(--radius-md)',
                                                border: selected ? '1px solid var(--primary-500)' : '1px solid transparent'
                                            }}>
                                                <div>
                                                    <span style={{ fontWeight: 500 }}>{item.name}</span>
                                                    <span style={{
                                                        marginLeft: 'var(--space-sm)',
                                                        color: 'var(--text-secondary)'
                                                    }}>₹{(item.price / 100).toFixed(0)}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                                                    {selected && (
                                                        <>
                                                            <button
                                                                onClick={() => removeItem(item._id)}
                                                                className="btn btn-ghost btn-icon"
                                                                style={{ padding: 4 }}
                                                            >
                                                                <Minus size={16} />
                                                            </button>
                                                            <span style={{ fontWeight: 600, minWidth: 20, textAlign: 'center' }}>
                                                                {selected.quantity}
                                                            </span>
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={() => addItem(item)}
                                                        className="btn btn-ghost btn-icon"
                                                        style={{ padding: 4 }}
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer / Cart Summary */}
                {selectedItems.length > 0 && (
                    <div style={{
                        padding: 'var(--space-lg)',
                        borderTop: '1px solid var(--border-subtle)',
                        background: 'var(--bg-elevated)'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: 'var(--space-md)'
                        }}>
                            <span style={{ fontWeight: 600 }}>
                                {selectedItems.reduce((sum, i) => sum + i.quantity, 0)} items
                            </span>
                            <span style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)' }}>
                                ₹{(total / 100).toFixed(0)}
                            </span>
                        </div>
                        <button
                            onClick={handleCreate}
                            disabled={creating}
                            className="btn btn-primary"
                            style={{ width: '100%', padding: 'var(--space-md)' }}
                        >
                            {creating ? 'Creating...' : 'Create Order (Cash)'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OfflineOrderModal;
