// Member Dashboard — dynamic data from API
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import MyReviewsPanel from '../components/reviews/MyReviewsPanel';
import { getAuthState } from '../services/authStore';
import { circulationAPI, recommendationsAPI, authAPI, settingsAPI, reservationsAPI, financialAPI, wishlistAPI } from '../services/api';

const DAY_MS = 1000 * 60 * 60 * 24;

function getTimeDifferenceInDays(dueDate, referenceDate = new Date()) {
    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) return 0;

    return (due.getTime() - referenceDate.getTime()) / DAY_MS;
}

function getDaysUntilDue(dueDate, referenceDate = new Date()) {
    return Math.ceil(getTimeDifferenceInDays(dueDate, referenceDate));
}

function getOverdueDays(dueDate, referenceDate = new Date()) {
    const differenceInDays = getTimeDifferenceInDays(dueDate, referenceDate);
    if (differenceInDays >= 0) return 0;
    return Math.ceil(Math.abs(differenceInDays));
}

function getNumericSetting(settings, keys, fallback) {
    for (const key of keys) {
        if (Array.isArray(settings)) {
            const found = settings.find((item) => item?.key === key)?.value;
            const parsed = Number.parseFloat(found);
            if (Number.isFinite(parsed)) return parsed;
            continue;
        }

        const parsed = Number.parseFloat(settings?.[key]);
        if (Number.isFinite(parsed)) return parsed;
    }

    return fallback;
}

function getStaffCancellationReason(notes) {
    if (!notes) return '';
    const text = String(notes);
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    const staffLine = lines.find((line) => line.toLowerCase().startsWith('staff cancellation reason:'));
    if (!staffLine) return '';
    return staffLine.replace(/staff cancellation reason:\s*/i, '').trim();
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

function DaysLeft({ dueDate }) {
    const overdueDays = getOverdueDays(dueDate);
    if (overdueDays > 0) return <span className="text-[#c16549] font-bold" style={{ fontFamily: "'Noto Sans', sans-serif" }}>{overdueDays}d overdue</span>;

    const days = getDaysUntilDue(dueDate);
    if (days === 0) return <span className="text-[#c16549] font-bold" style={{ fontFamily: "'Noto Sans', sans-serif" }}>Due today</span>;
    return <span className={days <= 3 ? 'text-[#c16549] font-medium' : 'text-[#6B6560] dark:text-gray-400'} style={{ fontFamily: "'Noto Sans', sans-serif" }}>{days}d left</span>;
}

export default function MemberDashboard() {
    const [authState, setAuthState] = useState(getAuthState());
    const navigate = useNavigate();

    const [memberProfile, setMemberProfile] = useState(null);
    const [activeLoans, setActiveLoans]     = useState([]);
    const [history, setHistory]             = useState([]);
    const [recommended, setRecommended]     = useState([]);
    const [reservations, setReservations]   = useState([]);
    const [financialTransactions, setFinancialTransactions] = useState([]);
    const [reservationActionId, setReservationActionId] = useState(null);
    const [dailyFineRate, setDailyFineRate] = useState(0.5);
    const [loading, setLoading]             = useState(true);
    const [readingProfile, setReadingProfile] = useState([]);
    const [wishlistCount, setWishlistCount] = useState(0);
    const [trendingBooks, setTrendingBooks] = useState([]);

    const greeting  = getGreeting();
    const firstName = memberProfile?.name?.split(' ')[0] || authState.user?.name?.split(' ')[0] || 'Reader';

    useEffect(() => {
        const state = getAuthState();
        if (!state.isAuthenticated) {
            navigate('/login');
            return;
        }
        setAuthState(state);
    }, [navigate]);

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        try {
            const [profile, loans, hist, settings, myReservations, myTransactions] = await Promise.all([
                authAPI.getCurrentUser().catch(() => null),
                circulationAPI.getMyLoans().catch(() => []),
                circulationAPI.getMyHistory({ limit: 6 }).catch(() => []),
                settingsAPI.getAll().catch(() => ({})),
                reservationsAPI.getMy({ limit: 10 }).catch(() => []),
                financialAPI.getMyTransactions(8).catch(() => []),
            ]);
            const loansArr = Array.isArray(loans) ? loans : [];
            const histArr  = Array.isArray(hist)  ? hist  : [];
            const reservationsArr = Array.isArray(myReservations) ? myReservations : [];
            const transactionsArr = Array.isArray(myTransactions) ? myTransactions : [];
            const fineRate = getNumericSetting(settings, ['daily_fine_rate', 'fine_per_day'], 0.5);

            setMemberProfile(profile);
            setDailyFineRate(fineRate);

            setActiveLoans(loansArr);
            setHistory(histArr);
            setReservations(reservationsArr);
            setFinancialTransactions(transactionsArr);

            // Neo4j feature fetches (non-blocking, all catch errors silently)
            if (profile?.id) {
                recommendationsAPI.getMyProfile(profile.id)
                    .then(r => setReadingProfile(Array.isArray(r) ? r : []))
                    .catch(() => {});
            }
            wishlistAPI.getAll()
                .then(r => setWishlistCount(Array.isArray(r) ? r.length : 0))
                .catch(() => {});
            recommendationsAPI.getTrending(7, 6)
                .then(r => setTrendingBooks(Array.isArray(r) ? r : []))
                .catch(() => {});

            // If we have a book, get related recommendations
            if (loansArr.length > 0 && loansArr[0].books?.id) {
                recommendationsAPI.getRelated(loansArr[0].books.id, 4)
                    .then(r => setRecommended(Array.isArray(r) ? r : []))
                    .catch(() => {});
            } else {
                recommendationsAPI.getPopular(4)
                    .then(r => setRecommended(Array.isArray(r) ? r : []))
                    .catch(() => {});
            }
        } catch {
            /* silent */
        } finally {
            setLoading(false);
        }
    }, []);

    const handleCancelReservation = useCallback(async (reservationId) => {
        if (!reservationId) return;
        setReservationActionId(reservationId);
        try {
            await reservationsAPI.cancel(reservationId);
            const updatedReservations = await reservationsAPI.getMy({ limit: 10 }).catch(() => []);
            setReservations(Array.isArray(updatedReservations) ? updatedReservations : []);
        } catch {
            /* silent */
        } finally {
            setReservationActionId(null);
        }
    }, []);

    useEffect(() => {
        if (authState.isAuthenticated) loadDashboard();
    }, [authState.isAuthenticated, loadDashboard]);

    // Derived stats
    const currentRead = activeLoans[0] || null;
    const dueSoonBook = activeLoans.find(l => {
        const days = getDaysUntilDue(l.due_date);
        return days <= 3;
    }) || null;
    const totalBorrowed  = history.length;
    const totalReturned  = history.filter(h => h.status === 'returned').length;
    const totalActive    = activeLoans.length;
    const overdueCount   = activeLoans.filter(l => getOverdueDays(l.due_date) > 0).length;
    const currentDues = Number.parseFloat(memberProfile?.fines || 0);
    const currentReadOverdueDays = currentRead ? getOverdueDays(currentRead.due_date) : 0;
    const isCurrentReadOverdue = currentReadOverdueDays > 0;
    const currentReadEstimatedFine = currentReadOverdueDays * dailyFineRate;
    const overdueLoans = activeLoans
        .filter((loan) => getOverdueDays(loan.due_date) > 0)
        .sort((left, right) => getOverdueDays(right.due_date) - getOverdueDays(left.due_date));
    const recentBorrowedBooks = history
        .filter((loan) => loan.status === 'returned')
        .slice(0, 4);

    return (
        <>
            <style>{`
              /* Editorial Design System Styles */
              ::-webkit-scrollbar { width: 8px; }
              ::-webkit-scrollbar-track { background: transparent; }
              ::-webkit-scrollbar-thumb { background-color: #d4cec7; border-radius: 20px; }
              ::-webkit-scrollbar-thumb:hover { background-color: #c16549; }
              
              /* Paper grain texture */
              .bg-paper-grain {
                background-image: url('data:image/svg+xml,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)" opacity="0.05"/%3E%3C/svg%3E');
              }
              
              /* Editorial shadows */
              .editorial-shadow {
                box-shadow: 0 4px 20px -2px rgba(30, 24, 21, 0.08);
              }
              
              .editorial-shadow-lg {
                box-shadow: 0 10px 40px -4px rgba(30, 24, 21, 0.12);
              }
              
              /* Book cover shadow */
              .book-shadow {
                box-shadow: -8px 8px 24px rgba(0,0,0,0.2), -2px 2px 5px rgba(0,0,0,0.1);
              }
              
              /* Dotted underline accent */
              .dotted-accent {
                border-bottom: 2px dotted #c16549;
                padding-bottom: 2px;
              }
              
              /* Fade-in animation */
              @keyframes fadeInUp {
                from {
                  opacity: 0;
                  transform: translateY(20px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
              
              .animate-fade-in-up {
                animation: fadeInUp 0.6s ease-out forwards;
              }
              
              /* Stagger delays */
              .delay-100 { animation-delay: 0.1s; opacity: 0; }
              .delay-200 { animation-delay: 0.2s; opacity: 0; }
              .delay-300 { animation-delay: 0.3s; opacity: 0; }
              .delay-400 { animation-delay: 0.4s; opacity: 0; }
            `}</style>

            <Header />
            <div className="flex h-screen w-full overflow-hidden bg-[#FAF7F2] dark:bg-[#1e1614] text-[#1E1815] dark:text-[#FAF7F2] transition-colors duration-300 pt-24 relative"
                style={{ fontFamily: "'Newsreader', serif" }}>

                {/* Paper Grain Texture Overlay */}
                <div className="fixed inset-0 pointer-events-none z-50 mix-blend-multiply opacity-40 bg-paper-grain"></div>

                <main className="flex-1 h-full overflow-y-auto overflow-x-hidden px-6 md:px-12 lg:px-20 py-8 md:py-12 relative z-10">
                    <div className="max-w-[1440px] mx-auto flex flex-col gap-12 lg:gap-16">

                        {/* Header - Editorial Style */}
                        <header className="flex flex-col gap-6 animate-fade-in-up delay-100">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                                <div className="flex flex-col gap-3">
                                    {/* Small eyebrow label */}
                                    <p className="text-[#c16549] text-xs font-medium tracking-[0.2em] uppercase"
                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                        Member Portal
                                    </p>
                                    
                                    {/* Main greeting - Large editorial headline */}
                                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1E1815] dark:text-white leading-[1.1] tracking-tight">
                                        {greeting},<br className="md:hidden" /> <span className="dotted-accent">{firstName}</span>.
                                    </h1>
                                    
                                    {/* Subtitle with icon */}
                                    <p className="text-[#6B6560] dark:text-gray-400 text-base md:text-lg font-light flex items-center gap-2.5 mt-1"
                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                        <span className="material-symbols-outlined text-[#c16549] text-xl">auto_stories</span>
                                        {loading ? 'Loading your library…' : activeLoans.length === 0 ? 'Your shelf is clear — time to explore.' : `${activeLoans.length} book${activeLoans.length > 1 ? 's' : ''} in your current collection.`}
                                    </p>
                                </div>
                                
                                {/* Date badge - refined */}
                                <div className="hidden md:block">
                                    <span className="text-xs font-medium text-[#6B6560] dark:text-gray-400 bg-white/80 dark:bg-gray-800/80 px-4 py-2 rounded-full border border-[#E8E4DF] dark:border-gray-700 editorial-shadow backdrop-blur-sm tracking-wide"
                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Decorative divider line */}
                            <div className="h-px bg-gradient-to-r from-[#c16549]/30 via-[#c16549]/10 to-transparent w-full max-w-md"></div>
                        </header>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-32 text-[#6B6560] text-xl italic">
                                <span className="material-symbols-outlined text-5xl mb-4 animate-pulse text-[#c16549]">menu_book</span>
                                Loading your reading world…
                            </div>
                        ) : (
                            <>
                                {/* Top Layout: Current Read + Sidebar */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

                                    {/* Current Read - Editorial Book Display */}
                                    <div className="lg:col-span-8 flex flex-col h-full animate-fade-in-up delay-200">
                                        <h2 className="text-sm font-semibold text-[#c16549] tracking-[0.15em] uppercase mb-6"
                                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                            <span className="material-symbols-outlined text-base align-middle mr-1.5">menu_book</span>
                                            Currently Reading
                                        </h2>
                                        {currentRead ? (
                                            <div className="relative group bg-white dark:bg-[#2a2622] rounded-sm editorial-shadow-lg flex flex-col md:flex-row gap-8 items-start hover:shadow-2xl transition-all duration-500 overflow-hidden border border-[#E8E4DF] dark:border-[#3d3935] h-full p-8 md:p-10">
                                                {/* Decorative corner accent */}
                                                <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-[#c16549]/20"></div>
                                                
                                                {/* Book Cover - Editorial Style */}
                                                <div className="relative shrink-0 w-40 md:w-56 lg:w-64 aspect-[2/3] rounded-r-lg rounded-l-sm book-shadow rotate-[-1deg] group-hover:rotate-0 transition-transform duration-700 ease-out origin-bottom overflow-hidden bg-[#E8E4DF] border-l-4 border-[#c16549]/30">
                                                    {currentRead.books?.cover_image_url ? (
                                                        <img
                                                            src={currentRead.books.cover_image_url}
                                                            alt={currentRead.books.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-[#89332a] to-[#c16549] flex items-end p-4">
                                                            <p className="text-white font-bold italic text-base leading-tight" style={{ fontFamily: "'Newsreader', serif" }}>{currentRead.books?.title}</p>
                                                        </div>
                                                    )}
                                                    {/* Book spine highlight */}
                                                    <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-white/30 to-transparent"></div>
                                                </div>

                                                {/* Book Details - Editorial Typography */}
                                                <div className="flex flex-col justify-between h-full w-full py-2">
                                                    <div>
                                                        <div className="flex justify-between items-start mb-6">
                                                            <div>
                                                                <h3 className="text-3xl md:text-4xl font-bold text-[#1E1815] dark:text-white mb-3 leading-tight tracking-tight">
                                                                    {currentRead.books?.title}
                                                                </h3>
                                                                <p className="text-[#6B6560] dark:text-gray-400 text-lg italic"
                                                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                                    by {currentRead.books?.author || '—'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Metadata - Clean typography */}
                                                        <div className="mt-6 flex flex-col gap-3 text-sm text-[#6B6560] dark:text-gray-400"
                                                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                            {currentRead.books?.category && (
                                                                <div className="inline-flex w-fit">
                                                                    <span className="bg-[#f4ede8] dark:bg-[#3d3935] text-[#c16549] dark:text-[#f4a690] px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest border border-[#c16549]/20">
                                                                        {currentRead.books.category}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <div className="flex flex-col gap-2">
                                                                <span className="flex items-center gap-2">
                                                                    <span className="material-symbols-outlined text-[16px] text-[#c16549]">calendar_today</span>
                                                                    Borrowed {new Date(currentRead.checkout_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                                                </span>
                                                                <span className="flex items-center gap-2">
                                                                    <span className="material-symbols-outlined text-[16px] text-[#c16549]">event</span>
                                                                    Due {new Date(currentRead.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                                                </span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="material-symbols-outlined text-[16px] text-[#c16549]">schedule</span>
                                                                    <DaysLeft dueDate={currentRead.due_date} />
                                                                </div>
                                                            </div>
                                                            {currentRead.books?.isbn && (
                                                                <span className="flex items-center gap-2 text-xs">
                                                                    <span className="material-symbols-outlined text-[14px]">qr_code_2</span>
                                                                    ISBN: {currentRead.books.isbn}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="mt-8 md:mt-auto pt-6 border-t border-[#E8E4DF] dark:border-[#3d3935]">
                                                        {/* Status */}
                                                        <div className="mb-4 text-sm font-medium text-[#6B6560]"
                                                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                            Status: <span className={`font-bold ${currentRead.status === 'overdue' || isCurrentReadOverdue ? 'text-[#c16549]' : 'text-[#2f5233]'}`}>
                                                                {isCurrentReadOverdue ? 'Overdue' : currentRead.status === 'checked_out' ? 'Checked Out' : currentRead.status}
                                                            </span>
                                                            {isCurrentReadOverdue && (
                                                                <span className="ml-2 text-xs text-[#c16549]">
                                                                    {`(Est. fine: $${currentReadEstimatedFine.toFixed(2)} at $${dailyFineRate.toFixed(2)}/day)`}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap gap-3">
                                                            <Link to="/catalog"
                                                                className="inline-flex items-center gap-2 bg-[#c16549] hover:bg-[#89332a] text-white px-6 py-3 rounded-sm text-sm font-medium editorial-shadow transition-all duration-300 hover:shadow-lg"
                                                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                                <span>Browse More Books</span>
                                                                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-white dark:bg-[#2a2622] rounded-sm editorial-shadow flex flex-col items-center justify-center gap-6 h-full min-h-[320px] text-center p-12 border border-[#E8E4DF] dark:border-[#3d3935]">
                                                <span className="material-symbols-outlined text-7xl text-[#E8E4DF] dark:text-[#3d3935]">library_books</span>
                                                <div>
                                                    <p className="text-[#6B6560] dark:text-gray-400 text-xl font-medium mb-2" style={{ fontFamily: "'Newsreader', serif" }}>No books currently checked out.</p>
                                                    <p className="text-[#6B6560] dark:text-gray-400 text-sm italic" style={{ fontFamily: "'Noto Sans', sans-serif" }}>Your reading journey awaits.</p>
                                                </div>
                                                <Link to="/catalog"
                                                    className="bg-[#c16549] text-white px-6 py-3 rounded-sm text-sm font-medium hover:bg-[#89332a] transition-all editorial-shadow"
                                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                    Explore the Catalog
                                                </Link>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Stats + Due Soon - Editorial Cards */}
                                    <div className="lg:col-span-4 flex flex-col gap-6 h-full animate-fade-in-up delay-300">
                                        {/* Collection Stats - Refined Grid */}
                                        <div className="bg-white dark:bg-[#2a2622] rounded-sm editorial-shadow p-6 border border-[#E8E4DF] dark:border-[#3d3935]">
                                            <h3 className="text-xs font-semibold text-[#c16549] uppercase tracking-[0.15em] mb-5"
                                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                Your Library
                                            </h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                {[
                                                    { icon: 'book_2',      value: totalActive,    label: 'Active Loans', color: 'text-[#c16549]' },
                                                    { icon: 'done_all',    value: totalReturned,  label: 'Returned', color: 'text-[#2f5233]' },
                                                    { icon: 'history',     value: totalBorrowed,  label: 'Total Borrows', color: 'text-[#6B6560]' },
                                                    { icon: 'warning',     value: overdueCount,   label: 'Overdue', danger: overdueCount > 0, color: overdueCount > 0 ? 'text-[#c16549]' : 'text-[#6B6560]' },
                                                    { icon: 'payments',    value: currentDues, label: 'Dues', danger: currentDues > 0, formatCurrency: true, color: currentDues > 0 ? 'text-[#c16549]' : 'text-[#2f5233]' },
                                                    { icon: 'favorite', value: wishlistCount, label: 'Wishlisted', color: 'text-[#c16549]' },
                                                ].map((stat, idx) => (
                                                    <div key={stat.label} className={`p-4 rounded-sm flex flex-col gap-2 border transition-all ${stat.danger && stat.value > 0 ? 'bg-[#fef5f3] border-[#c16549]/20 dark:bg-[#3d2a27] dark:border-[#c16549]/30' : 'bg-[#FAF7F2] dark:bg-[#3d3935] border-[#E8E4DF] dark:border-[#4d4945]'}`}
                                                        style={{ animationDelay: `${0.4 + idx * 0.05}s` }}>
                                                        <span className={`material-symbols-outlined text-[18px] ${stat.color}`}>{stat.icon}</span>
                                                        <span className={`text-2xl font-bold ${stat.danger && stat.value > 0 ? 'text-[#c16549]' : 'text-[#1E1815] dark:text-white'}`}>
                                                            {stat.formatCurrency ? `$${Number.parseFloat(stat.value || 0).toFixed(2)}` : stat.value}
                                                        </span>
                                                        <span className="text-[10px] text-[#6B6560] dark:text-gray-400 uppercase tracking-wider font-medium"
                                                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                            {stat.label}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Due Soon Alert - Editorial Style */}
                                        {dueSoonBook ? (
                                            <div className="bg-white dark:bg-[#2a2622] border-l-[3px] border-[#c16549] rounded-r-sm editorial-shadow p-6 flex flex-col justify-between flex-1">
                                                <div className="flex justify-between items-start mb-4">
                                                    <h3 className="text-sm font-semibold text-[#c16549] flex items-center gap-2 tracking-wide"
                                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                        <span className="material-symbols-outlined text-[18px]">event_busy</span>
                                                        Due Soon
                                                    </h3>
                                                    <DaysLeft dueDate={dueSoonBook.due_date} />
                                                </div>
                                                <div className="flex gap-4 items-center">
                                                    <div className="w-12 h-16 rounded-sm overflow-hidden shrink-0 bg-[#E8E4DF] book-shadow">
                                                        {dueSoonBook.books?.cover_image_url ? (
                                                            <img src={dueSoonBook.books.cover_image_url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-[#89332a] to-[#c16549]" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-[#1E1815] dark:text-white leading-tight text-sm" style={{ fontFamily: "'Newsreader', serif" }}>{dueSoonBook.books?.title}</p>
                                                        <p className="text-xs text-[#6B6560] dark:text-gray-400 mt-1 italic" style={{ fontFamily: "'Noto Sans', sans-serif" }}>{dueSoonBook.books?.author}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-[#f4f8f4] dark:bg-[#2a3230] border border-[#d4e4d8] dark:border-[#3d4d45] rounded-sm p-6 flex items-center gap-3 flex-1">
                                                <span className="material-symbols-outlined text-[#2f5233] dark:text-emerald-400 text-3xl">check_circle</span>
                                                <div>
                                                    <p className="font-semibold text-[#2f5233] dark:text-emerald-400 text-sm" style={{ fontFamily: "'Newsreader', serif" }}>All clear!</p>
                                                    <p className="text-xs text-[#6B6560] dark:text-gray-400" style={{ fontFamily: "'Noto Sans', sans-serif" }}>No books due soon.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Middle: All Active Loans (if more than 1) */}
                                {activeLoans.length > 1 && (
                                    <section className="animate-fade-in-up delay-400">
                                        <h2 className="text-sm font-semibold text-[#c16549] tracking-[0.15em] uppercase mb-6"
                                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                            <span className="material-symbols-outlined text-base align-middle mr-1.5">checklist</span>
                                            All Active Loans
                                        </h2>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                            {activeLoans.map((loan, idx) => (
                                                <div key={loan.id} className="bg-white dark:bg-[#2a2622] rounded-sm p-5 flex gap-4 editorial-shadow border border-[#E8E4DF] dark:border-[#3d3935] hover:shadow-lg transition-all duration-300 group"
                                                    style={{ animationDelay: `${0.5 + idx * 0.05}s` }}>
                                                    <div className="w-11 h-16 rounded-sm overflow-hidden shrink-0 bg-[#E8E4DF] book-shadow group-hover:scale-105 transition-transform duration-300">
                                                        {loan.books?.cover_image_url ? (
                                                            <img src={loan.books.cover_image_url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-[#6B6560] to-[#89332a]" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-sm truncate text-[#1E1815] dark:text-white" style={{ fontFamily: "'Newsreader', serif" }}>{loan.books?.title}</p>
                                                        <p className="text-xs text-[#6B6560] dark:text-gray-400 truncate mt-0.5 italic" style={{ fontFamily: "'Noto Sans', sans-serif" }}>{loan.books?.author}</p>
                                                        <p className="text-xs mt-2" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                            <DaysLeft dueDate={loan.due_date} />
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                <section className="bg-white dark:bg-[#2a2622] rounded-sm editorial-shadow-lg p-8 md:p-10 border border-[#E8E4DF] dark:border-[#3d3935] relative overflow-hidden animate-fade-in-up delay-400">
                                    {/* Decorative top accent */}
                                    <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#c16549] via-[#89332a] to-[#c16549]" />
                                    
                                    <div className="flex items-center justify-between mb-8">
                                        <h2 className="text-sm font-semibold text-[#c16549] tracking-[0.15em] uppercase flex items-center gap-2"
                                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                            <span className="material-symbols-outlined text-base">receipt_long</span>
                                            Account Center
                                        </h2>
                                        <span className="text-[10px] uppercase tracking-[0.18em] text-[#6B6560] dark:text-gray-400 font-medium"
                                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                            Live Member Ledger
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                        {/* Dues & Reservations */}
                                        <div className="rounded-sm border border-[#d4dfe8]/60 bg-[#f9fbfd] dark:bg-[#2a3138] dark:border-[#3d4550] p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <p className="text-sm font-semibold text-[#1E1815] dark:text-white tracking-wide"
                                                    style={{ fontFamily: "'Newsreader', serif" }}>
                                                    Dues & Reservations
                                                </p>
                                                <p className={`text-lg font-bold ${currentDues > 0 ? 'text-[#c16549]' : 'text-[#2f5233]'}`}>
                                                    ${currentDues.toFixed(2)}
                                                </p>
                                            </div>
                                            <p className="text-xs text-[#6B6560] dark:text-gray-400 mb-4 italic"
                                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                Outstanding dues must be cleared before new reservations.
                                            </p>
                                            {reservations.length === 0 ? (
                                                <p className="text-xs text-[#6B6560] dark:text-gray-400 italic py-4"
                                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                    No reservations yet.
                                                </p>
                                            ) : (
                                                <div className="space-y-2.5">
                                                    {reservations.slice(0, 6).map((reservation) => (
                                                        <div key={reservation.id} className="bg-white/90 dark:bg-[#1e2228] rounded-sm px-4 py-3 border border-[#E8E4DF]/60 dark:border-[#3d3935]">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-medium truncate text-[#1E1815] dark:text-white"
                                                                        style={{ fontFamily: "'Newsreader', serif" }}>
                                                                        {reservation.books?.title || 'Untitled Book'}
                                                                    </p>
                                                                    <p className="text-xs text-[#6B6560] dark:text-gray-400 mt-0.5"
                                                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                                        {reservation.status === 'pending'
                                                                            ? `Queue #${reservation.position_in_queue || '-'} • Expires ${reservation.expiry_date ? new Date(reservation.expiry_date).toLocaleDateString() : 'N/A'}`
                                                                            : `${reservation.status?.toUpperCase() || 'UNKNOWN'} • ${reservation.updated_at ? new Date(reservation.updated_at).toLocaleDateString() : ''}`}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full font-semibold ${reservation.status === 'pending' ? 'bg-[#d4dfe8] text-[#1E1815]' : reservation.status === 'cancelled' ? 'bg-[#fef5f3] text-[#c16549]' : 'bg-[#E8E4DF] text-[#6B6560]'}`}
                                                                        style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                                        {reservation.status || 'unknown'}
                                                                    </span>
                                                                    {reservation.status === 'pending' && (
                                                                        <button
                                                                            onClick={() => handleCancelReservation(reservation.id)}
                                                                            disabled={reservationActionId === reservation.id}
                                                                            className="text-xs px-3 py-1.5 rounded-sm bg-[#c16549] text-white hover:bg-[#89332a] transition-colors disabled:bg-[#E8E4DF] disabled:text-[#6B6560] font-medium"
                                                                            style={{ fontFamily: "'Noto Sans', sans-serif" }}
                                                                        >
                                                                            {reservationActionId === reservation.id ? 'Cancelling...' : 'Cancel'}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {reservation.status === 'cancelled' && getStaffCancellationReason(reservation.notes) && (
                                                                <p className="mt-2.5 text-xs text-[#c16549] dark:text-[#f4a690] bg-[#fef5f3] dark:bg-[#3d2a27] px-3 py-2 rounded-sm border border-[#c16549]/20 italic"
                                                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                                    Admin note: {getStaffCancellationReason(reservation.notes)}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Overdue Books */}
                                        <div className="rounded-sm border border-[#f4d5d8]/60 bg-[#fef9fa] dark:bg-[#3d2a27] dark:border-[#c16549]/20 p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <p className="text-sm font-semibold text-[#1E1815] dark:text-white tracking-wide"
                                                    style={{ fontFamily: "'Newsreader', serif" }}>
                                                    Overdue Books
                                                </p>
                                                <p className="text-lg font-bold text-[#c16549]">{overdueLoans.length}</p>
                                            </div>
                                            {overdueLoans.length === 0 ? (
                                                <p className="text-xs text-[#2f5233] dark:text-emerald-300 italic py-4"
                                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                    No overdue books.
                                                </p>
                                            ) : (
                                                <div className="space-y-2.5">
                                                    {overdueLoans.slice(0, 4).map((loan) => (
                                                        <div key={loan.id} className="bg-white/90 dark:bg-[#1e2228] rounded-sm px-4 py-3 border border-[#E8E4DF]/60 dark:border-[#3d3935]">
                                                            <p className="text-sm font-medium truncate text-[#1E1815] dark:text-white"
                                                                style={{ fontFamily: "'Newsreader', serif" }}>
                                                                {loan.books?.title || 'Untitled Book'}
                                                            </p>
                                                            <p className="text-xs text-[#c16549] dark:text-[#f4a690] mt-0.5"
                                                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                                {getOverdueDays(loan.due_date)} days overdue • Est. ${(getOverdueDays(loan.due_date) * dailyFineRate).toFixed(2)}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Past Borrowed Books */}
                                        <div className="rounded-sm border border-[#e7e2d1]/60 bg-[#fffdf9] dark:bg-[#2a2622] dark:border-[#3d3935] p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <p className="text-sm font-semibold text-[#1E1815] dark:text-white tracking-wide"
                                                    style={{ fontFamily: "'Newsreader', serif" }}>
                                                    Past Borrowed Books
                                                </p>
                                                <p className="text-lg font-bold text-[#6B6560]">{recentBorrowedBooks.length}</p>
                                            </div>
                                            {recentBorrowedBooks.length === 0 ? (
                                                <p className="text-xs text-[#6B6560] dark:text-gray-400 italic py-4"
                                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                    No returned books yet.
                                                </p>
                                            ) : (
                                                <div className="space-y-2.5">
                                                    {recentBorrowedBooks.map((item) => (
                                                        <div key={item.id} className="bg-white/90 dark:bg-[#1e2228] rounded-sm px-4 py-3 border border-[#E8E4DF]/60 dark:border-[#3d3935] flex items-center justify-between gap-3">
                                                            <p className="text-sm font-medium truncate text-[#1E1815] dark:text-white"
                                                                style={{ fontFamily: "'Newsreader', serif" }}>
                                                                {item.books?.title || 'Untitled Book'}
                                                            </p>
                                                            <span className="text-xs text-[#6B6560] dark:text-gray-400"
                                                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                                {new Date(item.checkout_date).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Financial Transactions */}
                                        <div className="rounded-sm border border-[#d6e8dd]/60 bg-[#f9fdfb] dark:bg-[#2a3230] dark:border-[#3d4d45] p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <p className="text-sm font-semibold text-[#1E1815] dark:text-white tracking-wide"
                                                    style={{ fontFamily: "'Newsreader', serif" }}>
                                                    Financial Transactions
                                                </p>
                                                <p className="text-lg font-bold text-[#2f5233]">{financialTransactions.length}</p>
                                            </div>
                                            {financialTransactions.length === 0 ? (
                                                <p className="text-xs text-[#6B6560] dark:text-gray-400 italic py-4"
                                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                    No financial records available.
                                                </p>
                                            ) : (
                                                <div className="space-y-2.5">
                                                    {financialTransactions.slice(0, 5).map((item) => (
                                                        <div key={item.id} className="bg-white/90 dark:bg-[#1e2228] rounded-sm px-4 py-3 border border-[#E8E4DF]/60 dark:border-[#3d3935] flex items-center justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-medium capitalize truncate text-[#1E1815] dark:text-white"
                                                                    style={{ fontFamily: "'Newsreader', serif" }}>
                                                                    {item.transaction_type || 'transaction'}
                                                                </p>
                                                                <p className="text-xs text-[#6B6560] dark:text-gray-400 truncate mt-0.5"
                                                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                                    {item.description || 'Ledger entry'}
                                                                </p>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <p className={`text-sm font-bold ${item.transaction_type === 'payment' ? 'text-[#2f5233]' : 'text-[#c16549]'}`}>
                                                                    ${Number.parseFloat(item.amount || 0).toFixed(2)}
                                                                </p>
                                                                <p className="text-[10px] text-[#6B6560] dark:text-gray-400"
                                                                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </section>

                                <div className="animate-fade-in-up delay-400">
                                    <MyReviewsPanel />
                                </div>

                                {/* Bottom: History + Recommendations - Editorial Layout */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10 animate-fade-in-up delay-400">
                                    {/* Borrowing History */}
                                    <div className="lg:col-span-2 flex flex-col bg-white dark:bg-[#2a2622] rounded-sm editorial-shadow p-8 border border-[#E8E4DF] dark:border-[#3d3935]">
                                        <div className="flex justify-between items-center mb-6">
                                            <h2 className="text-sm font-semibold text-[#c16549] tracking-[0.15em] uppercase"
                                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                Recent History
                                            </h2>
                                            <Link to="/catalog" className="text-xs text-[#c16549] hover:text-[#89332a] font-medium tracking-wide transition-colors underline decoration-dotted underline-offset-4"
                                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                Browse Catalog
                                            </Link>
                                        </div>
                                        {history.length === 0 ? (
                                            <p className="text-[#6B6560] dark:text-gray-400 italic text-sm py-8 text-center"
                                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                No borrowing history yet.
                                            </p>
                                        ) : (
                                            <div className="flex flex-col gap-3">
                                                {history.slice(0, 5).map((tx, idx) => (
                                                    <div key={tx.id} className="flex items-center gap-4 py-3 border-b border-[#E8E4DF] dark:border-[#3d3935] last:border-0 hover:bg-[#FAF7F2] dark:hover:bg-[#3d3935] transition-colors rounded-sm px-2"
                                                        style={{ animationDelay: `${0.5 + idx * 0.05}s` }}>
                                                        <div className="w-9 h-12 rounded-sm overflow-hidden shrink-0 bg-[#E8E4DF] book-shadow">
                                                            {tx.books?.cover_image_url ? (
                                                                <img src={tx.books.cover_image_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full bg-gradient-to-br from-[#6B6560] to-[#89332a]" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-sm truncate text-[#1E1815] dark:text-white"
                                                                style={{ fontFamily: "'Newsreader', serif" }}>
                                                                {tx.books?.title}
                                                            </p>
                                                            <p className="text-xs text-[#6B6560] dark:text-gray-400 mt-0.5"
                                                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                                {new Date(tx.checkout_date).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                                                            tx.status === 'returned' ? 'bg-[#f4f8f4] text-[#2f5233] border border-[#d4e4d8]' :
                                                            tx.status === 'overdue'  ? 'bg-[#fef5f3] text-[#c16549] border border-[#c16549]/20'      :
                                                            'bg-[#f9fbfd] text-[#6B6560] border border-[#E8E4DF]'
                                                        }`} style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                            {tx.status === 'checked_out' ? 'Active' : tx.status}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Recommendations - Editorial Card */}
                                    <div className="flex flex-col bg-white dark:bg-[#2a2622] rounded-sm editorial-shadow p-8 border border-[#E8E4DF] dark:border-[#3d3935] gap-6">
                                        <h2 className="text-sm font-semibold text-[#c16549] tracking-[0.15em] uppercase"
                                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                            You Might Like
                                        </h2>
                                        {recommended.length === 0 ? (
                                            <p className="text-[#6B6560] dark:text-gray-400 italic text-sm py-8 text-center"
                                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                Explore the catalog to get recommendations.
                                            </p>
                                        ) : (
                                            <div className="flex flex-col gap-4">
                                                {recommended.slice(0, 4).map((book, idx) => (
                                                    <Link key={book.id || idx} to={`/book/${book.id}`}
                                                        className="group flex items-center gap-3 hover:bg-[#FAF7F2] dark:hover:bg-[#3d3935] rounded-sm p-2 transition-all duration-300">
                                                        <div className="w-9 h-12 rounded-sm overflow-hidden shrink-0 bg-[#E8E4DF] book-shadow group-hover:scale-105 transition-transform duration-300">
                                                            {book.cover_image_url ? (
                                                                <img src={book.cover_image_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full bg-gradient-to-br from-[#89332a] to-[#c16549]" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-sm truncate text-[#1E1815] dark:text-white group-hover:text-[#c16549] transition-colors"
                                                                style={{ fontFamily: "'Newsreader', serif" }}>
                                                                {book.title}
                                                            </p>
                                                            <p className="text-xs text-[#6B6560] dark:text-gray-400 truncate italic mt-0.5"
                                                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                                {book.author}
                                                            </p>
                                                        </div>
                                                        <span className="material-symbols-outlined text-[#c16549] text-[18px] opacity-0 group-hover:opacity-100 transition-opacity duration-300">arrow_forward</span>
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Reading Profile */}
                                {readingProfile.length > 0 && (
                                    <div className="bg-white dark:bg-[#2a2622] rounded-sm editorial-shadow p-6 border border-[#E8E4DF] dark:border-[#3d3935] mb-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="material-symbols-outlined text-[#c16549] text-base">insights</span>
                                            <h2 className="text-xs font-bold text-[#c16549] uppercase tracking-[0.15em]"
                                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                Your Reading Profile
                                            </h2>
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            {readingProfile.map(cat => {
                                                const maxScore = readingProfile[0]?.interest_score || 1;
                                                const pct = Math.round((cat.interest_score / maxScore) * 100);
                                                return (
                                                    <div key={cat.category} className="flex items-center gap-3">
                                                        <span className="text-xs w-28 truncate text-[#6B6560] dark:text-gray-400"
                                                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                            {cat.category}
                                                        </span>
                                                        <div className="flex-1 h-2 bg-[#E8E4DF] dark:bg-[#3d3935] rounded-full overflow-hidden">
                                                            <div className="h-full bg-[#c16549] rounded-full transition-all duration-700"
                                                                style={{ width: `${pct}%` }} />
                                                        </div>
                                                        <span className="text-xs text-[#6B6560] dark:text-gray-400 w-6 text-right"
                                                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                            {cat.interest_score}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Trending This Week */}
                                {trendingBooks.length > 0 && (
                                    <div className="bg-white dark:bg-[#2a2622] rounded-sm editorial-shadow p-6 border border-[#E8E4DF] dark:border-[#3d3935] mb-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="material-symbols-outlined text-[#c16549] text-base">trending_up</span>
                                            <h2 className="text-xs font-bold text-[#c16549] uppercase tracking-[0.15em]"
                                                style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                Trending This Week
                                            </h2>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            {trendingBooks.map((b, i) => (
                                                <Link key={b.id || b.book_id} to={`/book/${b.id || b.book_id}`}
                                                    className="flex items-center gap-3 p-2 hover:bg-[#FAF7F2] dark:hover:bg-[#3d3935] rounded-sm transition-colors group">
                                                    <span className="text-xs font-bold text-[#c16549] w-4 text-center">{i + 1}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-[#1E1815] dark:text-white truncate group-hover:text-[#c16549] transition-colors"
                                                            style={{ fontFamily: "'Newsreader', serif" }}>{b.title}</p>
                                                        <p className="text-xs text-[#6B6560] dark:text-gray-400 italic"
                                                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>{b.author || 'Unknown'}</p>
                                                    </div>
                                                    <span className="material-symbols-outlined text-[16px] text-[#E8E4DF] dark:text-[#3d3935] group-hover:text-[#c16549] transition-colors">chevron_right</span>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            </>
                        )}

                        {/* Footer spacing - Editorial breathing room */}
                        <div className="h-16 md:h-24" />
                    </div>
                </main>
            </div>
        </>
    );
}
