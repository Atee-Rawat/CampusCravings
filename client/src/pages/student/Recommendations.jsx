import { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import RecommendationCard from '../../components/RecommendationCard';
import toast from 'react-hot-toast';

const Recommendations = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!(user?._id || user?.id) || !user?.profileCompleted) {
            setLoading(false);
            return;
        }

        const fetchRecommendations = async () => {
            setLoading(true);
            try {
                // Fetch more recommendations for the full page
                const response = await api.post(`/ai/recommend/${user._id || user.id}`, { limit: 20 });
                setRecommendations(response.data.data.recommendations || []);
            } catch (err) {
                const msg = err?.message || 'Failed to load recommendations';
                toast.error(msg);
            } finally {
                setLoading(false);
            }
        };

        fetchRecommendations();
    }, [user]);

    return (
        <div className="container" style={{ paddingTop: 'var(--space-lg)', paddingBottom: 120 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <button 
                    onClick={() => navigate(-1)}
                    style={{ 
                        background: 'none', 
                        border: 'none', 
                        padding: 8, 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        backgroundColor: '#f3f4f6'
                    }}
                >
                    <ChevronLeft size={24} />
                </button>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>AI Recommendations</h1>
                    <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>Tailored specifically for your taste</p>
                </div>
            </div>

            {!user?.profileCompleted ? (
                <div className="empty-state">
                    <p className="empty-state-title">Profile Incomplete</p>
                    <p className="empty-state-text">Please complete your AI profile in settings to get personalized food suggestions.</p>
                    <button 
                        onClick={() => navigate('/profile')} 
                        className="btn btn-primary" 
                        style={{ marginTop: 16 }}
                    >
                        Complete Profile
                    </button>
                </div>
            ) : loading ? (
                <div className="outlets-grid">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="card recommendation-skeleton" style={{ height: 160, background: '#fff', opacity: 0.6 }} />
                    ))}
                </div>
            ) : recommendations.length === 0 ? (
                <div className="empty-state">
                    <p className="empty-state-title">No recommendations yet</p>
                    <p className="empty-state-text">
                        We couldn't find matches right now. Try updating your AI preferences or check back later.
                    </p>
                </div>
            ) : (
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                    gap: 16 
                }}>
                    {recommendations.map((rec) => (
                        <RecommendationCard 
                            key={rec.menuItem.id || rec.menuItem._id} 
                            recommendation={rec} 
                            isFullPage={true}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Recommendations;
