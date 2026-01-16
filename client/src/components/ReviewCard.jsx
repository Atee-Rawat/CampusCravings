import { useState } from 'react';
import PropTypes from 'prop-types';
import { ThumbsUp, Edit2, Trash2, ShieldCheck } from 'lucide-react';
import StarRating from './StarRating';
import api from '../services/api';
import toast from 'react-hot-toast';

const ReviewCard = ({ review, currentUserId, onEdit, onDelete, onHelpfulUpdate }) => {
    const [isMarkingHelpful, setIsMarkingHelpful] = useState(false);
    const [localHelpfulCount, setLocalHelpfulCount] = useState(review.helpfulCount);
    const [isMarkedHelpful, setIsMarkedHelpful] = useState(
        review.markedHelpfulBy?.includes(currentUserId)
    );

    const isOwnReview = review.user._id === currentUserId;

    const handleHelpful = async () => {
        if (isMarkingHelpful) return;

        setIsMarkingHelpful(true);
        try {
            const response = await api.post(`/reviews/${review._id}/helpful`);

            setLocalHelpfulCount(response.data.data.helpfulCount);
            setIsMarkedHelpful(response.data.data.isMarkedHelpful);

            if (onHelpfulUpdate) {
                onHelpfulUpdate(review._id, response.data.data);
            }
        } catch (error) {
            console.error('Mark helpful error:', error);
            toast.error('Failed to update helpful status');
        } finally {
            setIsMarkingHelpful(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffInDays === 0) return 'Today';
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays < 7) return `${diffInDays} days ago`;
        if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
        if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
        return date.toLocaleDateString();
    };

    return (
        <div style={{
            background: 'var(--bg-card)',
            padding: 'var(--space-lg)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 'var(--space-md)'
            }}>
                <div style={{ flex: 1 }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-sm)',
                        marginBottom: 'var(--space-xs)'
                    }}>
                        <span style={{
                            fontWeight: 600,
                            fontSize: 'var(--font-size-base)'
                        }}>
                            {review.user.name}
                        </span>
                        {review.orderVerified && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: 'var(--success-bg)',
                                color: 'var(--success)',
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: 'var(--font-size-xs)',
                                fontWeight: 500
                            }}>
                                <ShieldCheck size={12} />
                                Verified Purchase
                            </div>
                        )}
                    </div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-md)'
                    }}>
                        <StarRating rating={review.rating} size={16} />
                        <span style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--text-muted)'
                        }}>
                            {formatDate(review.createdAt)}
                        </span>
                    </div>
                </div>

                {/* Actions for own review */}
                {isOwnReview && (
                    <div style={{
                        display: 'flex',
                        gap: 'var(--space-xs)'
                    }}>
                        <button
                            onClick={() => onEdit(review)}
                            className="btn btn-ghost btn-icon"
                            style={{ width: 32, height: 32, minHeight: 'auto' }}
                            title="Edit review"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button
                            onClick={() => onDelete(review._id)}
                            className="btn btn-ghost btn-icon"
                            style={{ width: 32, height: 32, minHeight: 'auto', color: 'var(--error)' }}
                            title="Delete review"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* Review comment */}
            {review.comment && (
                <p style={{
                    fontSize: 'var(--font-size-base)',
                    color: 'var(--text-primary)',
                    lineHeight: 1.6,
                    marginBottom: 'var(--space-md)'
                }}>
                    {review.comment}
                </p>
            )}

            {/* Helpful button */}
            {!isOwnReview && (
                <div style={{ marginTop: 'var(--space-md)' }}>
                    <button
                        onClick={handleHelpful}
                        disabled={isMarkingHelpful}
                        className="btn btn-ghost btn-sm"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-xs)',
                            fontSize: 'var(--font-size-sm)',
                            color: isMarkedHelpful ? 'var(--primary-500)' : 'var(--text-secondary)',
                            padding: '6px 12px',
                            minHeight: 'auto'
                        }}
                    >
                        <ThumbsUp
                            size={14}
                            fill={isMarkedHelpful ? 'currentColor' : 'none'}
                        />
                        Helpful ({localHelpfulCount})
                    </button>
                </div>
            )}
        </div>
    );
};

ReviewCard.propTypes = {
    review: PropTypes.object.isRequired,
    currentUserId: PropTypes.string.isRequired,
    onEdit: PropTypes.func,
    onDelete: PropTypes.func,
    onHelpfulUpdate: PropTypes.func
};

export default ReviewCard;
