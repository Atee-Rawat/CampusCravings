import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import ReviewCard from './ReviewCard';
import ReviewForm from './ReviewForm';
import StarRating from './StarRating';
import { ChevronDown } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ReviewsList = ({ menuItemId, currentUserId }) => {
    const [reviews, setReviews] = useState([]);
    const [userReview, setUserReview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('newest');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [distribution, setDistribution] = useState([]);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [editingReview, setEditingReview] = useState(null);

    useEffect(() => {
        fetchReviews();
        fetchUserReview();
    }, [menuItemId, sortBy, page]);

    const fetchReviews = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/reviews/item/${menuItemId}`, {
                params: { sortBy, page, limit: 10 }
            });
            setReviews(response.data.data.reviews);
            setTotalPages(response.data.data.pagination.pages);
            setDistribution(response.data.data.distribution || []);
        } catch (error) {
            console.error('Fetch reviews error:', error);
            toast.error('Failed to load reviews');
        } finally {
            setLoading(false);
        }
    };

    const fetchUserReview = async () => {
        try {
            const response = await api.get(`/reviews/item/${menuItemId}/user`);
            setUserReview(response.data.data);
        } catch (error) {
            // User hasn't reviewed yet, which is fine
            setUserReview(null);
        }
    };

    const handleDeleteReview = async (reviewId) => {
        if (!confirm('Are you sure you want to delete this review?')) return;

        try {
            await api.delete(`/reviews/${reviewId}`);
            toast.success('Review deleted successfully');
            fetchReviews();
            fetchUserReview();
        } catch (error) {
            console.error('Delete review error:', error);
            toast.error('Failed to delete review');
        }
    };

    const handleEditReview = (review) => {
        setEditingReview(review);
        setShowReviewForm(true);
    };

    const handleReviewSuccess = () => {
        setShowReviewForm(false);
        setEditingReview(null);
        fetchReviews();
        fetchUserReview();
    };

    // Calculate average rating from distribution
    const calculateAverage = () => {
        if (!distribution || distribution.length === 0) return 0;
        const total = distribution.reduce((sum, item) => sum + item.count, 0);
        const weightedSum = distribution.reduce((sum, item) => sum + (item._id * item.count), 0);
        return total > 0 ? (weightedSum / total).toFixed(1) : 0;
    };

    const averageRating = calculateAverage();
    const totalReviews = distribution.reduce((sum, item) => sum + item.count, 0);

    return (
        <div style={{ marginTop: 'var(--space-xl)' }}>
            {/* Reviews Header */}
            <div style={{
                background: 'var(--bg-card)',
                padding: 'var(--space-lg)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                marginBottom: 'var(--space-lg)'
            }}>
                <h3 style={{
                    fontSize: 'var(--font-size-xl)',
                    marginBottom: 'var(--space-md)'
                }}>
                    Customer Reviews
                </h3>

                <div style={{
                    display: 'flex',
                    gap: 'var(--space-xl)',
                    alignItems: 'center',
                    flexWrap: 'wrap'
                }}>
                    {/* Average rating */}
                    <div>
                        <div style={{
                            fontSize: 'var(--font-size-3xl)',
                            fontWeight: 700,
                            marginBottom: 'var(--space-xs)'
                        }}>
                            {averageRating}
                        </div>
                        <StarRating rating={parseFloat(averageRating)} size={20} />
                        <div style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--text-muted)',
                            marginTop: 'var(--space-xs)'
                        }}>
                            {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
                        </div>
                    </div>

                    {/* Rating distribution */}
                    {distribution.length > 0 && (
                        <div style={{ flex: 1, maxWidth: '400px' }}>
                            {[5, 4, 3, 2, 1].map(rating => {
                                const item = distribution.find(d => d._id === rating);
                                const count = item?.count || 0;
                                const percentage = totalReviews > 0 ? (count / totalReviews * 100) : 0;

                                return (
                                    <div key={rating} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-sm)',
                                        marginBottom: 'var(--space-xs)'
                                    }}>
                                        <span style={{
                                            fontSize: 'var(--font-size-sm)',
                                            width: '50px',
                                            color: 'var(--text-secondary)'
                                        }}>
                                            {rating} stars
                                        </span>
                                        <div style={{
                                            flex: 1,
                                            height: '8px',
                                            background: 'var(--bg-secondary)',
                                            borderRadius: 'var(--radius-sm)',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                height: '100%',
                                                width: `${percentage}%`,
                                                background: 'var(--primary-500)',
                                                transition: 'width 0.3s ease'
                                            }} />
                                        </div>
                                        <span style={{
                                            fontSize: 'var(--font-size-sm)',
                                            width: '40px',
                                            textAlign: 'right',
                                            color: 'var(--text-secondary)'
                                        }}>
                                            {count}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Write review button */}
                {!userReview && !showReviewForm && (
                    <button
                        onClick={() => setShowReviewForm(true)}
                        className="btn btn-primary"
                        style={{ marginTop: 'var(--space-md)' }}
                    >
                        Write a Review
                    </button>
                )}
            </div>

            {/* Review form */}
            {showReviewForm && (
                <div style={{ marginBottom: 'var(--space-lg)' }}>
                    <ReviewForm
                        menuItemId={menuItemId}
                        existingReview={editingReview || userReview}
                        onSuccess={handleReviewSuccess}
                        onCancel={() => {
                            setShowReviewForm(false);
                            setEditingReview(null);
                        }}
                    />
                </div>
            )}

            {/* User's existing review */}
            {userReview && !showReviewForm && (
                <div style={{ marginBottom: 'var(--space-lg)' }}>
                    <h4 style={{
                        fontSize: 'var(--font-size-base)',
                        marginBottom: 'var(--space-sm)',
                        color: 'var(--text-secondary)'
                    }}>
                        Your Review
                    </h4>
                    <ReviewCard
                        review={userReview}
                        currentUserId={currentUserId}
                        onEdit={handleEditReview}
                        onDelete={handleDeleteReview}
                    />
                </div>
            )}

            {/* Sort controls */}
            {totalReviews > 0 && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 'var(--space-md)'
                }}>
                    <h4 style={{ fontSize: 'var(--font-size-lg)' }}>
                        All Reviews
                    </h4>
                    <div style={{ position: 'relative' }}>
                        <select
                            value={sortBy}
                            onChange={(e) => {
                                setSortBy(e.target.value);
                                setPage(1);
                            }}
                            className="input select"
                            style={{
                                minHeight: 'auto',
                                padding: '8px 32px 8px 12px',
                                fontSize: 'var(--font-size-sm)',
                                appearance: 'none',
                                paddingRight: '32px'
                            }}
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="highest">Highest Rated</option>
                            <option value="lowest">Lowest Rated</option>
                            <option value="helpful">Most Helpful</option>
                        </select>
                        <ChevronDown
                            size={16}
                            style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                pointerEvents: 'none',
                                color: 'var(--text-secondary)'
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Reviews list */}
            {loading ? (
                <div style={{
                    textAlign: 'center',
                    padding: 'var(--space-xl)',
                    color: 'var(--text-muted)'
                }}>
                    Loading reviews...
                </div>
            ) : reviews.length > 0 ? (
                <>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-md)'
                    }}>
                        {reviews.map(review => (
                            <ReviewCard
                                key={review._id}
                                review={review}
                                currentUserId={currentUserId}
                                onEdit={handleEditReview}
                                onDelete={handleDeleteReview}
                            />
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: 'var(--space-sm)',
                            marginTop: 'var(--space-lg)'
                        }}>
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="btn btn-ghost"
                            >
                                Previous
                            </button>
                            <span style={{
                                padding: '0 var(--space-md)',
                                display: 'flex',
                                alignItems: 'center',
                                color: 'var(--text-secondary)',
                                fontSize: 'var(--font-size-sm)'
                            }}>
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="btn btn-ghost"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div style={{
                    textAlign: 'center',
                    padding: 'var(--space-xl)',
                    color: 'var(--text-muted)',
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-subtle)'
                }}>
                    No reviews yet. Be the first to review this item!
                </div>
            )}
        </div>
    );
};

ReviewsList.propTypes = {
    menuItemId: PropTypes.string.isRequired,
    currentUserId: PropTypes.string.isRequired
};

export default ReviewsList;
