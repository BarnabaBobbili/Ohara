import { useState, useEffect } from 'react';
import { auditAPI } from '../../services/api';
import { formatIST } from '../../utils/dateFormat';

export default function AuditTrail() {
    const [logs, setLogs] = useState([]);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAuditLogs();
    }, []);

    const fetchAuditLogs = async () => {
        try {
            setLoading(true);
            const response = await auditAPI.getAllAudits(100, 0);
            setLogs(response.logs || []);
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const getActionIcon = (action) => {
        const icons = {
            UPDATE: 'edit',
            DELETE: 'delete',
            CREATE: 'add_circle',
            INSERT: 'add_circle',
        };
        return icons[action] || 'info';
    };

    const getActionColor = (action) => {
        if (action === 'INSERT' || action === 'CREATE') return 'bg-green-100 text-green-700';
        if (action === 'DELETE') return 'bg-red-100 text-red-700';
        if (action === 'UPDATE') return 'bg-blue-100 text-blue-700';
        return 'bg-gray-100 text-gray-700';
    };

    // Helper to parse JSON value and extract meaningful info
    const parseRecordValue = (value) => {
        if (!value) return null;
        try {
            const parsed = JSON.parse(value);
            return {
                title: parsed.title,
                author: parsed.author,
                isbn: parsed.isbn,
                publisher: parsed.publisher,
                format: parsed.format,
                total_copies: parsed.total_copies,
            };
        } catch {
            return null;
        }
    };

    // Format display value based on action and field
    const formatDisplayValue = (log, isOldValue) => {
        const value = isOldValue ? log.old_value : log.new_value;
        
        // For complete_record (INSERT/DELETE), show summary instead of full JSON
        if (log.field_name === 'complete_record') {
            const parsed = parseRecordValue(value);
            if (parsed) {
                const parts = [];
                if (parsed.title) parts.push(`"${parsed.title}"`);
                if (parsed.author) parts.push(`by ${parsed.author}`);
                if (parsed.isbn) parts.push(`(ISBN: ${parsed.isbn})`);
                return parts.join(' ') || 'Book record';
            }
        }
        
        // For regular fields, return value as-is but truncate if too long
        if (value && value.length > 100) {
            return value.substring(0, 100) + '...';
        }
        return value;
    };

    // Get description text based on action type
    const getActionDescription = (log) => {
        if (log.action === 'INSERT') {
            const parsed = parseRecordValue(log.new_value);
            if (parsed?.title) {
                return `Added: "${parsed.title}"${parsed.author ? ` by ${parsed.author}` : ''}`;
            }
            return 'New book added';
        }
        if (log.action === 'DELETE') {
            const parsed = parseRecordValue(log.old_value);
            if (parsed?.title) {
                return `Deleted: "${parsed.title}"${parsed.author ? ` by ${parsed.author}` : ''}`;
            }
            return 'Book deleted';
        }
        return log.field_name;
    };

    const filtered = logs.filter(log => {
        const searchLower = search.toLowerCase();
        const matchSearch = 
            log.field_name?.toLowerCase().includes(searchLower) || 
            log.changed_by?.toLowerCase().includes(searchLower) ||
            log.book_title?.toLowerCase().includes(searchLower) ||
            log.book_isbn?.toLowerCase().includes(searchLower) ||
            log.old_value?.toLowerCase().includes(searchLower) ||
            log.new_value?.toLowerCase().includes(searchLower);
        const matchFilter = filter === 'all' || log.action === filter;
        return matchSearch && matchFilter;
    });

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <span className="material-symbols-outlined text-4xl text-[#c16549] animate-spin">refresh</span>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                    <div className="h-[2px] w-8 bg-[#c16549]"></div>
                    <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#c16549]">System</span>
                </div>
                <h1 className="text-3xl font-bold text-[#1E1815]">Audit Trail</h1>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6560] text-lg">search</span>
                    <input
                        type="text"
                        placeholder="Search logs..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-[#E8E4DF] bg-white text-sm focus:border-[#c16549] focus:outline-none"
                    />
                </div>
                <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-4 py-2 border border-[#E8E4DF] bg-white text-sm focus:border-[#c16549] focus:outline-none">
                    <option value="all">All Actions</option>
                    <option value="UPDATE">Updates</option>
                    <option value="DELETE">Deletions</option>
                    <option value="INSERT">Insertions</option>
                </select>
            </div>

            {/* Logs */}
            <div className="bg-white border border-[#E8E4DF]">
                {filtered.map((log) => {
                    const isCompleteRecord = log.field_name === 'complete_record';
                    const actionDesc = getActionDescription(log);
                    
                    return (
                        <div key={log.id} className="flex items-start gap-4 p-4 border-b border-[#E8E4DF] last:border-0 hover:bg-[#FAF7F2]">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getActionColor(log.action)}`}>
                                <span className="material-symbols-outlined text-sm">{getActionIcon(log.action)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-[#1E1815] font-medium">
                                    {log.book_title ? (
                                        <>
                                            <span className="text-[#c16549]">{log.book_title}</span>
                                            {log.book_isbn && <span className="text-[#6B6560] text-xs ml-2">(ISBN: {log.book_isbn})</span>}
                                        </>
                                    ) : (
                                        <>Book ID: {log.book_id}</>
                                    )}
                                    {!isCompleteRecord && <span className="text-[#6B6560]"> — {log.field_name}</span>}
                                </p>
                                <p className="text-xs text-[#6B6560] mt-1">
                                    {isCompleteRecord ? (
                                        <span className="font-medium">{actionDesc}</span>
                                    ) : (
                                        <>
                                            {log.old_value && (
                                                <span>
                                                    From: <span className="font-mono bg-gray-100 px-1">{formatDisplayValue(log, true)}</span>
                                                </span>
                                            )}
                                            {log.old_value && log.new_value && <span className="mx-2">→</span>}
                                            {log.new_value && (
                                                <span>
                                                    To: <span className="font-mono bg-gray-100 px-1">{formatDisplayValue(log, false)}</span>
                                                </span>
                                            )}
                                            {!log.old_value && !log.new_value && <span>Record deleted</span>}
                                        </>
                                    )}
                                </p>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-xs text-[#6B6560]">by {log.changed_by}</span>
                                    <span className="text-xs text-[#6B6560]">{formatIST(log.changed_at)}</span>
                                </div>
                            </div>
                            <span className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${getActionColor(log.action)}`}>
                                {log.action}
                            </span>
                        </div>
                    );
                })}
                {filtered.length === 0 && (
                    <div className="p-8 text-center text-sm text-[#6B6560]">No audit logs found</div>
                )}
            </div>
        </div>
    );
}
