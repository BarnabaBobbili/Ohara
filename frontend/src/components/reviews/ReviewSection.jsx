import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { reviewsAPI } from '../../services/reviewsApi';
import { getAuthState } from '../../services/authStore';
import ReviewCard from './ReviewCard';
import ReviewComposer from './ReviewComposer';
import StarRating from './StarRating';

const EMPTY_DISTRIBUTION = [5, 4, 3, 2, 1].map((rating) => ({ rating, count: 0, percentage: 0 }));

export default function ReviewSection({ bookId, bookTitle }) {
    const navigate = useNavigate();
    const [summary, setSummary] = useState({ average_rating: 0, total_ratings: 0, total_reviews: 0, rating_distribution: EMPTY_DISTRIBUTION });
    const [reviews, setReviews] = useState([]);
    const [myReview, setMyReview] = useState(null);
    const [currentMemberId, setCurrentMemberId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [sort, setSort] = useState('newest');
    const [ratingFilter, setRatingFilter] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ has_more: false, total: 0 });
    const isAuthenticated = getAuthState().isAuthenticated;

    useEffect(() => {
        setPage(1);
        setReviews([]);
    }, [bookId]);

    useEffect(() => {
        let active = true;
        setLoading(true);

        Promise.all([
            reviewsAPI.getSummary(bookId).catch(() => null),
            reviewsAPI.getForBook(bookId, { sort, rating: ratingFilter, page, limit: 5 }).catch(() => ({ reviews: [], pagination: {} })),
            isAuthenticated ? reviewsAPI.getMy().catch(() => []) : Promise.resolve([]),
            isAuthenticated ? authAPI.getCurrentUser().catch(() => null) : Promise.resolve(null),
        ]).then(([summaryResponse, reviewResponse, myReviews, currentUser]) => {
            if (!active) return;

            setSummary(summaryResponse || { average_rating: 0, total_ratings: 0, total_reviews: 0, rating_distribution: EMPTY_DISTRIBUTION });
            setReviews((previous) => (page === 1 ? (reviewResponse.reviews || []) : [...previous, ...(reviewResponse.reviews || [])]));
            setPagination(reviewResponse.pagination || { has_more: false, total: 0 });
            setMyReview((Array.isArray(myReviews) ? myReviews : []).find((review) => Number(review.book_id) === Number(bookId)) || null);
            setCurrentMemberId(currentUser?.id || null);
            setLoading(false);
        });

        return () => {
            active = false;
        };
    }, [bookId, isAuthenticated, page, ratingFilter, refreshKey, sort]);

    const reload = async () => {
        setRefreshKey((value) => value + 1);
        setPage(1);
    };

    const distribution = summary.rating_distribution?.length ? summary.rating_distribution : EMPTY_DISTRIBUTION;

    return (
        <section>
            <div className="mb-8 flex items-center gap-3">
                <div className="h-px w-8 bg-[#c16549]" />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#c16549]" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                    Reviews & Ratings
                </h3>
            </div>

            <div className="mb-8 rounded-sm border border-[#E8E4DF] bg-white p-6 editorial-shadow dark:border-[#3d3935] dark:bg-[#2a2622]">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#c16549]" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                    Overall Rating
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                    <StarRating value={summary.average_rating || 0} size="lg" />
                    <p className="text-sm text-[#6B6560] dark:text-gray-400" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                        {summary.total_ratings || 0} ratings · {summary.total_reviews || 0} reviews
                    </p>
                </div>
                <div className="mt-5 space-y-3">
                    {distribution.map((item) => (
                        <div key={item.rating} className="flex items-center gap-3 text-sm" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                            <span className="w-8 text-[#6B6560] dark:text-gray-400">{item.rating}★</span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#E8E4DF] dark:bg-[#3d3935]">
                                <div className="h-full bg-[#c16549]" style={{ width: `${item.percentage}%` }} />
                            </div>
                            <span className="w-12 text-right text-[#6B6560] dark:text-gray-400">{item.percentage}%</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-3">
                <select value={sort} onChange={(event) => {
                    setPage(1);
                    setReviews([]);
                    setSort(event.target.value);
                }} className="rounded-sm border border-[#E8E4DF] bg-white px-4 py-2 text-sm text-[#1E1815] focus:border-[#c16549] focus:outline-none dark:border-[#3d3935] dark:bg-[#2a2622] dark:text-white" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                    <option value="newest">Newest</option>
                    <option value="popular">Most Liked</option>
                    <option value="rating">Highest Rated</option>
                </select>
                <select value={ratingFilter} onChange={(event) => {
                    setPage(1);
                    setReviews([]);
                    setRatingFilter(event.target.value);
                }} className="rounded-sm border border-[#E8E4DF] bg-white px-4 py-2 text-sm text-[#1E1815] focus:border-[#c16549] focus:outline-none dark:border-[#3d3935] dark:bg-[#2a2622] dark:text-white" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                    <option value="">All Stars</option>
                    <option value="5">5 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="3">3 Stars</option>
                    <option value="2">2 Stars</option>
                    <option value="1">1 Star</option>
                </select>
            </div>

            <div className="space-y-6">
                {loading && page === 1 ? (
                    <div className="py-12 text-center text-sm text-[#6B6560]" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                        Loading reviews...
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="rounded-sm border border-[#E8E4DF] bg-[#f4ede8] px-6 py-10 text-center dark:border-[#3d3935] dark:bg-[#241d1b]">
                        <span className="material-symbols-outlined text-5xl text-[#c16549]">auto_stories</span>
                        <p className="mt-3 text-sm italic text-[#6B6560] dark:text-gray-400" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                            No reviews yet. Be the first to leave one.
                        </p>
                    </div>
                ) : (
                    reviews.map((review) => (
                        <ReviewCard
                            key={review.id}
                            review={review}
                            isAuthenticated={isAuthenticated}
                            currentMemberId={currentMemberId}
                            onChanged={reload}
                            onRequireLogin={() => navigate('/login')}
                        />
                    ))
                )}
            </div>

            {pagination.has_more ? (
                <div className="mt-6">
                    <button type="button" onClick={() => setPage((value) => value + 1)} className="rounded-full border border-[#E8E4DF] px-5 py-2 text-sm text-[#1E1815] transition-colors hover:border-[#c16549] dark:border-[#3d3935] dark:text-white" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                        Load More Reviews
                    </button>
                </div>
            ) : null}

            <div className="mt-10">
                <ReviewComposer
                    bookId={bookId}
                    bookTitle={bookTitle}
                    existingReview={myReview}
                    isAuthenticated={isAuthenticated}
                    onSaved={reload}
                    onDeleted={() => {
                        setMyReview(null);
                        reload();
                    }}
                    onRequireLogin={() => navigate('/login')}
                />
            </div>
        </section>
    );
}
