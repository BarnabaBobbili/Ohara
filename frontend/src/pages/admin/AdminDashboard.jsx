import { useState, useEffect } from 'react';
import { reportsAPI, staffBoardAPI } from '../../services/api';

export default function AdminDashboard() {
    const [stats, setStats] = useState({ books: 0, members: 0, checkouts: 0, overdue: 0 });
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [statsData, activityData] = await Promise.all([
                reportsAPI.getStats().catch(() => ({})),
                staffBoardAPI.getPosts().catch(() => [])
            ]);
            setStats({
                books: statsData?.collection?.total_books || 0,
                members: statsData?.membership?.total || 0,
                checkouts: statsData?.circulation?.checkouts || 0,
                overdue: statsData?.circulation?.overdue || 0
            });
            setActivities(Array.isArray(activityData) ? activityData.slice(0, 5) : []);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ icon, label, value, color }) => (
        <div className="bg-white border border-[#E8E4DF] p-4 hover:border-[#c16549] transition-colors">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
                    <span className="material-symbols-outlined text-white text-lg">{icon}</span>
                </div>
                <div>
                    <p className="text-xs text-[#6B6560] uppercase tracking-wide font-medium">{label}</p>
                    <p className="text-2xl font-bold text-[#1E1815]">{value.toLocaleString()}</p>
                </div>
            </div>
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
                    <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#c16549]">Overview</span>
                </div>
                <h1 className="text-3xl font-bold text-[#1E1815]">Dashboard</h1>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard icon="auto_stories" label="Total Books" value={stats.books} color="bg-blue-500" />
                <StatCard icon="group" label="Members" value={stats.members} color="bg-green-500" />
                <StatCard icon="swap_horiz" label="Active Loans" value={stats.checkouts} color="bg-purple-500" />
                <StatCard icon="warning" label="Overdue" value={stats.overdue} color="bg-red-500" />
            </div>

            {/* Quick Actions & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border border-[#E8E4DF] p-5">
                    <h2 className="text-lg font-bold text-[#1E1815] mb-4">Recent Activity</h2>
                    {activities.length === 0 ? (
                        <p className="text-sm text-[#6B6560]">No recent activity</p>
                    ) : (
                        <div className="space-y-3">
                            {activities.map((activity, i) => (
                                <div key={i} className="flex items-start gap-3 pb-3 border-b border-[#E8E4DF] last:border-0">
                                    <div className="w-8 h-8 bg-[#FAF7F2] rounded-full flex items-center justify-center">
                                        <span className="material-symbols-outlined text-sm text-[#c16549]">schedule</span>
                                    </div>
                                    <div>
                                        <p className="text-sm text-[#1E1815]">{activity.content || activity.title}</p>
                                        <p className="text-xs text-[#6B6560]">{new Date(activity.created_at).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-[#c16549] text-white p-5">
                    <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
                    <div className="space-y-2">
                        <a href="/admin/books" className="flex items-center gap-2 p-3 bg-white/10 hover:bg-white/20 rounded transition-colors text-sm">
                            <span className="material-symbols-outlined text-lg">add_circle</span>
                            Add New Book
                        </a>
                        <a href="/admin/members" className="flex items-center gap-2 p-3 bg-white/10 hover:bg-white/20 rounded transition-colors text-sm">
                            <span className="material-symbols-outlined text-lg">person_add</span>
                            Register Member
                        </a>
                        <a href="/admin/circulation" className="flex items-center gap-2 p-3 bg-white/10 hover:bg-white/20 rounded transition-colors text-sm">
                            <span className="material-symbols-outlined text-lg">sync_alt</span>
                            Process Transaction
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
