import { useState, useEffect } from 'react';
import { membersAPI, financialAPI } from '../../services/api';

export default function MemberManagement() {
    const [members, setMembers] = useState([]);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentMember, setPaymentMember] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('0.00');
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', address: '', member_type: 'public', status: 'active',
        date_of_birth: '', gender: '', role: 'member', max_books_allowed: 5, loan_period_days: 14,
        emergency_contact: '', emergency_phone: '', notes: ''
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

    const openPaymentModal = (member) => {
        const currentFines = Number.parseFloat(member.fines || 0);
        if (currentFines <= 0) {
            alert('This member has no outstanding dues.');
            return;
        }
        setPaymentMember(member);
        setPaymentAmount(currentFines.toFixed(2));
        setShowPaymentModal(true);
    };

    const closePaymentModal = () => {
        setShowPaymentModal(false);
        setPaymentMember(null);
        setPaymentAmount('0.00');
    };

    const handleClearDues = async (e) => {
        e.preventDefault();
        if (!paymentMember) return;

        const amount = Number.parseFloat(paymentAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
            alert('Please enter a valid amount greater than 0.');
            return;
        }

        setPaymentLoading(true);
        try {
            const result = await financialAPI.processPayment(paymentMember.id, amount);
            const remaining = Number.parseFloat(result?.remaining_balance ?? 0);
            alert(`Payment processed successfully. Remaining due: $${remaining.toFixed(2)}`);
            closePaymentModal();
            loadMembers();
        } catch (error) {
            alert('Failed to process payment: ' + error.message);
        } finally {
            setPaymentLoading(false);
        }
    };

    const openAddModal = () => {
        setEditingMember(null);
        setFormData({ name: '', email: '', phone: '', address: '', member_type: 'public', status: 'active',
            date_of_birth: '', gender: '', role: 'member', max_books_allowed: 5, loan_period_days: 14,
            emergency_contact: '', emergency_phone: '', notes: '' });
        setShowModal(true);
    };

    const openEditModal = (member) => {
        setEditingMember(member);
        setFormData({
            name: member.name || '',
            email: member.email || '',
            phone: member.phone || '',
            address: member.address || '',
            member_type: member.member_type || 'public',
            status: member.status || 'active',
            date_of_birth: member.date_of_birth ? member.date_of_birth.split('T')[0] : '',
            gender: member.gender || '',
            role: member.role || 'member',
            max_books_allowed: member.max_books_allowed || 5,
            loan_period_days: member.loan_period_days || 14,
            emergency_contact: member.emergency_contact || '',
            emergency_phone: member.emergency_phone || '',
            notes: member.notes || ''
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
                    <option value="public">Public</option>
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                    <option value="researcher">Researcher</option>
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
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        <span className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                                            member.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                        }`}>{member.status}</span>
                                        <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-[#FAF7F2] text-[#6B6560]">{member.member_type}</span>
                                        {member.role && member.role !== 'member' && (
                                            <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-blue-100 text-blue-700">{member.role}</span>
                                        )}
                                        {parseFloat(member.fines) > 0 && (
                                            <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-red-100 text-red-700">${member.fines} fine</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <button onClick={() => openEditModal(member)} className="p-1 text-[#6B6560] hover:text-[#c16549]">
                                        <span className="material-symbols-outlined text-lg">edit</span>
                                    </button>
                                    {Number.parseFloat(member.fines || 0) > 0 && (
                                        <button
                                            onClick={() => openPaymentModal(member)}
                                            className="p-1 text-[#6B6560] hover:text-green-600"
                                            title="Clear dues"
                                        >
                                            <span className="material-symbols-outlined text-lg">payments</span>
                                        </button>
                                    )}
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
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-lg shadow-2xl">
                        <div className="p-4 border-b border-[#E8E4DF] flex items-center justify-between">
                            <h2 className="text-lg font-bold text-[#1E1815]">{editingMember ? 'Edit Member' : 'Add Member'}</h2>
                            <button onClick={closeModal} className="p-1 hover:bg-[#FAF7F2] rounded">
                                <span className="material-symbols-outlined text-[#6B6560]">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Name *</label>
                                    <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Email *</label>
                                    <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Phone</label>
                                    <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Date of Birth</label>
                                    <input type="date" value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Address</label>
                                <textarea rows="2" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none resize-none" />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Gender</label>
                                    <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none">
                                        <option value="">Select</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Member Type</label>
                                    <select value={formData.member_type} onChange={e => setFormData({...formData, member_type: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none">
                                        <option value="public">Public</option>
                                        <option value="student">Student</option>
                                        <option value="faculty">Faculty</option>
                                        <option value="researcher">Researcher</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Role</label>
                                    <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none">
                                        <option value="member">Member</option>
                                        <option value="staff">Staff</option>
                                        <option value="librarian">Librarian</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Status</label>
                                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none">
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="suspended">Suspended</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Max Books</label>
                                    <input type="number" min="1" max="50" value={formData.max_books_allowed} onChange={e => setFormData({...formData, max_books_allowed: parseInt(e.target.value) || 5})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Loan Days</label>
                                    <input type="number" min="1" max="90" value={formData.loan_period_days} onChange={e => setFormData({...formData, loan_period_days: parseInt(e.target.value) || 14})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Emergency Contact</label>
                                    <input value={formData.emergency_contact} onChange={e => setFormData({...formData, emergency_contact: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Emergency Phone</label>
                                    <input value={formData.emergency_phone} onChange={e => setFormData({...formData, emergency_phone: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Notes</label>
                                <textarea rows="2" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none resize-none" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 border border-[#E8E4DF] text-sm font-medium hover:bg-[#FAF7F2] transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-[#c16549] text-white text-sm font-medium hover:bg-[#a85443] transition-colors">{editingMember ? 'Update' : 'Add'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Dues Payment Modal */}
            {showPaymentModal && paymentMember && (
                <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-lg shadow-2xl">
                        <div className="p-4 border-b border-[#E8E4DF] flex items-center justify-between">
                            <h2 className="text-lg font-bold text-[#1E1815]">Clear Member Dues</h2>
                            <button onClick={closePaymentModal} className="p-1 hover:bg-[#FAF7F2] rounded">
                                <span className="material-symbols-outlined text-[#6B6560]">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleClearDues} className="p-4 space-y-4">
                            <div className="bg-[#FAF7F2] border border-[#E8E4DF] p-3">
                                <p className="text-sm text-[#1E1815] font-medium">{paymentMember.name}</p>
                                <p className="text-xs text-[#6B6560]">{paymentMember.email}</p>
                                <p className="mt-2 text-sm text-red-700 font-semibold">
                                    Current due: ${Number.parseFloat(paymentMember.fines || 0).toFixed(2)}
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Payment Amount *</label>
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    max={Number.parseFloat(paymentMember.fines || 0).toFixed(2)}
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none"
                                    required
                                />
                                <p className="mt-1 text-xs text-[#6B6560]">Use full amount to clear all dues, or partial to reduce balance.</p>
                            </div>

                            <div className="flex gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={closePaymentModal}
                                    className="flex-1 px-4 py-2 border border-[#E8E4DF] text-sm font-medium hover:bg-[#FAF7F2] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={paymentLoading}
                                    className="flex-1 px-4 py-2 bg-[#c16549] text-white text-sm font-medium hover:bg-[#a85443] transition-colors disabled:bg-gray-300"
                                >
                                    {paymentLoading ? 'Processing...' : 'Process Payment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
