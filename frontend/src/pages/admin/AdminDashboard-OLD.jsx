import { ADMIN_COLORS } from '../../styles/adminTheme';
import { useEffect, useMemo, useState } from 'react';
import { financialAPI, reportsAPI, staffBoardAPI } from '../../services/api';

const EMPTY_POST = {
    title: '',
    content: '',
    category: 'announcement',
    is_pinned: false,
    expires_at: '',
};

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [activityLogs, setActivityLogs] = useState([]);
    const [boardPosts, setBoardPosts] = useState([]);
    const [logFilter, setLogFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [savingPost, setSavingPost] = useState(false);
    const [editor, setEditor] = useState(EMPTY_POST);
    const [editingPostId, setEditingPostId] = useState(null);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const [statsData, logsData, boardData] = await Promise.all([
                financialAPI.getDashboardStats().catch(() => ({})),
                reportsAPI.getActivityLogs({ limit: 10 }).catch(() => ({ logs: [] })),
                staffBoardAPI.getAll().catch(() => []),
            ]);

            setStats(statsData || {});
            setActivityLogs(logsData.logs || []);
            setBoardPosts(Array.isArray(boardData) ? boardData : []);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = useMemo(() => {
        if (!logFilter.trim()) return activityLogs;
        const query = logFilter.toLowerCase();
        return activityLogs.filter((entry) =>
            [entry.action, entry.book_title, entry.member_name, entry.transaction_id]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query))
        );
    }, [activityLogs, logFilter]);

    const activePost = boardPosts[0] || null;

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const getActionColor = (action) => {
        const colors = {
            checkout: 'blue',
            checkin: 'emerald',
            return: 'emerald',
            alert: 'red',
            delivery: 'purple',
            fine: 'gray',
            security: 'amber',
        };
        return colors[action?.toLowerCase()] || 'gray';
    };

    const startEditing = (post) => {
        setEditingPostId(post.id);
        setEditor({
            title: post.title || '',
            content: post.content || '',
            category: post.category || 'announcement',
            is_pinned: Boolean(post.is_pinned),
            expires_at: post.expires_at ? new Date(post.expires_at).toISOString().slice(0, 16) : '',
        });
    };

    const resetEditor = () => {
        setEditingPostId(null);
        setEditor(EMPTY_POST);
    };

    const handleSavePost = async (event) => {
        event.preventDefault();
        try {
            setSavingPost(true);
            const payload = {
                ...editor,
                expires_at: editor.expires_at || null,
            };

            if (editingPostId) {
                await staffBoardAPI.update(editingPostId, payload);
            } else {
                await staffBoardAPI.create(payload);
            }

            resetEditor();
            await loadDashboardData();
        } catch (error) {
            console.error('Failed to save post:', error);
            alert(`Failed to save post: ${error.message}`);
        } finally {
            setSavingPost(false);
        }
    };

    const handleDeletePost = async (postId) => {
        if (!confirm('Delete this staff board post?')) return;

        try {
            await staffBoardAPI.remove(postId);
            if (editingPostId === postId) {
                resetEditor();
            }
            await loadDashboardData();
        } catch (error) {
            console.error('Failed to delete post:', error);
            alert(`Failed to delete post: ${error.message}`);
        }
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

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
                <div className="max-w-7xl mx-auto h-full flex flex-col lg:flex-row gap-8">
                    <div className="flex-1 flex flex-col gap-6 min-w-0">
                        <div className="w-full">
                            <div className="relative flex items-center h-12 w-full rounded border shadow-sm focus-within:ring-1 transition-all"
                                style={{ borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.cardBg }}>
                                <div className="absolute left-4 flex items-center justify-center" style={{ color: ADMIN_COLORS.burgundy }}>
                                    <span className="material-symbols-outlined">search</span>
                                </div>
                                <input
                                    className="w-full h-full bg-transparent border-none pl-12 pr-16 sm:pr-4 focus:ring-0 text-sm sm:text-base md:text-lg"
                                    placeholder="Search activity logs..."
                                    type="text"
                                    value={logFilter}
                                    onChange={(event) => setLogFilter(event.target.value)}
                                    style={{ fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textPrimary }}
                                />
                            </div>
                        </div>

                        <div className="border rounded shadow-sm flex-1 flex flex-col overflow-hidden relative"
                            style={{ backgroundColor: ADMIN_COLORS.cardBg, borderColor: ADMIN_COLORS.border }}>
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
                                        {filteredLogs.length > 0 ? filteredLogs.map((entry, index) => (
                                            <tr key={`${entry.transaction_id || index}-${entry.timestamp || index}`} className="group transition-colors hover:bg-opacity-10" style={{ borderBottom: `1px solid ${ADMIN_COLORS.border}` }}>
                                                <td className="px-3 sm:px-4 md:px-6 py-3 md:py-4 text-sm" style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textMuted }}>{formatTime(entry.timestamp)}</td>
                                                <td className="px-3 sm:px-4 md:px-6 py-3 md:py-4">
                                                    <ActionBadge color={getActionColor(entry.action)}>{entry.action}</ActionBadge>
                                                </td>
                                                <td className="px-3 sm:px-4 md:px-6 py-3 md:py-4 font-medium" style={{ color: ADMIN_COLORS.textPrimary }}>
                                                    {entry.book_title || 'Library event'}
                                                    <span className="block text-xs font-normal mt-0.5" style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textMuted }}>Book ID: {entry.book_id || 'N/A'}</span>
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
                                                    <StatusText color="muted">#{entry.transaction_id || '---'}</StatusText>
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

                    <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-6 sm:gap-8">
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

                        <div className="flex flex-col gap-4">
                            <h3 className="text-lg sm:text-xl italic font-medium px-1 flex items-center justify-between" style={{ fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textPrimary }}>
                                Staff Board
                                <button onClick={resetEditor} className="transition-colors" style={{ color: ADMIN_COLORS.burgundy }}>
                                    <span className="material-symbols-outlined text-lg">add_circle</span>
                                </button>
                            </h3>
                            <div className="border rounded-sm shadow-sm p-4 sm:p-6"
                                style={{ backgroundColor: ADMIN_COLORS.cardBg, borderColor: ADMIN_COLORS.border }}>
                                {activePost ? (
                                    <div className="relative p-4 sm:p-5 rounded-lg shadow-sm border"
                                        style={{ backgroundColor: `${ADMIN_COLORS.tan}10`, borderColor: `${ADMIN_COLORS.tan}40` }}>
                                        <div className="absolute -top-3 right-4 rounded-full p-1 shadow-sm z-10 border"
                                            style={{ backgroundColor: ADMIN_COLORS.cardBg, borderColor: ADMIN_COLORS.border, color: ADMIN_COLORS.red }}>
                                            <span className="material-symbols-outlined text-lg block transform rotate-45">push_pin</span>
                                        </div>
                                        <div className="flex flex-col h-full">
                                            <span className="inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider w-fit mb-3"
                                                style={{ backgroundColor: `${ADMIN_COLORS.tan}50`, color: ADMIN_COLORS.tan, borderWidth: '1px', borderColor: `${ADMIN_COLORS.tan}60` }}>{activePost.category}</span>
                                            <h4 className="font-bold mb-2 text-lg" style={{ fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textPrimary }}>{activePost.title}</h4>
                                            <div className="prose prose-sm leading-relaxed mb-4 whitespace-pre-line" style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textPrimary }}>
                                                {activePost.content}
                                            </div>
                                            <div className="mt-auto pt-4 flex justify-between items-center gap-3" style={{ borderTop: `1px solid ${ADMIN_COLORS.borderDotted}40` }}>
                                                <span className="text-xs italic" style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textMuted }}>
                                                    Posted by {activePost.staff?.name || activePost.staff?.email || 'Admin'}
                                                </span>
                                                <div className="flex gap-2">
                                                    <button className="text-xs font-bold hover:underline" style={{ color: ADMIN_COLORS.burgundy }} onClick={() => startEditing(activePost)}>Edit</button>
                                                    <button className="text-xs font-bold hover:underline" style={{ color: ADMIN_COLORS.red }} onClick={() => handleDeletePost(activePost.id)}>Delete</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p style={{ color: ADMIN_COLORS.textMuted }}>No staff notices yet.</p>
                                )}

                                {boardPosts.length > 1 && (
                                    <div className="mt-4 flex flex-col gap-2">
                                        {boardPosts.slice(1, 4).map((post) => (
                                            <button
                                                key={post.id}
                                                onClick={() => startEditing(post)}
                                                className="text-left p-3 rounded border hover:bg-[#faf6f0] transition-colors"
                                                style={{ borderColor: ADMIN_COLORS.border }}
                                            >
                                                <div className="text-xs uppercase tracking-wider mb-1" style={{ color: ADMIN_COLORS.textMuted }}>{post.category}</div>
                                                <div className="font-semibold" style={{ color: ADMIN_COLORS.textPrimary }}>{post.title}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleSavePost} className="border rounded-sm shadow-sm p-4 flex flex-col gap-3"
                                style={{ backgroundColor: ADMIN_COLORS.cardBg, borderColor: ADMIN_COLORS.border }}>
                                <div className="flex items-center justify-between">
                                    <h4 style={{ fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textPrimary }}>
                                        {editingPostId ? 'Edit Notice' : 'New Notice'}
                                    </h4>
                                    {editingPostId && (
                                        <button type="button" onClick={resetEditor} className="text-xs uppercase tracking-wider" style={{ color: ADMIN_COLORS.textMuted }}>
                                            Cancel
                                        </button>
                                    )}
                                </div>
                                <input
                                    value={editor.title}
                                    onChange={(event) => setEditor((current) => ({ ...current, title: event.target.value }))}
                                    placeholder="Title"
                                    className="w-full px-3 py-2 rounded border"
                                    style={{ borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.primaryBg, color: ADMIN_COLORS.textPrimary }}
                                />
                                <textarea
                                    value={editor.content}
                                    onChange={(event) => setEditor((current) => ({ ...current, content: event.target.value }))}
                                    placeholder="Write the announcement"
                                    rows={5}
                                    className="w-full px-3 py-2 rounded border resize-none"
                                    style={{ borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.primaryBg, color: ADMIN_COLORS.textPrimary }}
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <select
                                        value={editor.category}
                                        onChange={(event) => setEditor((current) => ({ ...current, category: event.target.value }))}
                                        className="px-3 py-2 rounded border"
                                        style={{ borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.primaryBg, color: ADMIN_COLORS.textPrimary }}
                                    >
                                        <option value="announcement">Announcement</option>
                                        <option value="memo">Memo</option>
                                        <option value="alert">Alert</option>
                                    </select>
                                    <input
                                        type="datetime-local"
                                        value={editor.expires_at}
                                        onChange={(event) => setEditor((current) => ({ ...current, expires_at: event.target.value }))}
                                        className="px-3 py-2 rounded border"
                                        style={{ borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.primaryBg, color: ADMIN_COLORS.textPrimary }}
                                    />
                                </div>
                                <label className="flex items-center gap-2 text-sm" style={{ color: ADMIN_COLORS.textSecondary }}>
                                    <input
                                        type="checkbox"
                                        checked={editor.is_pinned}
                                        onChange={(event) => setEditor((current) => ({ ...current, is_pinned: event.target.checked }))}
                                    />
                                    Pin this post
                                </label>
                                <button
                                    type="submit"
                                    disabled={savingPost || !editor.title.trim() || !editor.content.trim()}
                                    className="px-4 py-2 rounded hover:opacity-90 transition"
                                    style={{ backgroundColor: ADMIN_COLORS.burgundy, color: 'white' }}
                                >
                                    {savingPost ? 'Saving...' : editingPostId ? 'Update Notice' : 'Publish Notice'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

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

function StatCard({ label, value, suffix, change, changePositive, icon, borderColor, iconColor, subtitle }) {
    return (
        <div className="relative p-4 rounded-sm shadow-sm border-l-4 overflow-hidden transition-all hover:shadow-md"
            style={{ backgroundColor: ADMIN_COLORS.cardBg, borderLeftColor: borderColor, borderTop: `1px solid ${ADMIN_COLORS.border}`, borderRight: `1px solid ${ADMIN_COLORS.border}`, borderBottom: `1px solid ${ADMIN_COLORS.border}` }}>
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
