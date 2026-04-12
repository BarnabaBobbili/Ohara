import { useEffect, useState } from 'react';
import StatCard from '../../components/admin/StatCard';
import ModerationFilters from '../../components/admin/reviews/ModerationFilters';
import ModerationRow from '../../components/admin/reviews/ModerationRow';
import { reviewsAPI } from '../../services/reviewsApi';

export default function ReviewModeration() {
    const [stats, setStats] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, total: 0, has_more: false });
    const [filters, setFilters] = useState({ status: '', book: '', member: '', startDate: '', endDate: '', search: '' });
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        let active = true;
        setLoading(true);

        Promise.all([
            reviewsAPI.adminGetStats().catch(() => null),
            reviewsAPI.adminGetAll({ ...filters, page: pagination.page, limit: 10 }).catch(() => ({ reviews: [], pagination: {} })),
        ]).then(([statsResponse, reviewsResponse]) => {
            if (!active) return;
            setStats(statsResponse);
            setReviews(Array.isArray(reviewsResponse?.reviews) ? reviewsResponse.reviews : []);
            setPagination((current) => ({ ...current, ...(reviewsResponse?.pagination || {}) }));
            setLoading(false);
        });

        return () => {
            active = false;
        };
    }, [filters, pagination.page, refreshKey]);

    const refresh = () => setRefreshKey((value) => value + 1);

    return (
        <div className="p-6">
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                    <div className="h-[2px] w-8 bg-[#c16549]" />
                    <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#c16549]">Overview</span>
                </div>
                <h1 className="text-3xl font-bold text-[#1E1815] dark:text-white">Reviews & Ratings Moderation</h1>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Total Reviews" value={stats?.total_reviews || 0} subtitle="All submitted reviews" />
                <StatCard title="Pending" value={stats?.pending_reviews || 0} subtitle="Awaiting moderation" />
                <StatCard title="Flagged" value={stats?.flagged_reviews || 0} subtitle="Reported by members" />
                <StatCard title="Avg Rating" value={(stats?.average_rating_overall || 0).toFixed(1)} subtitle="Overall community average" />
            </div>

            <ModerationFilters
                filters={filters}
                onChange={(key, value) => {
                    setPagination((current) => ({ ...current, page: 1 }));
                    setFilters((current) => ({ ...current, [key]: value }));
                }}
            />

            <div className="mt-6 space-y-4">
                {loading ? (
                    <div className="py-12 text-center text-sm text-[#6B6560]">Loading reviews...</div>
                ) : reviews.length === 0 ? (
                    <div className="rounded-sm border border-[#E8E4DF] bg-white p-8 text-center text-sm text-[#6B6560] dark:border-[#3d3935] dark:bg-[#2a2622] dark:text-gray-400">
                        No reviews match the current filters.
                    </div>
                ) : (
                    reviews.map((review) => (
                        <ModerationRow
                            key={review.id}
                            review={review}
                            onStatusChange={async (reviewId, status, adminNotes) => {
                                await reviewsAPI.adminSetStatus(reviewId, { status, admin_notes: adminNotes });
                                refresh();
                            }}
                            onDelete={async (reviewId) => {
                                if (!window.confirm('Delete this review permanently?')) return;
                                await reviewsAPI.adminDelete(reviewId);
                                refresh();
                            }}
                            onDeleteComment={async (reviewId, commentId) => {
                                await reviewsAPI.adminDeleteComment(reviewId, commentId);
                                refresh();
                            }}
                        />
                    ))
                )}
            </div>

            <div className="mt-6 flex items-center justify-between text-sm text-[#6B6560] dark:text-gray-400">
                <button type="button" disabled={(pagination.page || 1) <= 1} onClick={() => setPagination((current) => ({ ...current, page: Math.max((current.page || 1) - 1, 1) }))} className="rounded-sm border border-[#E8E4DF] px-4 py-2 disabled:opacity-50 dark:border-[#3d3935]">
                    Previous
                </button>
                <span>Page {pagination.page || 1}</span>
                <button type="button" disabled={!pagination.has_more} onClick={() => setPagination((current) => ({ ...current, page: (current.page || 1) + 1 }))} className="rounded-sm border border-[#E8E4DF] px-4 py-2 disabled:opacity-50 dark:border-[#3d3935]">
                    Next
                </button>
            </div>
        </div>
    );
}
