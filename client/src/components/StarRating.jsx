import { Star } from 'lucide-react';
import PropTypes from 'prop-types';

const StarRating = ({ rating, maxRating = 5, size = 20, interactive = false, onRatingChange = null, color = 'var(--primary-500)' }) => {
    const handleClick = (value) => {
        if (interactive && onRatingChange) {
            onRatingChange(value);
        }
    };

    const renderStars = () => {
        const stars = [];

        for (let i = 1; i <= maxRating; i++) {
            const filled = i <= Math.floor(rating);
            const halfFilled = i === Math.ceil(rating) && rating % 1 !== 0;

            stars.push(
                <div
                    key={i}
                    onClick={() => handleClick(i)}
                    style={{
                        position: 'relative',
                        cursor: interactive ? 'pointer' : 'default',
                        display: 'inline-block'
                    }}
                >
                    {halfFilled ? (
                        <>
                            {/* Half-filled star */}
                            <Star
                                size={size}
                                fill="none"
                                stroke="var(--border-light)"
                                style={{ position: 'absolute', top: 0, left: 0 }}
                            />
                            <div style={{
                                overflow: 'hidden',
                                width: '50%',
                                position: 'relative'
                            }}>
                                <Star
                                    size={size}
                                    fill={color}
                                    stroke={color}
                                />
                            </div>
                        </>
                    ) : (
                        <Star
                            size={size}
                            fill={filled ? color : 'none'}
                            stroke={filled ? color : 'var(--border-light)'}
                            style={{
                                transition: 'all 0.2s ease',
                                ...(interactive && {
                                    ':hover': {
                                        fill: color,
                                        stroke: color,
                                        transform: 'scale(1.1)'
                                    }
                                })
                            }}
                        />
                    )}
                </div>
            );
        }

        return stars;
    };

    return (
        <div style={{
            display: 'flex',
            gap: '4px',
            alignItems: 'center'
        }}>
            {renderStars()}
            {!interactive && rating > 0 && (
                <span style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-secondary)',
                    marginLeft: '4px'
                }}>
                    ({rating.toFixed(1)})
                </span>
            )}
        </div>
    );
};

StarRating.propTypes = {
    rating: PropTypes.number.isRequired,
    maxRating: PropTypes.number,
    size: PropTypes.number,
    interactive: PropTypes.bool,
    onRatingChange: PropTypes.func,
    color: PropTypes.string
};

export default StarRating;
