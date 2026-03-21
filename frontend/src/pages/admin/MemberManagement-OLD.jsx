import { useState, useEffect, useCallback } from 'react';
import { ADMIN_COLORS } from '../../styles/adminTheme';
import { membersAPI } from '../../services/api';

const STATUS_STYLE = {
    active:    { label: 'Active',    color: 'text-emerald-700' },
    suspended: { label: 'Suspended', color: 'text-slate-500'   },
    expired:   { label: 'Expired',   color: 'text-orange-500'  },
    inactive:  { label: 'Inactive',  color: 'text-red-500'     },
};

const AVATAR_COLORS = [
    'bg-[#1754cf]/10 text-[#1754cf]',
    'bg-blue-100 text-blue-600',
    'bg-indigo-100 text-indigo-600',
    'bg-purple-100 text-purple-600',
    'bg-teal-100 text-teal-600',
    'bg-orange-100 text-orange-600',
];

export default function MemberManagement() {
    const [activeFilter, setActiveFilter] = useState('all');
    const [search, setSearch]             = useState('');
    const [members, setMembers]           = useState([]);
    const [total, setTotal]               = useState(0);
    const [page, setPage]                 = useState(1);
    const [loading, setLoading]           = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newMember, setNewMember]       = useState({ name: '', email: '', phone: '', member_type: 'regular' });
    const [saving, setSaving]             = useState(false);
    const [saveError, setSaveError]       = useState('');

    const PAGE_SIZE = 10;

    const loadMembers = useCallback(() => {
        setLoading(true);
        const params = {
            limit: PAGE_SIZE,
            offset: (page - 1) * PAGE_SIZE,
        };
        if (search.trim()) params.search = search.trim();
        if (activeFilter !== 'all') {
            if (activeFilter === 'loans') params.has_loans = true;
            else if (activeFilter === 'fines') params.has_fines = true;
            else params.status = activeFilter;
        }

        membersAPI.getAll(params)
            .then(data => {
                const list = Array.isArray(data) ? data : (data?.results || []);
                setMembers(list);
                setTotal(data?.total || list.length);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [page, search, activeFilter]);

    useEffect(() => { loadMembers(); }, [loadMembers]);

    // Debounce search
    useEffect(() => {
        setPage(1);
    }, [search, activeFilter]);

    const handleAddMember = async (e) => {
        e.preventDefault();
        setSaving(true);
        setSaveError('');
        const cardId = `LIB-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2,4).toUpperCase()}`;
        try {
            await membersAPI.create({ ...newMember, card_id: cardId, status: 'active' });
            setShowAddModal(false);
            setNewMember({ name: '', email: '', phone: '', member_type: 'regular' });
            loadMembers();
        } catch (err) {
            setSaveError(err.message || 'Failed to add member');
        } finally {
            setSaving(false);
        }
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className="min-h-full flex flex-col p-8 lg:p-12" style={{ backgroundColor: ADMIN_COLORS.primaryBg }}>
            <div className="max-w-7xl mx-auto flex flex-col gap-8 w-full">

                {/* Header */}
                <header className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider" style={{ color: ADMIN_COLORS.burgundy, fontFamily: "'Noto Sans', sans-serif" }}>
                        <span className="material-symbols-outlined text-lg">group</span>
                        <span>Patron Management</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight" style={{ fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textPrimary }}>
                        Member Registry
                    </h1>
                    <p className="text-lg mt-1" style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textSecondary }}>
                        {total.toLocaleString()} members registered · <span style={{ color: ADMIN_COLORS.burgundy }}>live data</span>
                    </p>
                </header>

                {/* Search & Filters */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2" style={{ color: ADMIN_COLORS.textMuted }}>search</span>
                        <input
                            className="w-full pl-12 pr-4 py-3 rounded border text-base focus:ring-2 transition-all"
                            placeholder="Search members by name, card ID, or email…"
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ fontFamily: "'Noto Sans', sans-serif", backgroundColor: ADMIN_COLORS.cardBg, borderColor: ADMIN_COLORS.border, color: ADMIN_COLORS.textPrimary }}
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {['all', 'active', 'suspended', 'loans', 'fines'].map(f => (
                            <FilterButton key={f} active={activeFilter === f} onClick={() => { setActiveFilter(f); setPage(1); }}>
                                {{ all: 'All', active: 'Active', suspended: 'Suspended', loans: 'Active Loans', fines: 'Outstanding Fines' }[f]}
                            </FilterButton>
                        ))}
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 rounded text-sm font-bold transition-colors text-white shadow-sm flex items-center gap-2"
                        style={{ backgroundColor: ADMIN_COLORS.burgundy, fontFamily: "'Noto Sans', sans-serif" }}
                    >
                        <span className="material-symbols-outlined text-lg">person_add</span>
                        New Member
                    </button>
                </div>

                {/* Table */}
                <div className="flex flex-col gap-4">
                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-black">
                                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-500 w-16" />
                                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-500 w-64">Name</th>
                                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-500 w-48">Card ID</th>
                                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-500 w-64">Contact</th>
                                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-500 w-40">Joined</th>
                                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-500 text-right w-32">Fines</th>
                                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-500 w-32 pl-8">Status</th>
                                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-slate-500 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {loading ? (
                                    <tr><td colSpan={8} className="py-12 text-center text-slate-400 italic animate-pulse">Loading members…</td></tr>
                                ) : members.length === 0 ? (
                                    <tr><td colSpan={8} className="py-12 text-center text-slate-400 italic">No members found.</td></tr>
                                ) : members.map((member, idx) => (
                                    <MemberRow key={member.id} member={member} avatarColorClass={AVATAR_COLORS[idx % AVATAR_COLORS.length]} />
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        <div className="flex justify-between items-center py-6 px-4 border-t border-[#e2e8f0] mt-2">
                            <span className="text-xs text-slate-400 uppercase tracking-widest font-medium">
                                Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()} records
                            </span>
                            <div className="flex gap-4">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                    className="text-xs font-bold uppercase tracking-widest text-slate-400 disabled:opacity-40 hover:text-[#1754cf] transition-colors">
                                    Previous
                                </button>
                                <span className="text-xs text-slate-500">Page {page} / {totalPages || 1}</span>
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                                    className="text-xs font-bold uppercase tracking-widest text-[#1754cf] hover:text-blue-800 disabled:opacity-40 transition-colors">
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Member Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-lg mx-4">
                        <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: "'Newsreader', serif" }}>Add New Member</h2>
                        <form onSubmit={handleAddMember} className="flex flex-col gap-4">
                            {[
                                { key: 'name', label: 'Full Name', type: 'text', required: true },
                                { key: 'email', label: 'Email', type: 'email', required: true },
                                { key: 'phone', label: 'Phone (optional)', type: 'tel', required: false },
                            ].map(f => (
                                <label key={f.key} className="flex flex-col gap-1.5">
                                    <span className="text-sm font-bold text-slate-600">{f.label}</span>
                                    <input
                                        type={f.type}
                                        required={f.required}
                                        value={newMember[f.key]}
                                        onChange={e => setNewMember(prev => ({ ...prev, [f.key]: e.target.value }))}
                                        className="border border-slate-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1754cf]/30"
                                    />
                                </label>
                            ))}
                            <label className="flex flex-col gap-1.5">
                                <span className="text-sm font-bold text-slate-600">Member Type</span>
                                <select
                                    value={newMember.member_type}
                                    onChange={e => setNewMember(prev => ({ ...prev, member_type: e.target.value }))}
                                    className="border border-slate-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1754cf]/30"
                                >
                                    <option value="regular">Regular</option>
                                    <option value="student">Student</option>
                                    <option value="faculty">Faculty</option>
                                    <option value="premium">Premium</option>
                                </select>
                            </label>
                            {saveError && <p className="text-red-600 text-sm">{saveError}</p>}
                            <div className="flex gap-3 justify-end mt-2">
                                <button type="button" onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium text-sm">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving}
                                    className="px-6 py-2 bg-[#1754cf] text-white rounded font-bold text-sm disabled:opacity-50">
                                    {saving ? 'Saving…' : 'Add Member'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function FilterButton({ active, onClick, children }) {
    return (
        <button onClick={onClick}
            className="px-4 py-2 text-sm font-medium rounded transition-colors"
            style={{
                fontFamily: "'Noto Sans', sans-serif",
                backgroundColor: active ? ADMIN_COLORS.burgundy : ADMIN_COLORS.secondaryBg,
                color: active ? 'white' : ADMIN_COLORS.textSecondary,
                borderWidth: '1px',
                borderColor: active ? ADMIN_COLORS.burgundy : ADMIN_COLORS.border
            }}>
            {children}
        </button>
    );
}

function MemberRow({ member, avatarColorClass }) {
    const initials = member.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
    const st = STATUS_STYLE[member.status] || { label: member.status, color: 'text-slate-500' };

    return (
        <tr className="group hover:bg-slate-50 transition-colors border-b border-[#e2e8f0]">
            <td className="py-3 px-4">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${avatarColorClass}`}>
                    {initials}
                </div>
            </td>
            <td className="py-3 px-4 font-semibold">{member.name}</td>
            <td className="py-3 px-4 font-mono text-slate-500 text-xs tracking-tight">{member.card_id}</td>
            <td className="py-3 px-4 text-slate-600 truncate max-w-[200px]">{member.email}</td>
            <td className="py-3 px-4 text-slate-500 tabular-nums">
                {member.joined_date ? new Date(member.joined_date).toLocaleDateString() : '—'}
            </td>
            <td className="py-3 px-4 text-right tabular-nums font-mono">
                {(member.fines || 0) > 0
                    ? <span className="text-red-600 font-bold">${Number(member.fines).toFixed(2)}</span>
                    : <span className="text-slate-400">—</span>}
            </td>
            <td className="py-3 px-4 pl-8">
                <span className={`inline-flex items-center text-xs font-bold uppercase tracking-wide ${st.color}`}>
                    {st.label}
                </span>
            </td>
            <td className="py-3 px-4 text-right">
                <a className="text-[#1754cf] hover:text-blue-800 font-medium text-xs uppercase tracking-wide" href="#">Edit</a>
            </td>
        </tr>
    );
}
