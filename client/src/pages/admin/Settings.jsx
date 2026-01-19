import { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, X, Store, Edit2, Save } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const Settings = () => {
    const [outlet, setOutlet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        cuisineType: '',
        location: { building: '', landmark: '' },
        operatingHours: { open: '', close: '' },
        contact: { phone: '', email: '' }
    });

    const token = localStorage.getItem('adminToken');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    // Fetch outlet data
    useEffect(() => {
        const fetchOutlet = async () => {
            try {
                const response = await api.get('/admin/dashboard', config);
                const outletData = response.data.data.outlet;
                setOutlet(outletData);
                // Initialize form data
                setFormData({
                    name: outletData.name || '',
                    description: outletData.description || '',
                    cuisineType: outletData.cuisineType || '',
                    location: {
                        building: outletData.location?.building || '',
                        landmark: outletData.location?.landmark || ''
                    },
                    operatingHours: {
                        open: outletData.operatingHours?.open || '09:00',
                        close: outletData.operatingHours?.close || '21:00'
                    },
                    contact: {
                        phone: outletData.contact?.phone || '',
                        email: outletData.contact?.email || ''
                    }
                });
            } catch (error) {
                toast.error('Failed to load outlet data');
            } finally {
                setLoading(false);
            }
        };

        fetchOutlet();
    }, []);

    // Upload outlet cover image
    const uploadImage = async (file) => {
        setUploading(true);
        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await api.post('/admin/upload/outlet-image', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            setOutlet(prev => ({ ...prev, coverImage: response.data.data.imageUrl }));
            toast.success('Outlet image uploaded!');
        } catch (error) {
            toast.error('Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    // Handle file change
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Image must be less than 5MB');
                return;
            }
            uploadImage(file);
        }
    };

    // Start editing
    const handleEdit = () => {
        setIsEditing(true);
    };

    // Cancel editing
    const handleCancel = () => {
        setIsEditing(false);
        // Reset form data to outlet values
        setFormData({
            name: outlet.name || '',
            description: outlet.description || '',
            cuisineType: outlet.cuisineType || '',
            location: {
                building: outlet.location?.building || '',
                landmark: outlet.location?.landmark || ''
            },
            operatingHours: {
                open: outlet.operatingHours?.open || '09:00',
                close: outlet.operatingHours?.close || '21:00'
            },
            contact: {
                phone: outlet.contact?.phone || '',
                email: outlet.contact?.email || ''
            }
        });
    };

    // Save changes
    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await api.put('/admin/outlet', formData, config);
            setOutlet(response.data.data.outlet);
            setIsEditing(false);
            toast.success('Outlet information updated!');
        } catch (error) {
            toast.error(error.message || 'Failed to update outlet');
        } finally {
            setSaving(false);
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
                <h1 style={{ fontSize: 'var(--font-size-2xl)' }}>
                    Outlet Settings
                </h1>
                {!isEditing && (
                    <button className="btn btn-primary" onClick={handleEdit}>
                        <Edit2 size={18} />
                        Edit Outlet Info
                    </button>
                )}
            </div>

            {/* Outlet Info Card */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-xl)',
                marginBottom: 'var(--space-xl)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                    <Store size={24} style={{ color: 'var(--primary-500)' }} />
                    <h2 style={{ fontSize: 'var(--font-size-lg)' }}>{outlet?.name}</h2>
                </div>

                {/* Cover Image Section */}
                <div>
                    <h3 style={{ fontSize: 'var(--font-size-md)', marginBottom: 'var(--space-md)' }}>
                        Cover Image
                    </h3>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                        This image will be displayed on your outlet card in the student app.
                    </p>

                    <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                        {/* Cover Image */}
                        <div style={{
                            width: '100%',
                            maxWidth: 400,
                            height: 200,
                            borderRadius: 'var(--radius-md)',
                            background: outlet?.coverImage ? `url(${outlet.coverImage}) center/cover` : 'var(--bg-elevated)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            border: '2px dashed var(--border-light)'
                        }}>
                            {!outlet?.coverImage && (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <ImageIcon size={48} style={{ marginBottom: 'var(--space-sm)' }} />
                                    <p>No cover image</p>
                                </div>
                            )}

                            {/* Upload overlay */}
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                background: outlet?.coverImage ? 'rgba(0,0,0,0.5)' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 'var(--radius-md)',
                                opacity: outlet?.coverImage ? 0 : 1,
                                transition: 'opacity 0.2s'
                            }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = outlet?.coverImage ? 0 : 1}
                            >
                                <label style={{ cursor: uploading ? 'wait' : 'pointer' }}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={handleFileChange}
                                        disabled={uploading}
                                    />
                                    <div className="btn btn-primary" style={{ pointerEvents: 'none' }}>
                                        <Upload size={18} />
                                        {uploading ? 'Uploading...' : outlet?.coverImage ? 'Change Image' : 'Upload Image'}
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Company Logo */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <img
                                src="/CC_logo.png"
                                alt="CampusCravings Logo"
                                style={{
                                    height: '250px',
                                    width: 'auto',
                                    objectFit: 'contain'
                                }}
                            />
                        </div>
                    </div>

                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>
                        Recommended: 800x600 pixels, max 5MB (JPEG, PNG, WebP)
                    </p>
                </div>

                {/* Outlet Information */}
                <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-xl)'
                }}>
                    <h3 style={{ fontSize: 'var(--font-size-md)', marginBottom: 'var(--space-lg)' }}>
                        Outlet Information
                    </h3>

                    {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                            {/* Name */}
                            <div className="input-group">
                                <label className="input-label">Outlet Name *</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            {/* Description */}
                            <div className="input-group">
                                <label className="input-label">Description</label>
                                <textarea
                                    className="input"
                                    rows={3}
                                    placeholder="Tell customers about your outlet..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    maxLength={500}
                                />
                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                                    {formData.description.length}/500 characters
                                </span>
                            </div>

                            {/* Cuisine Type */}
                            <div className="input-group">
                                <label className="input-label">Cuisine Type *</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g., Indian, Chinese, Fast Food"
                                    value={formData.cuisineType}
                                    onChange={(e) => setFormData({ ...formData, cuisineType: e.target.value })}
                                />
                            </div>

                            {/* Location */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                                <div className="input-group">
                                    <label className="input-label">Building</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Building name/number"
                                        value={formData.location.building}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            location: { ...formData.location, building: e.target.value }
                                        })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Landmark</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Near..."
                                        value={formData.location.landmark}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            location: { ...formData.location, landmark: e.target.value }
                                        })}
                                    />
                                </div>
                            </div>

                            {/* Operating Hours */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                                <div className="input-group">
                                    <label className="input-label">Opening Time *</label>
                                    <input
                                        type="time"
                                        className="input"
                                        value={formData.operatingHours.open}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            operatingHours: { ...formData.operatingHours, open: e.target.value }
                                        })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Closing Time *</label>
                                    <input
                                        type="time"
                                        className="input"
                                        value={formData.operatingHours.close}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            operatingHours: { ...formData.operatingHours, close: e.target.value }
                                        })}
                                    />
                                </div>
                            </div>

                            {/* Contact */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                                <div className="input-group">
                                    <label className="input-label">Contact Phone *</label>
                                    <input
                                        type="tel"
                                        className="input"
                                        value={formData.contact.phone}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            contact: { ...formData.contact, phone: e.target.value }
                                        })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Contact Email</label>
                                    <input
                                        type="email"
                                        className="input"
                                        value={formData.contact.email}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            contact: { ...formData.contact, email: e.target.value }
                                        })}
                                    />
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
                                <button
                                    className="btn btn-ghost"
                                    onClick={handleCancel}
                                    disabled={saving}
                                    style={{ flex: 1 }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleSave}
                                    disabled={saving}
                                    style={{ flex: 1 }}
                                >
                                    <Save size={18} />
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                            {formData.description && (
                                <div>
                                    <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>Description</span>
                                    <p style={{ fontWeight: 500 }}>{formData.description}</p>
                                </div>
                            )}
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>Cuisine Type</span>
                                <p style={{ fontWeight: 500 }}>{formData.cuisineType || 'Not set'}</p>
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>Location</span>
                                <p style={{ fontWeight: 500 }}>
                                    {formData.location.building || 'Not set'}
                                    {formData.location.landmark && ` • ${formData.location.landmark}`}
                                </p>
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>Operating Hours</span>
                                <p style={{ fontWeight: 500 }}>{formData.operatingHours.open} - {formData.operatingHours.close}</p>
                            </div>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>Contact</span>
                                <p style={{ fontWeight: 500 }}>
                                    {formData.contact.phone}
                                    {formData.contact.email && ` • ${formData.contact.email}`}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
