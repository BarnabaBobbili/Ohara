import { useState, useEffect } from 'react';
import { membersAPI } from '../../services/api';

export default function MemberManagement() {
    const [members, setMembers] = useState([]);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', address: '', member_type: 'regular', status: 'active'
    });

    useEffect(() => { loadMembers(); }, []);

    const loadMembers = async () => {
        try {
            const data = await membersAPI.getAll();
            setMembers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load members:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingMember) {
                await membersAPI.update(editingMember.id, formData);
            } else {
                await membersAPI.create({ ...formData, password: 'temp123' });
            }
            loadMembers();
            closeModal();
        } catch (error) {
            alert('Failed to save: ' + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this member?')) return;
        try {
            await membersAPI.delete(id);
            loadMembers();
        } catch (error) {
            alert('Failed to delete: ' + error.message);
        }
    };

    const openAddModal = () => {
        setEditingMember(null);
        setFormData({ name: '', email: '', phone: '', address: '', member_type: 'regular', status: 'active' });
        setShowModal(true);
    };

    const openEditModal = (member) => {
        setEditingMember(member);
        setFormData({
            name: member.name || '',
            email: member.email || '',
            phone: member.phone || '',
            address: member.address || '',
            member_type: member.member_type || 'regular',
            status: member.status || 'active'
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingMember(null);
    };

    const filtered = members.filter(m => {
        const matchSearch = m.name?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === 'all' || m.member_type === filter;
        return matchSearch && matchFilter;
    });

    const getAvatar = (name) => {
        const colors = ['#c16549', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'];
        const initial = name?.charAt(0)?.toUpperCase() || '?';
        const color = colors[name?.charCodeAt(0) % colors.length];
        return { initial, color };
    };

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
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="h-[2px] w-8 bg-[#c16549]"></div>
                        <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#c16549]">Patrons</span>
                    </div>
                    <h1 className="text-3xl font-bold text-[#1E1815]">Member Management</h1>
                </div>
                <button onClick={openAddModal} className="flex items-center gap-2 bg-[#c16549] text-white px-4 py-2 text-sm font-medium hover:bg-[#a85443] transition-colors">
                    <span className="material-symbols-outlined text-lg">person_add</span>
                    Add Member
                </button>
            </div>

            {/* Search & Filter */}
            <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6560] text-lg">search</span>
                    <input
                        type="text"
                        placeholder="Search members..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-[#E8E4DF] bg-white text-sm focus:border-[#c16549] focus:outline-none"
                    />
                </div>
                <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-4 py-2 border border-[#E8E4DF] bg-white text-sm focus:border-[#c16549] focus:outline-none">
                    <option value="all">All Types</option>
                    <option value="regular">Regular</option>
                    <option value="student">Student</option>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                </select>
            </div>

            {/* Member Count */}
            <p className="text-sm text-[#6B6560] mb-4">{filtered.length} members</p>

            {/* Members Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((member) => {
                    const avatar = getAvatar(member.name);
                    return (
                        <div key={member.id} className="bg-white border border-[#E8E4DF] p-4 hover:border-[#c16549] transition-colors">
                            <div className="flex items-start gap-3">
                                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold" style={{ backgroundColor: avatar.color }}>
                                    {avatar.initial}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-sm text-[#1E1815] truncate">{member.name}</h3>
                                    <p className="text-xs text-[#6B6560] truncate">{member.email}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                                            member.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                        }`}>{member.status}</span>
                                        <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-[#FAF7F2] text-[#6B6560]">{member.member_type}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <button onClick={() => openEditModal(member)} className="p-1 text-[#6B6560] hover:text-[#c16549]">
                                        <span className="material-symbols-outlined text-lg">edit</span>
                                    </button>
                                    <button onClick={() => handleDelete(member.id)} className="p-1 text-[#6B6560] hover:text-red-500">
                                        <span className="material-symbols-outlined text-lg">delete</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-4 border-b border-[#E8E4DF] flex items-center justify-between">
                            <h2 className="text-lg font-bold text-[#1E1815]">{editingMember ? 'Edit Member' : 'Add Member'}</h2>
                            <button onClick={closeModal} className="p-1 hover:bg-[#FAF7F2] rounded">
                                <span className="material-symbols-outlined text-[#6B6560]">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Name *</label>
                                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Email *</label>
                                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Phone</label>
                                <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Address</label>
                                <textarea rows="2" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Type</label>
                                    <select value={formData.member_type} onChange={e => setFormData({...formData, member_type: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none">
                                        <option value="regular">Regular</option>
                                        <option value="student">Student</option>
                                        <option value="staff">Staff</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Status</label>
                                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none">
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="suspended">Suspended</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 border border-[#E8E4DF] text-sm font-medium hover:bg-[#FAF7F2] transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-[#c16549] text-white text-sm font-medium hover:bg-[#a85443] transition-colors">{editingMember ? 'Update' : 'Add'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
