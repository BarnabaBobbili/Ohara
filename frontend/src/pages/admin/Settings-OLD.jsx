import { useEffect, useState } from 'react';
import { ADMIN_COLORS } from '../../styles/adminTheme';
import { settingsAPI } from '../../services/api';

const DEFAULT_CIRCULATION_RULES = [
    { patron_type: 'Faculty', loan_period: '180 Days', grace_period: '14 Days', max_items: '50', fine_policy: 'Exempt' },
    { patron_type: 'Graduate Student', loan_period: '90 Days', grace_period: '7 Days', max_items: '25', fine_policy: 'Standard' },
    { patron_type: 'Undergraduate', loan_period: '21 Days', grace_period: '3 Days', max_items: '10', fine_policy: 'Standard' },
    { patron_type: 'Community', loan_period: '14 Days', grace_period: '1 Day', max_items: '5', fine_policy: 'Double' },
];

const DEFAULT_PAYMENT_GATEWAYS = {
    stripe: true,
    paypal: false,
    cash: true,
};

const DEFAULT_NOTIFICATION_BODY = `Dear {{patron_name}},

This is a reminder that the following items checked out to your account are now overdue:

{{#each overdue_items}}
- {{title}} (Due: {{due_date}})
{{/each}}

Please return these items to the Main Branch as soon as possible to avoid further fines. The current outstanding balance on your account is \${{ fine_balance }}.

Sincerely,
The Athenaeum Staff`;

const DEFAULT_NOTIFICATION_SETTINGS = {
    template_type: 'Overdue Notice (1st Warning)',
    subject: 'Action Required: Items Overdue at Athenaeum',
    body: DEFAULT_NOTIFICATION_BODY,
};

const DEFAULT_PERMISSIONS_MATRIX = [
    { permission: 'System Configuration', checks: [true, false, false, false] },
    { permission: 'Catalog Management (Add/Edit)', checks: [true, true, false, false] },
    { permission: 'Patron Data (View PII)', checks: [true, true, true, false] },
    { permission: 'Financial Reports', checks: [true, false, false, false] },
];

const PAYMENT_GATEWAY_OPTIONS = [
    { key: 'stripe', label: 'Accept Stripe', description: 'Card payments and online settlements' },
    { key: 'paypal', label: 'Accept PayPal', description: 'External wallet payments' },
    { key: 'cash', label: 'Cash / In-person', description: 'Desk payments for fines and waivers' },
];

const TEMPLATE_TYPES = [
    'Overdue Notice (1st Warning)',
    'Overdue Notice (Final)',
    'Hold Available for Pickup',
    'Welcome New Patron',
];

const ROLE_LABELS = ['Admin', 'Librarian', 'Assistant', 'Volunteer'];

const parseJsonSetting = (value, fallback) => {
    if (!value) return fallback;

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

const firstNumberFromText = (value, fallback) => {
    const match = String(value ?? '').match(/\d+/);
    return match ? match[0] : fallback;
};

const getStatusText = (statusMap, section) => statusMap[section] || '';

export default function Settings() {
    const [expandedSection, setExpandedSection] = useState('circulation');
    const [loading, setLoading] = useState(true);
    const [savingSection, setSavingSection] = useState('');
    const [saveStatus, setSaveStatus] = useState({});
    const [circulationRules, setCirculationRules] = useState(DEFAULT_CIRCULATION_RULES);
    const [fiscalSettings, setFiscalSettings] = useState({
        daily_fine_rate: '0.50',
        lost_item_processing_fee: '15.00',
        max_fine_cap: '20.00',
        payment_gateways: DEFAULT_PAYMENT_GATEWAYS,
    });
    const [notificationSettings, setNotificationSettings] = useState(DEFAULT_NOTIFICATION_SETTINGS);
    const [permissionsMatrix, setPermissionsMatrix] = useState(DEFAULT_PERMISSIONS_MATRIX);

    useEffect(() => {
        loadSettings();
    }, []);

    const toggleSection = (section) => {
        setExpandedSection((current) => (current === section ? null : section));
    };

    const loadSettings = async () => {
        try {
            setLoading(true);
            const settings = await settingsAPI.getAll();

            setCirculationRules(parseJsonSetting(settings.circulation_rules, DEFAULT_CIRCULATION_RULES));
            setFiscalSettings({
                daily_fine_rate: settings.daily_fine_rate || '0.50',
                lost_item_processing_fee: settings.lost_item_processing_fee || '15.00',
                max_fine_cap: settings.max_fine_cap || '20.00',
                payment_gateways: parseJsonSetting(settings.accepted_payment_gateways, DEFAULT_PAYMENT_GATEWAYS),
            });
            setNotificationSettings({
                template_type: settings.notification_template_type || DEFAULT_NOTIFICATION_SETTINGS.template_type,
                subject: settings.notification_subject || DEFAULT_NOTIFICATION_SETTINGS.subject,
                body: settings.notification_body || DEFAULT_NOTIFICATION_SETTINGS.body,
            });
            setPermissionsMatrix(parseJsonSetting(settings.staff_permissions_matrix, DEFAULT_PERMISSIONS_MATRIX));
        } catch (error) {
            console.error('Failed to load settings:', error);
            setSaveStatus({ global: `Failed to load settings: ${error.message}` });
        } finally {
            setLoading(false);
        }
    };

    const persistSection = async (section, settings) => {
        try {
            setSavingSection(section);
            setSaveStatus((current) => ({ ...current, [section]: '' }));
            await settingsAPI.bulkUpdate(settings);
            setSaveStatus((current) => ({ ...current, [section]: 'Saved.' }));
        } catch (error) {
            console.error(`Failed to save ${section}:`, error);
            setSaveStatus((current) => ({ ...current, [section]: `Failed to save: ${error.message}` }));
        } finally {
            setSavingSection('');
        }
    };

    const saveCirculationRules = async () => {
        const undergraduateRule = circulationRules.find((rule) => rule.patron_type === 'Undergraduate') || DEFAULT_CIRCULATION_RULES[2];

        await persistSection('circulation', [
            {
                key: 'circulation_rules',
                value: JSON.stringify(circulationRules),
                category: 'circulation',
            },
            {
                key: 'loan_period_days',
                value: firstNumberFromText(undergraduateRule.loan_period, '21'),
                category: 'circulation',
            },
            {
                key: 'max_books_per_member',
                value: String(undergraduateRule.max_items || '10'),
                category: 'circulation',
            },
        ]);
    };

    const saveFiscalSettings = async () => {
        await persistSection('fiscal', [
            { key: 'daily_fine_rate', value: fiscalSettings.daily_fine_rate, category: 'fiscal' },
            { key: 'lost_item_processing_fee', value: fiscalSettings.lost_item_processing_fee, category: 'fiscal' },
            { key: 'max_fine_cap', value: fiscalSettings.max_fine_cap, category: 'fiscal' },
            {
                key: 'accepted_payment_gateways',
                value: JSON.stringify(fiscalSettings.payment_gateways),
                category: 'fiscal',
            },
        ]);
    };

    const saveNotifications = async () => {
        await persistSection('notifications', [
            { key: 'notification_template_type', value: notificationSettings.template_type, category: 'notifications' },
            { key: 'notification_subject', value: notificationSettings.subject, category: 'notifications' },
            { key: 'notification_body', value: notificationSettings.body, category: 'notifications' },
        ]);
    };

    const savePermissions = async () => {
        await persistSection('permissions', [
            {
                key: 'staff_permissions_matrix',
                value: JSON.stringify(permissionsMatrix),
                category: 'permissions',
            },
        ]);
    };

    const updateCirculationRule = (index, field, value) => {
        setCirculationRules((current) =>
            current.map((rule, ruleIndex) => (
                ruleIndex === index ? { ...rule, [field]: value } : rule
            ))
        );
    };

    const updatePaymentGateway = (gateway, checked) => {
        setFiscalSettings((current) => ({
            ...current,
            payment_gateways: {
                ...current.payment_gateways,
                [gateway]: checked,
            },
        }));
    };

    const updatePermission = (rowIndex, columnIndex, checked) => {
        setPermissionsMatrix((current) =>
            current.map((row, currentRowIndex) => {
                if (currentRowIndex !== rowIndex) return row;

                return {
                    ...row,
                    checks: row.checks.map((value, currentColumnIndex) => (
                        currentColumnIndex === columnIndex ? checked : value
                    )),
                };
            })
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: ADMIN_COLORS.primaryBg }}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4" style={{ borderColor: ADMIN_COLORS.burgundy }}></div>
                    <p style={{ color: ADMIN_COLORS.textMuted }}>Loading settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full flex flex-col" style={{ backgroundColor: ADMIN_COLORS.primaryBg }}>
            <main className="flex-1 flex flex-col overflow-y-auto">
                <div className="px-8 pt-10 pb-6 w-full max-w-[1200px] mx-auto">
                    <div className="flex flex-col gap-2 pb-6" style={{ borderBottom: `1px solid ${ADMIN_COLORS.border}` }}>
                        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider" style={{ color: ADMIN_COLORS.burgundy, fontFamily: "'Noto Sans', sans-serif" }}>
                            <span className="material-symbols-outlined text-lg">settings</span>
                            <span>System Configuration</span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight" style={{ fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textPrimary }}>Administration Settings</h1>
                        <p className="text-base mt-1" style={{ fontFamily: "'Noto Sans', sans-serif", color: ADMIN_COLORS.textSecondary }}>Configure library policies, notifications, and system preferences.</p>
                        {saveStatus.global && (
                            <p className="text-sm mt-2" style={{ color: ADMIN_COLORS.red }}>{saveStatus.global}</p>
                        )}
                    </div>
                </div>

                <div className="flex-1 px-8 pb-20 w-full max-w-[1200px] mx-auto flex flex-col gap-8">
                    <Accordion
                        title="Circulation Rules"
                        isOpen={expandedSection === 'circulation'}
                        onToggle={() => toggleSection('circulation')}
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
                                    {circulationRules.map((rule, index) => (
                                        <tr key={rule.patron_type} className="hover:bg-white transition-colors">
                                            <td className="p-4 font-medium">{rule.patron_type}</td>
                                            <td className="p-4">
                                                <input
                                                    type="text"
                                                    value={rule.loan_period}
                                                    onChange={(event) => updateCirculationRule(index, 'loan_period', event.target.value)}
                                                    className="w-full bg-transparent border-0 border-b border-[#0e121b]/20 px-0 py-1 focus:ring-0 focus:border-[#1754cf]"
                                                />
                                            </td>
                                            <td className="p-4">
                                                <input
                                                    type="text"
                                                    value={rule.grace_period}
                                                    onChange={(event) => updateCirculationRule(index, 'grace_period', event.target.value)}
                                                    className="w-full bg-transparent border-0 border-b border-[#0e121b]/20 px-0 py-1 focus:ring-0 focus:border-[#1754cf]"
                                                />
                                            </td>
                                            <td className="p-4">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={rule.max_items}
                                                    onChange={(event) => updateCirculationRule(index, 'max_items', event.target.value)}
                                                    className="w-full bg-transparent border-0 border-b border-[#0e121b]/20 px-0 py-1 focus:ring-0 focus:border-[#1754cf]"
                                                />
                                            </td>
                                            <td className="p-4">
                                                <select
                                                    value={rule.fine_policy}
                                                    onChange={(event) => updateCirculationRule(index, 'fine_policy', event.target.value)}
                                                    className="w-full bg-transparent border-0 border-b border-[#0e121b]/20 px-0 py-1 focus:ring-0 focus:border-[#1754cf]"
                                                >
                                                    <option value="Exempt">Exempt</option>
                                                    <option value="Standard">Standard</option>
                                                    <option value="Double">Double</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <SectionActions
                            label={getStatusText(saveStatus, 'circulation')}
                            saving={savingSection === 'circulation'}
                            buttonText="Save Rules"
                            onSave={saveCirculationRules}
                        />
                    </Accordion>

                    <Accordion
                        title="Fiscal Policy"
                        isOpen={expandedSection === 'fiscal'}
                        onToggle={() => toggleSection('fiscal')}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
                            <label className="flex flex-col gap-2">
                                <span className="text-base font-medium">Standard Daily Fine ($)</span>
                                <input
                                    className="form-input w-full bg-white border-0 border-b border-[#0e121b]/30 focus:border-[#1754cf] focus:ring-0 px-0 py-3 text-lg placeholder-gray-400 transition-colors"
                                    step="0.01"
                                    type="number"
                                    value={fiscalSettings.daily_fine_rate}
                                    onChange={(event) => setFiscalSettings((current) => ({ ...current, daily_fine_rate: event.target.value }))}
                                />
                                <span className="text-xs text-[#4e6797]">Applied per item, per day overdue.</span>
                            </label>
                            <label className="flex flex-col gap-2">
                                <span className="text-base font-medium">Lost Item Processing Fee ($)</span>
                                <input
                                    className="form-input w-full bg-white border-0 border-b border-[#0e121b]/30 focus:border-[#1754cf] focus:ring-0 px-0 py-3 text-lg placeholder-gray-400 transition-colors"
                                    step="0.01"
                                    type="number"
                                    value={fiscalSettings.lost_item_processing_fee}
                                    onChange={(event) => setFiscalSettings((current) => ({ ...current, lost_item_processing_fee: event.target.value }))}
                                />
                                <span className="text-xs text-[#4e6797]">Fixed fee added to replacement cost.</span>
                            </label>
                            <label className="flex flex-col gap-2">
                                <span className="text-base font-medium">Maximum Fine Cap ($)</span>
                                <input
                                    className="form-input w-full bg-white border-0 border-b border-[#0e121b]/30 focus:border-[#1754cf] focus:ring-0 px-0 py-3 text-lg placeholder-gray-400 transition-colors"
                                    step="1.00"
                                    type="number"
                                    value={fiscalSettings.max_fine_cap}
                                    onChange={(event) => setFiscalSettings((current) => ({ ...current, max_fine_cap: event.target.value }))}
                                />
                                <span className="text-xs text-[#4e6797]">Maximum fine accrual per item.</span>
                            </label>
                            <div className="flex flex-col gap-4 pt-2">
                                <span className="text-base font-medium">Payment Gateways</span>
                                <div className="flex flex-col gap-3">
                                    {PAYMENT_GATEWAY_OPTIONS.map((option) => (
                                        <label key={option.key} className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                className="editorial-checkbox text-[#1754cf] focus:ring-0 focus:ring-offset-0"
                                                type="checkbox"
                                                checked={Boolean(fiscalSettings.payment_gateways[option.key])}
                                                onChange={(event) => updatePaymentGateway(option.key, event.target.checked)}
                                            />
                                            <span>{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <SectionActions
                            label={getStatusText(saveStatus, 'fiscal')}
                            saving={savingSection === 'fiscal'}
                            buttonText="Save Policy"
                            onSave={saveFiscalSettings}
                        />
                    </Accordion>

                    <Accordion
                        title="Notification Templates"
                        isOpen={expandedSection === 'notifications'}
                        onToggle={() => toggleSection('notifications')}
                    >
                        <div className="flex flex-col gap-6 max-w-4xl">
                            <div className="flex gap-4 items-end">
                                <div className="w-1/3">
                                    <label className="block text-sm font-medium text-[#4e6797] mb-1">Template Type</label>
                                    <select
                                        className="block w-full rounded-sm border-[#0e121b]/20 bg-white py-2 pl-3 pr-10 text-base focus:border-[#1754cf] focus:outline-none focus:ring-0 sm:text-sm"
                                        value={notificationSettings.template_type}
                                        onChange={(event) => setNotificationSettings((current) => ({ ...current, template_type: event.target.value }))}
                                    >
                                        {TEMPLATE_TYPES.map((templateType) => (
                                            <option key={templateType}>{templateType}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-[#4e6797] mb-1">Email Subject Line</label>
                                    <input
                                        className="block w-full rounded-sm border-[#0e121b]/20 bg-white py-2 px-3 text-base focus:border-[#1754cf] focus:outline-none focus:ring-0 sm:text-sm"
                                        type="text"
                                        value={notificationSettings.subject}
                                        onChange={(event) => setNotificationSettings((current) => ({ ...current, subject: event.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="relative">
                                <label className="block text-sm font-medium text-[#4e6797] mb-2">Body Content (Monospace)</label>
                                <textarea
                                    className="block w-full rounded-sm border-[#0e121b]/20 bg-[#fffff0] p-4 font-['Courier'] text-sm leading-relaxed shadow-inner focus:border-[#1754cf] focus:ring-0 resize-none"
                                    rows="12"
                                    value={notificationSettings.body}
                                    onChange={(event) => setNotificationSettings((current) => ({ ...current, body: event.target.value }))}
                                />
                                <div className="absolute bottom-3 right-3 text-xs text-gray-400 font-['Courier']">
                                    Supported tags: {'{{patron_name}}, {{due_date}}, {{title}}'}
                                </div>
                            </div>
                            <div className="flex justify-between items-center gap-3">
                                <span className="text-sm" style={{ color: getStatusText(saveStatus, 'notifications')?.startsWith('Failed') ? ADMIN_COLORS.red : ADMIN_COLORS.textMuted }}>
                                    {getStatusText(saveStatus, 'notifications')}
                                </span>
                                <div className="flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => alert('Email preview is not wired yet. Save the template, then connect your mail provider to send tests.')}
                                        className="px-4 py-2 text-sm font-medium border border-[#0e121b]/20 rounded hover:bg-black/5 transition-colors"
                                    >
                                        Send Test Email
                                    </button>
                                    <button
                                        type="button"
                                        onClick={saveNotifications}
                                        disabled={savingSection === 'notifications'}
                                        className="px-4 py-2 text-sm font-medium text-[#1754cf] hover:text-[#1754cf]/80 hover:underline disabled:opacity-60"
                                    >
                                        {savingSection === 'notifications' ? 'Saving...' : 'Save Template'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Accordion>

                    <Accordion
                        title="Staff & Permissions"
                        isOpen={expandedSection === 'permissions'}
                        onToggle={() => toggleSection('permissions')}
                    >
                        <p className="text-[#4e6797] text-base mb-6">Manage role-based access control for the staff portal.</p>
                        <div className="overflow-hidden border border-[#0e121b]/20 rounded-sm">
                            <table className="min-w-full divide-y divide-[#0e121b]/10">
                                <thead className="bg-black/5">
                                    <tr>
                                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-6">Permission Node</th>
                                        {ROLE_LABELS.map((role) => (
                                            <th key={role} className="px-3 py-3.5 text-center text-sm font-semibold w-24">{role}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#0e121b]/10 bg-white/50 backdrop-blur-sm">
                                    {permissionsMatrix.map((row, rowIndex) => (
                                        <tr key={row.permission}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-6">{row.permission}</td>
                                            {row.checks.map((checked, columnIndex) => (
                                                <td key={`${row.permission}-${ROLE_LABELS[columnIndex]}`} className="px-3 py-4 text-center">
                                                    <input
                                                        className="editorial-checkbox text-[#1754cf] mx-auto cursor-pointer focus:ring-0 focus:ring-offset-0"
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={(event) => updatePermission(rowIndex, columnIndex, event.target.checked)}
                                                        disabled={columnIndex === 0 && row.permission === 'System Configuration'}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <SectionActions
                            label={getStatusText(saveStatus, 'permissions')}
                            saving={savingSection === 'permissions'}
                            buttonText="Save Permissions"
                            onSave={savePermissions}
                        />
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
                onClick={(event) => {
                    event.preventDefault();
                    onToggle();
                }}
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

function SectionActions({ label, saving, buttonText, onSave }) {
    return (
        <div className="flex items-center justify-between gap-3 mt-6">
            <span className="text-sm" style={{ color: label.startsWith('Failed') ? ADMIN_COLORS.red : ADMIN_COLORS.textMuted }}>
                {label}
            </span>
            <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="px-4 py-2 rounded text-sm font-medium hover:opacity-90 transition disabled:opacity-60"
                style={{ backgroundColor: ADMIN_COLORS.burgundy, color: 'white' }}
            >
                {saving ? 'Saving...' : buttonText}
            </button>
        </div>
    );
}
