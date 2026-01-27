import { useState } from 'react';

export default function CirculationDesk() {
    const [patronId, setPatronId] = useState('LC-8921-2291');
    const [itemBarcode, setItemBarcode] = useState('');
    const [returnBarcode, setReturnBarcode] = useState('');
    const [condition, setCondition] = useState('good');

    const transactions = [
        { time: '09:42 AM', action: 'CHECK OUT', actionColor: 'text-primary', item: 'The History of the Peloponnesian War', patron: 'Eleanor Vance', status: 'DUE NOV 14', isStamped: true },
        { time: '09:35 AM', action: 'CHECK IN', actionColor: 'text-secondary', item: 'Introduction to Quantum Mechanics', patron: 'Arthur P.', status: 'SHELVING', statusColor: 'text-secondary' },
        { time: '09:15 AM', action: 'CHECK OUT', actionColor: 'text-primary', item: 'Botany of the Northern Hemisphere', patron: 'Sarah J.', status: 'DUE NOV 14', statusColor: 'text-ink-light' },
        { time: '08:55 AM', action: 'CHECK IN', actionColor: 'text-secondary', item: 'Advanced Calculus Vol. 2', patron: 'Marcus T.', status: 'DAMAGED', statusColor: 'text-orange-600' },
        { time: '08:42 AM', action: 'CHECK OUT', actionColor: 'text-primary', item: 'Modern Architecture 1900-1950', patron: 'Eleanor Vance', status: 'DUE NOV 14', statusColor: 'text-ink-light' },
    ];

    return (
        <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#f9f7f1' }}>
            {/* Main Content Area */}
            <main className="flex-1 w-full max-w-[1440px] mx-auto p-4 sm:p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 md:gap-8">
                {/* Left Column: Lending (Check Out) */}
                <div className="lg:col-span-7 flex flex-col gap-4 sm:gap-6">
                    <div className="flex items-center gap-2 pb-2 border-b border-primary/20">
                        <span className="material-symbols-outlined text-primary text-xl sm:text-2xl">logout</span>
                        <h2 className="text-xl sm:text-2xl font-bold text-primary">Lending Operations</h2>
                    </div>

                    {/* Patron ID Input */}
                    <div className="bg-white p-6 rounded border border-[#e1d8d6] shadow-paper relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                        <label className="flex flex-col gap-2">
                            <span className="text-ink text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                <span className="material-symbols-outlined text-base">id_card</span>
                                Patron Library Card No.
                            </span>
                            <div className="relative">
                                <input
                                    className="w-full h-14 pl-4 pr-12 bg-[#fbf9f9] border border-[#dcd6d4] text-lg font-display placeholder:text-ink-light/50 rounded-sm focus:border-primary focus:ring-0 transition-all"
                                    placeholder="Scan or type ID..."
                                    type="text"
                                    value={patronId}
                                    onChange={(e) => setPatronId(e.target.value)}
                                />
                                <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-ink-light hover:text-primary transition-colors">
                                    <span className="material-symbols-outlined">qr_code_scanner</span>
                                </button>
                            </div>
                        </label>
                    </div>

                    {/* Member Preview Card */}
                    <div className="relative">
                        <div className="bg-[#fcfbf9] p-4 sm:p-5 rounded-sm border border-[#dcd6d4] shadow-md flex flex-col sm:flex-row gap-4 sm:gap-6 relative z-10">
                            {/* Photo Area */}
                            <div className="w-24 h-32 sm:w-32 sm:h-40 bg-[#edeae8] rounded-sm border border-[#dcd6d4] flex-shrink-0 relative overflow-hidden mx-auto sm:mx-0">
                                <img
                                    alt="Member Photo"
                                    className="w-full h-full object-cover sepia-[.2]"
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCjydj9hDdO6wrxqmAxb7WRMkodUQcb-RMGj41dqVrN8zPlTwBQqFvG7kSLFkuAHqa0DUuytYbV1MmxkZMrfW4czvOOCSP7qtg-SUo3qMtkRwBUMXx3v-7bdgr618KX9SI3QjhlbihetziOQ_0tBFCIz4YCKaEerj4RLeErwokRvv9VJc14P0a7wKdxJK-bDcwQ6cKGNoWQTl1ZQE4vfbFj8j7shKVNO6exe94niZKAn41KOoXVI7ofvrpXgSPFs3c_-wShPJ4KFEoX"
                                />
                                <div className="absolute bottom-0 w-full bg-black/60 text-white text-[10px] text-center py-1 uppercase tracking-widest font-sans">Verified</div>
                            </div>

                            {/* Details Area */}
                            <div className="flex-1 flex flex-col justify-between text-center sm:text-left">
                                <div>
                                    <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-2">
                                        <div>
                                            <h3 className="text-xl sm:text-2xl font-bold text-ink leading-tight">Eleanor Vance</h3>
                                            <p className="text-ink-light text-sm italic">Faculty Member • History Dept.</p>
                                        </div>
                                        <div className="px-2 py-1 bg-secondary/10 border border-secondary/30 text-secondary text-xs font-bold uppercase tracking-wider rounded-sm">
                                            Good Standing
                                        </div>
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="block text-ink-light text-xs uppercase tracking-wider">Current Loans</span>
                                            <span className="block text-ink font-bold text-lg">2 <span className="text-sm font-normal text-ink-light">/ 10 items</span></span>
                                        </div>
                                        <div>
                                            <span className="block text-ink-light text-xs uppercase tracking-wider">Outstanding Fines</span>
                                            <span className="block text-secondary font-bold text-lg">$0.00</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 pt-3 border-t border-dashed border-[#dcd6d4] flex justify-center sm:justify-end">
                                    <button className="text-primary text-sm font-bold hover:underline flex items-center gap-1">
                                        View Full Profile <span className="material-symbols-outlined text-base">arrow_forward</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        {/* Stacked paper effect */}
                        <div className="absolute top-2 left-2 w-full h-full bg-[#f4f1ef] border border-[#e5e1df] rounded-sm -z-0"></div>
                    </div>

                    {/* Item Input & Action */}
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <label className="flex-1 flex flex-col gap-2">
                            <span className="text-ink text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                <span className="material-symbols-outlined text-base">menu_book</span>
                                Item ISBN / Barcode
                            </span>
                            <div className="relative">
                                <input
                                    className="w-full h-14 pl-4 bg-[#fbf9f9] border border-[#dcd6d4] text-lg font-display placeholder:text-ink-light/50 rounded-sm focus:border-primary focus:ring-0 transition-all"
                                    placeholder="Scan item to issue..."
                                    type="text"
                                    value={itemBarcode}
                                    onChange={(e) => setItemBarcode(e.target.value)}
                                />
                            </div>
                        </label>
                        <button className="h-14 px-8 bg-primary hover:bg-[#7a4236] text-white text-lg font-bold rounded-sm shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] min-w-[200px]">
                            <span className="material-symbols-outlined">approval_delegation</span>
                            Stamp & Issue
                        </button>
                    </div>
                </div>

                {/* Vertical Divider */}
                <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-[#dcd6d4] to-transparent"></div>

                {/* Right Column: Returns */}
                <div className="lg:col-span-4 flex flex-col gap-4 sm:gap-6">
                    <div className="flex items-center gap-2 pb-2 border-b border-secondary/20">
                        <span className="material-symbols-outlined text-secondary text-xl sm:text-2xl">login</span>
                        <h2 className="text-xl sm:text-2xl font-bold text-secondary">Returns Drop-off</h2>
                    </div>

                    <div className="bg-white p-6 rounded border border-[#e1d8d6] shadow-paper h-full flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-1 h-full bg-secondary"></div>
                        <div className="flex-1 flex flex-col gap-6">
                            <label className="flex flex-col gap-2">
                                <span className="text-ink text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                    <span className="material-symbols-outlined text-base">qr_code_2</span>
                                    Return ISBN
                                </span>
                                <input
                                    className="w-full h-14 pl-4 bg-[#fbf9f9] border border-[#dcd6d4] text-lg font-display placeholder:text-ink-light/50 rounded-sm focus:border-secondary focus:ring-0 transition-all"
                                    placeholder="Scan returned item..."
                                    type="text"
                                    value={returnBarcode}
                                    onChange={(e) => setReturnBarcode(e.target.value)}
                                />
                            </label>

                            <div className="flex flex-col gap-3">
                                <span className="text-ink text-sm font-bold uppercase tracking-wider">Condition Assessment</span>
                                <div className="flex flex-col gap-2">
                                    <label className="flex items-center p-3 border border-[#dcd6d4] rounded-sm hover:bg-[#fbf9f9] cursor-pointer transition-colors has-[:checked]:border-secondary has-[:checked]:bg-secondary/5">
                                        <input
                                            className="w-5 h-5 text-secondary border-gray-300 focus:ring-secondary"
                                            name="condition"
                                            type="radio"
                                            checked={condition === 'good'}
                                            onChange={() => setCondition('good')}
                                        />
                                        <span className="ml-3 text-ink font-medium">Good / Normal Wear</span>
                                    </label>
                                    <label className="flex items-center p-3 border border-[#dcd6d4] rounded-sm hover:bg-[#fbf9f9] cursor-pointer transition-colors has-[:checked]:border-red-600 has-[:checked]:bg-red-50">
                                        <input
                                            className="w-5 h-5 text-red-600 border-gray-300 focus:ring-red-600"
                                            name="condition"
                                            type="radio"
                                            checked={condition === 'damaged'}
                                            onChange={() => setCondition('damaged')}
                                        />
                                        <span className="ml-3 text-ink font-medium">Damaged / Needs Repair</span>
                                    </label>
                                    <label className="flex items-center p-3 border border-[#dcd6d4] rounded-sm hover:bg-[#fbf9f9] cursor-pointer transition-colors has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50">
                                        <input
                                            className="w-5 h-5 text-orange-500 border-gray-300 focus:ring-orange-500"
                                            name="condition"
                                            type="radio"
                                            checked={condition === 'missing'}
                                            onChange={() => setCondition('missing')}
                                        />
                                        <span className="ml-3 text-ink font-medium">Missing Parts / Disc</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-dashed border-[#dcd6d4]">
                            <button className="w-full h-14 bg-secondary hover:bg-[#2d523c] text-white text-lg font-bold rounded-sm shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                                <span className="material-symbols-outlined">assignment_return</span>
                                Process Return
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer: Transaction Ledger */}
            <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 pb-6 sm:pb-8">
                <div className="bg-white border border-[#dcd6d4] rounded shadow-paper overflow-hidden">
                    <div className="bg-[#edeae8] px-3 sm:px-4 py-2 border-b border-[#dcd6d4] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <h3 className="font-bold text-ink-light text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
                            <span className="material-symbols-outlined text-base sm:text-lg">receipt_long</span>
                            Daily Transaction Ledger
                        </h3>
                        <span className="text-xs text-ink-light font-mono">LOG_DATE: 2023-10-24</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[640px]">
                            <thead>
                                <tr className="border-b-2 border-[#dcd6d4] text-xs uppercase tracking-wider text-ink-light bg-[#fbf9f9]">
                                    <th className="px-4 py-3 font-bold w-24">Time</th>
                                    <th className="px-4 py-3 font-bold w-32">Action</th>
                                    <th className="px-4 py-3 font-bold">Item Title</th>
                                    <th className="px-4 py-3 font-bold">Patron</th>
                                    <th className="px-4 py-3 font-bold text-right">Status / Due</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm font-mono text-ink">
                                {transactions.map((tx, idx) => (
                                    <tr key={idx} className="border-b border-[#f1efed] hover:bg-[#fbf9f9] transition-colors">
                                        <td className="px-4 py-3 text-ink-light">{tx.time}</td>
                                        <td className={`px-4 py-3 font-bold ${tx.actionColor}`}>{tx.action}</td>
                                        <td className="px-4 py-3 font-display text-base">{tx.item}</td>
                                        <td className="px-4 py-3">{tx.patron}</td>
                                        <td className="px-4 py-3 text-right">
                                            {tx.isStamped ? (
                                                <div className="relative inline-block">
                                                    <span className="opacity-0">{tx.status}</span>
                                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-primary text-primary px-2 py-0.5 text-[10px] font-bold -rotate-6 whitespace-nowrap opacity-80 mix-blend-multiply">
                                                        {tx.status}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className={`font-bold ${tx.statusColor || ''}`}>{tx.status}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    <div className="bg-[#fbf9f9] border-t border-[#dcd6d4] p-2 flex justify-center">
                        <div className="flex gap-1 text-xs text-ink-light font-mono">
                            <span className="cursor-pointer hover:text-primary hover:font-bold">[PREV]</span>
                            <span>1</span>
                            <span>2</span>
                            <span>3</span>
                            <span className="cursor-pointer hover:text-primary hover:font-bold">[NEXT]</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
