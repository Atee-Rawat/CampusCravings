import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, Plus, Minus, ShoppingBag } from 'lucide-react';
import { outletsAPI, menuAPI } from '../../services/api';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';

const Outlet = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { addItem, getItemQuantity, incrementQuantity, decrementQuantity, itemCount, outlet: cartOutlet } = useCart();

    const [outlet, setOutlet] = useState(null);
    const [menu, setMenu] = useState({});
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchOutletAndMenu = async () => {
            try {
                // Fetch outlet details
                const outletRes = await outletsAPI.getBySlug(slug);
                setOutlet(outletRes.data.data.outlet);
                setCategories(outletRes.data.data.categories);

                if (outletRes.data.data.categories.length > 0) {
                    setActiveCategory(outletRes.data.data.categories[0]);
                }

                // Fetch full menu
                const menuRes = await menuAPI.getByOutlet(outletRes.data.data.outlet._id);
                setMenu(menuRes.data.data);

            } catch (error) {
                toast.error('Failed to load outlet');
                navigate('/');
            } finally {
                setLoading(false);
            }
        };

        fetchOutletAndMenu();
    }, [slug, navigate]);

    const handleAddToCart = (item) => {
        const success = addItem(item, outlet);
        if (success) {
            toast.success(`Added ${item.name} to cart`);
        }
    };

    const formatPrice = (price) => `₹${(price / 100).toFixed(0)}`;

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!outlet) {
        return null;
    }

    // Filter menu items by search
    const getFilteredItems = () => {
        if (!searchQuery) {
            return menu[activeCategory] || [];
        }

        const allItems = Object.values(menu).flat();
        return allItems.filter(item =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    const filteredItems = getFilteredItems();

    return (
        <div style={{ paddingBottom: itemCount > 0 ? 100 : 20 }}>
            {/* Header with cover image */}
            <div className="menu-header">
                <div
                    className="menu-header-image"
                    style={{
                        backgroundImage: outlet.coverImage ? `url(${outlet.coverImage})` : 'linear-gradient(135deg, var(--primary-500), var(--secondary-500))',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                    }}
                />
                <div className="menu-header-overlay">
                    <button
                        onClick={() => navigate(-1)}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: 'var(--bg-card)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 'var(--space-md)'
                        }}
                    >
                        <ArrowLeft size={20} />
                    </button>

                    <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>
                        {outlet.name}
                    </h1>

                    <div style={{
                        display: 'flex',
                        gap: 'var(--space-md)',
                        marginTop: 'var(--space-sm)',
                        flexWrap: 'wrap'
                    }}>
                        <span className={`badge ${outlet.isOpen ? 'badge-success' : 'badge-error'}`}>
                            {outlet.isOpen ? 'Open' : 'Closed'}
                        </span>
                        <span className="badge badge-secondary">{outlet.cuisineType}</span>
                    </div>

                    <div style={{
                        display: 'flex',
                        gap: 'var(--space-lg)',
                        marginTop: 'var(--space-sm)',
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--text-secondary)'
                    }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={14} />
                            {outlet.operatingHours?.open} - {outlet.operatingHours?.close}
                        </span>
                        {outlet.location?.building && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <MapPin size={14} />
                                {outlet.location.building}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="container">
                {/* Search */}
                <input
                    type="text"
                    className="input"
                    placeholder="Search menu..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ marginBottom: 'var(--space-md)' }}
                />

                {/* Category Tabs */}
                {!searchQuery && (
                    <div className="category-tabs">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                className={`category-tab ${activeCategory === cat ? 'active' : ''}`}
                                onClick={() => setActiveCategory(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                )}

                {/* Menu Items */}
                <div style={{ marginTop: 'var(--space-md)' }}>
                    {filteredItems.length === 0 ? (
                        <div className="empty-state">
                            <p>No items found</p>
                        </div>
                    ) : (
                        filteredItems.map(item => {
                            const quantity = getItemQuantity(item._id);

                            return (
                                <div key={item._id} className="menu-item">
                                    <div className="menu-item-info">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                            <span className={`veg-indicator ${item.isVeg ? 'veg' : 'non-veg'}`}></span>
                                            <span className="menu-item-name">{item.name}</span>
                                        </div>

                                        {item.description && (
                                            <p className="menu-item-desc line-clamp-2">{item.description}</p>
                                        )}

                                        <div className="menu-item-meta">
                                            <span className="menu-item-price">{formatPrice(item.price)}</span>
                                            <span className="menu-item-time">
                                                <Clock size={12} />
                                                {item.prepTime} mins
                                            </span>
                                            {item.tags?.includes('bestseller') && (
                                                <span className="badge badge-primary">Bestseller</span>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        {item.image && (
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="menu-item-image"
                                            />
                                        )}

                                        {!outlet.isOpen ? (
                                            <span className="text-muted text-sm">Closed</span>
                                        ) : quantity === 0 ? (
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => handleAddToCart(item)}
                                                style={{ minWidth: 80 }}
                                            >
                                                <Plus size={16} />
                                                Add
                                            </button>
                                        ) : (
                                            <div className="quantity-control">
                                                <button
                                                    className="quantity-btn"
                                                    onClick={() => decrementQuantity(item._id)}
                                                >
                                                    <Minus size={16} />
                                                </button>
                                                <span className="quantity-value">{quantity}</span>
                                                <button
                                                    className="quantity-btn"
                                                    onClick={() => incrementQuantity(item._id)}
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Floating Cart Button */}
            {itemCount > 0 && cartOutlet?._id === outlet._id && (
                <div style={{
                    position: 'fixed',
                    bottom: 'var(--space-lg)',
                    left: 'var(--space-md)',
                    right: 'var(--space-md)',
                    maxWidth: 'calc(480px - var(--space-md) * 2)',
                    margin: '0 auto'
                }}>
                    <button
                        className="btn btn-primary btn-block"
                        onClick={() => navigate('/cart')}
                        style={{
                            justifyContent: 'space-between',
                            padding: '16px 24px'
                        }}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <ShoppingBag size={20} />
                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </span>
                        <span>View Cart →</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default Outlet;
