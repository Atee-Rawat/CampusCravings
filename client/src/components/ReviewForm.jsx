import { useState } from 'react';
import PropTypes from 'prop-types';
import StarRating from './StarRating';
import toast from 'react-hot-toast';
import api from '../services/api';

const ReviewForm = ({ menuItemId, existingReview = null, onSuccess, onCancel }) => {
    const [rating, setRating] = useState(existingReview?.rating || 0);
    const [comment, setComment] = useState(existingReview?.comment || '');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (rating === 0) {
            toast.error('Please select a rating');
            return;
        }

        setLoading(true);

        try {
            const data = {
                menuItemId,
                rating,
                comment: comment.trim()
            };

            if (existingReview) {
                // Update existing review
                await api.put(`/reviews/${existingReview._id}`, {
                    rating,
                    comment: comment.trim()
                });
                toast.success('Review updated successfully!');
            } else {
                // Create new review
                await api.post('/reviews', data);
                toast.success('Review submitted successfully!');
            }

            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Review submission error:', error);
            toast.error(error.response?.data?.message || 'Failed to submit review');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{
            background: 'var(--bg-card)',
            padding: 'var(--space-lg)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)'
        }}>
            <h3 style={{
                fontSize: 'var(--font-size-lg)',
                marginBottom: 'var(--space-md)'
            }}>
                {existingReview ? 'Edit Your Review' : 'Write a Review'}
            </h3>

            {/* Rating selector */}
            <div style={{ marginBottom: 'var(--space-lg)' }}>
                <label style={{
                    display: 'block',
                    marginBottom: 'var(--space-sm)',
                    fontWeight: 500,
                    fontSize: 'var(--font-size-sm)'
                }}>
                    Your Rating *
                </label>
                <StarRating
                    rating={rating}
                    interactive={true}
                    onRatingChange={setRating}
                    size={32}
                />
            </div>

            {/* Comment textarea */}
            <div style={{ marginBottom: 'var(--space-lg)' }}>
                <label style={{
                    display: 'block',
                    marginBottom: 'var(--space-sm)',
                    fontWeight: 500,
                    fontSize: 'var(--font-size-sm)'
                }}>
                    Your Review (Optional)
                </label>
                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={500}
                    placeholder="Share your experience with this item..."
                    className="input"
                    style={{
                        width: '100%',
                        minHeight: '120px',
                        resize: 'vertical',
                        fontFamily: 'inherit'
                    }}
                />
                <div style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-muted)',
                    marginTop: 'var(--space-xs)',
                    textAlign: 'right'
                }}>
                    {comment.length}/500
                </div>
            </div>

            {/* Action buttons */}
            <div style={{
                display: 'flex',
                gap: 'var(--space-sm)',
                justifyContent: 'flex-end'
            }}>
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="btn btn-ghost"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                )}
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || rating === 0}
                >
                    {loading ? 'Submitting...' : existingReview ? 'Update Review' : 'Submit Review'}
                </button>
            </div>
        </form>
    );
};

ReviewForm.propTypes = {
    menuItemId: PropTypes.string.isRequired,
    existingReview: PropTypes.object,
    onSuccess: PropTypes.func,
    onCancel: PropTypes.func
};

export default ReviewForm;
