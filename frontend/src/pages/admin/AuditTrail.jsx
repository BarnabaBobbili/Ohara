import { useState, useEffect } from 'react';

export default function AuditTrail() {
    const [logs, setLogs] = useState([]);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulated audit logs - in real app, fetch from API
        setTimeout(() => {
            setLogs([
                { id: 1, action: 'book_added', user: 'Admin', details: 'Added "The Great Gatsby"', timestamp: new Date().toISOString() },
                { id: 2, action: 'member_created', user: 'Staff', details: 'New member: John Doe', timestamp: new Date(Date.now() - 3600000).toISOString() },
                { id: 3, action: 'checkout', user: 'Staff', details: 'Checked out book #123 to member #45', timestamp: new Date(Date.now() - 7200000).toISOString() },
                { id: 4, action: 'return', user: 'Staff', details: 'Returned book #89 from member #12', timestamp: new Date(Date.now() - 10800000).toISOString() },
                { id: 5, action: 'settings_updated', user: 'Admin', details: 'Updated loan duration to 14 days', timestamp: new Date(Date.now() - 14400000).toISOString() },
            ]);
            setLoading(false);
        }, 500);
    }, []);

    const getActionIcon = (action) => {
        const icons = {
            book_added: 'add_circle', book_deleted: 'delete', book_updated: 'edit',
            member_created: 'person_add', member_deleted: 'person_remove',
            checkout: 'output', return: 'input',
            settings_updated: 'settings', login: 'login', logout: 'logout'
        };
        return icons[action] || 'info';
    };

    const getActionColor = (action) => {
        if (action.includes('added') || action.includes('created')) return 'bg-green-100 text-green-700';
        if (action.includes('deleted') || action.includes('remove')) return 'bg-red-100 text-red-700';
        if (action.includes('updated') || action.includes('settings')) return 'bg-blue-100 text-blue-700';
        if (action === 'checkout') return 'bg-purple-100 text-purple-700';
        if (action === 'return') return 'bg-teal-100 text-teal-700';
        return 'bg-gray-100 text-gray-700';
    };

    const filtered = logs.filter(log => {
        const matchSearch = log.details?.toLowerCase().includes(search.toLowerCase()) || log.user?.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === 'all' || log.action.includes(filter);
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
                    <option value="book">Books</option>
                    <option value="member">Members</option>
                    <option value="checkout">Checkouts</option>
                    <option value="return">Returns</option>
                    <option value="settings">Settings</option>
                </select>
            </div>

            {/* Logs */}
            <div className="bg-white border border-[#E8E4DF]">
                {filtered.map((log) => (
                    <div key={log.id} className="flex items-start gap-4 p-4 border-b border-[#E8E4DF] last:border-0 hover:bg-[#FAF7F2]">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getActionColor(log.action)}`}>
                            <span className="material-symbols-outlined text-sm">{getActionIcon(log.action)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#1E1815]">{log.details}</p>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-[#6B6560]">by {log.user}</span>
                                <span className="text-xs text-[#6B6560]">{new Date(log.timestamp).toLocaleString()}</span>
                            </div>
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${getActionColor(log.action)}`}>
                            {log.action.replace('_', ' ')}
                        </span>
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className="p-8 text-center text-sm text-[#6B6560]">No logs found</div>
                )}
            </div>
        </div>
    );
}
