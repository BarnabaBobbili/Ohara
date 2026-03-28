import { useState, useEffect } from 'react';
import { circulationAPI, booksAPI, membersAPI, settingsAPI } from '../../services/api';

// Book condition options (real library standard)
const BOOK_CONDITIONS = [
    { value: 'new', label: 'New', description: 'Brand new, pristine condition', color: 'text-emerald-600' },
    { value: 'good', label: 'Good', description: 'Minor wear, fully functional', color: 'text-green-600' },
    { value: 'fair', label: 'Fair', description: 'Noticeable wear, some marks/creases', color: 'text-yellow-600' },
    { value: 'poor', label: 'Poor', description: 'Heavy wear, may have damage', color: 'text-orange-600' },
    { value: 'damaged', label: 'Damaged', description: 'Significant damage, needs repair', color: 'text-red-600' },
];

// Calculate fine for overdue books
const calculateFine = (dueDate, dailyRate = 1.00, maxCap = 25.00) => {
    const now = new Date();
    const due = new Date(dueDate);
    if (now <= due) return 0;
    
    const daysOverdue = Math.ceil((now - due) / (1000 * 60 * 60 * 24));
    const fine = Math.min(daysOverdue * dailyRate, maxCap);
    return fine;
};

const readNumericSetting = (sources, keys, fallback) => {
    for (const source of sources) {
        if (!source) continue;

        for (const key of keys) {
            if (Array.isArray(source)) {
                const found = source.find((item) => item?.key === key)?.value;
                const parsed = Number.parseFloat(found);
                if (Number.isFinite(parsed)) return parsed;
                continue;
            }

            const parsed = Number.parseFloat(source?.[key]);
            if (Number.isFinite(parsed)) return parsed;
        }
    }

    return fallback;
};

const fetchAllPaged = async (fetchFn, baseParams = {}) => {
    const PAGE_SIZE = 100;
    const MAX_SKIP = 5000;
    const records = [];
    let skip = 0;

    while (true) {
        const response = await fetchFn({
            ...baseParams,
            limit: PAGE_SIZE,
            skip,
        });
        const rows = Array.isArray(response) ? response : [];
        records.push(...rows);

        if (rows.length < PAGE_SIZE) break;
        if (skip >= MAX_SKIP) break;
        skip += PAGE_SIZE;
    }

    return records;
};

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
    
    // Modal states
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState(null);
    
    // Checkout condition state
    const [checkoutCondition, setCheckoutCondition] = useState('good');
    const [checkoutNotes, setCheckoutNotes] = useState('');
    const [loanDays, setLoanDays] = useState(14);
    
    // Return condition state
    const [returnCondition, setReturnCondition] = useState('good');
    const [returnNotes, setReturnNotes] = useState('');
    
    // Fine settings
    const [fineSettings, setFineSettings] = useState({ dailyRate: 1.00, maxCap: 25.00 });
    
    // Processing state
    const [processing, setProcessing] = useState(false);

    useEffect(() => { 
        loadData(); 
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const [allSettings, fineSettingsByCategory] = await Promise.all([
                settingsAPI.getAll().catch(() => null),
                settingsAPI.getByCategory('fines').catch(() => null),
            ]);

            const dailyRate = readNumericSetting(
                [fineSettingsByCategory, allSettings],
                ['daily_fine_rate', 'fine_per_day'],
                1.00
            );

            const maxCap = readNumericSetting(
                [fineSettingsByCategory, allSettings],
                ['max_fine_cap'],
                25.00
            );

            setFineSettings({
                dailyRate,
                maxCap,
            });
        } catch {
            // Use defaults
        }
    };

    const loadData = async () => {
        try {
            const loansPromise = circulationAPI.getActive().catch(() => []);
            const booksPromise = fetchAllPaged(booksAPI.getAll, { is_active: 'true' }).catch(() => []);
            const membersPromise = fetchAllPaged(membersAPI.getAll, {}).catch(() => []);

            const [loansData, booksData, membersData] = await Promise.all([
                loansPromise,
                booksPromise,
                membersPromise,
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

    // Open checkout confirmation modal
    const openCheckoutModal = () => {
        if (!selectedMember || !selectedBook) {
            alert('Please select both a member and a book');
            return;
        }
        // Reset modal state
        setCheckoutCondition('good');
        setCheckoutNotes('');
        setLoanDays(14);
        setShowCheckoutModal(true);
    };

    // Confirm checkout with condition
    const handleCheckout = async () => {
        if (!selectedMember || !selectedBook) return;
        if (selectedBook.is_reference_only) {
            alert('Reference-only books cannot be checked out.');
            return;
        }
        
        setProcessing(true);
        try {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + loanDays);
            
            await circulationAPI.checkout({ 
                member_id: selectedMember.id, 
                book_id: selectedBook.id,
                due_date: dueDate.toISOString(),
                checkout_condition: checkoutCondition,
                notes: checkoutNotes || undefined,
            });
            
            alert(`Book checked out successfully!\nDue date: ${dueDate.toLocaleDateString()}\nCondition at checkout: ${checkoutCondition}`);
            setSelectedMember(null);
            setSelectedBook(null);
            setMemberSearch('');
            setBookSearch('');
            setShowCheckoutModal(false);
            loadData();
        } catch (error) {
            alert('Checkout failed: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    // Open return modal
    const openReturnModal = (loan) => {
        setSelectedLoan(loan);
        setReturnCondition(loan.checkout_condition || 'good'); // Default to checkout condition
        setReturnNotes('');
        setShowReturnModal(true);
    };

    // Confirm return with condition
    const handleReturn = async () => {
        if (!selectedLoan) return;
        
        setProcessing(true);
        try {
            const result = await circulationAPI.checkin(selectedLoan.id, { 
                return_condition: returnCondition,
                notes: returnNotes || undefined,
            });
            
            const isOverdue = new Date(selectedLoan.due_date) < new Date();
            const fine = result?.fine_amount || 0;
            
            let message = 'Book returned successfully!';
            if (isOverdue && fine > 0) {
                message += `\n\nOverdue Fine: $${parseFloat(fine).toFixed(2)}`;
            }
            if (returnCondition !== selectedLoan.checkout_condition) {
                message += `\n\nCondition changed: ${selectedLoan.checkout_condition || 'good'} -> ${returnCondition}`;
            }
            
            alert(message);
            setShowReturnModal(false);
            setSelectedLoan(null);
            loadData();
        } catch (error) {
            alert('Return failed: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const filteredMembers = members.filter(m => 
        m.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.email?.toLowerCase().includes(memberSearch.toLowerCase())
    );

    const filteredBooks = books.filter(b => 
        b.title?.toLowerCase().includes(bookSearch.toLowerCase()) ||
        b.author?.toLowerCase().includes(bookSearch.toLowerCase()) ||
        b.isbn?.toLowerCase().includes(bookSearch.toLowerCase())
    );

    const filteredLoans = loans.filter(l =>
        l.members?.name?.toLowerCase().includes(returnSearch.toLowerCase()) ||
        l.books?.title?.toLowerCase().includes(returnSearch.toLowerCase()) ||
        l.books?.isbn?.toLowerCase().includes(returnSearch.toLowerCase())
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
                                placeholder="Search members by name or email..."
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
                                    {selectedMember.fines > 0 && (
                                        <p className="text-xs text-red-600 mt-1">Outstanding fines: ${parseFloat(selectedMember.fines).toFixed(2)}</p>
                                    )}
                                </div>
                                <button onClick={() => setSelectedMember(null)} className="text-red-500 hover:text-red-600">
                                    <span className="material-symbols-outlined text-lg">close</span>
                                </button>
                            </div>
                        ) : (
                            <div className="max-h-48 overflow-y-auto space-y-1">
                                <p className="text-[11px] text-[#6B6560] px-2">{filteredMembers.length} matches</p>
                                {filteredMembers.map(m => (
                                    <button key={m.id} onClick={() => setSelectedMember(m)} className="w-full text-left p-2 hover:bg-[#FAF7F2] border border-transparent hover:border-[#E8E4DF]">
                                        <p className="text-sm font-medium text-[#1E1815]">{m.name}</p>
                                        <p className="text-xs text-[#6B6560]">{m.email}</p>
                                    </button>
                                ))}
                                {filteredMembers.length === 0 && memberSearch && (
                                    <p className="text-sm text-[#6B6560] p-2">No members found</p>
                                )}
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
                                placeholder="Search by title, author, or ISBN..."
                                value={bookSearch}
                                onChange={(e) => setBookSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none"
                            />
                        </div>
                        {selectedBook ? (
                            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200">
                                <div className="flex items-center gap-3">
                                    {selectedBook.cover_image_url && (
                                        <img src={selectedBook.cover_image_url} alt="" className="w-10 h-14 object-cover rounded" />
                                    )}
                                <div>
                                    <p className="text-sm font-medium text-[#1E1815]">{selectedBook.title}</p>
                                    <p className="text-xs text-[#6B6560]">{selectedBook.author}</p>
                                    <p className={`text-xs ${selectedBook.is_reference_only ? 'text-amber-700' : ((selectedBook.available_copies || 0) > 0 ? 'text-green-600' : 'text-red-600')}`}>
                                        {selectedBook.is_reference_only
                                            ? 'Reference only'
                                            : ((selectedBook.available_copies || 0) > 0 ? `${selectedBook.available_copies} available` : 'No copies available')}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedBook(null)} className="text-red-500 hover:text-red-600">
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                            </div>
                        ) : (
                            <div className="max-h-48 overflow-y-auto space-y-1">
                                <p className="text-[11px] text-[#6B6560] px-2">{filteredBooks.length} matches</p>
                                {filteredBooks.map((b) => {
                                    const isSelectable = (b.available_copies || 0) > 0 && !b.is_reference_only;
                                    const availabilityText = b.is_reference_only
                                        ? 'Reference only'
                                        : ((b.available_copies || 0) > 0 ? `${b.available_copies} available` : 'No copies available');
                                    const availabilityClass = b.is_reference_only
                                        ? 'text-amber-700'
                                        : ((b.available_copies || 0) > 0 ? 'text-green-600' : 'text-red-600');

                                    return (
                                    <button
                                        key={b.id}
                                        onClick={() => setSelectedBook(b)}
                                        disabled={!isSelectable}
                                        className={`w-full text-left p-2 border border-transparent flex items-center gap-3 ${
                                            isSelectable
                                                ? 'hover:bg-[#FAF7F2] hover:border-[#E8E4DF]'
                                                : 'opacity-60 cursor-not-allowed bg-[#FAF7F2]'
                                        }`}
                                    >
                                        {b.cover_image_url && (
                                            <img src={b.cover_image_url} alt="" className="w-8 h-12 object-cover rounded" />
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-[#1E1815]">{b.title}</p>
                                            <p className="text-xs text-[#6B6560]">{b.author}</p>
                                            <p className={`text-xs ${availabilityClass}`}>
                                                {availabilityText}
                                            </p>
                                        </div>
                                    </button>
                                    );
                                })}
                                {filteredBooks.length === 0 && bookSearch && (
                                    <p className="text-sm text-[#6B6560] p-2">No books found</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Checkout Button */}
                    <div className="lg:col-span-2">
                        <button onClick={openCheckoutModal} disabled={!selectedMember || !selectedBook} className="w-full py-3 bg-[#c16549] text-white text-sm font-medium hover:bg-[#a85443] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed">
                            <span className="material-symbols-outlined text-lg align-middle mr-1">verified</span>
                            Verify Condition & Checkout
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
                            placeholder="Search by member name, book title, or ISBN..."
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
                                    <th className="text-left p-3 text-xs font-semibold text-[#6B6560] uppercase tracking-wide">Checkout</th>
                                    <th className="text-left p-3 text-xs font-semibold text-[#6B6560] uppercase tracking-wide">Due Date</th>
                                    <th className="text-left p-3 text-xs font-semibold text-[#6B6560] uppercase tracking-wide">Condition</th>
                                    <th className="text-left p-3 text-xs font-semibold text-[#6B6560] uppercase tracking-wide">Status</th>
                                    <th className="text-right p-3 text-xs font-semibold text-[#6B6560] uppercase tracking-wide">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E8E4DF]">
                                {filteredLoans.map((loan) => {
                                    const isOverdue = loan.due_date && new Date(loan.due_date) < new Date();
                                    const estimatedFine = isOverdue ? calculateFine(loan.due_date, fineSettings.dailyRate, fineSettings.maxCap) : 0;
                                    const daysOverdue = isOverdue ? Math.ceil((new Date() - new Date(loan.due_date)) / (1000 * 60 * 60 * 24)) : 0;
                                    
                                    return (
                                        <tr key={loan.id} className={`hover:bg-[#FAF7F2] ${isOverdue ? 'bg-red-50' : ''}`}>
                                            <td className="p-3 text-sm text-[#1E1815]">{loan.members?.name || 'Unknown'}</td>
                                            <td className="p-3">
                                                <p className="text-sm text-[#1E1815]">{loan.books?.title || 'Unknown'}</p>
                                                <p className="text-xs text-[#6B6560]">{loan.books?.isbn}</p>
                                            </td>
                                            <td className="p-3 text-sm text-[#6B6560]">{loan.checkout_date ? new Date(loan.checkout_date).toLocaleDateString() : '-'}</td>
                                            <td className="p-3 text-sm text-[#6B6560]">{loan.due_date ? new Date(loan.due_date).toLocaleDateString() : '-'}</td>
                                            <td className="p-3">
                                                <span className={`text-xs font-medium capitalize ${
                                                    loan.checkout_condition === 'new' ? 'text-emerald-600' :
                                                    loan.checkout_condition === 'good' ? 'text-green-600' :
                                                    loan.checkout_condition === 'fair' ? 'text-yellow-600' :
                                                    loan.checkout_condition === 'poor' ? 'text-orange-600' :
                                                    'text-red-600'
                                                }`}>
                                                    {loan.checkout_condition || 'good'}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                {isOverdue ? (
                                                    <div>
                                                        <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-red-100 text-red-700">
                                                            {daysOverdue}d Overdue
                                                        </span>
                                                        <p className="text-xs text-red-600 mt-1">Est. fine: ${estimatedFine.toFixed(2)}</p>
                                                    </div>
                                                ) : (
                                                    <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-green-100 text-green-700">
                                                        Active
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3 text-right">
                                                <button onClick={() => openReturnModal(loan)} className="px-3 py-1 bg-[#c16549] text-white text-xs font-medium hover:bg-[#a85443] transition-colors">
                                                    Process Return
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredLoans.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="p-8 text-center text-sm text-[#6B6560]">No active loans found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Checkout Confirmation Modal */}
            {showCheckoutModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-lg font-bold text-[#1E1815]">Confirm Checkout</h3>
                                <button onClick={() => setShowCheckoutModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            {/* Book & Member Summary */}
                            <div className="bg-[#FAF7F2] p-4 rounded mb-4">
                                <div className="flex gap-4 items-start">
                                    {selectedBook?.cover_image_url && (
                                        <img src={selectedBook.cover_image_url} alt="" className="w-16 h-24 object-cover rounded shadow" />
                                    )}
                                    <div>
                                        <p className="font-medium text-[#1E1815]">{selectedBook?.title}</p>
                                        <p className="text-sm text-[#6B6560]">{selectedBook?.author}</p>
                                        <p className="text-xs text-[#6B6560] mt-1">ISBN: {selectedBook?.isbn}</p>
                                        <div className="mt-2 pt-2 border-t border-[#E8E4DF]">
                                            <p className="text-sm text-[#1E1815]">Lending to: <strong>{selectedMember?.name}</strong></p>
                                            <p className="text-xs text-[#6B6560]">{selectedMember?.email}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Loan Duration */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-[#1E1815] mb-2">Loan Duration</label>
                                <select
                                    value={loanDays}
                                    onChange={(e) => setLoanDays(Number(e.target.value))}
                                    className="w-full p-2 border border-[#E8E4DF] rounded text-sm focus:border-[#c16549] focus:outline-none"
                                >
                                    <option value={7}>7 days</option>
                                    <option value={14}>14 days (Standard)</option>
                                    <option value={21}>21 days</option>
                                    <option value={28}>28 days</option>
                                </select>
                                <p className="text-xs text-[#6B6560] mt-1">
                                    Due date: {new Date(Date.now() + loanDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
                                </p>
                            </div>

                            {/* Book Condition at Checkout */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-[#1E1815] mb-2">
                                    Book Condition at Checkout <span className="text-red-500">*</span>
                                </label>
                                <p className="text-xs text-[#6B6560] mb-2">Inspect the book and record its current condition</p>
                                <div className="space-y-2">
                                    {BOOK_CONDITIONS.map(cond => (
                                        <label key={cond.value} className={`flex items-center gap-3 p-2 border rounded cursor-pointer transition-colors ${checkoutCondition === cond.value ? 'border-[#c16549] bg-[#FAF7F2]' : 'border-[#E8E4DF] hover:bg-[#FAF7F2]'}`}>
                                            <input
                                                type="radio"
                                                name="checkoutCondition"
                                                value={cond.value}
                                                checked={checkoutCondition === cond.value}
                                                onChange={(e) => setCheckoutCondition(e.target.value)}
                                                className="accent-[#c16549]"
                                            />
                                            <div>
                                                <p className={`text-sm font-medium ${cond.color}`}>{cond.label}</p>
                                                <p className="text-xs text-[#6B6560]">{cond.description}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-[#1E1815] mb-2">Notes (Optional)</label>
                                <textarea
                                    value={checkoutNotes}
                                    onChange={(e) => setCheckoutNotes(e.target.value)}
                                    placeholder="Any specific observations about the book condition..."
                                    className="w-full p-2 border border-[#E8E4DF] rounded text-sm focus:border-[#c16549] focus:outline-none resize-none"
                                    rows={2}
                                />
                            </div>

                            {/* Warning for damaged books */}
                            {(checkoutCondition === 'poor' || checkoutCondition === 'damaged') && (
                                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded">
                                    <div className="flex gap-2">
                                        <span className="material-symbols-outlined text-orange-600 text-lg">warning</span>
                                        <div>
                                            <p className="text-sm font-medium text-orange-800">Condition Warning</p>
                                            <p className="text-xs text-orange-700">This book is in {checkoutCondition} condition. Consider if it should be repaired or replaced instead of loaned.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowCheckoutModal(false)}
                                    className="flex-1 py-2 border border-[#E8E4DF] text-[#6B6560] text-sm font-medium rounded hover:bg-[#FAF7F2] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCheckout}
                                    disabled={processing}
                                    className="flex-1 py-2 bg-[#c16549] text-white text-sm font-medium rounded hover:bg-[#a85443] transition-colors disabled:bg-gray-300"
                                >
                                    {processing ? 'Processing...' : 'Confirm Checkout'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Return Confirmation Modal */}
            {showReturnModal && selectedLoan && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-lg font-bold text-[#1E1815]">Process Return</h3>
                                <button onClick={() => setShowReturnModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            {/* Loan Summary */}
                            <div className="bg-[#FAF7F2] p-4 rounded mb-4">
                                <div className="flex gap-4 items-start">
                                    {selectedLoan.books?.cover_image_url && (
                                        <img src={selectedLoan.books.cover_image_url} alt="" className="w-16 h-24 object-cover rounded shadow" />
                                    )}
                                    <div className="flex-1">
                                        <p className="font-medium text-[#1E1815]">{selectedLoan.books?.title}</p>
                                        <p className="text-sm text-[#6B6560]">{selectedLoan.books?.author}</p>
                                        <div className="mt-2 text-xs text-[#6B6560] space-y-1">
                                            <p>Borrowed by: <strong>{selectedLoan.members?.name}</strong></p>
                                            <p>Checkout: {new Date(selectedLoan.checkout_date).toLocaleDateString()}</p>
                                            <p>Due: {new Date(selectedLoan.due_date).toLocaleDateString()}</p>
                                            <p>Condition at checkout: <span className="font-medium capitalize">{selectedLoan.checkout_condition || 'good'}</span></p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Overdue Warning & Fine */}
                            {new Date(selectedLoan.due_date) < new Date() && (
                                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
                                    <div className="flex gap-3">
                                        <span className="material-symbols-outlined text-red-600 text-2xl">payments</span>
                                        <div>
                                            <p className="text-sm font-bold text-red-800">Overdue Book</p>
                                            <p className="text-xs text-red-700 mt-1">
                                                {Math.ceil((new Date() - new Date(selectedLoan.due_date)) / (1000 * 60 * 60 * 24))} days overdue
                                            </p>
                                            <p className="text-lg font-bold text-red-800 mt-2">
                                                Estimated Fine: ${calculateFine(selectedLoan.due_date, fineSettings.dailyRate, fineSettings.maxCap).toFixed(2)}
                                            </p>
                                            <p className="text-xs text-red-600 mt-1">
                                                Rate: ${fineSettings.dailyRate.toFixed(2)}/day (max ${fineSettings.maxCap.toFixed(2)})
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Book Condition at Return */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-[#1E1815] mb-2">
                                    Book Condition at Return <span className="text-red-500">*</span>
                                </label>
                                <p className="text-xs text-[#6B6560] mb-2">Inspect the book and compare with checkout condition ({selectedLoan.checkout_condition || 'good'})</p>
                                <div className="space-y-2">
                                    {BOOK_CONDITIONS.map(cond => (
                                        <label key={cond.value} className={`flex items-center gap-3 p-2 border rounded cursor-pointer transition-colors ${returnCondition === cond.value ? 'border-[#c16549] bg-[#FAF7F2]' : 'border-[#E8E4DF] hover:bg-[#FAF7F2]'}`}>
                                            <input
                                                type="radio"
                                                name="returnCondition"
                                                value={cond.value}
                                                checked={returnCondition === cond.value}
                                                onChange={(e) => setReturnCondition(e.target.value)}
                                                className="accent-[#c16549]"
                                            />
                                            <div className="flex-1">
                                                <p className={`text-sm font-medium ${cond.color}`}>{cond.label}</p>
                                                <p className="text-xs text-[#6B6560]">{cond.description}</p>
                                            </div>
                                            {cond.value === (selectedLoan.checkout_condition || 'good') && (
                                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">At checkout</span>
                                            )}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Condition Changed Warning */}
                            {returnCondition !== (selectedLoan.checkout_condition || 'good') && (
                                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                                    <div className="flex gap-2">
                                        <span className="material-symbols-outlined text-yellow-600 text-lg">compare_arrows</span>
                                        <div>
                                            <p className="text-sm font-medium text-yellow-800">Condition Changed</p>
                                            <p className="text-xs text-yellow-700">
                                                Book condition changed from <strong>{selectedLoan.checkout_condition || 'good'}</strong> to <strong>{returnCondition}</strong>. 
                                                {BOOK_CONDITIONS.findIndex(c => c.value === returnCondition) > BOOK_CONDITIONS.findIndex(c => c.value === (selectedLoan.checkout_condition || 'good')) 
                                                    ? ' Consider assessing damage charges.' 
                                                    : ''}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-[#1E1815] mb-2">Notes (Optional)</label>
                                <textarea
                                    value={returnNotes}
                                    onChange={(e) => setReturnNotes(e.target.value)}
                                    placeholder="Any observations about the book condition or return..."
                                    className="w-full p-2 border border-[#E8E4DF] rounded text-sm focus:border-[#c16549] focus:outline-none resize-none"
                                    rows={2}
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowReturnModal(false)}
                                    className="flex-1 py-2 border border-[#E8E4DF] text-[#6B6560] text-sm font-medium rounded hover:bg-[#FAF7F2] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReturn}
                                    disabled={processing}
                                    className="flex-1 py-2 bg-[#c16549] text-white text-sm font-medium rounded hover:bg-[#a85443] transition-colors disabled:bg-gray-300"
                                >
                                    {processing ? 'Processing...' : 'Confirm Return'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
