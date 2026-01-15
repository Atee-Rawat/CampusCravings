import { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, X, Store } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const Settings = () => {
    const [outlet, setOutlet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const token = localStorage.getItem('adminToken');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    // Fetch outlet data
    useEffect(() => {
        const fetchOutlet = async () => {
            try {
                const response = await api.get('/admin/dashboard', config);
                setOutlet(response.data.data.outlet);
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

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div>
            <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--space-xl)' }}>
                Outlet Settings
            </h1>

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

                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>
                        Recommended: 800x600 pixels, max 5MB (JPEG, PNG, WebP)
                    </p>
                </div>
            </div>

            {/* Other Settings */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-xl)'
            }}>
                <h3 style={{ fontSize: 'var(--font-size-md)', marginBottom: 'var(--space-md)' }}>
                    Outlet Information
                </h3>

                <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                    <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>Cuisine Type</span>
                        <p style={{ fontWeight: 500 }}>{outlet?.cuisineType || 'Not set'}</p>
                    </div>
                    <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>Location</span>
                        <p style={{ fontWeight: 500 }}>{outlet?.location?.building || 'Not set'}</p>
                    </div>
                    <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>Operating Hours</span>
                        <p style={{ fontWeight: 500 }}>{outlet?.operatingHours?.open} - {outlet?.operatingHours?.close}</p>
                    </div>
                </div>

                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginTop: 'var(--space-lg)' }}>
                    Contact support to update other outlet details.
                </p>
            </div>
        </div>
    );
};

export default Settings;
