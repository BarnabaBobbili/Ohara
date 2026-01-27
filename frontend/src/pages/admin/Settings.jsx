import { useState } from 'react';
import { ADMIN_COLORS } from '../../styles/adminTheme';

export default function Settings() {
    const [expandedSection, setExpandedSection] = useState(null);

    const toggleSection = (section) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    return (
        <div className="min-h-full flex flex-col" style={{ backgroundColor: ADMIN_COLORS.primaryBg }}>
            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-y-auto">
                {/* Page Heading */}
                <div className="px-8 pt-10 pb-6 w-full max-w-[1200px] mx-auto">
                    <div className="flex flex-col gap-2 pb-6" style={{ borderBottom: `1px solid ${ADMIN_COLORS.border}` }}>
                        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider" style={{ color: ADMIN_COLORS.burgundy, fontFamily: "'Noto Sans', sans-serif" }}>
                            <span className="material-symbols-outlined text-lg">settings</span>
                            <span>System Configuration</span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight" style={{ fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textPrimary }}>Administration Settings</h1>
                        <p className="text-base mt-1" style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textSecondary }}>Configure library policies, notifications, and system preferences.</p>
                    </div>
                </div>

                {/* Content Container */}
                <div className="flex-1 px-8 pb-20 w-full max-w-[1200px] mx-auto flex flex-col gap-8">
                    {/* Accordion 1: Circulation Rules */}
                    <Accordion
                        title="Circulation Rules"
                        isOpen={openAccordion === 'circulation'}
                        onToggle={() => toggleAccordion('circulation')}
                    >
                        <p className="text-[#4e6797] text-base mb-6 max-w-3xl">Define loan periods, grace periods, and item limits for each patron category. Changes take effect at midnight.</p>
                        <div className="overflow-x-auto border border-[#0e121b]/20 rounded-sm bg-white/50 backdrop-blur-sm">
                            <table className="w-full min-w-[800px] text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#0e121b]/10">
                                        <th className="p-4 text-sm font-semibold w-1/5 bg-black/5">Patron Type</th>
                                        <th className="p-4 text-sm font-medium text-[#4e6797] w-1/5">Loan Period</th>
                                        <th className="p-4 text-sm font-medium text-[#4e6797] w-1/5">Grace Period</th>
                                        <th className="p-4 text-sm font-medium text-[#4e6797] w-1/5">Max Items</th>
                                        <th className="p-4 text-sm font-medium text-[#4e6797] w-1/5">Fine Policy</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#0e121b]/10">
                                    <tr className="hover:bg-white transition-colors">
                                        <td className="p-4 font-medium">Faculty</td>
                                        <td className="p-4">180 Days</td>
                                        <td className="p-4">14 Days</td>
                                        <td className="p-4">50</td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">Exempt</span>
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-white transition-colors">
                                        <td className="p-4 font-medium">Graduate Student</td>
                                        <td className="p-4">90 Days</td>
                                        <td className="p-4">7 Days</td>
                                        <td className="p-4">25</td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">Standard</span>
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-white transition-colors">
                                        <td className="p-4 font-medium">Undergraduate</td>
                                        <td className="p-4">21 Days</td>
                                        <td className="p-4">3 Days</td>
                                        <td className="p-4">10</td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">Standard</span>
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-white transition-colors">
                                        <td className="p-4 font-medium">Community</td>
                                        <td className="p-4">14 Days</td>
                                        <td className="p-4">1 Day</td>
                                        <td className="p-4">5</td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">Double</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </Accordion>

                    {/* Accordion 2: Fiscal Policy */}
                    <Accordion
                        title="Fiscal Policy"
                        isOpen={openAccordion === 'fiscal'}
                        onToggle={() => toggleAccordion('fiscal')}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
                            <label className="flex flex-col gap-2">
                                <span className="text-base font-medium">Standard Daily Fine ($)</span>
                                <input className="form-input w-full bg-white border-0 border-b border-[#0e121b]/30 focus:border-[#1754cf] focus:ring-0 px-0 py-3 text-lg placeholder-gray-400 transition-colors" step="0.01" type="number" defaultValue="0.50" />
                                <span className="text-xs text-[#4e6797]">Applied per item, per day overdue.</span>
                            </label>
                            <label className="flex flex-col gap-2">
                                <span className="text-base font-medium">Lost Item Processing Fee ($)</span>
                                <input className="form-input w-full bg-white border-0 border-b border-[#0e121b]/30 focus:border-[#1754cf] focus:ring-0 px-0 py-3 text-lg placeholder-gray-400 transition-colors" step="0.01" type="number" defaultValue="15.00" />
                                <span className="text-xs text-[#4e6797]">Fixed fee added to replacement cost.</span>
                            </label>
                            <label className="flex flex-col gap-2">
                                <span className="text-base font-medium">Maximum Fine Cap ($)</span>
                                <input className="form-input w-full bg-white border-0 border-b border-[#0e121b]/30 focus:border-[#1754cf] focus:ring-0 px-0 py-3 text-lg placeholder-gray-400 transition-colors" step="1.00" type="number" defaultValue="20.00" />
                                <span className="text-xs text-[#4e6797]">Maximum fine accrual per item.</span>
                            </label>
                            <div className="flex flex-col gap-4 pt-2">
                                <span className="text-base font-medium">Payment Gateways</span>
                                <div className="flex items-center gap-6">
                                    {['Accept Stripe', 'Accept PayPal', 'Cash / In-person'].map((label, idx) => (
                                        <label key={idx} className="flex items-center gap-3 cursor-pointer">
                                            <input className="editorial-checkbox text-[#1754cf] focus:ring-0 focus:ring-offset-0" type="checkbox" defaultChecked={idx === 0 || idx === 2} />
                                            <span>{label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Accordion>

                    {/* Accordion 3: Notification Templates */}
                    <Accordion
                        title="Notification Templates"
                        isOpen={openAccordion === 'notifications'}
                        onToggle={() => toggleAccordion('notifications')}
                    >
                        <div className="flex flex-col gap-6 max-w-4xl">
                            <div className="flex gap-4 items-end">
                                <div className="w-1/3">
                                    <label className="block text-sm font-medium text-[#4e6797] mb-1">Template Type</label>
                                    <select className="block w-full rounded-sm border-[#0e121b]/20 bg-white py-2 pl-3 pr-10 text-base focus:border-[#1754cf] focus:outline-none focus:ring-0 sm:text-sm">
                                        <option>Overdue Notice (1st Warning)</option>
                                        <option>Overdue Notice (Final)</option>
                                        <option>Hold Available for Pickup</option>
                                        <option>Welcome New Patron</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-[#4e6797] mb-1">Email Subject Line</label>
                                    <input className="block w-full rounded-sm border-[#0e121b]/20 bg-white py-2 px-3 text-base focus:border-[#1754cf] focus:outline-none focus:ring-0 sm:text-sm" type="text" defaultValue="Action Required: Items Overdue at Athenaeum" />
                                </div>
                            </div>
                            <div className="relative">
                                <label className="block text-sm font-medium text-[#4e6797] mb-2">Body Content (Monospace)</label>
                                <textarea className="block w-full rounded-sm border-[#0e121b]/20 bg-[#fffff0] p-4 font-['Courier'] text-sm leading-relaxed shadow-inner focus:border-[#1754cf] focus:ring-0 resize-none" rows="12" defaultValue={`Dear {{patron_name}},\n\nThis is a reminder that the following items checked out to your account are now overdue:\n\n{{#each overdue_items}}\n- {{title}} (Due: {{due_date}})\n{{/each}}\n\nPlease return these items to the Main Branch as soon as possible to avoid further fines. The current outstanding balance on your account is ${{ fine_balance }}.\n\nSincerely,\nThe Athenaeum Staff`}></textarea>
                                <div className="absolute bottom-3 right-3 text-xs text-gray-400 font-['Courier']">
                                    Supported tags: {'{{patron_name}}, {{due_date}}, {{title}}'}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button className="px-4 py-2 text-sm font-medium border border-[#0e121b]/20 rounded hover:bg-black/5 transition-colors">Send Test Email</button>
                                <button className="px-4 py-2 text-sm font-medium text-[#1754cf] hover:text-[#1754cf]/80 hover:underline">Save Template</button>
                            </div>
                        </div>
                    </Accordion>

                    {/* Accordion 4: Staff & Permissions */}
                    <Accordion
                        title="Staff & Permissions"
                        isOpen={openAccordion === 'permissions'}
                        onToggle={() => toggleAccordion('permissions')}
                    >
                        <p className="text-[#4e6797] text-base mb-6">Manage role-based access control for the staff portal.</p>
                        <div className="overflow-hidden border border-[#0e121b]/20 rounded-sm">
                            <table className="min-w-full divide-y divide-[#0e121b]/10">
                                <thead className="bg-black/5">
                                    <tr>
                                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-6">Permission Node</th>
                                        <th className="px-3 py-3.5 text-center text-sm font-semibold w-24">Admin</th>
                                        <th className="px-3 py-3.5 text-center text-sm font-semibold w-24">Librarian</th>
                                        <th className="px-3 py-3.5 text-center text-sm font-semibold w-24">Assistant</th>
                                        <th className="px-3 py-3.5 text-center text-sm font-semibold w-24">Volunteer</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#0e121b]/10 bg-white/50 backdrop-blur-sm">
                                    {[
                                        ['System Configuration', [true, false, false, false]],
                                        ['Catalog Management (Add/Edit)', [true, true, false, false]],
                                        ['Patron Data (View PII)', [true, true, true, false]],
                                        ['Financial Reports', [true, false, false, false]]
                                    ].map(([permission, checks], idx) => (
                                        <tr key={idx}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-6">{permission}</td>
                                            {checks.map((checked, i) => (
                                                <td key={i} className="px-3 py-4 text-center">
                                                    <input className="editorial-checkbox text-[#1754cf] mx-auto cursor-pointer focus:ring-0 focus:ring-offset-0" type="checkbox" defaultChecked={checked} disabled={i === 0 && checked} />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Accordion>
                </div>
            </main>

            <style>{`
                .editorial-checkbox {
                    appearance: none;
                    background-color: transparent;
                    margin: 0;
                    font: inherit;
                    color: currentColor;
                    width: 1.15em;
                    height: 1.15em;
                    border: 1px solid currentColor;
                    border-radius: 0.15em;
                    display: grid;
                    place-content: center;
                }
                .editorial-checkbox::before {
                    content: "";
                    width: 0.65em;
                    height: 0.65em;
                    transform: scale(0);
                    transition: 120ms transform ease-in-out;
                    box-shadow: inset 1em 1em #1754cf;
                    transform-origin: center;
                    clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
                }
                .editorial-checkbox:checked::before {
                    transform: scale(1);
                }
            `}</style>
        </div>
    );
}

function Accordion({ title, isOpen, onToggle, children }) {
    return (
        <details className="group bg-transparent" open={isOpen}>
            <summary
                className="flex cursor-pointer items-center justify-between gap-4 py-4 border-b border-[#0e121b]/20 select-none hover:bg-black/5 px-2 -mx-2 rounded transition-colors list-none"
                onClick={(e) => { e.preventDefault(); onToggle(); }}
            >
                <h3 className="text-2xl font-semibold">{title}</h3>
                <span className={`material-symbols-outlined transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </summary>
            {isOpen && (
                <div className="pt-6 pb-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    {children}
                </div>
            )}
        </details>
    );
}
