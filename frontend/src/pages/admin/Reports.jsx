import { useState } from 'react';
import { ADMIN_COLORS } from '../../styles/adminTheme';

export default function Reports() {
    const [activeMonth, setActiveMonth] = useState(null);
    const genres = [
        { name: 'Fiction', percentage: 85, color: '#2c3e50', subtitle: 'Classics & Modern' },
        { name: 'History', percentage: 65, color: '#8b3a3a', subtitle: 'World Events' },
        { name: 'Science', percentage: 50, color: ' #2f4f4f', subtitle: 'Nature & Physics' },
        { name: 'Biographies', percentage: 40, color: '#b8860b', subtitle: 'Memoirs' },
        { name: 'Arts', percentage: 30, color: '#5d4037', subtitle: 'Design & Painting' },
    ];

    const ledgerEntries = [
        { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', patronId: '#882109', dueDate: 'Oct 24, 2023', status: 'Returned', statusColor: 'emerald' },
        { title: 'Invisible Man', author: 'Ralph Ellison', patronId: '#440192', dueDate: 'Oct 26, 2023', status: 'Due Soon', statusColor: 'amber' },
        { title: '1984', author: 'George Orwell', patronId: '#992011', dueDate: 'Oct 20, 2023', status: 'Overdue', statusColor: 'rose' },
        { title: 'To Kill a Mockingbird', author: 'Harper Lee', patronId: '#102938', dueDate: 'Nov 01, 2023', status: 'Checked Out', statusColor: 'primary' },
        { title: 'Pride and Prejudice', author: 'Jane Austen', patronId: '#551234', dueDate: 'Nov 02, 2023', status: 'Checked Out', statusColor: 'primary' },
    ];

    return (
        <div className="min-h-full flex flex-col" style={{ backgroundColor: ADMIN_COLORS.primaryBg, fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textPrimary }}>
            {/* Content Wrapper */}
            <div className="flex-1 p-6 md:p-8 flex flex-col items-center">
                {/* Ledger Container */}
                <div className="w-full max-w-[1100px] flex rounded-r-lg border relative overflow-hidden min-h-[800px]" style={{ backgroundColor: ADMIN_COLORS.cardBg, borderColor: ADMIN_COLORS.border }}>
                    {/* Perforated Edge Strip */}
                    <div className="hidden sm:block w-12 border-r flex-shrink-0 relative" style={{ borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.secondaryBg }}>
                        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-4" style={{
                            backgroundImage: `radial-gradient(${ADMIN_COLORS.borderDotted} 20%, transparent 20%)`,
                            backgroundPosition: '0 0',
                            backgroundSize: '100% 40px',
                            opacity: 0.6
                        }}></div>
                    </div>

                    {/* Paper Content */}
                    <div className="flex-1 p-8 md:p-12 flex flex-col gap-10">
                        {/* Header Section */}
                        <header className="flex flex-wrap justify-between items-end gap-6 border-b-2 border-[#144bb8]/20 pb-6">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-[#144bb8] font-bold text-sm uppercase tracking-widest font-['Noto_Sans']">
                                    <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                                    <span>October 2023</span>
                                </div>
                                <h2 className="text-4xl md:text-5xl font-black leading-tight">Circulation Ledger</h2>
                                <p className="text-[#4e6797] text-lg italic">Weekly circulation and inventory analysis</p>
                            </div>
                            <div className="flex flex-col items-end gap-3 pb-1">
                                <a className="group flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#144bb8] transition-colors" href="#">
                                    <span className="group-hover:underline decoration-1 underline-offset-4 font-['Noto_Sans']">Export as CSV</span>
                                    <span className="material-symbols-outlined text-[18px]">download</span>
                                </a>
                                <a className="group flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#144bb8] transition-colors" href="#">
                                    <span className="group-hover:underline decoration-1 underline-offset-4 font-['Noto_Sans']">Print Ledger</span>
                                    <span className="material-symbols-outlined text-[18px]">print</span>
                                </a>
                            </div>
                        </header>

                        {/* Tabs */}
                        <div className="flex gap-8 border-b border-gray-200 -mt-4">
                            <a className="pb-3 border-b-[3px] border-[#144bb8] text-[#144bb8] font-bold text-sm tracking-wide" href="#">Circulation</a>
                            <a className="pb-3 border-b-[3px] border-transparent text-[#4e6797] hover:text-slate-800 font-bold text-sm tracking-wide transition-colors" href="#">Popular Books</a>
                            <a className="pb-3 border-b-[3px] border-transparent text-[#4e6797] hover:text-slate-800 font-bold text-sm tracking-wide transition-colors" href="#">Fine Collection</a>
                        </div>

                        {/* Stats KPIs */}
                        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="flex flex-col gap-1 p-4 border-l-4 border-gray-200 pl-6">
                                <p className="text-[#4e6797] font-['Noto_Sans'] text-xs font-bold uppercase tracking-wider">Total Loans</p>
                                <p className="text-4xl font-bold">1,248</p>
                                <p className="text-emerald-600 text-sm font-medium font-['Noto_Sans'] flex items-center gap-1 mt-1">
                                    <span className="material-symbols-outlined text-[16px]">trending_up</span> +12% vs last month
                                </p>
                            </div>
                            <div className="flex flex-col gap-1 p-4 border-l-4 border-gray-200 pl-6">
                                <p className="text-[#4e6797] font-['Noto_Sans'] text-xs font-bold uppercase tracking-wider">Overdue Items</p>
                                <p className="text-4xl font-bold">86</p>
                                <p className="text-rose-600 text-sm font-medium font-['Noto_Sans'] flex items-center gap-1 mt-1">
                                    <span className="material-symbols-outlined text-[16px]">trending_down</span> -5% vs last month
                                </p>
                            </div>
                            <div className="flex flex-col gap-1 p-4 border-l-4 border-gray-200 pl-6">
                                <p className="text-[#4e6797] font-['Noto_Sans'] text-xs font-bold uppercase tracking-wider">Fines Collected</p>
                                <p className="text-4xl font-bold">$420.50</p>
                                <p className="text-emerald-600 text-sm font-medium font-['Noto_Sans'] flex items-center gap-1 mt-1">
                                    <span className="material-symbols-outlined text-[16px]">trending_up</span> +2% vs last month
                                </p>
                            </div>
                        </section>

                        {/* Visualization Row */}
                        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-4">
                            {/* Book Spine Chart */}
                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-xl font-bold">Top Borrowed Genres</h3>
                                    <p className="text-sm text-[#4e6797] font-['Noto_Sans']">Based on checkout volume (Book Spines)</p>
                                </div>
                                <div className="flex flex-col gap-4 font-['Noto_Sans'] text-sm">
                                    {genres.map((genre, idx) => (
                                        <div key={idx} className="grid grid-cols-[100px_1fr_40px] items-center gap-4 group">
                                            <span className="text-right text-slate-600 font-medium">{genre.name}</span>
                                            <div className="h-8 w-full bg-slate-100 rounded-sm relative overflow-hidden">
                                                <div
                                                    className="absolute top-0 left-0 h-full rounded-r-sm flex items-center pl-3"
                                                    style={{
                                                        width: `${genre.percentage}%`,
                                                        backgroundColor: genre.color,
                                                        boxShadow: 'inset 2px 0 0 rgba(255,255,255,0.2), inset -2px 0 0 rgba(0,0,0,0.2)'
                                                    }}
                                                >
                                                    <span className="text-[10px] text-white/50 tracking-widest uppercase truncate w-full pr-2">
                                                        {genre.subtitle}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="font-bold">{genre.percentage}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Line Chart */}
                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-xl font-bold">Loan Trends</h3>
                                    <p className="text-sm text-[#4e6797] font-['Noto_Sans']">Daily checkout volume (Last 7 Days)</p>
                                </div>
                                <div className="flex-1 min-h-[200px] flex items-end justify-center pb-2 relative">
                                    {/* Background Grid Lines */}
                                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                        {[...Array(4)].map((_, i) => (
                                            <div key={i} className="border-t border-dashed border-gray-300 w-full h-0"></div>
                                        ))}
                                    </div>
                                    {/* SVG Chart */}
                                    <svg className="w-full h-full overflow-visible" viewBox="0 0 400 200">
                                        {/* Area fill */}
                                        <path className="text-[#144bb8]/5" d="M0,150 L60,120 L120,160 L180,90 L240,110 L300,50 L360,80 L400,180 L400,200 L0,200 Z" fill="currentColor"></path>
                                        {/* Line */}
                                        <path className="text-[#144bb8]" d="M0,150 L60,120 L120,160 L180,90 L240,110 L300,50 L360,80 L400,60" fill="none" stroke="currentColor" strokeWidth="2"></path>
                                        {/* Points */}
                                        {[60, 120, 180, 240, 300, 360].map((cx, i) => {
                                            const cys = [120, 160, 90, 110, 50, 80];
                                            return <circle key={i} className="fill-white stroke-[#144bb8] stroke-2" cx={cx} cy={cys[i]} r="3"></circle>;
                                        })}
                                    </svg>
                                </div>
                                {/* X-Axis Labels */}
                                <div className="flex justify-between text-xs font-['Noto_Sans'] font-medium text-slate-400 uppercase tracking-wider px-2">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                                        <span key={i}>{day}</span>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* Data Table */}
                        <section className="flex flex-col gap-6 pt-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold">Recent Ledger Entries</h3>
                                <div className="flex gap-2">
                                    <button className="size-8 flex items-center justify-center rounded hover:bg-slate-100 transition-colors text-slate-400">
                                        <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                                    </button>
                                    <button className="size-8 flex items-center justify-center rounded hover:bg-slate-100 transition-colors text-slate-600">
                                        <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                                    </button>
                                </div>
                            </div>
                            <div className="w-full overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b-2 border-slate-300">
                                            <th className="py-3 px-2 font-['Noto_Sans'] text-xs font-bold text-slate-500 uppercase tracking-wider w-1/4">Book Title</th>
                                            <th className="py-3 px-2 font-['Noto_Sans'] text-xs font-bold text-slate-500 uppercase tracking-wider w-1/4">Author</th>
                                            <th className="py-3 px-2 font-['Noto_Sans'] text-xs font-bold text-slate-500 uppercase tracking-wider w-1/6">Patron ID</th>
                                            <th className="py-3 px-2 font-['Noto_Sans'] text-xs font-bold text-slate-500 uppercase tracking-wider w-1/6">Date Due</th>
                                            <th className="py-3 px-2 font-['Noto_Sans'] text-xs font-bold text-slate-500 uppercase tracking-wider w-1/6 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-['Noto_Sans'] text-sm text-slate-700">
                                        {ledgerEntries.map((entry, idx) => {
                                            const statusColors = {
                                                emerald: 'text-emerald-600',
                                                amber: 'text-amber-600',
                                                rose: 'text-rose-600',
                                                primary: 'text-[#144bb8]'
                                            };

                                            return (
                                                <tr key={idx} className="group hover:bg-blue-50/30 transition-colors" style={{
                                                    backgroundImage: 'linear-gradient(to bottom, transparent 95%, #e5e7eb 95%)',
                                                    backgroundSize: '100% 100%'
                                                }}>
                                                    <td className="py-3 px-2 font-medium">{entry.title}</td>
                                                    <td className="py-3 px-2 text-slate-500">{entry.author}</td>
                                                    <td className="py-3 px-2 font-mono text-xs">{entry.patronId}</td>
                                                    <td className="py-3 px-2">{entry.dueDate}</td>
                                                    <td className={`py-3 px-2 text-right font-medium ${statusColors[entry.statusColor]}`}>{entry.status}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <footer className="mt-auto pt-8 flex items-center justify-between text-xs font-['Noto_Sans'] text-slate-400 border-t border-dashed border-slate-300">
                            <p>Generated by System V5.6</p>
                            <p>Page 1 of 12</p>
                        </footer>
                    </div>
                </div>
            </div>
        </div>
    );
}
