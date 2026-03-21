import { ADMIN_COLORS } from '../../styles/adminTheme';
import { useState, useEffect } from 'react';
import { auditAPI } from '../../services/api';

export default function AuditTrail() {
    const [audits, setAudits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'UPDATE', 'DELETE'
    const [bookIdSearch, setBookIdSearch] = useState('');
    const [pagination, setPagination] = useState({ limit: 50, offset: 0 });

    useEffect(() => {
        loadAuditData();
    }, [filter, pagination]);

    const loadAuditData = async () => {
        try {
            setLoading(true);
            let data;

            if (filter === 'all') {
                data = await auditAPI.getAllAudits(pagination.limit, pagination.offset);
            } else {
                data = await auditAPI.getAuditsByAction(filter, pagination.limit);
            }

            setAudits(data.logs || []);
        } catch (error) {
            console.error('Failed to load audit data:', error);
            setAudits([]);
        } finally {
            setLoading(false);
        }
    };

    const handleBookIdSearch = async () => {
        if (!bookIdSearch.trim()) {
            loadAuditData();
            return;
        }

        try {
            setLoading(true);
            const data = await auditAPI.getBookAudit(parseInt(bookIdSearch), 100);
            setAudits(data.logs || []);
        } catch (error) {
            console.error('Failed to search audit:', error);
            setAudits([]);
        } finally {
            setLoading(false);
        }
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const clearSearch = () => {
        setBookIdSearch('');
        loadAuditData();
    };

    if (loading && audits.length === 0) {
        return (
            <div className="flex items-center justify-center h-screen" style={{ backgroundColor: ADMIN_COLORS.primaryBg }}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4" style={{ borderColor: ADMIN_COLORS.burgundy }}></div>
                    <p style={{ color: ADMIN_COLORS.textMuted }}>Loading audit trail...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen" style={{ backgroundColor: ADMIN_COLORS.primaryBg }}>
            {/* Top Header */}
            <header className="flex-shrink-0 px-4 sm:px-6 md:px-8 py-4 sm:py-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 sm:gap-0"
                style={{ borderBottom: `1px solid ${ADMIN_COLORS.border}`, backgroundColor: ADMIN_COLORS.cardBg }}>
                <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium uppercase tracking-wider" style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textMuted }}>
                        Change History
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-semibold italic" style={{ fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textPrimary }}>
                        Audit Trail
                    </h2>
                </div>
                <div className="flex flex-col items-start sm:items-end gap-1">
                    <p className="text-base sm:text-lg" style={{ fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textPrimary }}>
                        {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-sm" style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textMuted }}>
                        Complete modification log
                    </p>
                </div>
            </header>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:px-8">
                <div className="max-w-7xl mx-auto flex flex-col gap-6">
                    {/* Filters & Search */}
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        {/* Action Filter Buttons */}
                        <div className="flex gap-2 flex-wrap">
                            <FilterButton
                                active={filter === 'all'}
                                onClick={() => setFilter('all')}
                                label="All Changes"
                            />
                            <FilterButton
                                active={filter === 'UPDATE'}
                                onClick={() => setFilter('UPDATE')}
                                label="Updates"
                                color={ADMIN_COLORS.burgundy}
                            />
                            <FilterButton
                                active={filter === 'DELETE'}
                                onClick={() => setFilter('DELETE')}
                                label="Deletions"
                                color={ADMIN_COLORS.red}
                            />
                        </div>

                        {/* Book ID Search */}
                        <div className="flex gap-2 items-center w-full sm:w-auto">
                            <div className="relative flex items-center h-10 flex-1 sm:flex-initial sm:w-48 rounded border"
                                style={{ borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.cardBg }}>
                                <input
                                    type="number"
                                    placeholder="Book ID"
                                    value={bookIdSearch}
                                    onChange={(e) => setBookIdSearch(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleBookIdSearch()}
                                    className="w-full h-full bg-transparent border-none px-3 focus:ring-0 text-sm"
                                    style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textPrimary }}
                                />
                            </div>
                            <button
                                onClick={handleBookIdSearch}
                                className="px-4 py-2 text-xs font-bold rounded transition hover:opacity-80"
                                style={{
                                    fontFamily: "'Noto Sans', sans-serif",
                                    backgroundColor: ADMIN_COLORS.burgundy,
                                    color: '#fff'
                                }}>
                                Search
                            </button>
                            {bookIdSearch && (
                                <button
                                    onClick={clearSearch}
                                    className="px-3 py-2 text-xs font-bold rounded transition hover:opacity-80"
                                    style={{
                                        fontFamily: "'Noto Sans', sans-serif",
                                        backgroundColor: ADMIN_COLORS.secondaryBg,
                                        color: ADMIN_COLORS.textSecondary
                                    }}>
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Audit Trail Table */}
                    <div className="border rounded shadow-sm flex-1 flex flex-col overflow-hidden relative"
                        style={{ backgroundColor: ADMIN_COLORS.cardBg, borderColor: ADMIN_COLORS.border }}>
                        {/* Paper lines background effect (subtle) */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
                            style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px)', backgroundSize: '100% 3rem' }}></div>

                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr style={{ borderBottom: `2px solid ${ADMIN_COLORS.border}`, backgroundColor: `${ADMIN_COLORS.secondaryBg}50` }}>
                                        <th className="px-4 md:px-6 py-3 md:py-4 text-xs font-bold uppercase tracking-wider w-32"
                                            style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textMuted }}>
                                            Timestamp
                                        </th>
                                        <th className="px-4 md:px-6 py-3 md:py-4 text-xs font-bold uppercase tracking-wider w-20"
                                            style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textMuted }}>
                                            Book ID
                                        </th>
                                        <th className="px-4 md:px-6 py-3 md:py-4 text-xs font-bold uppercase tracking-wider w-24"
                                            style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textMuted }}>
                                            Action
                                        </th>
                                        <th className="px-4 md:px-6 py-3 md:py-4 text-xs font-bold uppercase tracking-wider w-32"
                                            style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textMuted }}>
                                            Field
                                        </th>
                                        <th className="px-4 md:px-6 py-3 md:py-4 text-xs font-bold uppercase tracking-wider"
                                            style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textMuted }}>
                                            Change
                                        </th>
                                        <th className="px-4 md:px-6 py-3 md:py-4 text-xs font-bold uppercase tracking-wider w-32"
                                            style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textMuted }}>
                                            Changed By
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm" style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textPrimary }}>
                                    {audits.length > 0 ? audits.map((audit, index) => (
                                        <tr key={index} className="group transition-colors hover:bg-opacity-10"
                                            style={{ borderBottom: `1px solid ${ADMIN_COLORS.border}` }}>
                                            <td className="px-4 md:px-6 py-3 md:py-4 text-xs"
                                                style={{ color: ADMIN_COLORS.textMuted }}>
                                                {formatTimestamp(audit.changed_at)}
                                            </td>
                                            <td className="px-4 md:px-6 py-3 md:py-4 font-medium">
                                                <span className="font-mono" style={{ color: ADMIN_COLORS.burgundy }}>
                                                    #{audit.book_id}
                                                </span>
                                            </td>
                                            <td className="px-4 md:px-6 py-3 md:py-4">
                                                <ActionBadge action={audit.action} />
                                            </td>
                                            <td className="px-4 md:px-6 py-3 md:py-4">
                                                <span className="font-medium italic" style={{ fontFamily: "'Newsreader', serif" }}>
                                                    {audit.field_name || '-'}
                                                </span>
                                            </td>
                                            <td className="px-4 md:px-6 py-3 md:py-4">
                                                {audit.action === 'DELETE' ? (
                                                    <span className="text-xs italic" style={{ color: ADMIN_COLORS.textMuted }}>
                                                        Record deleted
                                                    </span>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <span className="line-through" style={{ color: ADMIN_COLORS.red }}>
                                                            {audit.old_value || '(empty)'}
                                                        </span>
                                                        <span style={{ color: ADMIN_COLORS.textMuted }}>→</span>
                                                        <span className="font-medium" style={{ color: ADMIN_COLORS.green }}>
                                                            {audit.new_value || '(empty)'}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 md:px-6 py-3 md:py-4 text-xs"
                                                style={{ color: ADMIN_COLORS.textSecondary }}>
                                                {audit.changed_by || 'system'}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <span className="material-symbols-outlined text-5xl"
                                                        style={{ color: ADMIN_COLORS.textMuted }}>
                                                        history
                                                    </span>
                                                    <p className="text-base italic"
                                                        style={{ fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textMuted }}>
                                                        No audit logs found
                                                    </p>
                                                    <p className="text-xs"
                                                        style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textMuted }}>
                                                        Audit logs will appear here when books are updated or deleted
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer with Refresh */}
                        <div className="p-3 flex justify-center"
                            style={{ borderTop: `1px solid ${ADMIN_COLORS.border}`, backgroundColor: `${ADMIN_COLORS.secondaryBg}50` }}>
                            <button
                                onClick={loadAuditData}
                                className="text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1 hover:opacity-80"
                                style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textMuted }}>
                                Refresh
                                <span className="material-symbols-outlined text-sm">refresh</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Filter Button Component
function FilterButton({ active, onClick, label, color = ADMIN_COLORS.burgundy }) {
    return (
        <button
            onClick={onClick}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded transition-all"
            style={{
                fontFamily: "'Noto Sans', sans-serif",
                backgroundColor: active ? color : ADMIN_COLORS.secondaryBg,
                color: active ? '#fff' : ADMIN_COLORS.textSecondary,
                border: `1px solid ${active ? color : ADMIN_COLORS.border}`,
            }}>
            {label}
        </button>
    );
}

// Action Badge Component
function ActionBadge({ action }) {
    const colorMap = {
        'UPDATE': { bg: `${ADMIN_COLORS.burgundy}20`, text: ADMIN_COLORS.burgundy, border: ADMIN_COLORS.burgundy },
        'DELETE': { bg: `${ADMIN_COLORS.red}20`, text: ADMIN_COLORS.red, border: ADMIN_COLORS.red },
    };

    const colors = colorMap[action] || { bg: ADMIN_COLORS.secondaryBg, text: ADMIN_COLORS.textSecondary, border: ADMIN_COLORS.border };

    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold border"
            style={{
                fontFamily: "'Noto Sans', sans-serif",
                backgroundColor: colors.bg,
                color: colors.text,
                borderColor: colors.border
            }}>
            <span className="material-symbols-outlined text-sm">
                {action === 'UPDATE' ? 'edit' : 'delete'}
            </span>
            {action}
        </span>
    );
}
