import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { outletsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const Home = () => {
    const { user } = useAuth();
    const [outlets, setOutlets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchOutlets = async () => {
            try {
                const response = await outletsAPI.getAll();
                setOutlets(response.data.data);
            } catch (error) {
                toast.error('Failed to load outlets');
            } finally {
                setLoading(false);
            }
        };

        fetchOutlets();
    }, []);

    const filteredOutlets = outlets.filter(outlet =>
        outlet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        outlet.cuisineType.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const firstName = user?.fullName?.split(' ')[0] || 'there';

    return (
        <div className="container" style={{ paddingTop: 'var(--space-lg)', paddingBottom: 100 }}>
            {/* Hero Section */}
            <div className="home-hero animate-fade-in">
                <p className="text-secondary">
                    {getGreeting()},
                </p>
                <h1 className="greeting">
                    <span className="greeting-name">{firstName}</span> 👋
                </h1>
                <p className="text-secondary" style={{ marginTop: 'var(--space-xs)' }}>
                    What would you like to eat today?
                </p>
            </div>

            {/* Search Bar */}
            <div className="search-bar">
                <Search size={20} className="search-icon" />
                <input
                    type="text"
                    className="input"
                    placeholder="Search outlets or cuisines..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Outlets List */}
            <div className="outlets-grid">
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>
                    Campus Outlets
                </h2>

                {loading ? (
                    // Skeleton loading
                    [...Array(3)].map((_, i) => (
                        <div key={i} className="card outlet-card">
                            <div className="skeleton outlet-image"></div>
                            <div className="outlet-info">
                                <div className="skeleton" style={{ height: 20, width: '60%', marginBottom: 8 }}></div>
                                <div className="skeleton" style={{ height: 16, width: '40%' }}></div>
                            </div>
                        </div>
                    ))
                ) : filteredOutlets.length === 0 ? (
                    <div className="empty-state">
                        <p className="empty-state-title">No outlets found</p>
                        <p className="empty-state-text">
                            {searchQuery ? 'Try a different search term' : 'No outlets available at your campus yet'}
                        </p>
                    </div>
                ) : (
                    filteredOutlets.map(outlet => (
                        <Link
                            key={outlet._id}
                            to={`/outlet/${outlet.slug}`}
                            className="card outlet-card animate-slide-up"
                            style={{ animationDelay: '100ms' }}
                        >
                            <div
                                className="outlet-image"
                                style={{
                                    backgroundImage: outlet.coverImage ? `url(${outlet.coverImage})` : 'none',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '2rem'
                                }}
                            >
                                {!outlet.coverImage && '🍽️'}
                            </div>

                            <div className="outlet-info">
                                <h3 className="outlet-name">{outlet.name}</h3>

                                <div className="outlet-meta">
                                    <span className="badge badge-secondary">
                                        {outlet.cuisineType}
                                    </span>
                                </div>

                                <div className="outlet-meta" style={{ marginTop: 'var(--space-xs)' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span className={`status-dot ${outlet.isOpen ? 'open' : 'closed'}`}></span>
                                        {outlet.isOpen ? 'Open' : 'Closed'}
                                    </span>

                                    {outlet.location?.building && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <MapPin size={14} />
                                            {outlet.location.building}
                                        </span>
                                    )}
                                </div>

                                <div className="outlet-meta" style={{ marginTop: 'var(--space-xs)' }}>
                                    <Clock size={14} />
                                    <span>
                                        {outlet.operatingHours?.open} - {outlet.operatingHours?.close}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
};

export default Home;
