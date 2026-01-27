import { ADMIN_COLORS } from '../../styles/adminTheme';
import { useState, useEffect } from 'react';
import { dashboardAPI, reportsAPI } from '../../services/api';

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [activityLogs, setActivityLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            // Fetch dashboard stats
            const statsData = await dashboardAPI.getStats();
            setStats(statsData);

            // Fetch activity logs
            const logsData = await reportsAPI.getActivityLogs({ limit: 10 });
            setActivityLogs(logsData.logs || []);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const getActionColor = (action) => {
        const colors = {
            'checkout': 'blue',
            'checkin': 'emerald',
            'return': 'emerald',
            'alert': 'red',
            'delivery': 'purple',
            'fine': 'gray',
            'security': 'amber',
        };
        return colors[action?.toLowerCase()] || 'gray';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen" style={{ backgroundColor: ADMIN_COLORS.primaryBg }}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4" style={{ borderColor: ADMIN_COLORS.burgundy }}></div>
                    <p style={{ color: ADMIN_COLORS.textMuted }}>Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen" style={{ backgroundColor: ADMIN_COLORS.primaryBg }}>
            {/* Top Header */}
            <header className="flex-shrink-0 px-4 sm:px-6 md:px-8 py-4 sm:py-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 sm:gap-0" style={{ borderBottom: `1px solid ${ADMIN_COLORS.border}`, backgroundColor: ADMIN_COLORS.cardBg }}>
                <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium uppercase tracking-wider" style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textMuted }}>Ohara Dashboard</p>
                    <h2 className="text-2xl sm:text-3xl font-semibold italic" style={{ fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textPrimary }}>Tree of Knowledge</h2>
                </div>
                <div className="flex flex-col items-start sm:items-end gap-1">
                    <p className="text-base sm:text-lg" style={{ fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textPrimary }}>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    <p className="text-sm" style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textMuted }}>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
            </header>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
                <div className="max-w-7xl mx-auto h-full flex flex-col lg:flex-row gap-8">
                    {/* Left Column: The Ledger (Dominant) */}
                    <div className="flex-1 flex flex-col gap-6 min-w-0">
                        {/* Search Bar */}
                        <div className="w-full">
                            <div className="relative flex items-center h-12 w-full rounded border shadow-sm focus-within:ring-1 transition-all"
                                style={{ borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.cardBg }}>
                                <div className="absolute left-4 flex items-center justify-center" style={{ color: ADMIN_COLORS.burgundy }}>
                                    <span className="material-symbols-outlined">search</span>
                                </div>
                                <input className="w-full h-full bg-transparent border-none pl-12 pr-16 sm:pr-4 focus:ring-0 text-sm sm:text-base md:text-lg" placeholder="Search activity logs..." type="text"
                                    style={{ fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textPrimary }} />
                                <div className="absolute right-2">
                                    <button className="px-3 py-1 text-xs font-medium rounded transition"
                                        style={{ fontFamily: "'Noto Sans', sans-serif", backgroundColor: ADMIN_COLORS.secondaryBg, color: ADMIN_COLORS.textSecondary }}>Filter</button>
                                </div>
                            </div>
                        </div>

                        {/* The Ledger Table */}
                        <div className="border rounded shadow-sm flex-1 flex flex-col overflow-hidden relative"
                            style={{ backgroundColor: ADMIN_COLORS.cardBg, borderColor: ADMIN_COLORS.border }}>
                            {/* Paper lines background effect (subtle) */}
                            <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px)', backgroundSize: '100% 3rem' }}></div>

                            <div className="overflow-x-auto flex-1">
                                <table className="w-full text-left border-collapse min-w-[640px]">
                                    <thead>
                                        <tr style={{ borderBottom: `2px solid ${ADMIN_COLORS.border}`, backgroundColor: `${ADMIN_COLORS.secondaryBg}50` }}>
                                            <th className="px-3 sm:px-4 md:px-6 py-3 md:py-4 text-xs font-bold uppercase tracking-wider w-20 sm:w-32" style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textMuted }}>Time</th>
                                            <th className="px-3 sm:px-4 md:px-6 py-3 md:py-4 text-xs font-bold uppercase tracking-wider w-32 sm:w-40" style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textMuted }}>Action</th>
                                            <th className="px-3 sm:px-4 md:px-6 py-3 md:py-4 text-xs font-bold uppercase tracking-wider" style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textMuted }}>Item / Patron</th>
                                            <th className="px-3 sm:px-4 md:px-6 py-3 md:py-4 text-xs font-bold uppercase tracking-wider w-32 sm:w-48" style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textMuted }}>Member</th>
                                            <th className="px-3 sm:px-4 md:px-6 py-3 md:py-4 text-xs font-bold uppercase tracking-wider w-32 sm:w-40 text-right" style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textMuted }}>ID</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-base" style={{ fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textPrimary }}>
                                        {activityLogs.length > 0 ? activityLogs.map((entry, index) => (
                                            <tr key={index} className="group transition-colors hover:bg-opacity-10" style={{ borderBottom: `1px solid ${ADMIN_COLORS.border}` }}>
                                                <td className="px-3 sm:px-4 md:px-6 py-3 md:py-4 text-sm" style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textMuted }}>{formatTime(entry.timestamp)}</td>
                                                <td className="px-3 sm:px-4 md:px-6 py-3 md:py-4">
                                                    <ActionBadge color={getActionColor(entry.action)}>{entry.action}</ActionBadge>
                                                </td>
                                                <td className="px-3 sm:px-4 md:px-6 py-3 md:py-4 font-medium" style={{ color: ADMIN_COLORS.textPrimary }}>
                                                    {entry.book_title}
                                                    <span className="block text-xs font-normal mt-0.5" style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textMuted }}>Book ID: {entry.book_id}</span>
                                                </td>
                                                <td className="px-3 sm:px-4 md:px-6 py-3 md:py-4 text-sm" style={{ color: ADMIN_COLORS.textPrimary }}>
                                                    <div className="flex items-center gap-2">
                                                        <div className="size-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                                                            style={{ backgroundColor: ADMIN_COLORS.secondaryBg, color: ADMIN_COLORS.textSecondary }}>
                                                            {entry.member_name?.substring(0, 2).toUpperCase() || '??'}
                                                        </div>
                                                        <span style={{ fontFamily: "'Noto Sans', sans-serif" }}>{entry.member_name || 'Unknown'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 sm:px-4 md:px-6 py-3 md:py-4 text-right">
                                                    <StatusText color="muted">#{entry.transaction_id}</StatusText>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-8 text-center" style={{ color: ADMIN_COLORS.textMuted }}>
                                                    No recent activity
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-3 flex justify-center" style={{ borderTop: `1px solid ${ADMIN_COLORS.border}`, backgroundColor: `${ADMIN_COLORS.secondaryBg}50` }}>
                                <button onClick={loadDashboardData} className="text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1 hover:opacity-80"
                                    style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textMuted }}>
                                    Refresh
                                    <span className="material-symbols-outlined text-sm">refresh</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Stats & Memo */}
                    <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-6 sm:gap-8">
                        {/* Stacked Quick Stats */}
                        <div className="flex flex-col gap-4">
                            <h3 className="text-lg sm:text-xl italic font-medium px-1" style={{ fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textPrimary }}>Quick Stats</h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                                <StatCard
                                    label="Books Available"
                                    value={stats?.books_available || 0}
                                    suffix={`/ ${stats?.total_books || 0}`}
                                    icon="library_books"
                                    borderColor={ADMIN_COLORS.burgundy}
                                    iconColor={ADMIN_COLORS.burgundy}
                                    subtitle="Total books in library"
                                />

                                <StatCard
                                    label="Active Members"
                                    value={stats?.total_members || 0}
                                    icon="person_filled"
                                    borderColor={ADMIN_COLORS.burgundy}
                                    iconColor={ADMIN_COLORS.burgundy}
                                    subtitle="Registered patrons"
                                />

                                <StatCard
                                    label="Checked Out"
                                    value={stats?.books_checked_out || 0}
                                    icon="schedule"
                                    borderColor={ADMIN_COLORS.tan}
                                    iconColor={ADMIN_COLORS.tan}
                                    subtitle="Currently borrowed"
                                />

                                <StatCard
                                    label="Overdue"
                                    value={stats?.books_overdue || 0}
                                    icon="warning"
                                    borderColor={ADMIN_COLORS.red}
                                    iconColor={ADMIN_COLORS.red}
                                    subtitle="Past due date"
                                />
                            </div>
                        </div>

                        {/* Staff Board / Memo */}
                        <div className="flex flex-col gap-4">
                            <h3 className="text-lg sm:text-xl italic font-medium px-1 flex items-center justify-between" style={{ fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textPrimary }}>
                                Staff Board
                                <button className="transition-colors" style={{ color: ADMIN_COLORS.burgundy, ':hover': { color: `${ADMIN_COLORS.burgundy}dd` } }}>
                                    <span className="material-symbols-outlined text-lg">add_circle</span>
                                </button>
                            </h3>
                            <div className="border rounded-sm shadow-sm p-4 sm:p-6"
                                style={{ backgroundColor: ADMIN_COLORS.cardBg, borderColor: ADMIN_COLORS.border }}>
                                {/* Staff Announcement */}
                                <div className="relative p-4 sm:p-5 rounded-lg shadow-sm border"
                                    style={{ backgroundColor: `${ADMIN_COLORS.tan}10`, borderColor: `${ADMIN_COLORS.tan}40` }}>
                                    {/* Pin Icon */}
                                    <div className="absolute -top-3 right-4 rounded-full p-1 shadow-sm z-10 border"
                                        style={{ backgroundColor: ADMIN_COLORS.cardBg, borderColor: ADMIN_COLORS.border, color: ADMIN_COLORS.red }}>
                                        <span className="material-symbols-outlined text-lg block transform rotate-45">push_pin</span>
                                    </div>
                                    <div className="flex flex-col h-full">
                                        <span className="inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider w-fit mb-3"
                                            style={{ backgroundColor: `${ADMIN_COLORS.tan}50`, color: ADMIN_COLORS.tan, borderWidth: '1px', borderColor: `${ADMIN_COLORS.tan}60` }}>Announcement</span>
                                        <h4 className="font-bold mb-2 text-lg" style={{ fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textPrimary }}>Holiday Hours Update</h4>
                                        <div className="prose prose-sm leading-relaxed mb-4" style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textPrimary }}>
                                            <p>Please note that the library will be closing early on <strong>November 24th</strong> for the Thanksgiving holiday.</p>
                                            <ul className="list-disc list-inside mt-2 text-xs space-y-1" style={{ color: ADMIN_COLORS.textSecondary }}>
                                                <li>Main Floor: Closes 2:00 PM</li>
                                                <li>Archives: Closed all day</li>
                                            </ul>
                                        </div>
                                        <div className="mt-auto pt-4 flex justify-between items-center" style={{ borderTop: `1px solid ${ADMIN_COLORS.borderDotted}40` }}>
                                            <span className="text-xs italic" style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textMuted }}>Posted by Admin</span>
                                            <button className="text-xs font-bold hover:underline" style={{ color: ADMIN_COLORS.burgundy }}>View details</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ActionBadge Component
function ActionBadge({ color, children }) {
    const colorMap = {
        emerald: { bg: `${ADMIN_COLORS.green}20`, text: ADMIN_COLORS.green },
        blue: { bg: `${ADMIN_COLORS.burgundy}20`, text: ADMIN_COLORS.burgundy },
        red: { bg: `${ADMIN_COLORS.red}20`, text: ADMIN_COLORS.red },
        purple: { bg: `${ADMIN_COLORS.tan}20`, text: ADMIN_COLORS.tan },
        gray: { bg: ADMIN_COLORS.secondaryBg, text: ADMIN_COLORS.textSecondary },
        amber: { bg: `${ADMIN_COLORS.tan}20`, text: ADMIN_COLORS.tan },
    };

    const colors = colorMap[color] || colorMap.gray;

    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-bold"
            style={{ fontFamily: "'Noto Sans', sans-serif", backgroundColor: colors.bg, color: colors.text }}>
            {children}
        </span>
    );
}

// StatusText Component
function StatusText({ color, children }) {
    const colorMap = {
        muted: ADMIN_COLORS.textMuted,
        main: ADMIN_COLORS.textPrimary,
        orange: ADMIN_COLORS.tan,
        emerald: ADMIN_COLORS.green,
    };

    return (
        <span className={`text-sm ${color === 'muted' ? 'italic' : 'font-medium'}`}
            style={{ fontFamily: "'Noto Sans', sans-serif", color: colorMap[color] || ADMIN_COLORS.textMuted }}>
            {children}
        </span>
    );
}

// StatCard Component
function StatCard({ label, value, suffix, change, changePositive, icon, borderColor, iconColor, subtitle }) {
    return (
        <div className="relative p-4 rounded-sm shadow-sm border-l-4 overflow-hidden transition-all hover:shadow-md"
            style={{ backgroundColor: ADMIN_COLORS.cardBg, borderLeftColor: borderColor, borderTop: `1px solid ${ADMIN_COLORS.border}`, borderRight: `1px solid ${ADMIN_COLORS.border}`, borderBottom: `1px solid ${ADMIN_COLORS.border}` }}>
            {/* Subtle background texture */}
            <div className="absolute top-0 right-0 opacity-5">
                <span className="material-symbols-outlined text-6xl" style={{ color: iconColor }}>
                    {icon}
                </span>
            </div>
            <div className="relative flex items-start justify-between mb-2">
                <span className="text-xs uppercase tracking-wider font-bold" style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textMuted }}>
                    {label}
                </span>
                <span className="material-symbols-outlined text-lg" style={{ color: iconColor }}>
                    {icon}
                </span>
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold" style={{ fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textPrimary }}>
                    {value}
                </span>
                {suffix && <span className="text-lg" style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textMuted }}>{suffix}</span>}
            </div>
            {subtitle && <p className="text-xs mt-1" style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textMuted }}>{subtitle}</p>}
            {change && (
                <div className={`text-xs font-bold mt-2 flex items-center gap-1`} style={{ color: changePositive ? ADMIN_COLORS.green : ADMIN_COLORS.red }}>
                    <span className="material-symbols-outlined text-xs">{changePositive ? 'arrow_upward' : 'arrow_downward'}</span>
                    {change}
                </div>
            )}
        </div>
    );
}
