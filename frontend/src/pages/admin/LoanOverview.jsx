import { useState, useEffect, useCallback, useRef } from 'react';
import { circulationAPI, reservationsAPI, financialAPI, settingsAPI } from '../../services/api';
import { formatIST, formatDateIST } from '../../utils/dateFormat';

// ─── Constants ─────────────────────────────────────────────────────────────
const DAY_MS = 1000 * 60 * 60 * 24;

const BOOK_CONDITIONS = [
    { value: 'new',     label: 'New',     description: 'Brand new, pristine', color: 'text-emerald-600' },
    { value: 'good',    label: 'Good',    description: 'Minor wear, fully functional', color: 'text-green-600' },
    { value: 'fair',    label: 'Fair',    description: 'Noticeable wear, some creases', color: 'text-yellow-600' },
    { value: 'poor',    label: 'Poor',    description: 'Heavy wear, may have damage', color: 'text-orange-600' },
    { value: 'damaged', label: 'Damaged', description: 'Significant damage', color: 'text-red-600' },
];

const TABS = [
    { id: 'active',       label: 'Active Loans',    icon: 'swap_horiz' },
    { id: 'past',         label: 'Past Borrowed',   icon: 'history'    },
    { id: 'overdue',      label: 'Overdue',         icon: 'warning'    },
    { id: 'reservations', label: 'Reservations',    icon: 'bookmarks'  },
];

const RESERVATION_STATUSES = ['all', 'pending', 'fulfilled', 'cancelled', 'expired'];

const getOverdueDays = (dueDate) => {
    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) return 0;
    const diff = (Date.now() - due.getTime()) / DAY_MS;
    return diff > 0 ? Math.ceil(diff) : 0;
};

const calcFine = (dueDate, rate = 1, cap = 25) => {
    const days = getOverdueDays(dueDate);
    return days > 0 ? Math.min(days * rate, cap) : 0;
};

const statusPill = (status) => {
    const map = {
        checked_out: 'bg-blue-100 text-blue-700',
        overdue:     'bg-red-100 text-red-700',
        returned:    'bg-emerald-100 text-emerald-700',
        pending:     'bg-amber-100 text-amber-700',
        fulfilled:   'bg-emerald-100 text-emerald-700',
        cancelled:   'bg-gray-100 text-gray-500',
        expired:     'bg-red-100 text-red-700',
        active:      'bg-blue-100 text-blue-700',
    };
    return map[status?.toLowerCase()] || 'bg-gray-100 text-gray-500';
};

// ─── Shared UI ──────────────────────────────────────────────────────────────
const Spinner = () => (
    <div className="flex items-center justify-center py-16">
        <span className="material-symbols-outlined text-3xl text-[#c16549] animate-spin">refresh</span>
    </div>
);

const EmptyState = ({ icon, message }) => (
    <div className="py-16 flex flex-col items-center gap-3 text-[#6B6560]">
        <span className="material-symbols-outlined text-4xl opacity-30">{icon}</span>
        <p className="text-sm">{message}</p>
    </div>
);

const SearchBar = ({ value, onChange, placeholder }) => (
    <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#6B6560] text-[18px]">search</span>
        <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder || 'Search…'}
            className="w-full pl-9 pr-4 py-2.5 border border-[#E8E4DF] text-sm text-[#1E1815] focus:border-[#c16549] focus:outline-none bg-white"
        />
    </div>
);

const Pagination = ({ page, total, onChange }) => {
    if (total <= 1) return null;
    return (
        <div className="flex items-center justify-center gap-2 mt-5 pt-4 border-t border-[#E8E4DF]">
            <button onClick={() => onChange(page - 1)} disabled={page === 1}
                className="px-3 py-1.5 border border-[#E8E4DF] text-sm text-[#6B6560] hover:text-[#c16549] hover:border-[#c16549] disabled:opacity-30 transition-colors">
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>
            <span className="text-xs text-[#6B6560] px-2">Page {page} of {total}</span>
            <button onClick={() => onChange(page + 1)} disabled={page === total}
                className="px-3 py-1.5 border border-[#E8E4DF] text-sm text-[#6B6560] hover:text-[#c16549] hover:border-[#c16549] disabled:opacity-30 transition-colors">
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
        </div>
    );
};

// ─── Loan Detail Drawer ─────────────────────────────────────────────────────
function LoanDrawer({ loan, fineSettings, onClose, onCheckin, onClearDue }) {
    const [returnCondition, setReturnCondition] = useState(loan.checkout_condition || 'good');
    const [returnNotes,     setReturnNotes]     = useState('');
    const [processing,      setProcessing]      = useState(false);
    const [clearingDue,     setClearingDue]     = useState(false);
    const drawerRef = useRef(null);

    const isOverdue = loan.due_date && new Date(loan.due_date) < new Date();
    const overdueDays = isOverdue ? getOverdueDays(loan.due_date) : 0;
    const estimatedFine = isOverdue ? calcFine(loan.due_date, fineSettings.dailyRate, fineSettings.maxCap) : 0;

    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const handleCheckin = async () => {
        setProcessing(true);
        try {
            await onCheckin(loan.id, returnCondition, returnNotes);
            onClose();
        } finally {
            setProcessing(false);
        }
    };

    const handleClearDue = async () => {
        const memberDue = Number.parseFloat(loan.members?.fines || 0);
        const amtRaw = window.prompt(`Enter payment amount for ${loan.members?.name || 'this member'} (due: $${memberDue.toFixed(2)}):`, memberDue.toFixed(2));
        if (amtRaw === null) return;
        const amount = Number.parseFloat(amtRaw);
        if (!Number.isFinite(amount) || amount <= 0) { alert('Enter a valid amount > 0'); return; }
        if (amount > memberDue) { alert(`Cannot exceed due amount $${memberDue.toFixed(2)}`); return; }
        setClearingDue(true);
        try {
            await onClearDue(loan.members?.id || loan.member_id, amount);
        } finally {
            setClearingDue(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div ref={drawerRef}
                className="relative z-10 w-full max-w-[480px] h-full bg-white shadow-2xl overflow-y-auto flex flex-col"
                style={{ animation: 'slideInRight 200ms ease-out' }}>
                <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

                {/* Drawer Header */}
                <div className="sticky top-0 bg-white z-10 border-b border-[#E8E4DF] px-6 py-4 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#c16549]">Loan Details</p>
                        <h3 className="text-lg font-bold text-[#1E1815] mt-0.5 leading-tight truncate max-w-[340px]">
                            {loan.books?.title || 'Unknown Book'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-[#FAF7F2] rounded text-[#6B6560] hover:text-[#1E1815] transition-colors">
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <div className="flex-1 p-6 space-y-5">
                    {/* Overdue Alert */}
                    {isOverdue && (
                        <div className="bg-red-50 border border-red-200 p-4 flex gap-3">
                            <span className="material-symbols-outlined text-red-600 text-2xl shrink-0">payments</span>
                            <div>
                                <p className="text-sm font-bold text-red-800">{overdueDays} day{overdueDays !== 1 ? 's' : ''} overdue</p>
                                <p className="text-lg font-bold text-red-700 mt-1">Estimated fine: ${estimatedFine.toFixed(2)}</p>
                                <p className="text-xs text-red-600 mt-0.5">${fineSettings.dailyRate.toFixed(2)}/day · max ${fineSettings.maxCap.toFixed(2)}</p>
                            </div>
                        </div>
                    )}

                    {/* Book Info */}
                    <div className="bg-[#FAF7F2] border border-[#E8E4DF] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B6560] mb-3">Book</p>
                        <div className="flex gap-3">
                            {loan.books?.cover_image_url && (
                                <img src={loan.books.cover_image_url} alt="" className="w-14 h-20 object-cover rounded shrink-0" />
                            )}
                            <div className="min-w-0">
                                <p className="font-semibold text-[#1E1815] truncate">{loan.books?.title}</p>
                                <p className="text-sm text-[#6B6560]">{loan.books?.author || '—'}</p>
                                <p className="text-xs text-[#a09a94] mt-0.5">{loan.books?.isbn || ''}</p>
                                <span className={`inline-block mt-2 text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${statusPill(loan.status)}`}>
                                    {loan.status}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Member Info */}
                    <div className="bg-[#FAF7F2] border border-[#E8E4DF] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B6560] mb-3">Member</p>
                        <div className="flex items-center justify-between">
                            <div className="min-w-0">
                                <p className="font-semibold text-[#1E1815] truncate">{loan.members?.name || '—'}</p>
                                <p className="text-xs text-[#6B6560] truncate">{loan.members?.email || ''}</p>
                                <p className="text-xs text-[#a09a94] mt-0.5">{loan.members?.card_id ? `Card: ${loan.members.card_id}` : ''}</p>
                            </div>
                            {Number.parseFloat(loan.members?.fines || 0) > 0 && (
                                <button onClick={handleClearDue} disabled={clearingDue}
                                    className="ml-3 shrink-0 px-3 py-1.5 text-xs font-semibold border border-[#c16549] text-[#c16549] hover:bg-[#c16549] hover:text-white transition-colors disabled:opacity-50">
                                    {clearingDue ? 'Processing…' : `Clear $${Number.parseFloat(loan.members.fines).toFixed(2)} Due`}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Checked Out', value: loan.checkout_date ? formatIST(loan.checkout_date) : '—', ok: true },
                            { label: 'Due Date', value: loan.due_date ? formatDateIST(loan.due_date) : '—', ok: !isOverdue },
                        ].map(({ label, value, ok }) => (
                            <div key={label} className="bg-[#FAF7F2] border border-[#E8E4DF] p-3">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B6560]">{label}</p>
                                <p className={`text-sm font-semibold mt-1 ${ok ? 'text-[#1E1815]' : 'text-red-600'}`}>{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Condition at Checkout */}
                    <div className="bg-[#FAF7F2] border border-[#E8E4DF] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B6560] mb-1">Condition at Checkout</p>
                        <p className="text-sm font-semibold text-[#1E1815] capitalize">{loan.checkout_condition || 'good'}</p>
                        {loan.notes && <p className="text-xs text-[#6B6560] mt-1 italic">"{loan.notes}"</p>}
                    </div>

                    {/* Check-in Section */}
                    {(loan.status === 'checked_out' || loan.status === 'overdue') && (
                        <div className="border border-[#E8E4DF] p-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1E1815] mb-3">Process Return</p>

                            <p className="text-xs text-[#6B6560] mb-2">
                                Book condition at return (was <strong>{loan.checkout_condition || 'good'}</strong> at checkout)
                            </p>
                            <div className="space-y-1.5 mb-4">
                                {BOOK_CONDITIONS.map(cond => (
                                    <label key={cond.value}
                                        className={`flex items-center gap-3 p-2.5 border cursor-pointer transition-colors ${returnCondition === cond.value ? 'border-[#c16549] bg-[#FAF7F2]' : 'border-[#E8E4DF] hover:bg-[#FAF7F2]'}`}>
                                        <input type="radio" name="returnCondition" value={cond.value}
                                            checked={returnCondition === cond.value}
                                            onChange={e => setReturnCondition(e.target.value)}
                                            className="accent-[#c16549]" />
                                        <div className="flex-1">
                                            <span className={`text-sm font-medium ${cond.color}`}>{cond.label}</span>
                                            <span className="text-xs text-[#6B6560] ml-2">{cond.description}</span>
                                        </div>
                                        {cond.value === (loan.checkout_condition || 'good') && (
                                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5">At checkout</span>
                                        )}
                                    </label>
                                ))}
                            </div>

                            <textarea
                                value={returnNotes}
                                onChange={e => setReturnNotes(e.target.value)}
                                placeholder="Return notes (optional)…"
                                rows={2}
                                className="w-full px-3 py-2 border border-[#E8E4DF] text-sm text-[#1E1815] focus:border-[#c16549] focus:outline-none resize-none mb-3"
                            />

                            <button onClick={handleCheckin} disabled={processing}
                                className="w-full py-3 bg-[#c16549] text-white text-sm font-semibold hover:bg-[#a85443] transition-colors disabled:bg-gray-300">
                                {processing ? 'Processing…' : '✓ Confirm Return'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Reservation Drawer ─────────────────────────────────────────────────────
function ReservationDrawer({ reservation, onClose, onCancel, onRefresh }) {
    const [cancelNote, setCancelNote] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const handleCancel = async () => {
        if (!cancelNote.trim()) { alert('Please enter a cancellation reason.'); return; }
        setProcessing(true);
        try {
            await onCancel(reservation.id, cancelNote.trim());
            onClose();
            onRefresh();
        } catch (e) {
            alert(e.message || 'Failed to cancel reservation');
        } finally { setProcessing(false); }
    };

    const isExpired = reservation.expiry_date && new Date(reservation.expiry_date) < new Date();
    const isPending = reservation.status === 'pending';

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-[480px] h-full bg-white shadow-2xl overflow-y-auto flex flex-col"
                style={{ animation: 'slideInRight 200ms ease-out' }}>

                {/* Header */}
                <div className="sticky top-0 bg-white z-10 border-b border-[#E8E4DF] px-6 py-4 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#c16549]">Reservation Details</p>
                        <h3 className="text-lg font-bold text-[#1E1815] mt-0.5 truncate max-w-[340px]">
                            {reservation.books?.title || 'Unknown Book'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-[#FAF7F2] rounded text-[#6B6560]">
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <div className="flex-1 p-6 space-y-5">
                    {/* Status */}
                    <div className="flex items-center gap-3">
                        <span className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide ${statusPill(reservation.status)}`}>
                            {reservation.status}
                        </span>
                        {isExpired && isPending && (
                            <span className="text-xs text-red-600 font-semibold">⚠ Expired</span>
                        )}
                    </div>

                    {/* Book */}
                    <div className="bg-[#FAF7F2] border border-[#E8E4DF] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B6560] mb-2">Book</p>
                        <p className="font-semibold text-[#1E1815]">{reservation.books?.title || '—'}</p>
                        <p className="text-sm text-[#6B6560]">{reservation.books?.author || '—'}</p>
                        <p className="text-xs text-[#a09a94] mt-0.5">{reservation.books?.isbn ? `ISBN: ${reservation.books.isbn}` : ''}</p>
                    </div>

                    {/* Member */}
                    <div className="bg-[#FAF7F2] border border-[#E8E4DF] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B6560] mb-2">Member</p>
                        <p className="font-semibold text-[#1E1815]">{reservation.members?.name || '—'}</p>
                        <p className="text-sm text-[#6B6560]">{reservation.members?.email || ''}</p>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Reserved On', value: reservation.reservation_date ? formatIST(reservation.reservation_date) : '—' },
                            { label: 'Expiry', value: reservation.expiry_date ? formatDateIST(reservation.expiry_date) : '—' },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-[#FAF7F2] border border-[#E8E4DF] p-3">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B6560]">{label}</p>
                                <p className="text-sm font-semibold text-[#1E1815] mt-1">{value}</p>
                            </div>
                        ))}
                    </div>

                    {reservation.position_in_queue && (
                        <div className="bg-amber-50 border border-amber-200 p-3 text-center">
                            <p className="text-xs text-amber-700 font-semibold uppercase tracking-wide">Queue Position</p>
                            <p className="text-3xl font-bold text-amber-700 mt-1">#{reservation.position_in_queue}</p>
                        </div>
                    )}

                    {reservation.cancellation_note && (
                        <div className="bg-[#FAF7F2] border border-[#E8E4DF] p-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B6560] mb-1">Cancellation Note</p>
                            <p className="text-sm text-[#1E1815] italic">"{reservation.cancellation_note}"</p>
                        </div>
                    )}

                    {/* Cancel action (only for pending) */}
                    {isPending && (
                        <div className="border border-red-200 p-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-red-700 mb-3">Cancel Reservation</p>
                            <textarea
                                value={cancelNote}
                                onChange={e => setCancelNote(e.target.value)}
                                placeholder="Reason for cancellation (required)…"
                                rows={3}
                                className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-red-400 focus:outline-none resize-none mb-3"
                            />
                            <button onClick={handleCancel} disabled={processing}
                                className="w-full py-2.5 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:bg-gray-300">
                                {processing ? 'Cancelling…' : 'Confirm Cancellation'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function LoanOverview() {
    const [activeTab, setActiveTab] = useState('active');

    // ── Fine settings ─────────────────────────────────────────────
    const [fineSettings, setFineSettings] = useState({ dailyRate: 1.00, maxCap: 25.00 });

    // ── Active Loans ──────────────────────────────────────────────
    const [activeLoans,    setActiveLoans]    = useState([]);
    const [activeLoading,  setActiveLoading]  = useState(false);
    const [activeSearch,   setActiveSearch]   = useState('');
    const [activeStatus,   setActiveStatus]   = useState('all');   // 'all' | 'on_time' | 'overdue'
    const [activeSortBy,   setActiveSortBy]   = useState('checkout_date');
    const [activeSortDir,  setActiveSortDir]  = useState('desc');
    const [activePage,     setActivePage]     = useState(1);
    const [selectedLoan,   setSelectedLoan]   = useState(null);

    // ── Past Borrowed ─────────────────────────────────────────────
    const [pastLoans,    setPastLoans]    = useState([]);
    const [pastLoading,  setPastLoading]  = useState(false);
    const [pastSearch,   setPastSearch]   = useState('');
    const [pastLimit,    setPastLimit]    = useState(50);
    const [pastHasFine,  setPastHasFine]  = useState('all');   // 'all' | 'yes' | 'no'
    const [pastSortBy,   setPastSortBy]   = useState('return_date');

    // ── Overdue ───────────────────────────────────────────────────
    const [overdueLoans,   setOverdueLoans]   = useState([]);
    const [overdueLoading, setOverdueLoading] = useState(false);
    const [overdueSearch,  setOverdueSearch]  = useState('');
    const [overdueSortBy,  setOverdueSortBy]  = useState('days_desc');  // days_desc | days_asc | alpha

    // ── Reservations ──────────────────────────────────────────────
    const [reservations,  setReservations]  = useState([]);
    const [resLoading,    setResLoading]    = useState(false);
    const [resStatus,     setResStatus]     = useState('all');
    const [resSearch,     setResSearch]     = useState('');
    const [resPage,       setResPage]       = useState(1);
    const [resTotal,      setResTotal]      = useState(0);
    const [selectedRes,   setSelectedRes]   = useState(null);
    const RES_LIMIT = 20;

    // ─── Loaders ─────────────────────────────────────────────────
    const loadSettings = useCallback(async () => {
        try {
            const [all, byCat] = await Promise.all([
                settingsAPI.getAll().catch(() => null),
                settingsAPI.getByCategory('fines').catch(() => null),
            ]);
            const readNum = (sources, keys, fallback) => {
                for (const src of sources) {
                    if (!src) continue;
                    for (const key of keys) {
                        const arr = Array.isArray(src) ? src.find(i => i?.key === key)?.value : src?.[key];
                        const n = Number.parseFloat(arr);
                        if (Number.isFinite(n)) return n;
                    }
                }
                return fallback;
            };
            setFineSettings({
                dailyRate: readNum([byCat, all], ['daily_fine_rate', 'fine_per_day'], 1.00),
                maxCap: readNum([byCat, all], ['max_fine_cap'], 25.00),
            });
        } catch { /* use defaults */ }
    }, []);

    const loadActive = useCallback(async () => {
        setActiveLoading(true);
        try {
            const data = await circulationAPI.getActive({ limit: 200, skip: 0 }).catch(() => []);
            setActiveLoans(Array.isArray(data) ? data : (data?.loans ?? []));
        } finally { setActiveLoading(false); }
    }, []);

    const loadPast = useCallback(async (limit = pastLimit) => {
        setPastLoading(true);
        try {
            const data = await circulationAPI.getRecentReturns(limit).catch(() => []);
            setPastLoans(Array.isArray(data) ? data : []);
        } finally { setPastLoading(false); }
    }, [pastLimit]);

    const loadOverdue = useCallback(async () => {
        setOverdueLoading(true);
        try {
            const data = await circulationAPI.getOverdue().catch(() => []);
            setOverdueLoans(Array.isArray(data) ? data : []);
        } finally { setOverdueLoading(false); }
    }, []);

    const loadReservations = useCallback(async (status = resStatus, page = resPage) => {
        setResLoading(true);
        try {
            const params = { limit: RES_LIMIT, skip: (page - 1) * RES_LIMIT };
            if (status !== 'all') params.status = status;
            const data = await reservationsAPI.getAll(params).catch(() => []);
            const items = Array.isArray(data) ? data : (data?.reservations ?? data?.items ?? []);
            setReservations(items);
            setResTotal(data?.total ?? items.length);
        } finally { setResLoading(false); }
    }, [resStatus, resPage]);

    useEffect(() => { loadSettings(); }, [loadSettings]);

    useEffect(() => {
        if (activeTab === 'active')       loadActive();
        if (activeTab === 'past')         loadPast();
        if (activeTab === 'overdue')      loadOverdue();
        if (activeTab === 'reservations') loadReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'reservations') loadReservations(resStatus, resPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resStatus, resPage]);

    // ─── Handlers ────────────────────────────────────────────────
    const handleCheckin = async (loanId, condition, notes) => {
        const result = await circulationAPI.checkin(loanId, { return_condition: condition, notes: notes || undefined });
        const fine = result?.fine_amount || 0;
        if (fine > 0) alert(`Book returned. Fine charged: $${Number.parseFloat(fine).toFixed(2)}`);
        else alert('Book returned successfully!');
        await loadActive();
        await loadOverdue();
    };

    const handleClearDue = async (memberId, amount) => {
        const result = await financialAPI.processPayment(memberId, amount);
        const remaining = Number.parseFloat(result?.remaining_balance ?? 0);
        alert(`Payment of $${amount.toFixed(2)} processed. Remaining: $${remaining.toFixed(2)}`);
        await loadActive();
    };

    const handleCancelReservation = async (id, note) => {
        await reservationsAPI.cancel(id, note);
    };

    // ─── Derived / filtered lists ────────────────────────────────
    const searchFilter = (list, q) => {
        if (!q.trim()) return list;
        const query = q.toLowerCase();
        return list.filter(item => [
            item.books?.title, item.books?.author, item.books?.isbn,
            item.members?.name, item.members?.email, item.members?.card_id,
            item.book_title, item.member_name,
        ].filter(Boolean).join(' ').toLowerCase().includes(query));
    };

    // Active — filter, then sort
    let filtActive = [...activeLoans];
    if (activeStatus === 'on_time')  filtActive = filtActive.filter(l => !(l.due_date && new Date(l.due_date) < new Date()));
    if (activeStatus === 'overdue')  filtActive = filtActive.filter(l => l.due_date && new Date(l.due_date) < new Date());
    filtActive = searchFilter(filtActive, activeSearch);
    filtActive.sort((a, b) => {
        let va, vb;
        if (activeSortBy === 'due_date') { va = a.due_date; vb = b.due_date; }
        else { va = a.checkout_date; vb = b.checkout_date; }
        va = va ? new Date(va).getTime() : 0;
        vb = vb ? new Date(vb).getTime() : 0;
        return activeSortDir === 'asc' ? va - vb : vb - va;
    });
    const PA = 20;
    const totalActivePages = Math.max(1, Math.ceil(filtActive.length / PA));
    const pagedActive = filtActive.slice((activePage - 1) * PA, activePage * PA);

    // Past
    let filtPast = [...pastLoans];
    if (pastHasFine === 'yes') filtPast = filtPast.filter(l => Number.parseFloat(l.fine_amount || 0) > 0);
    if (pastHasFine === 'no')  filtPast = filtPast.filter(l => !(Number.parseFloat(l.fine_amount || 0) > 0));
    filtPast = searchFilter(filtPast, pastSearch);
    filtPast.sort((a, b) => {
        const key = pastSortBy === 'checkout_date' ? 'checkout_date' : 'return_date';
        return new Date(b[key] || 0) - new Date(a[key] || 0);
    });

    // Overdue
    let filtOverdue = searchFilter([...overdueLoans], overdueSearch);
    if (overdueSortBy === 'days_desc') filtOverdue.sort((a, b) => getOverdueDays(b.due_date) - getOverdueDays(a.due_date));
    else if (overdueSortBy === 'days_asc') filtOverdue.sort((a, b) => getOverdueDays(a.due_date) - getOverdueDays(b.due_date));
    else filtOverdue.sort((a, b) => (a.books?.title || '').localeCompare(b.books?.title || ''));

    // Reservations
    const filtRes = resSearch.trim()
        ? reservations.filter(r => [r.books?.title, r.books?.author, r.books?.isbn, r.members?.name, r.members?.email, r.status]
            .filter(Boolean).join(' ').toLowerCase().includes(resSearch.toLowerCase()))
        : reservations;
    const totalResPages = Math.max(1, Math.ceil(resTotal / RES_LIMIT));

    // ─── Sort toggle ─────────────────────────────────────────────
    const toggleSort = (col) => {
        if (activeSortBy === col) setActiveSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setActiveSortBy(col); setActiveSortDir('desc'); }
        setActivePage(1);
    };
    const SortIcon = ({ col }) => {
        if (activeSortBy !== col) return <span className="material-symbols-outlined text-[14px] opacity-30">unfold_more</span>;
        return <span className="material-symbols-outlined text-[14px] text-[#c16549]">{activeSortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>;
    };

    // ─── Tab: Active Loans ───────────────────────────────────────
    const ActiveTab = () => (
        <div>
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h2 className="text-xl font-bold text-[#1E1815]">Active Loans</h2>
                    <p className="text-xs text-[#6B6560] mt-0.5">Click any row to view details & process return</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#6B6560] bg-[#FAF7F2] px-2.5 py-1 border border-[#E8E4DF]">
                        {filtActive.length} loan{filtActive.length !== 1 ? 's' : ''}
                    </span>
                    <button onClick={loadActive} disabled={activeLoading}
                        className="p-2 hover:bg-[#FAF7F2] border border-[#E8E4DF] text-[#6B6560] hover:text-[#c16549] transition-colors disabled:opacity-40">
                        <span className={`material-symbols-outlined text-[18px] ${activeLoading ? 'animate-spin' : ''}`}>refresh</span>
                    </button>
                </div>
            </div>

            {/* Filters row */}
            <div className="flex flex-col md:flex-row gap-3 mb-4">
                <SearchBar value={activeSearch} onChange={v => { setActiveSearch(v); setActivePage(1); }} placeholder="Search book, author, ISBN, member…" />
                <div className="flex gap-1 shrink-0">
                    {[['all','All'],['on_time','On Time'],['overdue','Overdue']].map(([val, lbl]) => (
                        <button key={val} onClick={() => { setActiveStatus(val); setActivePage(1); }}
                            className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide border transition-colors ${activeStatus === val ? 'bg-[#c16549] border-[#c16549] text-white' : 'border-[#E8E4DF] text-[#6B6560] hover:border-[#c16549] hover:text-[#c16549]'}`}>
                            {lbl}
                        </button>
                    ))}
                </div>
                <select value={activeSortBy} onChange={e => { setActiveSortBy(e.target.value); setActivePage(1); }}
                    className="px-3 py-2 border border-[#E8E4DF] text-sm text-[#1E1815] focus:border-[#c16549] focus:outline-none shrink-0">
                    <option value="checkout_date">Sort: Checkout Date</option>
                    <option value="due_date">Sort: Due Date</option>
                </select>
            </div>

            {activeLoading && activeLoans.length === 0 ? <Spinner /> :
             filtActive.length === 0 ? <EmptyState icon="swap_horiz" message="No active loans match your filters." /> : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="border-b-2 border-[#E8E4DF]">
                                    <th className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B6560]">Book</th>
                                    <th className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B6560]">Member</th>
                                    <th onClick={() => toggleSort('checkout_date')} className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B6560] cursor-pointer select-none whitespace-nowrap">
                                        <span className="flex items-center gap-1">Checked Out <SortIcon col="checkout_date" /></span>
                                    </th>
                                    <th onClick={() => toggleSort('due_date')} className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B6560] cursor-pointer select-none whitespace-nowrap">
                                        <span className="flex items-center gap-1">Due Date <SortIcon col="due_date" /></span>
                                    </th>
                                    <th className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B6560]">Status</th>
                                    <th className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B6560]">Cond.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagedActive.map(loan => {
                                    const od = loan.due_date && new Date(loan.due_date) < new Date();
                                    return (
                                        <tr key={loan.id}
                                            onClick={() => setSelectedLoan(loan)}
                                            className={`border-b border-[#E8E4DF] cursor-pointer transition-colors ${od ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-[#FAF7F2]'}`}>
                                            <td className="px-3 py-3 max-w-[200px]">
                                                <p className="font-semibold text-[#1E1815] truncate">{loan.books?.title || '—'}</p>
                                                <p className="text-[11px] text-[#6B6560] truncate">{loan.books?.author || ''}</p>
                                            </td>
                                            <td className="px-3 py-3 max-w-[160px]">
                                                <p className="font-medium text-[#1E1815] truncate">{loan.members?.name || '—'}</p>
                                                <p className="text-xs text-[#6B6560] truncate">{loan.members?.card_id || ''}</p>
                                            </td>
                                            <td className="px-3 py-3 text-xs text-[#6B6560] whitespace-nowrap">
                                                {loan.checkout_date ? formatDateIST(loan.checkout_date) : '—'}
                                            </td>
                                            <td className="px-3 py-3 text-xs whitespace-nowrap">
                                                <span className={od ? 'text-red-600 font-semibold' : 'text-[#6B6560]'}>
                                                    {loan.due_date ? formatDateIST(loan.due_date) : '—'}
                                                    {od && <span className="ml-1 text-[10px]">({getOverdueDays(loan.due_date)}d)</span>}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${statusPill(od ? 'overdue' : 'checked_out')}`}>
                                                    {od ? 'Overdue' : 'Active'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-xs text-[#6B6560] capitalize">{loan.checkout_condition || 'good'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <Pagination page={activePage} total={totalActivePages} onChange={setActivePage} />
                </>
            )}
        </div>
    );

    // ─── Tab: Past Borrowed ───────────────────────────────────────
    const PastTab = () => (
        <div>
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h2 className="text-xl font-bold text-[#1E1815]">Past Borrowed</h2>
                    <p className="text-xs text-[#6B6560] mt-0.5">{filtPast.length} record{filtPast.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => loadPast(pastLimit)} disabled={pastLoading}
                    className="p-2 hover:bg-[#FAF7F2] border border-[#E8E4DF] text-[#6B6560] hover:text-[#c16549] transition-colors disabled:opacity-40">
                    <span className={`material-symbols-outlined text-[18px] ${pastLoading ? 'animate-spin' : ''}`}>refresh</span>
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-3 mb-4">
                <SearchBar value={pastSearch} onChange={setPastSearch} placeholder="Search book, author, member…" />
                <div className="flex gap-2 shrink-0 items-center">
                    <select value={pastHasFine} onChange={e => setPastHasFine(e.target.value)}
                        className="px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none">
                        <option value="all">All fines</option>
                        <option value="yes">With fine</option>
                        <option value="no">No fine</option>
                    </select>
                    <select value={pastSortBy} onChange={e => setPastSortBy(e.target.value)}
                        className="px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none">
                        <option value="return_date">Sort: Return Date</option>
                        <option value="checkout_date">Sort: Checkout Date</option>
                    </select>
                    <select value={pastLimit} onChange={e => { const n = Number(e.target.value); setPastLimit(n); loadPast(n); }}
                        className="px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none">
                        {[25, 50, 100, 250].map(n => <option key={n} value={n}>{n} records</option>)}
                    </select>
                </div>
            </div>

            {pastLoading ? <Spinner /> : filtPast.length === 0 ? <EmptyState icon="history" message="No past loan records found." /> : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="border-b-2 border-[#E8E4DF]">
                                {['Book', 'Author / ISBN', 'Member', 'Checked Out', 'Returned', 'Cond.', 'Fine'].map(h => (
                                    <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B6560] whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtPast.map(entry => (
                                <tr key={entry.id} className="border-b border-[#E8E4DF] hover:bg-[#FAF7F2] transition-colors">
                                    <td className="px-3 py-3 font-semibold text-[#1E1815] max-w-[200px]"><p className="truncate">{entry.books?.title || '—'}</p></td>
                                    <td className="px-3 py-3 max-w-[160px]">
                                        <p className="truncate text-xs text-[#6B6560]">{entry.books?.author || '—'}</p>
                                        <p className="truncate text-[11px] text-[#a09a94]">{entry.books?.isbn || ''}</p>
                                    </td>
                                    <td className="px-3 py-3 max-w-[160px]">
                                        <p className="truncate font-medium text-[#1E1815]">{entry.members?.name || '—'}</p>
                                        <p className="truncate text-xs text-[#6B6560]">{entry.members?.email || ''}</p>
                                    </td>
                                    <td className="px-3 py-3 text-xs text-[#6B6560] whitespace-nowrap">{entry.checkout_date ? formatDateIST(entry.checkout_date) : '—'}</td>
                                    <td className="px-3 py-3 text-xs text-emerald-700 font-medium whitespace-nowrap">{entry.return_date ? formatIST(entry.return_date) : '—'}</td>
                                    <td className="px-3 py-3 text-xs text-[#6B6560] capitalize">{entry.return_condition || entry.checkout_condition || '—'}</td>
                                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                                        {Number.parseFloat(entry.fine_amount || 0) > 0
                                            ? <span className="text-red-600 font-semibold">${Number.parseFloat(entry.fine_amount).toFixed(2)}</span>
                                            : <span className="text-[#6B6560]">—</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    // ─── Tab: Overdue ─────────────────────────────────────────────
    const OverdueTab = () => (
        <div>
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h2 className="text-xl font-bold text-[#1E1815]">Overdue Books</h2>
                    <p className="text-xs text-[#6B6560] mt-0.5">{filtOverdue.length} overdue — click a row to process return</p>
                </div>
                <button onClick={loadOverdue} disabled={overdueLoading}
                    className="p-2 hover:bg-[#FAF7F2] border border-[#E8E4DF] text-[#6B6560] hover:text-[#c16549] transition-colors disabled:opacity-40">
                    <span className={`material-symbols-outlined text-[18px] ${overdueLoading ? 'animate-spin' : ''}`}>refresh</span>
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-3 mb-4">
                <SearchBar value={overdueSearch} onChange={setOverdueSearch} placeholder="Search book, member, card ID…" />
                <select value={overdueSortBy} onChange={e => setOverdueSortBy(e.target.value)}
                    className="px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none shrink-0">
                    <option value="days_desc">Most Overdue First</option>
                    <option value="days_asc">Least Overdue First</option>
                    <option value="alpha">Alphabetical</option>
                </select>
            </div>

            {overdueLoading && overdueLoans.length === 0 ? <Spinner /> :
             filtOverdue.length === 0 ? <EmptyState icon="check_circle" message="No overdue books. All clear!" /> : (
                <div className="space-y-2">
                    {filtOverdue.map(loan => {
                        const days = getOverdueDays(loan.due_date);
                        const fine = calcFine(loan.due_date, fineSettings.dailyRate, fineSettings.maxCap);
                        return (
                            <div key={loan.id}
                                onClick={() => setSelectedLoan(loan)}
                                className="border border-[#E8E4DF] hover:border-[#c16549] bg-red-50 hover:bg-red-100 transition-all p-4 flex flex-col md:flex-row md:items-center gap-4 cursor-pointer">
                                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 border-2 border-red-300 shrink-0">
                                    <div className="text-center">
                                        <p className="text-lg font-bold text-red-600 leading-tight">{days}</p>
                                        <p className="text-[9px] font-bold uppercase tracking-wider text-red-400">days</p>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-[#1E1815] truncate">{loan.books?.title || 'Unknown'}</p>
                                    <p className="text-xs text-[#6B6560] truncate">{loan.books?.author || '—'} {loan.books?.isbn ? `· ${loan.books.isbn}` : ''}</p>
                                </div>
                                <div className="min-w-0 md:w-48">
                                    <p className="font-medium text-[#1E1815] truncate text-sm">{loan.members?.name || '—'}</p>
                                    <p className="text-xs text-[#6B6560] truncate">{loan.members?.email || ''}</p>
                                    <p className="text-xs text-[#a09a94]">{loan.members?.card_id ? `Card: ${loan.members.card_id}` : ''}</p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="text-xs text-[#6B6560]">Due: <span className="font-semibold text-red-600">{formatDateIST(loan.due_date)}</span></p>
                                    {fine > 0 && <p className="text-sm font-bold text-red-700 mt-1">Est. Fine: ${fine.toFixed(2)}</p>}
                                    <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wide text-[#c16549] border border-[#c16549] px-2 py-0.5">
                                        Click to Process ›
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    // ─── Tab: Reservations ────────────────────────────────────────
    const ReservationsTab = () => (
        <div>
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h2 className="text-xl font-bold text-[#1E1815]">Reservations</h2>
                    <p className="text-xs text-[#6B6560] mt-0.5">{resTotal} total · click a row to manage</p>
                </div>
                <button onClick={() => loadReservations(resStatus, resPage)} disabled={resLoading}
                    className="p-2 hover:bg-[#FAF7F2] border border-[#E8E4DF] text-[#6B6560] hover:text-[#c16549] transition-colors disabled:opacity-40">
                    <span className={`material-symbols-outlined text-[18px] ${resLoading ? 'animate-spin' : ''}`}>refresh</span>
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-3 mb-4">
                <div className="flex gap-1 flex-wrap shrink-0">
                    {RESERVATION_STATUSES.map(s => (
                        <button key={s} onClick={() => { setResStatus(s); setResPage(1); }}
                            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wide border transition-colors ${resStatus === s ? 'bg-[#c16549] border-[#c16549] text-white' : 'border-[#E8E4DF] text-[#6B6560] hover:border-[#c16549] hover:text-[#c16549]'}`}>
                            {s}
                        </button>
                    ))}
                </div>
                <SearchBar value={resSearch} onChange={setResSearch} placeholder="Search book, member, status…" />
            </div>

            {resLoading && reservations.length === 0 ? <Spinner /> :
             filtRes.length === 0 ? <EmptyState icon="bookmarks" message="No reservations found for this filter." /> : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="border-b-2 border-[#E8E4DF]">
                                    {['Book', 'Member', 'Reserved On', 'Expiry', 'Queue #', 'Status'].map(h => (
                                        <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B6560] whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtRes.map(res => {
                                    const expired = res.expiry_date && new Date(res.expiry_date) < new Date() && res.status === 'pending';
                                    return (
                                        <tr key={res.id}
                                            onClick={() => setSelectedRes(res)}
                                            className={`border-b border-[#E8E4DF] cursor-pointer transition-colors ${expired ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-[#FAF7F2]'}`}>
                                            <td className="px-3 py-3 max-w-[200px]">
                                                <p className="font-semibold text-[#1E1815] truncate">{res.books?.title || '—'}</p>
                                                <p className="text-[11px] text-[#6B6560] truncate">{res.books?.author || '—'}</p>
                                            </td>
                                            <td className="px-3 py-3 max-w-[160px]">
                                                <p className="font-medium text-[#1E1815] truncate">{res.members?.name || '—'}</p>
                                                <p className="text-xs text-[#6B6560] truncate">{res.members?.email || ''}</p>
                                            </td>
                                            <td className="px-3 py-3 text-xs text-[#6B6560] whitespace-nowrap">{res.reservation_date ? formatIST(res.reservation_date) : '—'}</td>
                                            <td className="px-3 py-3 text-xs whitespace-nowrap">
                                                <span className={expired ? 'text-red-600 font-semibold' : 'text-[#6B6560]'}>{res.expiry_date ? formatDateIST(res.expiry_date) : '—'}</span>
                                            </td>
                                            <td className="px-3 py-3 text-center text-xs font-semibold text-[#1E1815]">{res.position_in_queue ?? '—'}</td>
                                            <td className="px-3 py-3">
                                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${statusPill(res.status)}`}>
                                                    {res.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <Pagination page={resPage} total={totalResPages} onChange={setResPage} />
                </>
            )}
        </div>
    );

    // ─── Render ───────────────────────────────────────────────────
    return (
        <div className="p-6">
            {/* Page header */}
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                    <div className="h-[2px] w-8 bg-[#c16549]" />
                    <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#c16549]">Circulation</span>
                </div>
                <h1 className="text-3xl font-bold text-[#1E1815]">Loan Overview</h1>
                <p className="text-sm text-[#6B6560] mt-1">Monitor active loans, return history, overdue items, and reservations in one place.</p>
            </div>

            {/* Summary pills */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                    { label: 'Active',       count: activeLoans.length,  color: 'bg-blue-500',    icon: 'swap_horiz', tab: 'active' },
                    { label: 'Returned',     count: pastLoans.length,    color: 'bg-emerald-500', icon: 'history',    tab: 'past'   },
                    { label: 'Overdue',      count: overdueLoans.length, color: 'bg-red-500',     icon: 'warning',    tab: 'overdue' },
                    { label: 'Reservations', count: resTotal,            color: 'bg-amber-500',   icon: 'bookmarks',  tab: 'reservations' },
                ].map(stat => (
                    <button key={stat.label} onClick={() => setActiveTab(stat.tab)}
                        className={`bg-white border p-4 flex items-center gap-3 text-left transition-colors hover:border-[#c16549] ${activeTab === stat.tab ? 'border-[#c16549]' : 'border-[#E8E4DF]'}`}>
                        <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center shrink-0`}>
                            <span className="material-symbols-outlined text-white text-lg">{stat.icon}</span>
                        </div>
                        <div>
                            <p className="text-xs text-[#6B6560] uppercase tracking-wide font-medium">{stat.label}</p>
                            <p className="text-2xl font-bold text-[#1E1815]">{stat.count.toLocaleString()}</p>
                        </div>
                    </button>
                ))}
            </div>

            {/* Tab bar */}
            <div className="border-b border-[#E8E4DF] mb-6">
                <div className="flex gap-0 overflow-x-auto">
                    {TABS.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-all ${activeTab === tab.id ? 'border-[#c16549] text-[#c16549]' : 'border-transparent text-[#6B6560] hover:text-[#1E1815] hover:border-[#E8E4DF]'}`}>
                            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab content */}
            <div className="bg-white border border-[#E8E4DF] p-5">
                {activeTab === 'active'       && <ActiveTab />}
                {activeTab === 'past'         && <PastTab />}
                {activeTab === 'overdue'      && <OverdueTab />}
                {activeTab === 'reservations' && <ReservationsTab />}
            </div>

            {/* Loan Detail Drawer */}
            {selectedLoan && (
                <LoanDrawer
                    loan={selectedLoan}
                    fineSettings={fineSettings}
                    onClose={() => setSelectedLoan(null)}
                    onCheckin={handleCheckin}
                    onClearDue={handleClearDue}
                />
            )}

            {/* Reservation Detail Drawer */}
            {selectedRes && (
                <ReservationDrawer
                    reservation={selectedRes}
                    onClose={() => setSelectedRes(null)}
                    onCancel={handleCancelReservation}
                    onRefresh={() => loadReservations(resStatus, resPage)}
                />
            )}
        </div>
    );
}
