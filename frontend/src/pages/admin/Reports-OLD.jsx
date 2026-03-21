import { useState, useEffect } from 'react';
import { reportsAPI, financialAPI } from '../../services/api';
import { ADMIN_COLORS } from '../../styles/adminTheme';

const TABS = ['Circulation', 'Popular Books', 'Fine Collection'];

const STATUS_STYLE = {
    returned:    'text-emerald-600',
    checked_out: 'text-[#144bb8]',
    overdue:     'text-rose-600',
    reserved:    'text-amber-600',
};

export default function Reports() {
    const [activeTab, setActiveTab] = useState('Circulation');
    const [stats, setStats] = useState(null);
    const [genres, setGenres] = useState([]);
    const [ledger, setLedger] = useState([]);
    const [popularBooks, setPopularBooks] = useState([]);
    const [fineReport, setFineReport] = useState(null);
    const [monthlyTrend, setMonthlyTrend] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentDate] = useState(new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));

    useEffect(() => {
        setLoading(true);
        Promise.all([
            reportsAPI.getCirculationStats().catch(() => null),
            reportsAPI.getCategoryDistribution().catch(() => []),
            reportsAPI.getActivityLogs({ limit: 10 }).catch(() => ({ logs: [] })),
            reportsAPI.getPopularBooks(10).catch(() => []),
            reportsAPI.getFineReport().catch(() => null),
            reportsAPI.getMonthlyTrend().catch(() => []),
        ]).then(([circStats, catDist, logs, popular, fines, trend]) => {
            setStats(circStats);
            setGenres(Array.isArray(catDist) ? catDist : []);
            setLedger(logs?.logs || logs || []);
            setPopularBooks(Array.isArray(popular) ? popular : []);
            setFineReport(fines);
            setMonthlyTrend(Array.isArray(trend) ? trend.map(t => ({
            count: t.checkouts || t.count || 0,
            label: t.month ? new Date(t.year, t.month - 1).toLocaleString('default', { month: 'short' }) : (t.label || ''),
        })) : []);
        }).finally(() => setLoading(false));
    }, []);

    // Build chart points from monthlyTrend
    const maxCount = Math.max(...monthlyTrend.map(t => t.count || 0), 1);
    const chartPoints = monthlyTrend.slice(-7).map((t, i, arr) => ({
        x: Math.round((i / Math.max(arr.length - 1, 1)) * 400),
        y: Math.round(200 - ((t.count / maxCount) * 180)),
        label: t.day || t.label || '',
    }));

    const linePath = chartPoints.length > 1
        ? `M${chartPoints[0].x},${chartPoints[0].y} ` + chartPoints.slice(1).map(p => `L${p.x},${p.y}`).join(' ')
        : 'M0,100 L400,100';
    const areaPath = chartPoints.length > 1
        ? `M0,200 L${chartPoints.map(p => `${p.x},${p.y}`).join(' L')} L400,200 Z`
        : 'M0,200 L400,200 Z';

    return (
        <div className="min-h-full flex flex-col" style={{ backgroundColor: ADMIN_COLORS.primaryBg, fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textPrimary }}>
            <div className="flex-1 p-6 md:p-8 flex flex-col items-center">
                <div className="w-full max-w-[1100px] flex rounded-r-lg border relative overflow-hidden min-h-[800px]" style={{ backgroundColor: ADMIN_COLORS.cardBg, borderColor: ADMIN_COLORS.border }}>

                    {/* Perforated edge strip */}
                    <div className="hidden sm:block w-12 border-r flex-shrink-0 relative" style={{ borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.secondaryBg }}>
                        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-4" style={{
                            backgroundImage: `radial-gradient(${ADMIN_COLORS.borderDotted} 20%, transparent 20%)`,
                            backgroundPosition: '0 0', backgroundSize: '100% 40px', opacity: 0.6
                        }} />
                    </div>

                    <div className="flex-1 p-8 md:p-12 flex flex-col gap-10">
                        {/* Header */}
                        <header className="flex flex-wrap justify-between items-end gap-6 border-b-2 border-[#144bb8]/20 pb-6">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-[#144bb8] font-bold text-sm uppercase tracking-widest font-['Noto_Sans']">
                                    <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                                    <span>{currentDate}</span>
                                </div>
                                <h2 className="text-4xl md:text-5xl font-black leading-tight">Circulation Ledger</h2>
                                <p className="text-[#4e6797] text-lg italic">Weekly circulation and inventory analysis</p>
                            </div>
                            <div className="flex flex-col items-end gap-3 pb-1">
                                <button onClick={() => {
                                    const csv = [
                                        ['Book', 'Patron', 'Status', 'Action'],
                                        ...ledger.map(e => [e.book_title || '', e.member_name || '', e.action || '', ''])
                                    ].map(r => r.join(',')).join('\n');
                                    const a = document.createElement('a');
                                    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
                                    a.download = 'circulation.csv';
                                    a.click();
                                }} className="group flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#144bb8] transition-colors">
                                    <span className="group-hover:underline font-['Noto_Sans']">Export as CSV</span>
                                    <span className="material-symbols-outlined text-[18px]">download</span>
                                </button>
                                <button onClick={() => window.print()} className="group flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#144bb8] transition-colors">
                                    <span className="group-hover:underline font-['Noto_Sans']">Print Ledger</span>
                                    <span className="material-symbols-outlined text-[18px]">print</span>
                                </button>
                            </div>
                        </header>

                        {/* Tabs */}
                        <div className="flex gap-8 border-b border-gray-200 -mt-4">
                            {TABS.map(tab => (
                                <button key={tab} onClick={() => setActiveTab(tab)}
                                    className={`pb-3 border-b-[3px] font-bold text-sm tracking-wide ${activeTab === tab ? 'border-[#144bb8] text-[#144bb8]' : 'border-transparent text-[#4e6797] hover:text-slate-800 transition-colors'}`}>
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {loading ? (
                            <div className="flex-1 flex items-center justify-center text-[#4e6797] italic animate-pulse">
                                Loading report data…
                            </div>
                        ) : (
                            <>
                                {/* ── Circulation Tab ──────────────────────────────── */}
                                {activeTab === 'Circulation' && (
                                    <>
                                        {/* KPI Stats */}
                                        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <StatBox label="Total Loans" value={stats?.total_loans ?? stats?.total_transactions ?? '—'} trend={stats?.loans_trend} />
                                            <StatBox label="Overdue Items" value={stats?.overdue_count ?? '—'} trend={stats?.overdue_trend} trendNegative />
                                            <StatBox label="Fines Collected" value={stats?.total_fines_paid != null ? `$${Number(stats.total_fines_paid).toFixed(2)}` : '—'} trend={stats?.fines_trend} />
                                        </section>

                                        {/* Visualisation */}
                                        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-4">
                                            {/* Genre chart */}
                                            <div className="flex flex-col gap-6">
                                                <div className="flex flex-col gap-1">
                                                    <h3 className="text-xl font-bold">Top Borrowed Genres</h3>
                                                    <p className="text-sm text-[#4e6797] font-['Noto_Sans']">Based on checkout volume</p>
                                                </div>
                                                <div className="flex flex-col gap-4 font-['Noto_Sans'] text-sm">
                                                    {genres.length === 0 ? (
                                                        <p className="italic text-[#4e6797]">No genre data yet.</p>
                                                    ) : genres.slice(0, 6).map((genre, idx) => {
                                                        const COLORS = ['#2c3e50','#8b3a3a','#2f4f4f','#b8860b','#5d4037','#3c5a8a'];
                                                        const max = genres[0]?.count || 1;
                                                        const pct = Math.round((genre.count / max) * 100);
                                                        return (
                                                            <div key={idx} className="grid grid-cols-[100px_1fr_40px] items-center gap-4 group">
                                                                <span className="text-right text-slate-600 font-medium truncate">{genre.category || genre.name}</span>
                                                                <div className="h-8 w-full bg-slate-100 rounded-sm relative overflow-hidden">
                                                                    <div className="absolute top-0 left-0 h-full rounded-r-sm flex items-center pl-3"
                                                                        style={{ width: `${pct}%`, backgroundColor: COLORS[idx % COLORS.length], boxShadow: 'inset 2px 0 0 rgba(255,255,255,0.2), inset -2px 0 0 rgba(0,0,0,0.2)' }}>
                                                                        <span className="text-[10px] text-white/50 tracking-widest uppercase truncate w-full pr-2">{genre.count} books</span>
                                                                    </div>
                                                                </div>
                                                                <span className="font-bold">{pct}%</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Loan Trend Chart */}
                                            <div className="flex flex-col gap-6">
                                                <div className="flex flex-col gap-1">
                                                    <h3 className="text-xl font-bold">Loan Trends</h3>
                                                    <p className="text-sm text-[#4e6797] font-['Noto_Sans']">Daily checkout volume (Last 7 Days)</p>
                                                </div>
                                                <div className="flex-1 min-h-[200px] flex items-end justify-center pb-2 relative">
                                                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                                        {[...Array(4)].map((_, i) => <div key={i} className="border-t border-dashed border-gray-300 w-full h-0" />)}
                                                    </div>
                                                    <svg className="w-full h-full overflow-visible" viewBox="0 0 400 200">
                                                        <path className="text-[#144bb8]/5" d={areaPath} fill="currentColor" />
                                                        <path className="text-[#144bb8]" d={linePath} fill="none" stroke="currentColor" strokeWidth="2" />
                                                        {chartPoints.map((p, i) => (
                                                            <circle key={i} className="fill-white stroke-[#144bb8] stroke-2" cx={p.x} cy={p.y} r="3" />
                                                        ))}
                                                    </svg>
                                                </div>
                                                <div className="flex justify-between text-xs font-['Noto_Sans'] font-medium text-slate-400 uppercase tracking-wider px-2">
                                                    {chartPoints.map((p, i) => <span key={i}>{p.label}</span>)}
                                                </div>
                                            </div>
                                        </section>

                                        {/* Recent Activity Ledger */}
                                        <section className="flex flex-col gap-6 pt-4">
                                            <h3 className="text-xl font-bold">Recent Ledger Entries</h3>
                                            <div className="w-full overflow-x-auto">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="border-b-2 border-slate-300 font-['Noto_Sans'] text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                            <th className="py-3 px-2 w-1/4">Book</th>
                                                            <th className="py-3 px-2 w-1/4">Patron</th>
                                                            <th className="py-3 px-2 w-1/6">Action</th>
                                                            <th className="py-3 px-2 w-1/6 text-right">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="font-['Noto_Sans'] text-sm text-slate-700">
                                                        {ledger.length === 0 ? (
                                                            <tr><td colSpan={4} className="py-8 text-center italic text-slate-400">No recent activity</td></tr>
                                                        ) : ledger.map((entry, idx) => (
                                                            <tr key={idx} className="hover:bg-blue-50/30 transition-colors"
                                                                style={{ backgroundImage: 'linear-gradient(to bottom, transparent 95%, #e5e7eb 95%)', backgroundSize: '100% 100%' }}>
                                                                <td className="py-3 px-2 font-medium">{entry.book_title || '—'}</td>
                                                                <td className="py-3 px-2 text-slate-500">{entry.member_name || '—'}</td>
                                                                <td className="py-3 px-2 font-mono text-xs uppercase">{entry.action || '—'}</td>
                                                                <td className={`py-3 px-2 text-right font-medium ${STATUS_STYLE[entry.action] || 'text-slate-500'}`}>
                                                                    {entry.action === 'checkout' ? 'Checked Out' : entry.action === 'checkin' ? 'Returned' : entry.action}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </section>
                                    </>
                                )}

                                {/* ── Popular Books Tab ───────────────────────────── */}
                                {activeTab === 'Popular Books' && (
                                    <section className="flex flex-col gap-6">
                                        <h3 className="text-xl font-bold">Most Borrowed Books</h3>
                                        {popularBooks.length === 0 ? (
                                            <p className="italic text-[#4e6797]">No data available yet.</p>
                                        ) : (
                                            <div className="flex flex-col gap-2">
                                                {popularBooks.map((book, idx) => (
                                                    <div key={idx} className="flex items-center gap-4 p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                                        <span className="text-3xl font-black text-slate-200 w-10 text-center">{idx + 1}</span>
                                                        {book.cover_image_url && (
                                                            <img src={book.cover_image_url} alt={book.title} className="w-10 h-14 object-cover rounded-sm shadow-sm" />
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-slate-800 truncate">{book.title}</p>
                                                            <p className="text-sm text-slate-500">{book.author || book.category}</p>
                                                        </div>
                                                        <span className="text-sm font-mono text-[#144bb8] font-bold">{book.borrow_count || book.count || '—'} borrows</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </section>
                                )}

                                {/* ── Fine Collection Tab ─────────────────────────── */}
                                {activeTab === 'Fine Collection' && (
                                    <section className="flex flex-col gap-6">
                                        <h3 className="text-xl font-bold">Fine Collection Report</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <StatBox label="Total Fines Issued" value={fineReport?.total_fines != null ? `$${Number(fineReport.total_fines).toFixed(2)}` : '—'} />
                                            <StatBox label="Unpaid / Outstanding" value={fineReport?.unpaid_fines != null ? `$${Number(fineReport.unpaid_fines).toFixed(2)}` : '—'} trendNegative />
                                            <StatBox label="Members with Fines" value={fineReport?.members_with_fines?.length ?? '—'} trendNegative />
                                        </div>
                                        <div className="mt-4 flex flex-col gap-2">
                                            {(fineReport?.members_with_fines || []).map((rec, idx) => (
                                                <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-100 font-['Noto_Sans'] text-sm">
                                                    <div>
                                                        <span className="text-slate-700 font-medium">{rec.name}</span>
                                                        <span className="text-slate-400 ml-2 text-xs">{rec.email}</span>
                                                    </div>
                                                    <span className="text-rose-600 font-bold">${Number(rec.fines).toFixed(2)}</span>
                                                </div>
                                            ))}
                                            {fineReport?.members_with_fines?.length === 0 && (
                                                <p className="italic text-[#4e6797] text-sm">No outstanding fines. 🎉</p>
                                            )}
                                        </div>
                                    </section>
                                )}
                            </>
                        )}

                        <footer className="mt-auto pt-8 flex items-center justify-between text-xs font-['Noto_Sans'] text-slate-400 border-t border-dashed border-slate-300">
                            <p>Ohara Library System</p>
                            <p>{currentDate}</p>
                        </footer>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatBox({ label, value, trend, trendNegative }) {
    const trendColor = trendNegative
        ? (trend > 0 ? 'text-rose-600' : 'text-emerald-600')
        : (trend > 0 ? 'text-emerald-600' : 'text-rose-600');
    return (
        <div className="flex flex-col gap-1 p-4 border-l-4 border-gray-200 pl-6">
            <p className="text-[#4e6797] font-['Noto_Sans'] text-xs font-bold uppercase tracking-wider">{label}</p>
            <p className="text-4xl font-bold">{value}</p>
            {trend != null && (
                <p className={`text-sm font-medium font-['Noto_Sans'] flex items-center gap-1 mt-1 ${trendColor}`}>
                    <span className="material-symbols-outlined text-[16px]">{trend > 0 ? 'trending_up' : 'trending_down'}</span>
                    {trend > 0 ? '+' : ''}{trend}% vs last month
                </p>
            )}
        </div>
    );
}
