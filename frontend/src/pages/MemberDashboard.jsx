// Member Dashboard — dynamic data from API
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import { getAuthState } from '../services/authStore';
import { circulationAPI, membersAPI, recommendationsAPI } from '../services/api';

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

function DaysLeft({ dueDate }) {
    const days = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (days < 0) return <span className="text-red-600 font-bold">{Math.abs(days)}d overdue</span>;
    if (days === 0) return <span className="text-orange-600 font-bold">Due today</span>;
    return <span className={days <= 3 ? 'text-orange-500 font-medium' : 'text-slate-500'}>{days}d left</span>;
}

export default function MemberDashboard() {
    const [authState, setAuthState] = useState(getAuthState());
    const navigate = useNavigate();

    const [memberProfile, setMemberProfile] = useState(null);
    const [activeLoans, setActiveLoans]     = useState([]);
    const [history, setHistory]             = useState([]);
    const [recommended, setRecommended]     = useState([]);
    const [loading, setLoading]             = useState(true);

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
            const [loans, hist] = await Promise.all([
                circulationAPI.getMyLoans().catch(() => []),
                circulationAPI.getMyHistory({ limit: 6 }).catch(() => []),
            ]);
            const loansArr = Array.isArray(loans) ? loans : [];
            const histArr  = Array.isArray(hist)  ? hist  : [];

            setActiveLoans(loansArr);
            setHistory(histArr);

            // If we have a book, get related recommendations
            if (loansArr.length > 0 && loansArr[0].book?.id) {
                recommendationsAPI.getRelated(loansArr[0].book.id, 4)
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

    useEffect(() => {
        if (authState.isAuthenticated) loadDashboard();
    }, [authState.isAuthenticated, loadDashboard]);

    // Derived stats
    const currentRead = activeLoans[0] || null;
    const dueSoonBook = activeLoans.find(l => {
        const days = Math.ceil((new Date(l.due_date) - new Date()) / (1000 * 60 * 60 * 24));
        return days <= 3;
    }) || null;
    const totalBorrowed  = history.length;
    const totalReturned  = history.filter(h => h.status === 'returned').length;
    const totalActive    = activeLoans.length;
    const overdueCount   = activeLoans.filter(l => new Date(l.due_date) < new Date()).length;

    return (
        <>
            <style>{`
              ::-webkit-scrollbar { width: 8px; }
              ::-webkit-scrollbar-track { background: transparent; }
              ::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 20px; }
              .hand-drawn-line { border-radius: 2px 255px 25px 25px / 255px 25px 225px 255px; }
              .hand-drawn-border { border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px; }
            `}</style>

            <Header />
            <div className="flex h-screen w-full overflow-hidden bg-[#fdfbf7] dark:bg-[#111621] text-[#1e293b] dark:text-gray-100 transition-colors duration-300 pt-24"
                style={{ fontFamily: "'Epilogue', 'Noto Sans', sans-serif" }}>

                <main className="flex-1 h-full overflow-y-auto overflow-x-hidden p-6 md:p-12 relative">
                    <div className="max-w-[1400px] mx-auto flex flex-col gap-10">

                        {/* Header */}
                        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                            <div className="flex flex-col gap-2">
                                <h1 className="text-3xl md:text-5xl font-bold text-[#1e293b] dark:text-white leading-tight tracking-tight">
                                    {greeting}, {firstName}.
                                </h1>
                                <p className="text-gray-500 dark:text-gray-400 text-lg font-light flex items-center gap-2">
                                    <span className="material-symbols-outlined text-orange-300">local_cafe</span>
                                    {loading ? 'Loading your library…' : activeLoans.length === 0 ? 'Your shelf is clear — time to explore.' : `${activeLoans.length} book${activeLoans.length > 1 ? 's' : ''} checked out.`}
                                </p>
                            </div>
                            <div className="hidden md:block">
                                <span className="text-sm font-medium text-gray-400 bg-white dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-100 dark:border-gray-700 shadow-sm">
                                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                </span>
                            </div>
                        </header>

                        {loading ? (
                            <div className="flex items-center justify-center py-24 text-gray-400 animate-pulse text-xl">
                                Loading your reading world…
                            </div>
                        ) : (
                            <>
                                {/* Top Layout: Current Read + Sidebar */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

                                    {/* Current Read */}
                                    <div className="lg:col-span-8 flex flex-col h-full">
                                        <h2 className="text-lg font-semibold text-[#1e293b] dark:text-gray-200 mb-4 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[#2463eb]">menu_book</span>
                                            Current Read
                                        </h2>
                                        {currentRead ? (
                                            <div className="relative group bg-white dark:bg-[#1a202c] rounded-2xl p-6 md:p-8 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] flex flex-col md:flex-row gap-8 items-start hover:shadow-lg transition-shadow duration-300 h-full">
                                                {/* Cover */}
                                                <div className="relative shrink-0 w-32 md:w-48 aspect-[2/3] rounded-lg shadow-lg rotate-1 group-hover:rotate-0 transition-transform duration-500 ease-out origin-bottom-left overflow-hidden bg-gray-200">
                                                    {currentRead.book?.cover_image_url ? (
                                                        <img
                                                            src={currentRead.book.cover_image_url}
                                                            alt={currentRead.book.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-[#2463eb] to-[#7c3aed] flex items-end p-3">
                                                            <p className="text-white font-bold italic text-sm leading-tight">{currentRead.book?.title}</p>
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent rounded-lg" />
                                                </div>

                                                {/* Details */}
                                                <div className="flex flex-col justify-between h-full w-full py-2">
                                                    <div>
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h3 className="text-2xl md:text-3xl font-bold text-[#1e293b] dark:text-white mb-2 leading-tight">
                                                                    {currentRead.book?.title}
                                                                </h3>
                                                                <p className="text-gray-500 dark:text-gray-400 text-lg italic">
                                                                    by {currentRead.book?.author || '—'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="mt-4 flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                                                            {currentRead.book?.category && (
                                                                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-semibold uppercase tracking-wide">
                                                                    {currentRead.book.category}
                                                                </span>
                                                            )}
                                                            <span className="flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-[16px]">event</span>
                                                                Due: {new Date(currentRead.due_date).toLocaleDateString()}
                                                            </span>
                                                            <DaysLeft dueDate={currentRead.due_date} />
                                                        </div>
                                                    </div>

                                                    <div className="mt-8 md:mt-auto">
                                                        {/* Status */}
                                                        <div className="mb-3 text-sm font-medium text-gray-500">
                                                            Status: <span className={`font-bold ${currentRead.status === 'overdue' ? 'text-red-600' : 'text-emerald-600'}`}>
                                                                {currentRead.status === 'checked_out' ? 'Checked out' : currentRead.status}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-3">
                                                            <Link to="/catalog"
                                                                className="bg-[#2463eb] hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium shadow-md shadow-blue-500/20 transition-all flex items-center gap-2">
                                                                <span>Browse More Books</span>
                                                                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-white dark:bg-[#1a202c] rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center gap-4 h-full min-h-[260px] text-center">
                                                <span className="material-symbols-outlined text-6xl text-gray-300">library_books</span>
                                                <p className="text-gray-500 text-xl font-medium">No books currently checked out.</p>
                                                <Link to="/catalog"
                                                    className="bg-[#2463eb] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-all">
                                                    Explore the Catalog
                                                </Link>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Stats + Due Soon */}
                                    <div className="lg:col-span-4 flex flex-col gap-6 h-full">
                                        {/* Collection Stats */}
                                        <div className="bg-white dark:bg-[#1a202c] rounded-2xl p-6 shadow-sm">
                                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Your Library</h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                {[
                                                    { icon: 'book_2',      value: totalActive,    label: 'Active Loans' },
                                                    { icon: 'done_all',    value: totalReturned,  label: 'Returned' },
                                                    { icon: 'history',     value: totalBorrowed,  label: 'Total Borrows' },
                                                    { icon: 'warning',     value: overdueCount,   label: 'Overdue', danger: overdueCount > 0 },
                                                ].map(stat => (
                                                    <div key={stat.label} className={`p-3 rounded-xl flex flex-col gap-1 border ${stat.danger && stat.value > 0 ? 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-800/30' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700'}`}>
                                                        <span className={`material-symbols-outlined text-[20px] ${stat.danger && stat.value > 0 ? 'text-red-500' : 'text-gray-400'}`}>{stat.icon}</span>
                                                        <span className={`text-2xl font-bold ${stat.danger && stat.value > 0 ? 'text-red-600' : 'text-[#1e293b] dark:text-white'}`}>{stat.value}</span>
                                                        <span className="text-xs text-gray-500">{stat.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Due Soon Alert */}
                                        {dueSoonBook ? (
                                            <div className="bg-white dark:bg-[#1a202c] border-l-4 border-[#7D3C3C] rounded-r-xl shadow-sm p-5 flex flex-col justify-between flex-1">
                                                <div className="flex justify-between items-start mb-3">
                                                    <h3 className="text-md font-semibold text-[#7D3C3C] flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-[20px]">event_busy</span>
                                                        Due Soon
                                                    </h3>
                                                    <DaysLeft dueDate={dueSoonBook.due_date} />
                                                </div>
                                                <div className="flex gap-4 items-center">
                                                    <div className="w-12 h-16 rounded overflow-hidden shrink-0 bg-gray-200">
                                                        {dueSoonBook.book?.cover_image_url ? (
                                                            <img src={dueSoonBook.book.cover_image_url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-[#7D3C3C] to-[#c0392b]" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-[#1e293b] dark:text-white leading-tight">{dueSoonBook.book?.title}</p>
                                                        <p className="text-xs text-gray-500 mt-0.5">{dueSoonBook.book?.author}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 rounded-xl p-5 flex items-center gap-3 flex-1">
                                                <span className="material-symbols-outlined text-emerald-500 text-3xl">check_circle</span>
                                                <div>
                                                    <p className="font-semibold text-emerald-800 dark:text-emerald-400">All clear!</p>
                                                    <p className="text-sm text-emerald-600">No books due soon.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Middle: All Active Loans (if more than 1) */}
                                {activeLoans.length > 1 && (
                                    <section>
                                        <h2 className="text-lg font-semibold text-[#1e293b] dark:text-gray-200 mb-4 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[#2463eb]">checklist</span>
                                            All Active Loans
                                        </h2>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {activeLoans.map(loan => (
                                                <div key={loan.id} className="bg-white dark:bg-[#1a202c] rounded-xl p-4 flex gap-4 shadow-sm border border-gray-100 dark:border-gray-700">
                                                    <div className="w-10 h-14 rounded overflow-hidden shrink-0 bg-gray-200">
                                                        {loan.book?.cover_image_url ? (
                                                            <img src={loan.book.cover_image_url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-600" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-sm truncate">{loan.book?.title}</p>
                                                        <p className="text-xs text-gray-500 truncate">{loan.book?.author}</p>
                                                        <p className="text-xs mt-1">
                                                            <DaysLeft dueDate={loan.due_date} />
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Bottom: History + Recommendations */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {/* Borrowing History */}
                                    <div className="lg:col-span-2 flex flex-col justify-between bg-white dark:bg-[#1a202c] rounded-2xl p-6 shadow-sm">
                                        <div className="flex justify-between items-center mb-4">
                                            <h2 className="text-lg font-semibold text-[#1e293b] dark:text-gray-200">Recent History</h2>
                                            <Link to="/catalog" className="text-sm text-[#2463eb] hover:text-blue-700 font-medium">Browse Catalog</Link>
                                        </div>
                                        {history.length === 0 ? (
                                            <p className="text-gray-400 italic text-sm">No borrowing history yet.</p>
                                        ) : (
                                            <div className="flex flex-col gap-2">
                                                {history.slice(0, 5).map(tx => (
                                                    <div key={tx.id} className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                                                        <div className="w-8 h-11 rounded overflow-hidden shrink-0 bg-gray-200">
                                                            {tx.book?.cover_image_url ? (
                                                                <img src={tx.book.cover_image_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-500" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-sm truncate">{tx.book?.title}</p>
                                                            <p className="text-xs text-gray-500">{new Date(tx.checkout_date).toLocaleDateString()}</p>
                                                        </div>
                                                        <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${
                                                            tx.status === 'returned' ? 'bg-emerald-100 text-emerald-700' :
                                                            tx.status === 'overdue'  ? 'bg-red-100 text-red-600'      :
                                                            'bg-blue-100 text-blue-700'
                                                        }`}>
                                                            {tx.status === 'checked_out' ? 'Active' : tx.status}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Recommendations */}
                                    <div className="flex flex-col bg-white dark:bg-[#1a202c] rounded-2xl p-6 shadow-sm gap-4">
                                        <h2 className="text-lg font-semibold text-[#1e293b] dark:text-gray-200">You Might Like</h2>
                                        {recommended.length === 0 ? (
                                            <p className="text-gray-400 italic text-sm">Explore the catalog to get recommendations.</p>
                                        ) : (
                                            <div className="flex flex-col gap-3">
                                                {recommended.slice(0, 4).map((book, idx) => (
                                                    <Link key={book.id || idx} to={`/book/${book.id}`}
                                                        className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-1.5 transition-colors">
                                                        <div className="w-8 h-11 rounded overflow-hidden shrink-0 bg-gray-200">
                                                            {book.cover_image_url ? (
                                                                <img src={book.cover_image_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full bg-gradient-to-br from-purple-400 to-blue-500" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-sm truncate">{book.title}</p>
                                                            <p className="text-xs text-gray-500 truncate">{book.author}</p>
                                                        </div>
                                                        <span className="material-symbols-outlined text-[#2463eb] text-[18px] opacity-0 group-hover:opacity-100">arrow_forward</span>
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </>
                        )}

                        {/* Footer room */}
                        <div className="h-8" />
                    </div>
                </main>
            </div>
        </>
    );
}
