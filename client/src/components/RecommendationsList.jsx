import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import RecommendationCard from './RecommendationCard';
import toast from 'react-hot-toast';

const RecommendationsList = ({ limit = 6, showTitle = true }) => {
    const { user } = useAuth();
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(false);
    const CACHE_TTL = 60 * 60 * 1000; // 1 hour

    useEffect(() => {
        const userId = user?._id || user?.id;
        if (!userId || !user?.profileCompleted) {
            setLoading(false);
            return;
        }

        const cacheKey = `recommendations:${userId}:${limit}`;
        try {
            const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
            if (cached && Date.now() - cached.ts < CACHE_TTL) {
                setRecommendations(cached.items || []);
                return;
            }
        } catch (e) {
            // ignore parse errors and continue to fetch
        }

        const fetchRecommendations = async () => {
            setLoading(true);
            try {
                const response = await api.post(`/ai/recommend/${userId}`, { limit });
                const items = response.data.data.recommendations || [];
                setRecommendations(items);
                try {
                    localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), items }));
                } catch (e) {
                    // storage may fail (e.g., private mode) — ignore
                }
            } catch (err) {
                const msg = err?.message || 'Failed to load recommendations';
                toast.error(msg);
            } finally {
                setLoading(false);
            }
        };

        fetchRecommendations();
    }, [user?._id, user?.id, user?.profileCompleted, limit]);

    if (!user) return null;

    return (
        <section style={{ marginTop: showTitle ? 18 : 0 }}>
            {showTitle && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Recommended For You</h2>
                    <small style={{ color: '#6b7280' }}>Based on your profile</small>
                </div>
            )}

            {!user?.profileCompleted ? (
                <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                    Complete your profile to unlock personalized recommendations.
                </p>
            ) : loading ? (
                <div className="recommendations-strip" style={{ paddingBottom: 6 }}>
                    {[...Array(Math.min(limit, 3))].map((_, i) => (
                        <div key={i} className="card recommendation-skeleton" style={{ minWidth: 320, height: 160, background: '#fff', opacity: 0.6, borderRadius: 16, flex: '0 0 320px' }} />
                    ))}
                </div>
            ) : recommendations.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>We couldn't find any recommendations right now. Try updating your AI preferences.</p>
            ) : (
                <div className="recommendations-strip" style={{ gap: 16, paddingBottom: 6 }}>
                    {recommendations.map((rec) => (
                        <RecommendationCard key={(rec.menuItem && (rec.menuItem._id || rec.menuItem.id)) || Math.random()} recommendation={rec} />
                    ))}
                </div>
            )}
        </section>
    );
};

RecommendationsList.propTypes = {
    limit: PropTypes.number,
    showTitle: PropTypes.bool
};

export default RecommendationsList;
