import { useState, useEffect } from 'react';
import { analyticsAPI, reportsAPI } from '../../services/api';

const formatInputDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function Reports() {
    const [stats, setStats] = useState(null);
    const [topBooks, setTopBooks] = useState([]);
    const [genres, setGenres] = useState([]);
    const [activity, setActivity] = useState(null);
    const [startDate, setStartDate] = useState(() => {
        const start = new Date();
        start.setDate(start.getDate() - 7);
        return formatInputDate(start);
    });
    const [endDate, setEndDate] = useState(() => formatInputDate(new Date()));
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats({ showSpinner: true });
        const intervalId = setInterval(() => {
            loadStats({ showSpinner: false });
        }, 20000);
        return () => clearInterval(intervalId);
    }, [startDate, endDate]);

    const loadStats = async ({ showSpinner = false } = {}) => {
        try {
            if (!showSpinner) setRefreshing(true);

            const hasValidDateRange =
                startDate &&
                endDate &&
                !Number.isNaN(new Date(startDate).getTime()) &&
                !Number.isNaN(new Date(endDate).getTime()) &&
                new Date(startDate) <= new Date(endDate);

            const [statsData, activityData, topBooksData, categoryData] = await Promise.all([
                reportsAPI.getStats().catch(() => null),
                hasValidDateRange
                    ? analyticsAPI.getActivityDashboard({ startDate, endDate }).catch(() => null)
                    : Promise.resolve(null),
                reportsAPI.getPopularBooks(10).catch(() => []),
                reportsAPI.getCategoryDistribution().catch(() => []),
            ]);

            if (statsData) setStats(statsData);
            setTopBooks(Array.isArray(topBooksData) ? topBooksData : []);
            setGenres(
                (Array.isArray(categoryData) ? categoryData : []).map((item) => ({
                    name: item.category || 'Uncategorized',
                    count: Number(item.count) || 0,
                }))
            );
            if (activityData?.success && activityData?.data) {
                setActivity(activityData.data);
            } else if (activityData && !activityData.success) {
                setActivity(null);
            } else if (activityData && activityData.totalActivities !== undefined) {
                // Defensive fallback if backend returns direct object without { success, data }
                setActivity(activityData);
            }
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
            setRefreshing(false);
            setLoading(false);
        }
    };

    const StatCard = ({ icon, label, value, sublabel, color }) => (
        <div className="bg-white border border-[#E8E4DF] p-4">
            <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
                    <span className="material-symbols-outlined text-white text-sm">{icon}</span>
                </div>
                <span className="text-xs text-[#6B6560] uppercase tracking-wide font-medium">{label}</span>
            </div>
            <p className="text-2xl font-bold text-[#1E1815]">{value}</p>
            {sublabel && <p className="text-xs text-[#6B6560] mt-1">{sublabel}</p>}
        </div>
    );

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <span className="material-symbols-outlined text-4xl text-[#c16549] animate-spin">refresh</span>
            </div>
        );
    }

    const hasInvalidDateRange =
        startDate &&
        endDate &&
        !Number.isNaN(new Date(startDate).getTime()) &&
        !Number.isNaN(new Date(endDate).getTime()) &&
        new Date(startDate) > new Date(endDate);

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                    <div className="h-[2px] w-8 bg-[#c16549]"></div>
                    <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#c16549]">Analytics</span>
                </div>
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <h1 className="text-3xl font-bold text-[#1E1815]">Reports & Statistics</h1>
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-[#6B6560]">From</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-3 py-2 border border-[#E8E4DF] bg-white text-sm focus:border-[#c16549] focus:outline-none"
                        />
                        <label className="text-xs text-[#6B6560]">To</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-3 py-2 border border-[#E8E4DF] bg-white text-sm focus:border-[#c16549] focus:outline-none"
                        />
                        <button
                            onClick={() => loadStats({ showSpinner: false })}
                            disabled={hasInvalidDateRange}
                            className="px-3 py-2 bg-[#c16549] text-white text-sm font-medium hover:bg-[#a85443] transition-colors"
                        >
                            Refresh
                        </button>
                    </div>
                </div>
                <p className="text-xs text-[#6B6560] mt-2">
                    {refreshing ? 'Refreshing live analytics...' : `Last updated: ${lastUpdated ? lastUpdated.toLocaleTimeString() : 'Not yet'}`}
                </p>
                {hasInvalidDateRange && (
                    <p className="text-xs text-red-600 mt-1">Invalid range: "From" date cannot be after "To" date.</p>
                )}
            </div>

            {/* Collection Stats */}
            <div className="mb-6">
                <h2 className="text-sm font-bold text-[#1E1815] mb-3">Collection Overview</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon="auto_stories" label="Total Books" value={stats?.collection?.total_books || stats?.total_books || 0} color="bg-blue-500" />
                    <StatCard icon="library_books" label="Total Titles" value={stats?.collection?.unique_titles || stats?.total_books || 0} color="bg-indigo-500" />
                    <StatCard icon="inventory_2" label="Available" value={stats?.collection?.available_copies || stats?.books_available || 0} color="bg-green-500" />
                    <StatCard icon="category" label="Categories" value={stats?.collection?.total_categories || genres.length || 0} color="bg-purple-500" />
                </div>
            </div>

            {/* Membership Stats */}
            <div className="mb-6">
                <h2 className="text-sm font-bold text-[#1E1815] mb-3">Membership</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon="group" label="Total Members" value={stats?.membership?.total || stats?.total_members || 0} color="bg-teal-500" />
                    <StatCard icon="person_check" label="Active" value={stats?.membership?.active || stats?.total_members || 0} color="bg-green-500" />
                    <StatCard icon="person_add" label="New This Month" value={stats?.membership?.new_this_month || stats?.new_members_this_month || 0} color="bg-amber-500" />
                    <StatCard icon="badge" label="Staff" value={stats?.membership?.staff_count || 0} color="bg-rose-500" />
                </div>
            </div>

            {/* Circulation Stats */}
            <div className="mb-6">
                <h2 className="text-sm font-bold text-[#1E1815] mb-3">Circulation</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon="swap_horiz" label="Active Loans" value={stats?.circulation?.checkouts || stats?.books_checked_out || 0} color="bg-blue-500" />
                    <StatCard icon="warning" label="Overdue" value={stats?.circulation?.overdue || stats?.books_overdue || 0} color="bg-red-500" />
                    <StatCard icon="calendar_month" label="This Month" value={stats?.circulation?.this_month || 0} color="bg-cyan-500" />
                    <StatCard icon="check_circle" label="Returned Today" value={stats?.circulation?.returned_today || 0} color="bg-emerald-500" />
                </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-[#E8E4DF] p-4">
                    <h2 className="text-sm font-bold text-[#1E1815] mb-4">Top Borrowed Books</h2>
                    <div className="space-y-3">
                        {topBooks.slice(0, 5).map((book, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="w-6 h-6 bg-[#FAF7F2] text-[#c16549] text-xs font-bold flex items-center justify-center">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-[#1E1815] truncate">{book.title}</p>
                                    <p className="text-xs text-[#6B6560]">{book.checkout_count || book.borrow_count || 0} borrows</p>
                                </div>
                            </div>
                        ))}
                        {topBooks.length === 0 && (
                            <p className="text-sm text-[#6B6560]">No data available</p>
                        )}
                    </div>
                </div>
                <div className="bg-white border border-[#E8E4DF] p-4">
                    <h2 className="text-sm font-bold text-[#1E1815] mb-4">Genre Distribution</h2>
                    <div className="space-y-2">
                        {genres.slice(0, 5).map((genre, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="flex-1">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-[#1E1815]">{genre.name}</span>
                                        <span className="text-[#6B6560]">{genre.count}</span>
                                    </div>
                                    <div className="h-2 bg-[#FAF7F2] overflow-hidden">
                                        <div className="h-full bg-[#c16549]" style={{ width: `${(genre.count / (stats?.collection?.total_books || stats?.total_books || 1)) * 100}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {genres.length === 0 && (
                            <p className="text-sm text-[#6B6560]">No data available</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Activity Analytics */}
            <div className="mt-6 bg-white border border-[#E8E4DF] p-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-[#1E1815]">Live Activity</h2>
                    <span className="text-xs text-[#6B6560]">
                        Period: {activity?.period || `${startDate || '-'} to ${endDate || '-'}`}
                    </span>
                </div>
                {!activity ? (
                    <p className="text-sm text-[#6B6560]">Activity analytics unavailable right now.</p>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="border border-[#E8E4DF] p-3">
                            <p className="text-xs text-[#6B6560] uppercase tracking-wide mb-1">Total Activities</p>
                            <p className="text-2xl font-bold text-[#1E1815]">{activity.totalActivities || 0}</p>
                        </div>
                        <div className="border border-[#E8E4DF] p-3">
                            <p className="text-xs text-[#6B6560] uppercase tracking-wide mb-2">Top Actions</p>
                            <div className="space-y-1">
                                {(activity.actionBreakdown || []).slice(0, 3).map((item, i) => (
                                    <p key={`${item.action}-${i}`} className="text-xs text-[#1E1815]">
                                        {item.action}: {item.count}
                                    </p>
                                ))}
                                {(activity.actionBreakdown || []).length === 0 && (
                                    <p className="text-xs text-[#6B6560]">No action data</p>
                                )}
                            </div>
                        </div>
                        <div className="border border-[#E8E4DF] p-3">
                            <p className="text-xs text-[#6B6560] uppercase tracking-wide mb-2">Top Users</p>
                            <div className="space-y-1">
                                {(activity.topUsers || []).slice(0, 3).map((item, i) => (
                                    <p key={`${item.user}-${i}`} className="text-xs text-[#1E1815]">
                                        {item.user}: {item.activityCount}
                                    </p>
                                ))}
                                {(activity.topUsers || []).length === 0 && (
                                    <p className="text-xs text-[#6B6560]">No user data</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
