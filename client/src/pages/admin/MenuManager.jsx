import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Clock } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const MenuManager = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        category: '',
        prepTime: '10',
        isVeg: true,
        isAvailable: true
    });

    const token = localStorage.getItem('adminToken');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    // Fetch menu items
    useEffect(() => {
        const fetchMenu = async () => {
            try {
                const response = await api.get('/admin/menu', config);
                setItems(response.data.data);
            } catch (error) {
                toast.error('Failed to load menu');
            } finally {
                setLoading(false);
            }
        };

        fetchMenu();
    }, []);

    // Group items by category
    const groupedItems = items.reduce((acc, item) => {
        const cat = item.category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    // Open modal for new item
    const openNewModal = () => {
        setEditingItem(null);
        setFormData({
            name: '',
            description: '',
            price: '',
            category: '',
            prepTime: '10',
            isVeg: true,
            isAvailable: true
        });
        setShowModal(true);
    };

    // Open modal for editing
    const openEditModal = (item) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            description: item.description || '',
            price: (item.price / 100).toString(),
            category: item.category,
            prepTime: item.prepTime.toString(),
            isVeg: item.isVeg,
            isAvailable: item.isAvailable
        });
        setShowModal(true);
    };

    // Handle form submit
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.price || !formData.category) {
            toast.error('Please fill in required fields');
            return;
        }

        const data = {
            ...formData,
            price: Math.round(parseFloat(formData.price) * 100), // Convert to paise
            prepTime: parseInt(formData.prepTime)
        };

        try {
            if (editingItem) {
                // Update
                const response = await api.put(`/admin/menu/${editingItem._id}`, data, config);
                setItems(prev => prev.map(i => i._id === editingItem._id ? response.data.data : i));
                toast.success('Item updated');
            } else {
                // Create
                const response = await api.post('/admin/menu', data, config);
                setItems(prev => [...prev, response.data.data]);
                toast.success('Item added');
            }

            setShowModal(false);
        } catch (error) {
            toast.error(error.message || 'Failed to save item');
        }
    };

    // Delete item
    const deleteItem = async (id) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;

        try {
            await api.delete(`/admin/menu/${id}`, config);
            setItems(prev => prev.filter(i => i._id !== id));
            toast.success('Item deleted');
        } catch (error) {
            toast.error('Failed to delete item');
        }
    };

    // Toggle availability
    const toggleAvailability = async (item) => {
        try {
            const response = await api.put(`/admin/menu/${item._id}`, {
                isAvailable: !item.isAvailable
            }, config);

            setItems(prev => prev.map(i => i._id === item._id ? response.data.data : i));
            toast.success(`Item ${response.data.data.isAvailable ? 'available' : 'unavailable'}`);
        } catch (error) {
            toast.error('Failed to update item');
        }
    };

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner"></div>
            </div>
        );
    }

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
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 4 }}>Menu Manager</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>{items.length} items</p>
                </div>

                <button className="btn btn-primary" onClick={openNewModal}>
                    <Plus size={20} />
                    Add Item
                </button>
            </div>

            {/* Menu Items */}
            {Object.keys(groupedItems).length === 0 ? (
                <div style={{
                    padding: 'var(--space-2xl)',
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-lg)',
                    textAlign: 'center'
                }}>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
                        No menu items yet
                    </p>
                    <button className="btn btn-primary" onClick={openNewModal}>
                        <Plus size={20} />
                        Add Your First Item
                    </button>
                </div>
            ) : (
                Object.entries(groupedItems).map(([category, categoryItems]) => (
                    <div key={category} style={{ marginBottom: 'var(--space-xl)' }}>
                        <h2 style={{
                            fontSize: 'var(--font-size-lg)',
                            fontWeight: 600,
                            marginBottom: 'var(--space-md)'
                        }}>
                            {category}
                        </h2>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: 'var(--space-md)'
                        }}>
                            {categoryItems.map(item => (
                                <div
                                    key={item._id}
                                    style={{
                                        padding: 'var(--space-md)',
                                        background: 'var(--bg-card)',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-subtle)',
                                        opacity: item.isAvailable ? 1 : 0.6
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        marginBottom: 'var(--space-sm)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                            <span className={`veg-indicator ${item.isVeg ? 'veg' : 'non-veg'}`}></span>
                                            <span style={{ fontWeight: 600 }}>{item.name}</span>
                                        </div>
                                        {!item.isAvailable && (
                                            <span className="badge badge-error">Unavailable</span>
                                        )}
                                    </div>

                                    {item.description && (
                                        <p style={{
                                            fontSize: 'var(--font-size-sm)',
                                            color: 'var(--text-secondary)',
                                            marginBottom: 'var(--space-sm)'
                                        }}>
                                            {item.description}
                                        </p>
                                    )}

                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 'var(--space-md)'
                                    }}>
                                        <span style={{ fontWeight: 700, color: 'var(--primary-500)' }}>
                                            ₹{(item.price / 100).toFixed(0)}
                                        </span>
                                        <span style={{
                                            fontSize: 'var(--font-size-sm)',
                                            color: 'var(--text-muted)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4
                                        }}>
                                            <Clock size={14} />
                                            {item.prepTime} mins
                                        </span>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        gap: 'var(--space-sm)',
                                        paddingTop: 'var(--space-sm)',
                                        borderTop: '1px solid var(--border-subtle)'
                                    }}>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            style={{ flex: 1 }}
                                            onClick={() => toggleAvailability(item)}
                                        >
                                            {item.isAvailable ? 'Mark Unavailable' : 'Mark Available'}
                                        </button>
                                        <button
                                            className="btn btn-ghost btn-icon btn-sm"
                                            onClick={() => openEditModal(item)}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            className="btn btn-ghost btn-icon btn-sm"
                                            style={{ color: 'var(--error)' }}
                                            onClick={() => deleteItem(item._id)}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}

            {/* Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: 'var(--space-md)'
                }}>
                    <div style={{
                        background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 'var(--space-xl)',
                        width: '100%',
                        maxWidth: 500,
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 'var(--space-lg)'
                        }}>
                            <h2 style={{ fontSize: 'var(--font-size-xl)' }}>
                                {editingItem ? 'Edit Item' : 'Add New Item'}
                            </h2>
                            <button onClick={() => setShowModal(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="input-group" style={{ marginBottom: 'var(--space-md)' }}>
                                <label className="input-label">Name *</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Item name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="input-group" style={{ marginBottom: 'var(--space-md)' }}>
                                <label className="input-label">Description</label>
                                <textarea
                                    className="input"
                                    rows={2}
                                    placeholder="Short description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    style={{ resize: 'none' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                                <div className="input-group">
                                    <label className="input-label">Price (₹) *</label>
                                    <input
                                        type="number"
                                        className="input"
                                        placeholder="25"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        min="1"
                                        step="0.01"
                                        required
                                    />
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Prep Time (mins) *</label>
                                    <input
                                        type="number"
                                        className="input"
                                        placeholder="10"
                                        value={formData.prepTime}
                                        onChange={(e) => setFormData({ ...formData, prepTime: e.target.value })}
                                        min="1"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="input-group" style={{ marginBottom: 'var(--space-md)' }}>
                                <label className="input-label">Category *</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g., Beverages, Snacks"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    required
                                />
                            </div>

                            <div style={{
                                display: 'flex',
                                gap: 'var(--space-lg)',
                                marginBottom: 'var(--space-lg)'
                            }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.isVeg}
                                        onChange={(e) => setFormData({ ...formData, isVeg: e.target.checked })}
                                        style={{ width: 20, height: 20 }}
                                    />
                                    Vegetarian
                                </label>

                                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.isAvailable}
                                        onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                                        style={{ width: 20, height: 20 }}
                                    />
                                    Available
                                </label>
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    style={{ flex: 1 }}
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                    {editingItem ? 'Save Changes' : 'Add Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MenuManager;
