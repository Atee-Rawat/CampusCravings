import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, Plus, Minus, ShoppingBag, Leaf, Tag } from 'lucide-react';
import { outletsAPI, menuAPI, analyzeAPI } from '../../services/api';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';
import api from '../../services/api';

// Fallback nutrition estimator (used if AI fails)
const estimateFallbackNutrition = (item) => {
    const name = item.name.toLowerCase();
    const desc = (item.description || '').toLowerCase();
    const combined = name + ' ' + desc;

    let calories = 250, protein = 10, carbs = 30;
    let isHealthy = true;

    // Drinks - special handling
    if (/coke|cola|soda|pepsi|sprite|fanta/.test(combined)) {
        return { nutrition: { calories: 140, protein: 0, carbs: 39 }, isHealthy: false };
    }
    if (/juice|smoothie|shake|coffee|tea/.test(combined)) {
        return { nutrition: { calories: 120, protein: 2, carbs: 28 }, isHealthy: true };
    }

    // High calorie indicators
    if (/fried|cheese|cream|butter|mayo|deep/.test(combined)) {
        calories += 150; isHealthy = false;
    }
    if (/pizza|burger|fries|nachos|loaded/.test(combined)) {
        calories += 200; carbs += 20; isHealthy = false;
    }
    if (/chocolate|cake|ice cream|brownie|pastry|cookie/.test(combined)) {
        calories += 180; carbs += 40; isHealthy = false;
    }

    // Healthy indicators
    if (/salad|grilled|steamed|fresh|green|veggie|fruit/.test(combined)) {
        calories -= 80; isHealthy = true;
    }
    if (/protein|chicken breast|fish|egg|paneer|tofu/.test(combined)) {
        protein += 15;
    }
    if (/rice|noodle|pasta|bread|roti|naan/.test(combined)) {
        carbs += 25;
    }

    if (!item.isVeg) protein += 8;

    return {
        nutrition: { calories: Math.max(50, calories), protein: Math.max(0, protein), carbs: Math.max(5, carbs) },
        isHealthy
    };
};

const Outlet = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { addItem, getItemQuantity, incrementQuantity, decrementQuantity, itemCount, outlet: cartOutlet } = useCart();

    const [outlet, setOutlet] = useState(null);
    const [menu, setMenu] = useState({});
    const [nutritionData, setNutritionData] = useState({}); // AI nutrition cache
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [healthyOnly, setHealthyOnly] = useState(false);
    const [coupons, setCoupons] = useState([]);

    useEffect(() => {
        const fetchOutletAndMenu = async () => {
            try {
                const outletRes = await outletsAPI.getBySlug(slug);
                setOutlet(outletRes.data.data.outlet);
                setCategories(outletRes.data.data.categories);

                if (outletRes.data.data.categories.length > 0) {
                    setActiveCategory(outletRes.data.data.categories[0]);
                }

                const menuRes = await menuAPI.getByOutlet(outletRes.data.data.outlet._id);
                setMenu(menuRes.data.data);

                // Check cached nutrition data first (24 hour cache)
                const cacheKey = `nutrition_${outletRes.data.data.outlet._id}`;
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    try {
                        const { data, timestamp } = JSON.parse(cached);
                        // Check if cache is less than 24 hours old
                        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
                            setNutritionData(data);
                            return; // Skip API call
                        }
                    } catch (e) {
                        // Invalid cache, continue to API
                    }
                }

                // Fetch AI nutrition for all items
                const allItems = Object.values(menuRes.data.data).flat();
                try {
                    const nutritionRes = await analyzeAPI.batchNutrition(
                        allItems.map(item => ({
                            _id: item._id,
                            name: item.name,
                            description: item.description,
                            isVeg: item.isVeg
                        }))
                    );

                    // Create nutrition cache by item ID
                    const cache = {};
                    nutritionRes.data.data.forEach(n => {
                        cache[n.itemId] = { nutrition: n.nutrition, isHealthy: n.isHealthy };
                    });
                    setNutritionData(cache);

                    // Save to localStorage
                    localStorage.setItem(cacheKey, JSON.stringify({
                        data: cache,
                        timestamp: Date.now()
                    }));
                } catch (aiError) {
                    console.log('AI nutrition unavailable, using estimates');
                }

                // Fetch available coupons for this outlet
                try {
                    const couponsRes = await api.get(`/outlets/${slug}/coupons`);
                    setCoupons(couponsRes.data.data || []);
                } catch (couponError) {
                    console.log('Coupons unavailable');
                }

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

    // Add nutrition data to items (from AI or fallback)
    const menuWithNutrition = useMemo(() => {
        const result = {};
        Object.keys(menu).forEach(category => {
            result[category] = menu[category].map(item => {
                // Check AI cache first
                if (nutritionData[item._id]) {
                    return { ...item, ...nutritionData[item._id] };
                }
                // Check if item already has nutrition from DB
                if (item.nutrition?.calories) return item;
                // Fallback to estimates
                const fallback = estimateFallbackNutrition(item);
                return { ...item, ...fallback };
            });
        });
        return result;
    }, [menu, nutritionData]);

    // Filter menu items by search and healthy filter
    const getFilteredItems = () => {
        let items;
        if (!searchQuery) {
            items = menuWithNutrition[activeCategory] || [];
        } else {
            items = Object.values(menuWithNutrition).flat().filter(item =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Apply healthy filter
        if (healthyOnly) {
            items = items.filter(item => item.isHealthy);
        }

        return items;
    };

    const filteredItems = getFilteredItems();

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
                {/* Coupons Banner */}
                {coupons.length > 0 && (
                    <div style={{
                        marginBottom: 'var(--space-md)',
                        padding: 'var(--space-md)',
                        background: 'linear-gradient(135deg, var(--primary-600), var(--secondary-600))',
                        borderRadius: 'var(--radius-lg)',
                        color: 'white'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                            <Tag size={18} />
                            <span style={{ fontWeight: 600 }}>Available Offers</span>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-sm)', overflowX: 'auto', paddingBottom: 4 }}>
                            {coupons.map(coupon => (
                                <div
                                    key={coupon._id}
                                    style={{
                                        padding: 'var(--space-sm) var(--space-md)',
                                        background: 'rgba(255,255,255,0.2)',
                                        borderRadius: 'var(--radius-md)',
                                        whiteSpace: 'nowrap',
                                        fontSize: 'var(--font-size-sm)'
                                    }}
                                >
                                    <span style={{ fontWeight: 700 }}>{coupon.code}</span>
                                    <span style={{ marginLeft: 'var(--space-sm)', opacity: 0.9 }}>
                                        {coupon.discountType === 'percentage'
                                            ? `${coupon.discountValue}% off`
                                            : `₹${coupon.discountValue} off`}
                                        {coupon.minOrderAmount > 0 && ` on ₹${coupon.minOrderAmount / 100}+`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Search */}
                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                    <input
                        type="text"
                        className="input"
                        placeholder="Search menu..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <button
                        onClick={() => setHealthyOnly(!healthyOnly)}
                        className={`btn ${healthyOnly ? 'btn-primary' : 'btn-ghost'}`}
                        style={{
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-xs)'
                        }}
                    >
                        <Leaf size={18} />
                        Healthy
                    </button>
                </div>

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
                                            {item.isHealthy && (
                                                <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <Leaf size={10} /> Healthy
                                                </span>
                                            )}
                                        </div>

                                        {/* Nutrition Info */}
                                        {item.nutrition && (
                                            <div style={{
                                                display: 'flex',
                                                gap: 'var(--space-md)',
                                                marginTop: 'var(--space-xs)',
                                                fontSize: 'var(--font-size-xs)',
                                                color: 'var(--text-muted)'
                                            }}>
                                                <span>🔥 {item.nutrition.calories} cal</span>
                                                <span>💪 {item.nutrition.protein}g protein</span>
                                                <span>🍞 {item.nutrition.carbs}g carbs</span>
                                            </div>
                                        )}
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
