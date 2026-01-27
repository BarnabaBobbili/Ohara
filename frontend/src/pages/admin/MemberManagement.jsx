import { useState } from 'react';
import { ADMIN_COLORS } from '../../styles/adminTheme';

// Mock Data
const MEMBERS = [
    { id: 1, name: 'Elara Vane', initials: 'EV', cardId: 'LIB-8821-X', email: 'elara.v@example.com', joined: 'Oct 12, 2023', loans: 3, fines: null, status: 'Active', statusColor: 'emerald', avatarColor: 'primary' },
    { id: 2, name: 'Jonas K.', initials: 'JK', cardId: 'LIB-9932-A', email: 'jonas.k@example.com', joined: 'Sep 28, 2023', loans: 1, fines: 1.50, status: 'Active', statusColor: 'emerald', avatarColor: 'blue' },
    { id: 3, name: 'Mara S.', initials: 'MS', cardId: 'LIB-1002-B', email: 'mara.s@example.com', joined: 'Nov 01, 2023', loans: 0, fines: null, status: 'Suspended', statusColor: 'slate', avatarColor: 'indigo' },
    { id: 4, name: 'David R.', initials: 'DR', cardId: 'LIB-3310-C', email: 'david.r@example.com', joined: 'Aug 15, 2023', loans: 5, fines: 4.25, status: 'Restricted', statusColor: 'amber', avatarColor: 'purple' },
    { id: 5, name: 'Sarah L.', initials: 'SL', cardId: 'LIB-4421-D', email: 'sarah.l@example.com', joined: 'Jul 20, 2023', loans: 2, fines: null, status: 'Active', statusColor: 'emerald', avatarColor: 'teal' },
    { id: 6, name: 'Arthur T.', initials: 'AT', cardId: 'LIB-1192-M', email: 'arthur.t@example.com', joined: 'Jan 05, 2024', loans: 0, fines: null, status: 'Active', statusColor: 'emerald', avatarColor: 'orange' },
];

export default function MemberManagement() {
    const [activeFilter, setActiveFilter] = useState('all');

    return (
        <div className="min-h-full flex flex-col p-8 lg:p-12" style={{ backgroundColor: ADMIN_COLORS.primaryBg }}>
            <div className="max-w-7xl mx-auto flex flex-col gap-8 w-full">
                {/* Header Section */}
                <header className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider" style={{ color: ADMIN_COLORS.burgundy, fontFamily: "'Noto Sans', sans-serif" }}>
                        <span className="material-symbols-outlined text-lg">group</span>
                        <span>Patron Management</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight" style={{ fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textPrimary }}>Member Registry</h1>
                    <p className="text-lg mt-1" style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textSecondary }}>Community of readers, scholars, and patrons.</p>
                </header>

                {/* Search & Filters */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2" style={{ color: ADMIN_COLORS.textMuted }}>search</span>
                        <input
                            className="w-full pl-12 pr-4 py-3 rounded border text-base focus:ring-2 transition-all"
                            placeholder="Search members by name, card ID, or email..."
                            type="text"
                            style={{
                                fontFamily: "'Noto Sans', sans-serif",
                                backgroundColor: ADMIN_COLORS.cardBg,
                                borderColor: ADMIN_COLORS.border,
                                color: ADMIN_COLORS.textPrimary
                            }}
                        />
                    </div>
                    <div className="flex gap-2">
                        <FilterButton active={activeFilter === 'all'} onClick={() => setActiveFilter('all')}>All</FilterButton>
                        <FilterButton active={activeFilter === 'active'} onClick={() => setActiveFilter('active')}>Active</FilterButton>
                        <FilterButton active={activeFilter === 'suspended'} onClick={() => setActiveFilter('suspended')}>Suspended</FilterButton>
                        <FilterButton active={activeFilter === 'restricted'} onClick={() => setActiveFilter('restricted')}>Restricted</FilterButton>
                    </div>
                    <button className="px-4 py-2 rounded text-sm font-bold transition-colors text-white shadow-sm"
                        style={{ backgroundColor: ADMIN_COLORS.burgundy, fontFamily: "'Noto Sans', sans-serif" }}>
                        <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">person_add</span>
                            New Member
                        </span>
                    </button>
                </div>

                {/* Ledger Table Container */}
                <div className="flex flex-col gap-4">
                    {/* Toolbar/Filter Row */}
                    <div className="flex justify-between items-center text-sm">
                        <div className="flex gap-6">
                            <button
                                onClick={() => setActiveFilter('all')}
                                className={`font-bold pb-0.5 ${activeFilter === 'all' ? 'text-[#1754cf] border-b-2 border-[#1754cf]' : 'font-medium text-slate-500 hover:text-[#1e293b] transition-colors'}`}
                            >
                                All Members
                            </button>
                            <button
                                onClick={() => setActiveFilter('loans')}
                                className={`font-bold pb-0.5 ${activeFilter === 'loans' ? 'text-[#1754cf] border-b-2 border-[#1754cf]' : 'font-medium text-slate-500 hover:text-[#1e293b] transition-colors'}`}
                            >
                                Active Loans
                            </button>
                            <button
                                onClick={() => setActiveFilter('fines')}
                                className={`font-bold pb-0.5 ${activeFilter === 'fines' ? 'text-[#1754cf] border-b-2 border-[#1754cf]' : 'font-medium text-slate-500 hover:text-[#1e293b] transition-colors'}`}
                            >
                                Outstanding Fines
                            </button>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 cursor-pointer hover:text-[#1754cf] transition-colors">
                            <span className="material-symbols-outlined text-[20px]">filter_list</span>
                            <span className="font-medium">Filter View</span>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto min-h-[500px]">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-black">
                                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-500 w-16"></th>
                                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-500 w-64">Name</th>
                                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-500 w-48">Card ID</th>
                                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-500 w-64">Contact</th>
                                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-500 w-40">Joined</th>
                                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-500 text-center w-24">Loans</th>
                                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-500 text-right w-32">Fines</th>
                                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-500 w-32 pl-8">Status</th>
                                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-500 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {MEMBERS.map(member => (
                                    <MemberRow key={member.id} member={member} />
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        <div className="flex justify-between items-center py-6 px-4 border-t border-[#e2e8f0] mt-2">
                            <span className="text-xs text-slate-400 uppercase tracking-widest font-medium">Viewing 1-6 of 2,845 records</span>
                            <div className="flex gap-4">
                                <button className="text-xs font-bold uppercase tracking-widest text-slate-400 cursor-not-allowed">Previous</button>
                                <button className="text-xs font-bold uppercase tracking-widest text-[#1754cf] hover:text-blue-800">Next</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// FilterButton Component
function FilterButton({ active, onClick, children }) {
    return (
        <button
            onClick={onClick}
            className="px-4 py-2 text-sm font-medium rounded transition-colors"
            style={{
                fontFamily: "'Noto Sans', sans-serif",
                backgroundColor: active ? ADMIN_COLORS.burgundy : ADMIN_COLORS.secondaryBg,
                color: active ? 'white' : ADMIN_COLORS.textSecondary,
                borderWidth: '1px',
                borderColor: active ? ADMIN_COLORS.burgundy : ADMIN_COLORS.border
            }}
        >
            {children}
        </button>
    );
}


function NavLink({ to, icon, children, active }) {
    if (active) {
        return (
            <a href={to} className="flex items-center gap-3 px-3 py-2.5 rounded bg-white shadow-sm border border-[#e2e8f0]">
                <span className="material-symbols-outlined text-[#1754cf] filled-icon">{icon}</span>
                <span className="text-[#1754cf] text-sm font-bold">{children}</span>
            </a>
        );
    }

    return (
        <a href={to} className="flex items-center gap-3 px-3 py-2.5 rounded hover:bg-white transition-colors group">
            <span className="material-symbols-outlined text-slate-400 group-hover:text-[#1754cf] transition-colors">{icon}</span>
            <span className="text-slate-600 text-sm font-medium group-hover:text-[#1754cf] transition-colors">{children}</span>
        </a>
    );
}

function MemberRow({ member }) {
    const avatarColors = {
        primary: 'bg-[#1754cf]/10 text-[#1754cf]',
        blue: 'bg-blue-100 text-blue-600',
        indigo: 'bg-indigo-100 text-indigo-600',
        purple: 'bg-purple-100 text-purple-600',
        teal: 'bg-teal-100 text-teal-600',
        orange: 'bg-orange-100 text-orange-600',
    };

    const statusColors = {
        emerald: 'text-emerald-700',
        amber: 'text-amber-600',
        slate: 'text-slate-500',
    };

    return (
        <tr className="group hover:bg-slate-50 transition-colors border-b border-[#e2e8f0]">
            <td className="py-3 px-4">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${avatarColors[member.avatarColor]}`}>
                    {member.initials}
                </div>
            </td>
            <td className="py-3 px-4 font-semibold">{member.name}</td>
            <td className="py-3 px-4 font-mono text-slate-500 text-xs tracking-tight">{member.cardId}</td>
            <td className="py-3 px-4 text-slate-600 truncate max-w-[200px]">{member.email}</td>
            <td className="py-3 px-4 text-slate-500 tabular-nums">{member.joined}</td>
            <td className={`py-3 px-4 text-center tabular-nums ${member.loans > 0 ? 'font-medium' : 'text-slate-400'}`}>{member.loans}</td>
            <td className="py-3 px-4 text-right tabular-nums font-mono">
                {member.fines ? <span className="text-red-600 font-bold">${member.fines.toFixed(2)}</span> : <span className="text-slate-400">-</span>}
            </td>
            <td className="py-3 px-4 pl-8">
                <span className={`inline-flex items-center text-xs font-bold uppercase tracking-wide ${statusColors[member.statusColor]}`}>
                    {member.status}
                </span>
            </td>
            <td className="py-3 px-4 text-right">
                <a className="text-[#1754cf] hover:text-blue-800 font-medium text-xs uppercase tracking-wide" href="#">Edit</a>
            </td>
        </tr>
    );
}
