import { useState } from 'react';

export default function Settings() {
    const [settings, setSettings] = useState({
        library_name: 'Ohara Library',
        library_email: 'contact@oharalibrary.com',
        library_phone: '+1 234 567 8900',
        library_address: '123 Library Street, City',
        loan_duration: 14,
        max_books: 5,
        fine_per_day: 0.50,
        allow_renewals: true,
        max_renewals: 2,
        reservation_expiry: 3
    });
    const [saved, setSaved] = useState(false);

    const handleSave = (e) => {
        e.preventDefault();
        // In real app, save to API
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const Section = ({ title, children }) => (
        <div className="bg-white border border-[#E8E4DF] mb-4">
            <div className="p-3 border-b border-[#E8E4DF] bg-[#FAF7F2]">
                <h2 className="text-sm font-bold text-[#1E1815]">{title}</h2>
            </div>
            <div className="p-4 space-y-4">{children}</div>
        </div>
    );

    const Input = ({ label, value, onChange, type = 'text', ...props }) => (
        <div>
            <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">{label}</label>
            <input type={type} value={value} onChange={onChange} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" {...props} />
        </div>
    );

    const Toggle = ({ label, description, checked, onChange }) => (
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm text-[#1E1815]">{label}</p>
                {description && <p className="text-xs text-[#6B6560]">{description}</p>}
            </div>
            <button type="button" onClick={() => onChange(!checked)} className={`w-10 h-5 rounded-full relative transition-colors ${checked ? 'bg-[#c16549]' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'left-5' : 'left-0.5'}`}></span>
            </button>
        </div>
    );

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                    <div className="h-[2px] w-8 bg-[#c16549]"></div>
                    <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#c16549]">Configuration</span>
                </div>
                <h1 className="text-3xl font-bold text-[#1E1815]">Settings</h1>
            </div>

            {saved && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm">
                    Settings saved successfully!
                </div>
            )}

            <form onSubmit={handleSave}>
                <Section title="Library Information">
                    <Input label="Library Name" value={settings.library_name} onChange={e => setSettings({...settings, library_name: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Email" type="email" value={settings.library_email} onChange={e => setSettings({...settings, library_email: e.target.value})} />
                        <Input label="Phone" value={settings.library_phone} onChange={e => setSettings({...settings, library_phone: e.target.value})} />
                    </div>
                    <Input label="Address" value={settings.library_address} onChange={e => setSettings({...settings, library_address: e.target.value})} />
                </Section>

                <Section title="Loan Policies">
                    <div className="grid grid-cols-3 gap-4">
                        <Input label="Loan Duration (days)" type="number" min="1" value={settings.loan_duration} onChange={e => setSettings({...settings, loan_duration: parseInt(e.target.value)})} />
                        <Input label="Max Books Per Member" type="number" min="1" value={settings.max_books} onChange={e => setSettings({...settings, max_books: parseInt(e.target.value)})} />
                        <Input label="Fine Per Day ($)" type="number" step="0.01" min="0" value={settings.fine_per_day} onChange={e => setSettings({...settings, fine_per_day: parseFloat(e.target.value)})} />
                    </div>
                    <Toggle label="Allow Renewals" description="Members can renew their loans" checked={settings.allow_renewals} onChange={v => setSettings({...settings, allow_renewals: v})} />
                    {settings.allow_renewals && (
                        <Input label="Max Renewals" type="number" min="1" value={settings.max_renewals} onChange={e => setSettings({...settings, max_renewals: parseInt(e.target.value)})} />
                    )}
                </Section>

                <Section title="Reservation Settings">
                    <Input label="Reservation Expiry (days)" type="number" min="1" value={settings.reservation_expiry} onChange={e => setSettings({...settings, reservation_expiry: parseInt(e.target.value)})} />
                </Section>

                <button type="submit" className="w-full py-3 bg-[#c16549] text-white text-sm font-medium hover:bg-[#a85443] transition-colors">
                    Save Settings
                </button>
            </form>
        </div>
    );
}
