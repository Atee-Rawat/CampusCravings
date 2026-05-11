import PropTypes from 'prop-types';
import { useCart } from '../context/CartContext';
import { Star } from 'lucide-react';

const formatPrice = (price) => (typeof price === 'number' ? `₹${(price / 100).toFixed(2)}` : 'N/A');

const RecommendationCard = ({ recommendation, isFullPage = false }) => {
    const { addItem } = useCart();
    const item = recommendation.menuItem || {};
    const outletInfo = item.outlet && typeof item.outlet === 'object'
        ? item.outlet
        : recommendation.outlet && typeof recommendation.outlet === 'object'
            ? recommendation.outlet
            : null;

    return (
        <div
            className="recommendation-card card card-glass p-4"
            style={{
                width: isFullPage ? '100%' : '320px',
                flex: isFullPage ? '1 1 auto' : '0 0 320px'
            }}
        >
            <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ minWidth: 120, height: 120, borderRadius: 12, overflow: 'hidden', background: '#fff8f1', flexShrink: 0 }}>
                    {item.image ? (
                        <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>🍽️</div>
                    )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{item.name}</p>
                            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>{item.category || 'Menu'}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ background: '#fff', color: '#fb923c', padding: '4px 8px', borderRadius: 999, fontWeight: 700, fontSize: 12 }}>{formatPrice(item.price)}</div>
                        </div>
                    </div>

                            <p style={{ marginTop: 8, marginBottom: 8, fontSize: 13, color: '#374151', lineHeight: '1.3em' }}>{recommendation.personalizedReason || ''}</p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Star size={14} color="#f59e0b" />
                            <span style={{ fontSize: 12, color: '#6b7280' }}>{(item.averageRating || 0).toFixed(1)}</span>
                        </div>

                        <button
                            className="btn btn-primary"
                            onClick={() => addItem(item, outletInfo)}
                            style={{ background: 'linear-gradient(90deg,#fb923c,#f97316)', border: 'none', color: 'white', padding: '8px 12px', borderRadius: 10 }}
                        >
                            Add
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

RecommendationCard.propTypes = {
    recommendation: PropTypes.object.isRequired,
    isFullPage: PropTypes.bool
};

export default RecommendationCard;
