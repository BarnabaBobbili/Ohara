import { useState, useEffect } from 'react';
import { dashboardAPI, reportsAPI, reservationsAPI, circulationAPI, financialAPI, recommendationsAPI } from '../../services/api';
import { formatIST } from '../../utils/dateFormat';

const DAY_MS = 1000 * 60 * 60 * 24;

const getOverdueDays = (dueDate) => {
    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) return 0;
    const difference = (Date.now() - due.getTime()) / DAY_MS;
    return difference > 0 ? Math.ceil(difference) : 0;
};

const toCurrency = (value) => `$${Number.parseFloat(value || 0).toFixed(2)}`;

export default function AdminDashboard() {
    const [stats, setStats] = useState({ books: 0, members: 0, checkouts: 0, overdue: 0, reservations: 0 });
    const [activities, setActivities] = useState([]);
    const [activityTotal, setActivityTotal] = useState(0);
    const [activitySearch, setActivitySearch] = useState('');
    const [activityActionFilter, setActivityActionFilter] = useState('all');
    const [showAllActivities, setShowAllActivities] = useState(false);
    const [allActivitiesLoaded, setAllActivitiesLoaded] = useState(false);
    const [activityLoadingMore, setActivityLoadingMore] = useState(false);
    const [pendingReservations, setPendingReservations] = useState([]);
    const [membersWithDues, setMembersWithDues] = useState([]);
    const [overdueBooks, setOverdueBooks] = useState([]);
    const [recentReturns, setRecentReturns] = useState([]);
    const [recentFinancialTransactions, setRecentFinancialTransactions] = useState([]);
    const [clearingDueMemberId, setClearingDueMemberId] = useState(null);
    const [cancellingReservationId, setCancellingReservationId] = useState(null);
    const [reservationCancelNotes, setReservationCancelNotes] = useState({});
    const [loading, setLoading] = useState(true);
    const [graphStats, setGraphStats] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [statsData, activityData, reservationData, fineReportData, overdueData, returnsData, financialData, graphStatsData] = await Promise.all([
                dashboardAPI.getStats().catch(() => ({})),
                reportsAPI.getActivityLogs({ limit: 50, skip: 0 }).catch(() => ({ logs: [], total: 0 })),
                reservationsAPI.getAll({ status: 'pending', limit: 8 }).catch(() => []),
                reportsAPI.getFineReport().catch(() => ({})),
                circulationAPI.getOverdue().catch(() => []),
                circulationAPI.getRecentReturns(10).catch(() => []),
                financialAPI.getRecentTransactions(12).catch(() => []),
                recommendationsAPI.getGraphStats().catch(() => null),
            ]);
            setStats({
                books: statsData?.total_books || 0,
                members: statsData?.total_members || 0,
                checkouts: statsData?.books_checked_out || 0,
                overdue: statsData?.books_overdue || 0,
                reservations: statsData?.active_reservations || 0,
            });
            const activityLogs = Array.isArray(activityData?.logs) ? activityData.logs : [];
            setActivities(activityLogs);
            setActivityTotal(Number.isFinite(activityData?.total) ? activityData.total : activityLogs.length);
            setAllActivitiesLoaded(false);
            setShowAllActivities(false);
            setPendingReservations(Array.isArray(reservationData) ? reservationData : []);
            setMembersWithDues(Array.isArray(fineReportData?.members_with_fines) ? fineReportData.members_with_fines : []);
            setOverdueBooks(Array.isArray(overdueData) ? overdueData : []);
            setRecentReturns(Array.isArray(returnsData) ? returnsData : []);
            setRecentFinancialTransactions(Array.isArray(financialData) ? financialData : []);
            if (graphStatsData?.books !== undefined) setGraphStats(graphStatsData);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadAllActivities = async () => {
        if (activityLoadingMore || allActivitiesLoaded) return;

        setActivityLoadingMore(true);
        try {
            const PAGE_SIZE = 200;
            const MAX_SKIP = 5000;
            const allLogs = [];
            let skip = 0;
            let total = 0;

            while (true) {
                const response = await reportsAPI.getActivityLogs({ limit: PAGE_SIZE, skip }).catch(() => ({ logs: [], total: 0 }));
                const logs = Array.isArray(response?.logs) ? response.logs : [];
                total = Number.isFinite(response?.total) ? response.total : total;
                allLogs.push(...logs);

                if (logs.length < PAGE_SIZE) break;
                if (skip >= MAX_SKIP) break;
                if (total > 0 && allLogs.length >= total) break;
                skip += PAGE_SIZE;
            }

            setActivities(allLogs);
            setActivityTotal(total || allLogs.length);
            setAllActivitiesLoaded(true);
        } finally {
            setActivityLoadingMore(false);
        }
    };

    const activityActionOptions = [...new Set(
        activities
            .map((activity) => (activity?.action || '').toLowerCase())
            .filter(Boolean)
    )];

    const filteredActivities = activities.filter((activity) => {
        const actionValue = (activity?.action || '').toLowerCase();
        if (activityActionFilter !== 'all' && actionValue !== activityActionFilter) return false;

        const query = activitySearch.trim().toLowerCase();
        if (!query) return true;

        const searchable = [
            activity?.action,
            activity?.book_title,
            activity?.book_isbn,
            activity?.member_name,
            activity?.performed_by,
            activity?.entity_type,
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        return searchable.includes(query);
    });

    const visibleActivities = showAllActivities
        ? filteredActivities
        : filteredActivities.slice(0, 5);

    const handleCancelReservation = async (reservationId) => {
        if (!reservationId) return;

        const note = (reservationCancelNotes[reservationId] || '').trim();
        if (!note) {
            alert('Please enter a cancellation reason before cancelling this reservation.');
            return;
        }

        setCancellingReservationId(reservationId);
        try {
            await reservationsAPI.cancel(reservationId, note);
            const refreshed = await reservationsAPI.getAll({ status: 'pending', limit: 8 }).catch(() => []);
            setPendingReservations(Array.isArray(refreshed) ? refreshed : []);
            setReservationCancelNotes((previous) => ({ ...previous, [reservationId]: '' }));
            const latestStats = await dashboardAPI.getStats().catch(() => null);
            if (latestStats) {
                setStats((previous) => ({
                    ...previous,
                    reservations: latestStats?.active_reservations || 0,
                }));
            }
        } catch (error) {
            console.error('Failed to cancel reservation:', error);
            alert(error.message || 'Failed to cancel reservation');
        } finally {
            setCancellingReservationId(null);
        }
    };

    const handleClearDue = async (member) => {
        const memberId = Number(member?.id);
        const currentDue = Number.parseFloat(member?.fines || 0);
        if (!Number.isFinite(memberId) || !Number.isFinite(currentDue) || currentDue <= 0) {
            alert('This member has no outstanding dues.');
            return;
        }

        const amountRaw = window.prompt(
            `Enter payment amount for ${member.name || `Member #${memberId}`}:`,
            currentDue.toFixed(2)
        );
        if (amountRaw === null) return;

        const amount = Number.parseFloat(amountRaw);
        if (!Number.isFinite(amount) || amount <= 0) {
            alert('Please enter a valid amount greater than 0.');
            return;
        }
        if (amount > currentDue) {
            alert(`Amount cannot exceed current due (${toCurrency(currentDue)}).`);
            return;
        }

        setClearingDueMemberId(memberId);
        try {
            const result = await financialAPI.processPayment(memberId, amount);
            const remaining = Number.parseFloat(result?.remaining_balance ?? 0);
            alert(`Payment processed. Remaining due: ${toCurrency(remaining)}`);
            await loadData();
        } catch (error) {
            alert(error.message || 'Failed to clear due');
        } finally {
            setClearingDueMemberId(null);
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
            <style>{`
                @keyframes ledgerReveal {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                    <div className="h-[2px] w-8 bg-[#c16549]"></div>
                    <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#c16549]">Overview</span>
                </div>
                <h1 className="text-3xl font-bold text-[#1E1815]">Dashboard</h1>
            </div>

            {/* Neo4j Knowledge Graph Stats */}
            {graphStats && (
                <div className="mb-6 bg-gradient-to-br from-[#0f2744] to-[#1a3a5c] p-5 text-white shadow-xl">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="material-symbols-outlined text-2xl text-blue-300">hub</span>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-300">Live</p>
                            <h3 className="text-base font-bold">Neo4j Knowledge Graph</h3>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-center">
                        {[
                            { label: 'Books', value: graphStats.books, icon: 'menu_book' },
                            { label: 'Members', value: graphStats.members, icon: 'people' },
                            { label: 'Borrows', value: graphStats.borrows, icon: 'swap_horiz' },
                            { label: 'Wishlisted', value: graphStats.wishlisted, icon: 'favorite' },
                            { label: 'Authors', value: graphStats.authors, icon: 'person' },
                            { label: 'Categories', value: graphStats.categories, icon: 'category' },
                        ].map(s => (
                            <div key={s.label}>
                                <span className="material-symbols-outlined text-blue-300 text-lg">{s.icon}</span>
                                <p className="text-xl font-bold mt-0.5">{(s.value || 0).toLocaleString()}</p>
                                <p className="text-blue-300 text-[10px] uppercase tracking-wider">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <StatCard icon="auto_stories" label="Total Books" value={stats.books} color="bg-blue-500" />
                <StatCard icon="group" label="Members" value={stats.members} color="bg-green-500" />
                <StatCard icon="swap_horiz" label="Active Loans" value={stats.checkouts} color="bg-purple-500" />
                <StatCard icon="warning" label="Overdue" value={stats.overdue} color="bg-red-500" />
                <StatCard icon="bookmarks" label="Reservations" value={stats.reservations} color="bg-amber-500" />
            </div>

            <div className="bg-white border border-[#E8E4DF] p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-[#1E1815]">Reservation Queue</h2>
                    <span className="text-xs font-semibold text-[#6B6560] uppercase tracking-wide">
                        {pendingReservations.length} pending
                    </span>
                </div>

                {pendingReservations.length === 0 ? (
                    <p className="text-sm text-[#6B6560]">No pending reservations right now.</p>
                ) : (
                    <div className="space-y-2">
                        {pendingReservations.map((reservation) => (
                            <div key={reservation.id} className="border border-[#E8E4DF] p-3 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-[#1E1815] truncate">{reservation.books?.title || 'Unknown Book'}</p>
                                    <p className="text-xs text-[#6B6560] truncate">{reservation.books?.author || 'Unknown Author'} • ISBN {reservation.books?.isbn || 'N/A'}</p>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-[#1E1815]">{reservation.members?.name || 'Unknown Member'}</p>
                                    <p className="text-xs text-[#6B6560]">{reservation.members?.email || 'No email'} • Queue #{reservation.position_in_queue || '-'}</p>
                                </div>

                                <div className="text-xs text-[#6B6560] min-w-[180px]">
                                    <p>Reserved: {formatIST(reservation.reservation_date)}</p>
                                    <p>Expiry: {reservation.expiry_date ? formatIST(reservation.expiry_date) : 'N/A'}</p>
                                </div>

                                <div className="w-full lg:w-[260px] flex flex-col gap-2">
                                    <textarea
                                        value={reservationCancelNotes[reservation.id] || ''}
                                        onChange={(event) => setReservationCancelNotes((previous) => ({
                                            ...previous,
                                            [reservation.id]: event.target.value,
                                        }))}
                                        rows={2}
                                        placeholder="Cancellation reason (required)"
                                        className="w-full px-2.5 py-2 border border-[#E8E4DF] text-xs text-[#1E1815] focus:border-[#c16549] focus:outline-none resize-none"
                                    />
                                    <button
                                        onClick={() => handleCancelReservation(reservation.id)}
                                        disabled={cancellingReservationId === reservation.id}
                                        className="px-3 py-2 bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors disabled:bg-gray-300"
                                    >
                                        {cancellingReservationId === reservation.id ? 'Cancelling...' : 'Cancel With Note'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <section className="mb-6 bg-gradient-to-br from-[#fffdf9] to-[#faf5ef] border border-[#E8E4DF] relative overflow-hidden" style={{ animation: 'ledgerReveal 340ms ease-out' }}>
                <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#c16549] via-[#d37a5f] to-[#c16549]" />
                <div className="p-5 border-b border-[#E8E4DF] flex items-center justify-between gap-3">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-[#a35f48] font-bold">Operations Ledger</p>
                        <h2 className="text-xl font-bold text-[#1E1815] mt-1">Dues, Returns & Financial Flow</h2>
                    </div>
                    <span className="text-xs font-semibold text-[#6B6560] bg-white px-2 py-1 border border-[#E8E4DF]">
                        Synced with live records
                    </span>
                </div>

                <div className="p-5 grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <article className="bg-white border border-[#eddad3] p-4 hover:border-[#c16549] transition-colors duration-200">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm uppercase tracking-[0.12em] text-[#7d2f26] font-bold">Members With Dues</h3>
                            <span className="text-xs text-[#6B6560]">{membersWithDues.length} total</span>
                        </div>
                        {membersWithDues.length === 0 ? (
                            <p className="text-sm text-[#6B6560]">No outstanding dues.</p>
                        ) : (
                            <div className="space-y-2">
                                {membersWithDues.slice(0, 5).map((member) => (
                                    <div key={member.id} className="flex items-center justify-between gap-3 border border-[#f1ebe7] px-3 py-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-[#1E1815] truncate">{member.name}</p>
                                            <p className="text-xs text-[#6B6560] truncate">{member.email || 'No email'}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-red-600">{toCurrency(member.fines)}</span>
                                            <button
                                                onClick={() => handleClearDue(member)}
                                                disabled={clearingDueMemberId === member.id}
                                                className="px-2 py-1 text-[11px] font-medium border border-[#c16549] text-[#c16549] hover:bg-[#c16549] hover:text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                {clearingDueMemberId === member.id ? 'Processing...' : 'Clear'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </article>

                    <article className="bg-white border border-[#eddad3] p-4 hover:border-[#c16549] transition-colors duration-200">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm uppercase tracking-[0.12em] text-[#7d2f26] font-bold">Overdue Books</h3>
                            <span className="text-xs text-[#6B6560]">{overdueBooks.length} active</span>
                        </div>
                        {overdueBooks.length === 0 ? (
                            <p className="text-sm text-[#6B6560]">No overdue books right now.</p>
                        ) : (
                            <div className="space-y-2">
                                {overdueBooks.slice(0, 5).map((loan) => (
                                    <div key={loan.id} className="border border-[#f1ebe7] px-3 py-2">
                                        <p className="text-sm font-semibold text-[#1E1815] truncate">{loan.books?.title || 'Unknown Book'}</p>
                                        <div className="mt-1 flex items-center justify-between text-xs text-[#6B6560]">
                                            <span>{loan.members?.name || 'Unknown member'} • {loan.members?.card_id || 'No card'}</span>
                                            <span className="font-semibold text-red-600">{getOverdueDays(loan.due_date)}d overdue</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </article>

                    <article className="bg-white border border-[#eddad3] p-4 hover:border-[#c16549] transition-colors duration-200">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm uppercase tracking-[0.12em] text-[#7d2f26] font-bold">Past Borrowed Books</h3>
                            <span className="text-xs text-[#6B6560]">recent returns</span>
                        </div>
                        {recentReturns.length === 0 ? (
                            <p className="text-sm text-[#6B6560]">No return history available.</p>
                        ) : (
                            <div className="space-y-2">
                                {recentReturns.slice(0, 5).map((entry) => (
                                    <div key={entry.id} className="border border-[#f1ebe7] px-3 py-2">
                                        <p className="text-sm font-semibold text-[#1E1815] truncate">{entry.books?.title || 'Unknown Book'}</p>
                                        <div className="mt-1 flex items-center justify-between text-xs text-[#6B6560]">
                                            <span>{entry.members?.name || 'Unknown member'}</span>
                                            <span>{entry.return_date ? formatIST(entry.return_date) : 'N/A'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </article>

                    <article className="bg-white border border-[#eddad3] p-4 hover:border-[#c16549] transition-colors duration-200">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm uppercase tracking-[0.12em] text-[#7d2f26] font-bold">Financial Transactions</h3>
                            <span className="text-xs text-[#6B6560]">ledger stream</span>
                        </div>
                        {recentFinancialTransactions.length === 0 ? (
                            <p className="text-sm text-[#6B6560]">No transactions available.</p>
                        ) : (
                            <div className="space-y-2">
                                {recentFinancialTransactions.slice(0, 6).map((transaction) => (
                                    <div key={transaction.id} className="flex items-center justify-between gap-3 border border-[#f1ebe7] px-3 py-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-[#1E1815] capitalize truncate">{transaction.transaction_type}</p>
                                            <p className="text-xs text-[#6B6560] truncate">
                                                {transaction.member_name || `Member #${transaction.member_id}`} • {transaction.description || 'Ledger entry'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-bold ${['payment', 'waiver', 'refund'].includes((transaction.transaction_type || '').toLowerCase()) ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {toCurrency(transaction.amount)}
                                            </p>
                                            <p className="text-[11px] text-[#6B6560]">{transaction.created_at ? formatIST(transaction.created_at) : ''}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </article>
                </div>
            </section>

            {/* Quick Actions & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border border-[#E8E4DF] p-5">
                    <div className="flex flex-col gap-3 mb-4">
                        <h2 className="text-lg font-bold text-[#1E1815]">Recent Activity</h2>
                        <div className="flex flex-col md:flex-row gap-2">
                            <input
                                type="text"
                                value={activitySearch}
                                onChange={(event) => setActivitySearch(event.target.value)}
                                placeholder="Search action, book, ISBN, member, user..."
                                className="flex-1 px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none"
                            />
                            <select
                                value={activityActionFilter}
                                onChange={(event) => setActivityActionFilter(event.target.value)}
                                className="px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none"
                            >
                                <option value="all">All actions</option>
                                {activityActionOptions.map((action) => (
                                    <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>
                                ))}
                            </select>
                            <button
                                onClick={async () => {
                                    if (!showAllActivities && !allActivitiesLoaded) {
                                        await loadAllActivities();
                                    }
                                    setShowAllActivities((prev) => !prev);
                                }}
                                className="px-3 py-2 bg-[#c16549] text-white text-sm font-medium hover:bg-[#a85443] transition-colors disabled:bg-gray-300"
                                disabled={activityLoadingMore}
                            >
                                {activityLoadingMore ? 'Loading...' : (showAllActivities ? 'Show Top 5' : 'Show All')}
                            </button>
                        </div>
                        <p className="text-xs text-[#6B6560]">
                            Showing {visibleActivities.length} of {filteredActivities.length} filtered logs ({activityTotal} total)
                        </p>
                    </div>
                    {filteredActivities.length === 0 ? (
                        <p className="text-sm text-[#6B6560]">No recent activity</p>
                    ) : (
                        <div className="space-y-3">
                            {visibleActivities.map((activity, i) => {
                                const action = activity.action?.toLowerCase() || '';
                                const icon = action.includes('create') || action.includes('add') ? 'add_circle' :
                                             action.includes('delete') || action.includes('remove') ? 'delete' :
                                             action.includes('update') || action.includes('edit') ? 'edit' :
                                             action.includes('checkout') ? 'output' :
                                             action.includes('return') ? 'input' : 'schedule';
                                const actionLabel = activity.action?.replace(/_/g, ' ').toUpperCase() || 'ACTIVITY';
                                
                                return (
                                    <div key={`${activity.timestamp || 'ts'}-${activity.action || 'act'}-${i}`} className="flex items-start gap-3 pb-3 border-b border-[#E8E4DF] last:border-0">
                                        <div className="w-8 h-8 bg-[#FAF7F2] rounded-full flex items-center justify-center">
                                            <span className="material-symbols-outlined text-sm text-[#c16549]">{icon}</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm text-[#1E1815]">
                                                <span className="font-medium">{actionLabel}</span>
                                                {' — '}
                                                <span className="text-[#6B6560]">{activity.book_title}</span>
                                                {activity.book_author && <span className="text-[#6B6560]"> by {activity.book_author}</span>}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                {activity.fields_changed?.length > 0 && (
                                                    <span className="text-xs text-[#c16549]">
                                                        Changed: {activity.fields_changed.join(', ')}
                                                    </span>
                                                )}
                                                <span className="text-xs text-[#6B6560]">
                                                    {formatIST(activity.timestamp)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
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
