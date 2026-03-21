import { useState, useEffect } from 'react';
import { circulationAPI, booksAPI, membersAPI } from '../../services/api';

export default function CirculationDesk() {
    const [tab, setTab] = useState('checkout');
    const [loans, setLoans] = useState([]);
    const [books, setBooks] = useState([]);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMember, setSelectedMember] = useState(null);
    const [selectedBook, setSelectedBook] = useState(null);
    const [memberSearch, setMemberSearch] = useState('');
    const [bookSearch, setBookSearch] = useState('');
    const [returnSearch, setReturnSearch] = useState('');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [loansData, booksData, membersData] = await Promise.all([
                circulationAPI.getActive().catch(() => []),
                booksAPI.getAll().catch(() => []),
                membersAPI.getAll().catch(() => [])
            ]);
            setLoans(Array.isArray(loansData) ? loansData : []);
            setBooks(Array.isArray(booksData) ? booksData : []);
            setMembers(Array.isArray(membersData) ? membersData : []);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckout = async () => {
        if (!selectedMember || !selectedBook) {
            alert('Please select both a member and a book');
            return;
        }
        try {
            await circulationAPI.checkout({ member_id: selectedMember.id, book_id: selectedBook.id });
            alert('Book checked out successfully!');
            setSelectedMember(null);
            setSelectedBook(null);
            setMemberSearch('');
            setBookSearch('');
            loadData();
        } catch (error) {
            alert('Checkout failed: ' + error.message);
        }
    };

    const handleReturn = async (loanId) => {
        try {
            await circulationAPI.checkin(loanId);
            alert('Book returned successfully!');
            loadData();
        } catch (error) {
            alert('Return failed: ' + error.message);
        }
    };

    const filteredMembers = members.filter(m => 
        m.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.email?.toLowerCase().includes(memberSearch.toLowerCase())
    );

    const filteredBooks = books.filter(b => 
        b.title?.toLowerCase().includes(bookSearch.toLowerCase()) ||
        b.author?.toLowerCase().includes(bookSearch.toLowerCase())
    );

    const filteredLoans = loans.filter(l =>
        l.member?.name?.toLowerCase().includes(returnSearch.toLowerCase()) ||
        l.book?.title?.toLowerCase().includes(returnSearch.toLowerCase())
    );

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
                    <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#c16549]">Transactions</span>
                </div>
                <h1 className="text-3xl font-bold text-[#1E1815]">Circulation Desk</h1>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#E8E4DF] mb-6">
                <button onClick={() => setTab('checkout')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'checkout' ? 'border-[#c16549] text-[#c16549]' : 'border-transparent text-[#6B6560] hover:text-[#1E1815]'}`}>
                    <span className="material-symbols-outlined text-lg align-middle mr-1">output</span> Checkout
                </button>
                <button onClick={() => setTab('return')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'return' ? 'border-[#c16549] text-[#c16549]' : 'border-transparent text-[#6B6560] hover:text-[#1E1815]'}`}>
                    <span className="material-symbols-outlined text-lg align-middle mr-1">input</span> Return
                </button>
            </div>

            {/* Checkout Tab */}
            {tab === 'checkout' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Select Member */}
                    <div className="bg-white border border-[#E8E4DF] p-4">
                        <h2 className="text-sm font-bold text-[#1E1815] mb-3">1. Select Member</h2>
                        <div className="relative mb-3">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6560] text-lg">search</span>
                            <input
                                type="text"
                                placeholder="Search members..."
                                value={memberSearch}
                                onChange={(e) => setMemberSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none"
                            />
                        </div>
                        {selectedMember ? (
                            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200">
                                <div>
                                    <p className="text-sm font-medium text-[#1E1815]">{selectedMember.name}</p>
                                    <p className="text-xs text-[#6B6560]">{selectedMember.email}</p>
                                </div>
                                <button onClick={() => setSelectedMember(null)} className="text-red-500 hover:text-red-600">
                                    <span className="material-symbols-outlined text-lg">close</span>
                                </button>
                            </div>
                        ) : (
                            <div className="max-h-48 overflow-y-auto space-y-1">
                                {filteredMembers.slice(0, 10).map(m => (
                                    <button key={m.id} onClick={() => setSelectedMember(m)} className="w-full text-left p-2 hover:bg-[#FAF7F2] border border-transparent hover:border-[#E8E4DF]">
                                        <p className="text-sm font-medium text-[#1E1815]">{m.name}</p>
                                        <p className="text-xs text-[#6B6560]">{m.email}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Select Book */}
                    <div className="bg-white border border-[#E8E4DF] p-4">
                        <h2 className="text-sm font-bold text-[#1E1815] mb-3">2. Select Book</h2>
                        <div className="relative mb-3">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6560] text-lg">search</span>
                            <input
                                type="text"
                                placeholder="Search books..."
                                value={bookSearch}
                                onChange={(e) => setBookSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none"
                            />
                        </div>
                        {selectedBook ? (
                            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200">
                                <div>
                                    <p className="text-sm font-medium text-[#1E1815]">{selectedBook.title}</p>
                                    <p className="text-xs text-[#6B6560]">{selectedBook.author}</p>
                                </div>
                                <button onClick={() => setSelectedBook(null)} className="text-red-500 hover:text-red-600">
                                    <span className="material-symbols-outlined text-lg">close</span>
                                </button>
                            </div>
                        ) : (
                            <div className="max-h-48 overflow-y-auto space-y-1">
                                {filteredBooks.slice(0, 10).map(b => (
                                    <button key={b.id} onClick={() => setSelectedBook(b)} className="w-full text-left p-2 hover:bg-[#FAF7F2] border border-transparent hover:border-[#E8E4DF]">
                                        <p className="text-sm font-medium text-[#1E1815]">{b.title}</p>
                                        <p className="text-xs text-[#6B6560]">{b.author}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Checkout Button */}
                    <div className="lg:col-span-2">
                        <button onClick={handleCheckout} disabled={!selectedMember || !selectedBook} className="w-full py-3 bg-[#c16549] text-white text-sm font-medium hover:bg-[#a85443] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed">
                            <span className="material-symbols-outlined text-lg align-middle mr-1">done</span>
                            Complete Checkout
                        </button>
                    </div>
                </div>
            )}

            {/* Return Tab */}
            {tab === 'return' && (
                <div>
                    <div className="relative mb-4">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6560] text-lg">search</span>
                        <input
                            type="text"
                            placeholder="Search active loans..."
                            value={returnSearch}
                            onChange={(e) => setReturnSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-[#E8E4DF] bg-white text-sm focus:border-[#c16549] focus:outline-none"
                        />
                    </div>
                    <p className="text-sm text-[#6B6560] mb-4">{filteredLoans.length} active loans</p>
                    <div className="bg-white border border-[#E8E4DF] overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-[#FAF7F2]">
                                <tr>
                                    <th className="text-left p-3 text-xs font-semibold text-[#6B6560] uppercase tracking-wide">Member</th>
                                    <th className="text-left p-3 text-xs font-semibold text-[#6B6560] uppercase tracking-wide">Book</th>
                                    <th className="text-left p-3 text-xs font-semibold text-[#6B6560] uppercase tracking-wide">Checkout Date</th>
                                    <th className="text-left p-3 text-xs font-semibold text-[#6B6560] uppercase tracking-wide">Due Date</th>
                                    <th className="text-left p-3 text-xs font-semibold text-[#6B6560] uppercase tracking-wide">Status</th>
                                    <th className="text-right p-3 text-xs font-semibold text-[#6B6560] uppercase tracking-wide">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E8E4DF]">
                                {filteredLoans.map((loan) => {
                                    const isOverdue = loan.due_date && new Date(loan.due_date) < new Date();
                                    return (
                                        <tr key={loan.id} className="hover:bg-[#FAF7F2]">
                                            <td className="p-3 text-sm text-[#1E1815]">{loan.member?.name || 'Unknown'}</td>
                                            <td className="p-3 text-sm text-[#6B6560]">{loan.book?.title || 'Unknown'}</td>
                                            <td className="p-3 text-sm text-[#6B6560]">{loan.checkout_date ? new Date(loan.checkout_date).toLocaleDateString() : '-'}</td>
                                            <td className="p-3 text-sm text-[#6B6560]">{loan.due_date ? new Date(loan.due_date).toLocaleDateString() : '-'}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                    {isOverdue ? 'Overdue' : 'Active'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right">
                                                <button onClick={() => handleReturn(loan.id)} className="px-3 py-1 bg-[#c16549] text-white text-xs font-medium hover:bg-[#a85443] transition-colors">
                                                    Return
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredLoans.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="p-8 text-center text-sm text-[#6B6560]">No active loans found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
