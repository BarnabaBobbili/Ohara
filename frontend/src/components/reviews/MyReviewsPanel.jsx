import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reviewsAPI } from '../../services/reviewsApi';
import StarRating from './StarRating';

export default function MyReviewsPanel() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadReviews = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await reviewsAPI.getMy();
            setReviews(Array.isArray(response) ? response : []);
        } catch (err) {
            setError(err.message || 'Failed to load reviews');
            setReviews([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReviews();
    }, []);

    const handleDelete = async (reviewId) => {
        if (!window.confirm('Delete this review?')) return;
        try {
            await reviewsAPI.delete(reviewId);
            await loadReviews();
        } catch (err) {
            setError(err.message || 'Failed to delete review');
        }
    };

    return (
        <div className="bg-white dark:bg-[#2a2622] rounded-sm editorial-shadow p-8 border border-[#E8E4DF] dark:border-[#3d3935]">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-sm font-semibold text-[#c16549] tracking-[0.15em] uppercase" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                    My Reviews
                </h2>
                <span className="text-xs text-[#6B6560] dark:text-gray-400" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                    {reviews.length} total
                </span>
            </div>

            {loading ? (
                <p className="text-sm text-[#6B6560] dark:text-gray-400" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                    Loading your reviews...
                </p>
            ) : error ? (
                <p className="text-sm text-[#c16549]" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                    {error}
                </p>
            ) : reviews.length === 0 ? (
                <p className="text-sm italic text-[#6B6560] dark:text-gray-400" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                    You have not reviewed any books yet.
                </p>
            ) : (
                <div className="space-y-4">
                    {reviews.slice(0, 4).map((review) => (
                        <div key={review.id} className="rounded-sm border border-[#E8E4DF] p-4 dark:border-[#3d3935]">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <Link to={`/book/${review.book_id}`} className="text-xl font-bold text-[#1E1815] transition-colors hover:text-[#c16549] dark:text-white">
                                        {review.book_title || 'Untitled Book'}
                                    </Link>
                                    <div className="mt-2 flex flex-wrap items-center gap-3">
                                        <StarRating value={review.rating} size="sm" />
                                        <span className="text-[11px] uppercase tracking-[0.12em] text-[#6B6560] dark:text-gray-400" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                            {review.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link to={`/book/${review.book_id}`} className="rounded-sm border border-[#E8E4DF] px-3 py-2 text-xs text-[#6B6560] transition-colors hover:border-[#c16549] hover:text-[#c16549] dark:border-[#3d3935] dark:text-gray-300" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                        Edit
                                    </Link>
                                    <button type="button" onClick={() => handleDelete(review.id)} className="rounded-sm border border-[#E8E4DF] px-3 py-2 text-xs text-[#6B6560] transition-colors hover:border-[#c16549] hover:text-[#c16549] dark:border-[#3d3935] dark:text-gray-300" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                        Delete
                                    </button>
                                </div>
                            </div>
                            <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#1E1815] dark:text-gray-100" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                {review.review_text}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
