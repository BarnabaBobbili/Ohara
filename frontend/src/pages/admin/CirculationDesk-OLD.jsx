import { useState, useEffect, useCallback } from 'react';
import { membersAPI, booksAPI, circulationAPI } from '../../services/api';

const STATUS_COLOR = {
    checked_out: 'text-primary',
    returned: 'text-secondary',
    overdue: 'text-orange-600',
};

export default function CirculationDesk() {
    // ─── Checkout form state ──────────────────────────────────
    const [patronSearch, setPatronSearch] = useState('');
    const [memberLookup, setMemberLookup] = useState(null);
    const [memberLoading, setMemberLoading] = useState(false);
    const [memberError, setMemberError] = useState('');

    const [itemBarcode, setItemBarcode] = useState('');
    const [bookLookup, setBookLookup] = useState(null);
    const [bookError, setBookError] = useState('');

    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [checkoutSuccess, setCheckoutSuccess] = useState('');
    const [checkoutError, setCheckoutError] = useState('');

    // ─── Return form state ────────────────────────────────────
    const [returnBarcode, setReturnBarcode] = useState('');
    const [condition, setCondition] = useState('good');
    const [returnLoading, setReturnLoading] = useState(false);
    const [returnSuccess, setReturnSuccess] = useState('');
    const [returnError, setReturnError] = useState('');

    // ─── Transaction ledger ───────────────────────────────────
    const [ledger, setLedger] = useState([]);
    const [ledgerLoading, setLedgerLoading] = useState(false);
    const [todayDate] = useState(new Date().toLocaleDateString());

    const loadLedger = useCallback(() => {
        setLedgerLoading(true);
        circulationAPI.getActive({ limit: 20 })
            .then(data => setLedger(Array.isArray(data) ? data : (data?.results || [])))
            .catch(() => {})
            .finally(() => setLedgerLoading(false));
    }, []);

    useEffect(() => { loadLedger(); }, [loadLedger]);

    // ─── Member lookup ────────────────────────────────────────
    const lookupMember = async () => {
        if (!patronSearch.trim()) return;
        setMemberLoading(true);
        setMemberError('');
        setMemberLookup(null);
        try {
            // Try card ID first, then search by name/email
            const data = await membersAPI.getByCardId(patronSearch.trim()).catch(() => null)
                || await membersAPI.getAll({ search: patronSearch.trim(), limit: 1 })
                    .then(d => (Array.isArray(d) ? d[0] : d?.results?.[0]) || null)
                    .catch(() => null);
            if (!data) { setMemberError('Member not found'); }
            else { setMemberLookup(data); }
        } catch {
            setMemberError('Lookup failed');
        } finally {
            setMemberLoading(false);
        }
    };

    // ─── Book lookup ──────────────────────────────────────────
    const lookupBook = async () => {
        if (!itemBarcode.trim()) return;
        setBookError('');
        setBookLookup(null);
        try {
            const data = await booksAPI.getByISBN(itemBarcode.trim()).catch(() => null)
                || await booksAPI.getAll({ search: itemBarcode.trim(), limit: 1 })
                    .then(d => (Array.isArray(d) ? d[0] : d?.results?.[0]) || null)
                    .catch(() => null);
            if (!data) setBookError('Book not found');
            else setBookLookup(data);
        } catch {
            setBookError('Book lookup failed');
        }
    };

    // ─── Checkout ─────────────────────────────────────────────
    const handleCheckout = async () => {
        if (!memberLookup || !bookLookup) {
            setCheckoutError('Please look up both a member and a book first.');
            return;
        }
        setCheckoutLoading(true);
        setCheckoutError('');
        setCheckoutSuccess('');
        try {
            const due = new Date();
            due.setDate(due.getDate() + 14); // 2-week loan
            await circulationAPI.checkout({
                member_id: memberLookup.id,
                book_id: bookLookup.id,
                due_date: due.toISOString(),
            });
            setCheckoutSuccess(`✓ "${bookLookup.title}" issued to ${memberLookup.name}. Due ${due.toLocaleDateString()}.`);
            setItemBarcode('');
            setBookLookup(null);
            loadLedger();
        } catch (err) {
            setCheckoutError(err.message || 'Checkout failed');
        } finally {
            setCheckoutLoading(false);
        }
    };

    // ─── Return ───────────────────────────────────────────────
    const handleReturn = async () => {
        if (!returnBarcode.trim()) { setReturnError('Enter an ISBN or transaction ID.'); return; }
        setReturnLoading(true);
        setReturnError('');
        setReturnSuccess('');
        try {
            // Find the active checkout for this ISBN
            const active = await circulationAPI.getActive({ isbn: returnBarcode.trim() })
                .then(d => (Array.isArray(d) ? d[0] : null))
                .catch(() => null);
            if (!active) throw new Error('No active checkout found for this item');
            const result = await circulationAPI.checkin(active.id, { return_condition: condition });
            const fine = result.fine_amount || 0;
            setReturnSuccess(`✓ "${active.book?.title}" returned. ${fine > 0 ? `Fine: $${fine.toFixed(2)}` : 'No fine.'}`);
            setReturnBarcode('');
            setCondition('good');
            loadLedger();
        } catch (err) {
            setReturnError(err.message || 'Return failed');
        } finally {
            setReturnLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#f9f7f1' }}>
            <main className="flex-1 w-full max-w-[1440px] mx-auto p-4 sm:p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 md:gap-8">

                {/* ─── Left: Checkout ─────────────────────────────── */}
                <div className="lg:col-span-7 flex flex-col gap-4 sm:gap-6">
                    <div className="flex items-center gap-2 pb-2 border-b border-primary/20">
                        <span className="material-symbols-outlined text-primary text-xl sm:text-2xl">logout</span>
                        <h2 className="text-xl sm:text-2xl font-bold text-primary">Lending Operations</h2>
                    </div>

                    {/* Member lookup */}
                    <div className="bg-white p-6 rounded border border-[#e1d8d6] shadow-paper relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                        <label className="flex flex-col gap-2">
                            <span className="text-ink text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                <span className="material-symbols-outlined text-base">id_card</span>
                                Patron Library Card No.
                            </span>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        className="w-full h-14 pl-4 pr-12 bg-[#fbf9f9] border border-[#dcd6d4] text-lg font-display placeholder:text-ink-light/50 rounded-sm focus:border-primary focus:ring-0 transition-all"
                                        placeholder="Scan or type card ID / name…"
                                        type="text"
                                        value={patronSearch}
                                        onChange={(e) => setPatronSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && lookupMember()}
                                    />
                                    <button onClick={lookupMember} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-ink-light hover:text-primary transition-colors">
                                        <span className="material-symbols-outlined">qr_code_scanner</span>
                                    </button>
                                </div>
                                <button onClick={lookupMember} disabled={memberLoading}
                                    className="h-14 px-5 bg-primary/10 hover:bg-primary/20 text-primary rounded-sm font-bold text-sm transition-all disabled:opacity-50">
                                    {memberLoading ? '…' : 'Verify'}
                                </button>
                            </div>
                        </label>
                        {memberError && <p className="text-red-600 text-sm mt-2">{memberError}</p>}
                    </div>

                    {/* Member preview */}
                    {memberLookup && (
                        <div className="relative">
                            <div className="bg-[#fcfbf9] p-4 sm:p-5 rounded-sm border border-[#dcd6d4] shadow-md flex flex-col sm:flex-row gap-4 sm:gap-6 relative z-10">
                                <div className="w-24 h-32 sm:w-32 sm:h-40 bg-[#edeae8] rounded-sm border border-[#dcd6d4] flex-shrink-0 flex items-center justify-center mx-auto sm:mx-0">
                                    <span className="text-5xl font-bold text-[#b0a8a0]">
                                        {memberLookup.name?.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex-1 flex flex-col justify-between text-center sm:text-left">
                                    <div>
                                        <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-2">
                                            <div>
                                                <h3 className="text-xl sm:text-2xl font-bold text-ink leading-tight">{memberLookup.name}</h3>
                                                <p className="text-ink-light text-sm italic">{memberLookup.member_type || 'Member'} · {memberLookup.email}</p>
                                            </div>
                                            <div className={`px-2 py-1 text-xs font-bold uppercase tracking-wider rounded-sm border ${
                                                memberLookup.status === 'active'
                                                    ? 'bg-secondary/10 border-secondary/30 text-secondary'
                                                    : 'bg-red-50 border-red-200 text-red-600'
                                            }`}>
                                                {memberLookup.status}
                                            </div>
                                        </div>
                                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="block text-ink-light text-xs uppercase tracking-wider">Card ID</span>
                                                <span className="block text-ink font-bold font-mono">{memberLookup.card_id}</span>
                                            </div>
                                            <div>
                                                <span className="block text-ink-light text-xs uppercase tracking-wider">Outstanding Fines</span>
                                                <span className={`block font-bold text-lg ${memberLookup.fines > 0 ? 'text-red-600' : 'text-secondary'}`}>
                                                    ${(memberLookup.fines || 0).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute top-2 left-2 w-full h-full bg-[#f4f1ef] border border-[#e5e1df] rounded-sm -z-0" />
                        </div>
                    )}

                    {/* Book lookup & checkout */}
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <label className="flex-1 flex flex-col gap-2">
                            <span className="text-ink text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                <span className="material-symbols-outlined text-base">menu_book</span>
                                Item ISBN / Barcode
                            </span>
                            <div className="relative">
                                <input
                                    className="w-full h-14 pl-4 pr-12 bg-[#fbf9f9] border border-[#dcd6d4] text-lg font-display placeholder:text-ink-light/50 rounded-sm focus:border-primary focus:ring-0 transition-all"
                                    placeholder="Scan item to issue…"
                                    type="text"
                                    value={itemBarcode}
                                    onChange={(e) => { setItemBarcode(e.target.value); setBookLookup(null); setBookError(''); }}
                                    onKeyDown={(e) => e.key === 'Enter' && lookupBook()}
                                />
                                <button onClick={lookupBook} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-ink-light hover:text-primary">
                                    <span className="material-symbols-outlined text-base">search</span>
                                </button>
                            </div>
                            {bookLookup && (
                                <p className="text-secondary text-sm font-bold">✓ {bookLookup.title} — {bookLookup.available_copies} available</p>
                            )}
                            {bookError && <p className="text-red-600 text-sm">{bookError}</p>}
                        </label>
                        <button
                            onClick={handleCheckout}
                            disabled={checkoutLoading || !memberLookup || !bookLookup}
                            className="h-14 px-8 bg-primary hover:bg-[#7a4236] text-white text-lg font-bold rounded-sm shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] min-w-[200px] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="material-symbols-outlined">approval_delegation</span>
                            {checkoutLoading ? 'Processing…' : 'Stamp & Issue'}
                        </button>
                    </div>
                    {checkoutSuccess && <p className="text-secondary font-bold text-sm bg-secondary/10 px-4 py-2 rounded">{checkoutSuccess}</p>}
                    {checkoutError && <p className="text-red-600 font-bold text-sm bg-red-50 px-4 py-2 rounded">{checkoutError}</p>}
                </div>

                {/* ─── Divider ─────────────────────────────────────── */}
                <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-[#dcd6d4] to-transparent" />

                {/* ─── Right: Returns ──────────────────────────────── */}
                <div className="lg:col-span-4 flex flex-col gap-4 sm:gap-6">
                    <div className="flex items-center gap-2 pb-2 border-b border-secondary/20">
                        <span className="material-symbols-outlined text-secondary text-xl sm:text-2xl">login</span>
                        <h2 className="text-xl sm:text-2xl font-bold text-secondary">Returns Drop-off</h2>
                    </div>

                    <div className="bg-white p-6 rounded border border-[#e1d8d6] shadow-paper h-full flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-1 h-full bg-secondary" />
                        <div className="flex-1 flex flex-col gap-6">
                            <label className="flex flex-col gap-2">
                                <span className="text-ink text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                    <span className="material-symbols-outlined text-base">qr_code_2</span>
                                    Return ISBN
                                </span>
                                <input
                                    className="w-full h-14 pl-4 bg-[#fbf9f9] border border-[#dcd6d4] text-lg font-display placeholder:text-ink-light/50 rounded-sm focus:border-secondary focus:ring-0 transition-all"
                                    placeholder="Scan returned item…"
                                    type="text"
                                    value={returnBarcode}
                                    onChange={(e) => setReturnBarcode(e.target.value)}
                                />
                            </label>

                            <div className="flex flex-col gap-3">
                                <span className="text-ink text-sm font-bold uppercase tracking-wider">Condition Assessment</span>
                                <div className="flex flex-col gap-2">
                                    {[
                                        { value: 'good', label: 'Good / Normal Wear' },
                                        { value: 'damaged', label: 'Damaged / Needs Repair' },
                                        { value: 'missing', label: 'Missing Parts / Disc' },
                                    ].map(opt => (
                                        <label key={opt.value}
                                            className={`flex items-center p-3 border rounded-sm hover:bg-[#fbf9f9] cursor-pointer transition-colors ${condition === opt.value ? 'border-secondary bg-secondary/5' : 'border-[#dcd6d4]'}`}>
                                            <input
                                                className="w-5 h-5 text-secondary border-gray-300 focus:ring-secondary"
                                                name="condition" type="radio"
                                                checked={condition === opt.value}
                                                onChange={() => setCondition(opt.value)}
                                            />
                                            <span className="ml-3 text-ink font-medium">{opt.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {returnSuccess && <p className="text-secondary font-bold text-sm bg-secondary/10 px-3 py-2 rounded my-2">{returnSuccess}</p>}
                        {returnError && <p className="text-red-600 font-bold text-sm bg-red-50 px-3 py-2 rounded my-2">{returnError}</p>}

                        <div className="mt-8 pt-6 border-t border-dashed border-[#dcd6d4]">
                            <button
                                onClick={handleReturn}
                                disabled={returnLoading}
                                className="w-full h-14 bg-secondary hover:bg-[#2d523c] text-white text-lg font-bold rounded-sm shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50">
                                <span className="material-symbols-outlined">assignment_return</span>
                                {returnLoading ? 'Processing…' : 'Process Return'}
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* ─── Transaction Ledger ──────────────────────────────── */}
            <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 pb-6 sm:pb-8">
                <div className="bg-white border border-[#dcd6d4] rounded shadow-paper overflow-hidden">
                    <div className="bg-[#edeae8] px-3 sm:px-4 py-2 border-b border-[#dcd6d4] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <h3 className="font-bold text-ink-light text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
                            <span className="material-symbols-outlined text-base sm:text-lg">receipt_long</span>
                            Daily Transaction Ledger
                        </h3>
                        <span className="text-xs text-ink-light font-mono">LOG_DATE: {todayDate}</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[640px]">
                            <thead>
                                <tr className="border-b-2 border-[#dcd6d4] text-xs uppercase tracking-wider text-ink-light bg-[#fbf9f9]">
                                    <th className="px-4 py-3 font-bold">Status</th>
                                    <th className="px-4 py-3 font-bold">Book</th>
                                    <th className="px-4 py-3 font-bold">Patron</th>
                                    <th className="px-4 py-3 font-bold">Checkout Date</th>
                                    <th className="px-4 py-3 font-bold text-right">Due Date</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm font-mono text-ink">
                                {ledgerLoading ? (
                                    <tr><td colSpan={5} className="py-8 text-center text-ink-light">Loading…</td></tr>
                                ) : ledger.length === 0 ? (
                                    <tr><td colSpan={5} className="py-8 text-center text-ink-light italic">No active transactions</td></tr>
                                ) : (
                                    ledger.map((tx) => (
                                        <tr key={tx.id} className="border-b border-[#f1efed] hover:bg-[#fbf9f9] transition-colors">
                                            <td className={`px-4 py-3 font-bold ${STATUS_COLOR[tx.status] || 'text-ink'}`}>
                                                {tx.status?.replace('_', ' ').toUpperCase()}
                                            </td>
                                            <td className="px-4 py-3 font-display text-base">{tx.book?.title || `Book #${tx.book_id}`}</td>
                                            <td className="px-4 py-3">{tx.member?.name || `Member #${tx.member_id}`}</td>
                                            <td className="px-4 py-3 text-ink-light">{new Date(tx.checkout_date).toLocaleDateString()}</td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="relative inline-block">
                                                    <div className="border-2 border-primary text-primary px-2 py-0.5 text-[10px] font-bold -rotate-6 whitespace-nowrap opacity-80 mix-blend-multiply">
                                                        DUE {new Date(tx.due_date).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>
    );
}
