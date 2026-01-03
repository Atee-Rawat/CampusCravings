import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Tag, Percent, DollarSign, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const Coupons = () => {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);
    const [formData, setFormData] = useState({
        code: '',
        description: '',
        discountType: 'percentage',
        discountValue: '',
        minOrderAmount: '',
        maxDiscount: '',
        usageLimit: '',
        expiresAt: ''
    });

    const token = localStorage.getItem('adminToken');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    // Fetch coupons
    useEffect(() => {
        const fetchCoupons = async () => {
            try {
                const response = await api.get('/admin/coupons', config);
                setCoupons(response.data.data);
            } catch (error) {
                toast.error('Failed to load coupons');
            } finally {
                setLoading(false);
            }
        };

        fetchCoupons();
    }, []);

    // Open modal for new coupon
    const openNewModal = () => {
        setEditingCoupon(null);
        setFormData({
            code: '',
            description: '',
            discountType: 'percentage',
            discountValue: '',
            minOrderAmount: '',
            maxDiscount: '',
            usageLimit: '',
            expiresAt: ''
        });
        setShowModal(true);
    };

    // Open modal for editing
    const openEditModal = (coupon) => {
        setEditingCoupon(coupon);
        setFormData({
            code: coupon.code,
            description: coupon.description || '',
            discountType: coupon.discountType,
            discountValue: coupon.discountValue.toString(),
            minOrderAmount: coupon.minOrderAmount ? (coupon.minOrderAmount / 100).toString() : '',
            maxDiscount: coupon.maxDiscount ? (coupon.maxDiscount / 100).toString() : '',
            usageLimit: coupon.usageLimit?.toString() || '',
            expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().split('T')[0] : ''
        });
        setShowModal(true);
    };

    // Handle form submit
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.code || !formData.discountValue) {
            toast.error('Please fill in required fields');
            return;
        }

        const data = {
            code: formData.code,
            description: formData.description,
            discountType: formData.discountType,
            discountValue: parseInt(formData.discountValue),
            minOrderAmount: formData.minOrderAmount ? Math.round(parseFloat(formData.minOrderAmount) * 100) : 0,
            maxDiscount: formData.maxDiscount ? Math.round(parseFloat(formData.maxDiscount) * 100) : null,
            usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
            expiresAt: formData.expiresAt || null
        };

        try {
            if (editingCoupon) {
                // Update
                const response = await api.put(`/admin/coupons/${editingCoupon._id}`, data, config);
                setCoupons(prev => prev.map(c => c._id === editingCoupon._id ? response.data.data : c));
                toast.success('Coupon updated');
            } else {
                // Create
                const response = await api.post('/admin/coupons', data, config);
                setCoupons(prev => [response.data.data, ...prev]);
                toast.success('Coupon created');
            }

            setShowModal(false);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save coupon');
        }
    };

    // Delete coupon
    const deleteCoupon = async (id) => {
        if (!window.confirm('Are you sure you want to delete this coupon?')) return;

        try {
            await api.delete(`/admin/coupons/${id}`, config);
            setCoupons(prev => prev.filter(c => c._id !== id));
            toast.success('Coupon deleted');
        } catch (error) {
            toast.error('Failed to delete coupon');
        }
    };

    // Toggle active status
    const toggleActive = async (coupon) => {
        try {
            const response = await api.put(`/admin/coupons/${coupon._id}`, {
                isActive: !coupon.isActive
            }, config);

            setCoupons(prev => prev.map(c => c._id === coupon._id ? response.data.data : c));
            toast.success(`Coupon ${response.data.data.isActive ? 'activated' : 'deactivated'}`);
        } catch (error) {
            toast.error('Failed to update coupon');
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
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 4 }}>Coupons</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>{coupons.length} coupons</p>
                </div>

                <button className="btn btn-primary" onClick={openNewModal}>
                    <Plus size={20} />
                    Create Coupon
                </button>
            </div>

            {/* Coupons List */}
            {coupons.length === 0 ? (
                <div style={{
                    padding: 'var(--space-2xl)',
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-lg)',
                    textAlign: 'center'
                }}>
                    <Tag size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }} />
                    <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
                        No coupons yet
                    </p>
                    <button className="btn btn-primary" onClick={openNewModal}>
                        <Plus size={20} />
                        Create Your First Coupon
                    </button>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: 'var(--space-md)'
                }}>
                    {coupons.map(coupon => (
                        <CouponCard
                            key={coupon._id}
                            coupon={coupon}
                            onEdit={() => openEditModal(coupon)}
                            onDelete={() => deleteCoupon(coupon._id)}
                            onToggle={() => toggleActive(coupon)}
                        />
                    ))}
                </div>
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
                                {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
                            </h2>
                            <button onClick={() => setShowModal(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="input-group" style={{ marginBottom: 'var(--space-md)' }}>
                                <label className="input-label">Coupon Code *</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g., SAVE10"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    disabled={!!editingCoupon}
                                    required
                                    style={{ textTransform: 'uppercase' }}
                                />
                            </div>

                            <div className="input-group" style={{ marginBottom: 'var(--space-md)' }}>
                                <label className="input-label">Description</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g., Get 10% off on your order"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                                <div className="input-group">
                                    <label className="input-label">Discount Type *</label>
                                    <select
                                        className="input"
                                        value={formData.discountType}
                                        onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                                    >
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="flat">Flat (₹)</option>
                                    </select>
                                </div>

                                <div className="input-group">
                                    <label className="input-label">
                                        Discount Value * {formData.discountType === 'percentage' ? '(%)' : '(₹)'}
                                    </label>
                                    <input
                                        type="number"
                                        className="input"
                                        placeholder={formData.discountType === 'percentage' ? '10' : '50'}
                                        value={formData.discountValue}
                                        onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                                        min="1"
                                        max={formData.discountType === 'percentage' ? '100' : undefined}
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                                <div className="input-group">
                                    <label className="input-label">Min Order (₹)</label>
                                    <input
                                        type="number"
                                        className="input"
                                        placeholder="100"
                                        value={formData.minOrderAmount}
                                        onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                                        min="0"
                                    />
                                </div>

                                {formData.discountType === 'percentage' && (
                                    <div className="input-group">
                                        <label className="input-label">Max Discount (₹)</label>
                                        <input
                                            type="number"
                                            className="input"
                                            placeholder="50"
                                            value={formData.maxDiscount}
                                            onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                                            min="0"
                                        />
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                                <div className="input-group">
                                    <label className="input-label">Usage Limit</label>
                                    <input
                                        type="number"
                                        className="input"
                                        placeholder="Unlimited"
                                        value={formData.usageLimit}
                                        onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                                        min="1"
                                    />
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Expires On</label>
                                    <input
                                        type="date"
                                        className="input"
                                        value={formData.expiresAt}
                                        onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
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
                                    {editingCoupon ? 'Save Changes' : 'Create Coupon'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// Coupon Card Component
const CouponCard = ({ coupon, onEdit, onDelete, onToggle }) => {
    const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
    const isLimitReached = coupon.usageLimit && coupon.usedCount >= coupon.usageLimit;
    const isInactive = !coupon.isActive || isExpired || isLimitReached;

    return (
        <div style={{
            padding: 'var(--space-lg)',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            opacity: isInactive ? 0.6 : 1
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 'var(--space-md)'
            }}>
                <div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-sm)',
                        marginBottom: 4
                    }}>
                        <span style={{
                            padding: '4px 12px',
                            background: 'var(--primary-500)',
                            color: 'white',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 700,
                            fontSize: 'var(--font-size-lg)',
                            letterSpacing: 1
                        }}>
                            {coupon.code}
                        </span>
                        {isExpired && <span className="badge badge-error">Expired</span>}
                        {isLimitReached && <span className="badge badge-warning">Limit Reached</span>}
                    </div>
                    {coupon.description && (
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                            {coupon.description}
                        </p>
                    )}
                </div>

                <button
                    onClick={onToggle}
                    style={{ color: coupon.isActive ? 'var(--success)' : 'var(--text-muted)' }}
                    title={coupon.isActive ? 'Deactivate' : 'Activate'}
                >
                    {coupon.isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                </button>
            </div>

            {/* Discount Info */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                marginBottom: 'var(--space-md)',
                padding: 'var(--space-sm)',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm)'
            }}>
                {coupon.discountType === 'percentage' ? (
                    <>
                        <Percent size={18} style={{ color: 'var(--primary-500)' }} />
                        <span style={{ fontWeight: 600 }}>{coupon.discountValue}% OFF</span>
                        {coupon.maxDiscount && (
                            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
                                (up to ₹{coupon.maxDiscount / 100})
                            </span>
                        )}
                    </>
                ) : (
                    <>
                        <DollarSign size={18} style={{ color: 'var(--success)' }} />
                        <span style={{ fontWeight: 600 }}>₹{coupon.discountValue} OFF</span>
                    </>
                )}
            </div>

            {/* Details */}
            <div style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--text-muted)',
                marginBottom: 'var(--space-md)'
            }}>
                {coupon.minOrderAmount > 0 && (
                    <p>Min order: ₹{coupon.minOrderAmount / 100}</p>
                )}
                {coupon.usageLimit && (
                    <p>Uses: {coupon.usedCount}/{coupon.usageLimit}</p>
                )}
                {coupon.expiresAt && (
                    <p>Expires: {new Date(coupon.expiresAt).toLocaleDateString('en-IN')}</p>
                )}
            </div>

            {/* Actions */}
            <div style={{
                display: 'flex',
                gap: 'var(--space-sm)',
                paddingTop: 'var(--space-sm)',
                borderTop: '1px solid var(--border-subtle)'
            }}>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={onEdit}>
                    <Edit2 size={16} /> Edit
                </button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={onDelete}>
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
};

export default Coupons;
