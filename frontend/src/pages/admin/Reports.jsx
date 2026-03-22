import { useState, useEffect } from 'react';
import { reportsAPI } from '../../services/api';

export default function Reports() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadStats(); }, []);

    const loadStats = async () => {
        try {
            const data = await reportsAPI.getStats();
            setStats(data);
        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
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

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                    <div className="h-[2px] w-8 bg-[#c16549]"></div>
                    <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#c16549]">Analytics</span>
                </div>
                <h1 className="text-3xl font-bold text-[#1E1815]">Reports & Statistics</h1>
            </div>

            {/* Collection Stats */}
            <div className="mb-6">
                <h2 className="text-sm font-bold text-[#1E1815] mb-3">Collection Overview</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon="auto_stories" label="Total Books" value={stats?.collection?.total_books || 0} color="bg-blue-500" />
                    <StatCard icon="library_books" label="Total Titles" value={stats?.collection?.unique_titles || 0} color="bg-indigo-500" />
                    <StatCard icon="inventory_2" label="Available" value={stats?.collection?.available_copies || 0} color="bg-green-500" />
                    <StatCard icon="category" label="Categories" value={stats?.collection?.total_categories || 0} color="bg-purple-500" />
                </div>
            </div>

            {/* Membership Stats */}
            <div className="mb-6">
                <h2 className="text-sm font-bold text-[#1E1815] mb-3">Membership</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon="group" label="Total Members" value={stats?.membership?.total || 0} color="bg-teal-500" />
                    <StatCard icon="person_check" label="Active" value={stats?.membership?.active || 0} color="bg-green-500" />
                    <StatCard icon="person_add" label="New This Month" value={stats?.membership?.new_this_month || 0} color="bg-amber-500" />
                    <StatCard icon="badge" label="Staff" value={stats?.membership?.staff_count || 0} color="bg-rose-500" />
                </div>
            </div>

            {/* Circulation Stats */}
            <div className="mb-6">
                <h2 className="text-sm font-bold text-[#1E1815] mb-3">Circulation</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon="swap_horiz" label="Active Loans" value={stats?.circulation?.checkouts || 0} color="bg-blue-500" />
                    <StatCard icon="warning" label="Overdue" value={stats?.circulation?.overdue || 0} color="bg-red-500" />
                    <StatCard icon="calendar_month" label="This Month" value={stats?.circulation?.this_month || 0} color="bg-cyan-500" />
                    <StatCard icon="check_circle" label="Returned Today" value={stats?.circulation?.returned_today || 0} color="bg-emerald-500" />
                </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-[#E8E4DF] p-4">
                    <h2 className="text-sm font-bold text-[#1E1815] mb-4">Top Borrowed Books</h2>
                    <div className="space-y-3">
                        {(stats?.top_books || []).slice(0, 5).map((book, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="w-6 h-6 bg-[#FAF7F2] text-[#c16549] text-xs font-bold flex items-center justify-center">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-[#1E1815] truncate">{book.title}</p>
                                    <p className="text-xs text-[#6B6560]">{book.borrow_count} borrows</p>
                                </div>
                            </div>
                        ))}
                        {(!stats?.top_books || stats.top_books.length === 0) && (
                            <p className="text-sm text-[#6B6560]">No data available</p>
                        )}
                    </div>
                </div>
                <div className="bg-white border border-[#E8E4DF] p-4">
                    <h2 className="text-sm font-bold text-[#1E1815] mb-4">Genre Distribution</h2>
                    <div className="space-y-2">
                        {(stats?.genres || []).slice(0, 5).map((genre, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="flex-1">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-[#1E1815]">{genre.name}</span>
                                        <span className="text-[#6B6560]">{genre.count}</span>
                                    </div>
                                    <div className="h-2 bg-[#FAF7F2] overflow-hidden">
                                        <div className="h-full bg-[#c16549]" style={{ width: `${(genre.count / (stats?.collection?.total_books || 1)) * 100}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(!stats?.genres || stats.genres.length === 0) && (
                            <p className="text-sm text-[#6B6560]">No data available</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
