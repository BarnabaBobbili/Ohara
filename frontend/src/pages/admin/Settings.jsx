import { useEffect, useState } from 'react';
import { settingsAPI } from '../../services/api';

const DEFAULT_SETTINGS = {
    library_name: 'Ohara Library',
    library_email: 'contact@oharalibrary.com',
    library_phone: '+1 234 567 8900',
    library_address: '123 Library Street, City',
    loan_duration: 14,
    max_books: 5,
    fine_per_day: 0.5,
    max_fine_cap: 25,
    allow_renewals: true,
    max_renewals: 2,
    reservation_expiry: 3,
};

const toNumber = (value, fallback) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const getSettingValue = (settingsMap, keys, fallback) => {
    for (const key of keys) {
        if (settingsMap[key] !== undefined && settingsMap[key] !== null && settingsMap[key] !== '') {
            return settingsMap[key];
        }
    }
    return fallback;
};

const toBoolean = (value, fallback = false) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
        if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    }
    return fallback;
};

const normalizeSettings = (settingsMap) => ({
    library_name: String(getSettingValue(settingsMap, ['library_name'], DEFAULT_SETTINGS.library_name)),
    library_email: String(getSettingValue(settingsMap, ['contact_email', 'library_email'], DEFAULT_SETTINGS.library_email)),
    library_phone: String(getSettingValue(settingsMap, ['contact_phone', 'library_phone'], DEFAULT_SETTINGS.library_phone)),
    library_address: String(getSettingValue(settingsMap, ['address', 'library_address'], DEFAULT_SETTINGS.library_address)),
    loan_duration: Math.max(1, Math.round(toNumber(getSettingValue(settingsMap, ['default_loan_days', 'loan_duration'], DEFAULT_SETTINGS.loan_duration), DEFAULT_SETTINGS.loan_duration))),
    max_books: Math.max(1, Math.round(toNumber(getSettingValue(settingsMap, ['max_books_regular', 'max_books'], DEFAULT_SETTINGS.max_books), DEFAULT_SETTINGS.max_books))),
    fine_per_day: Math.max(0, toNumber(getSettingValue(settingsMap, ['daily_fine_rate', 'fine_per_day'], DEFAULT_SETTINGS.fine_per_day), DEFAULT_SETTINGS.fine_per_day)),
    max_fine_cap: Math.max(0, toNumber(getSettingValue(settingsMap, ['max_fine_cap'], DEFAULT_SETTINGS.max_fine_cap), DEFAULT_SETTINGS.max_fine_cap)),
    allow_renewals: toBoolean(getSettingValue(settingsMap, ['allow_renewals'], DEFAULT_SETTINGS.allow_renewals), DEFAULT_SETTINGS.allow_renewals),
    max_renewals: Math.max(1, Math.round(toNumber(getSettingValue(settingsMap, ['max_renewals'], DEFAULT_SETTINGS.max_renewals), DEFAULT_SETTINGS.max_renewals))),
    reservation_expiry: Math.max(1, Math.round(toNumber(getSettingValue(settingsMap, ['reservation_expiry_days', 'reservation_expiry'], DEFAULT_SETTINGS.reservation_expiry), DEFAULT_SETTINGS.reservation_expiry))),
});

export default function Settings() {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [settingRows, setSettingRows] = useState([]);
    const [newSetting, setNewSetting] = useState({ key: '', value: '', category: 'general', description: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    const loadSettings = async () => {
        setLoading(true);
        setError('');
        try {
            const [fullSettings, mapSettings] = await Promise.all([
                settingsAPI.getFull().catch(() => null),
                settingsAPI.getAll().catch(() => ({})),
            ]);

            const rows = Array.isArray(fullSettings) ? fullSettings : [];
            const settingsMap = rows.length > 0
                ? Object.fromEntries(rows.map((row) => [row.key, row.value]))
                : (mapSettings || {});

            setSettings(normalizeSettings(settingsMap));

            if (rows.length > 0) {
                setSettingRows(rows);
            } else {
                setSettingRows(
                    Object.entries(settingsMap).map(([key, value]) => ({
                        key,
                        value: String(value ?? ''),
                        category: 'general',
                        description: '',
                    }))
                );
            }
        } catch (loadError) {
            setError(loadError.message || 'Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    const showSavedBanner = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    const handleSaveCoreSettings = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');

        try {
            await settingsAPI.bulkUpdate([
                { key: 'library_name', value: settings.library_name, category: 'general', description: 'Name of the library' },
                { key: 'contact_email', value: settings.library_email, category: 'general', description: 'Contact email address' },
                { key: 'contact_phone', value: settings.library_phone, category: 'general', description: 'Contact phone number' },
                { key: 'address', value: settings.library_address, category: 'general', description: 'Library address' },
                { key: 'default_loan_days', value: String(settings.loan_duration), category: 'circulation', description: 'Default loan period in days' },
                { key: 'max_books_regular', value: String(settings.max_books), category: 'circulation', description: 'Max books for regular members' },
                { key: 'daily_fine_rate', value: String(settings.fine_per_day), category: 'fines', description: 'Fine per day for overdue books' },
                { key: 'max_fine_cap', value: String(settings.max_fine_cap), category: 'fines', description: 'Maximum fine cap per book' },
                { key: 'allow_renewals', value: String(settings.allow_renewals), category: 'circulation', description: 'Whether members can renew active loans' },
                { key: 'max_renewals', value: String(settings.max_renewals), category: 'circulation', description: 'Maximum number of renewals' },
                { key: 'reservation_expiry_days', value: String(settings.reservation_expiry), category: 'reservations', description: 'Reservation expiry in days' },
            ]);

            showSavedBanner();
            await loadSettings();
        } catch (saveError) {
            setError(saveError.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateRow = async (row) => {
        if (!row?.key) return;
        setSaving(true);
        setError('');

        try {
            await settingsAPI.update(row.key, row.value, row.category || 'general', row.description || null);
            showSavedBanner();
            await loadSettings();
        } catch (saveError) {
            setError(saveError.message || `Failed to update ${row.key}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRow = async (rowKey) => {
        if (!rowKey) return;
        setSaving(true);
        setError('');

        try {
            await settingsAPI.remove(rowKey);
            showSavedBanner();
            await loadSettings();
        } catch (deleteError) {
            setError(deleteError.message || `Failed to delete ${rowKey}`);
        } finally {
            setSaving(false);
        }
    };

    const handleCreateSetting = async () => {
        const key = newSetting.key.trim();
        if (!key) {
            setError('Setting key is required');
            return;
        }

        setSaving(true);
        setError('');

        try {
            await settingsAPI.update(
                key,
                String(newSetting.value ?? ''),
                (newSetting.category || 'general').trim(),
                newSetting.description || null
            );
            setNewSetting({ key: '', value: '', category: 'general', description: '' });
            showSavedBanner();
            await loadSettings();
        } catch (createError) {
            setError(createError.message || 'Failed to create setting');
        } finally {
            setSaving(false);
        }
    };

    const updateRowValue = (index, field, value) => {
        setSettingRows((previousRows) => previousRows.map((row, rowIndex) => (
            rowIndex === index ? { ...row, [field]: value } : row
        )));
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
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                    <div className="h-[2px] w-8 bg-[#c16549]"></div>
                    <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#c16549]">Configuration</span>
                </div>
                <h1 className="text-3xl font-bold text-[#1E1815]">Settings</h1>
            </div>

            {saved && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm">
                    Settings saved successfully.
                </div>
            )}

            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleSaveCoreSettings} className="space-y-6">
                <div className="bg-white border border-[#E8E4DF]">
                    <div className="p-3 border-b border-[#E8E4DF] bg-[#FAF7F2]">
                        <h2 className="text-sm font-bold text-[#1E1815]">Library Information</h2>
                    </div>
                    <div className="p-4 space-y-4">
                        <input className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" value={settings.library_name} onChange={(e) => setSettings({ ...settings, library_name: e.target.value })} placeholder="Library Name" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" value={settings.library_email} onChange={(e) => setSettings({ ...settings, library_email: e.target.value })} placeholder="Email" type="email" />
                            <input className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" value={settings.library_phone} onChange={(e) => setSettings({ ...settings, library_phone: e.target.value })} placeholder="Phone" />
                        </div>
                        <input className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" value={settings.library_address} onChange={(e) => setSettings({ ...settings, library_address: e.target.value })} placeholder="Address" />
                    </div>
                </div>

                <div className="bg-white border border-[#E8E4DF]">
                    <div className="p-3 border-b border-[#E8E4DF] bg-[#FAF7F2]">
                        <h2 className="text-sm font-bold text-[#1E1815]">Loan and Fine Policies</h2>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <input className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" type="number" min="1" value={settings.loan_duration} onChange={(e) => setSettings({ ...settings, loan_duration: Math.max(1, Number.parseInt(e.target.value || '1', 10)) })} placeholder="Loan Duration (days)" />
                        <input className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" type="number" min="1" value={settings.max_books} onChange={(e) => setSettings({ ...settings, max_books: Math.max(1, Number.parseInt(e.target.value || '1', 10)) })} placeholder="Max Books Per Member" />
                        <input className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" type="number" step="0.01" min="0" value={settings.fine_per_day} onChange={(e) => setSettings({ ...settings, fine_per_day: Math.max(0, Number.parseFloat(e.target.value || '0')) })} placeholder="Fine Per Day" />
                        <input className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" type="number" step="0.01" min="0" value={settings.max_fine_cap} onChange={(e) => setSettings({ ...settings, max_fine_cap: Math.max(0, Number.parseFloat(e.target.value || '0')) })} placeholder="Max Fine Cap" />
                        <input className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" type="number" min="1" value={settings.max_renewals} onChange={(e) => setSettings({ ...settings, max_renewals: Math.max(1, Number.parseInt(e.target.value || '1', 10)) })} placeholder="Max Renewals" disabled={!settings.allow_renewals} />
                        <input className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" type="number" min="1" value={settings.reservation_expiry} onChange={(e) => setSettings({ ...settings, reservation_expiry: Math.max(1, Number.parseInt(e.target.value || '1', 10)) })} placeholder="Reservation Expiry (days)" />
                        <label className="flex items-center gap-3 text-sm text-[#1E1815]">
                            <input type="checkbox" checked={settings.allow_renewals} onChange={(e) => setSettings({ ...settings, allow_renewals: e.target.checked })} className="accent-[#c16549]" />
                            Allow Renewals
                        </label>
                    </div>
                </div>

                <button type="submit" disabled={saving} className="w-full py-3 bg-[#c16549] text-white text-sm font-medium hover:bg-[#a85443] transition-colors disabled:bg-gray-300">
                    {saving ? 'Saving...' : 'Save Core Settings'}
                </button>
            </form>

            <div className="mt-8 bg-white border border-[#E8E4DF]">
                <div className="p-3 border-b border-[#E8E4DF] bg-[#FAF7F2]">
                    <h2 className="text-sm font-bold text-[#1E1815]">Advanced Settings (CRUD)</h2>
                </div>

                <div className="p-4 space-y-3">
                    {settingRows.map((row, index) => (
                        <div key={row.key || index} className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center border border-[#E8E4DF] p-3">
                            <input className="lg:col-span-2 px-3 py-2 border border-[#E8E4DF] text-xs font-mono bg-gray-50" value={row.key} disabled />
                            <input className="lg:col-span-3 px-3 py-2 border border-[#E8E4DF] text-sm" value={row.value ?? ''} onChange={(e) => updateRowValue(index, 'value', e.target.value)} />
                            <input className="lg:col-span-2 px-3 py-2 border border-[#E8E4DF] text-sm" value={row.category ?? 'general'} onChange={(e) => updateRowValue(index, 'category', e.target.value)} />
                            <input className="lg:col-span-3 px-3 py-2 border border-[#E8E4DF] text-sm" value={row.description ?? ''} onChange={(e) => updateRowValue(index, 'description', e.target.value)} placeholder="Description" />
                            <button type="button" onClick={() => handleUpdateRow(row)} disabled={saving} className="lg:col-span-1 px-3 py-2 bg-[#c16549] text-white text-xs font-medium hover:bg-[#a85443] disabled:bg-gray-300">Update</button>
                            <button type="button" onClick={() => handleDeleteRow(row.key)} disabled={saving} className="lg:col-span-1 px-3 py-2 bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:bg-gray-300">Delete</button>
                        </div>
                    ))}

                    <div className="border border-dashed border-[#E8E4DF] p-3 grid grid-cols-1 lg:grid-cols-12 gap-2 items-center">
                        <input className="lg:col-span-2 px-3 py-2 border border-[#E8E4DF] text-sm font-mono" value={newSetting.key} onChange={(e) => setNewSetting({ ...newSetting, key: e.target.value.trim() })} placeholder="key_name" />
                        <input className="lg:col-span-3 px-3 py-2 border border-[#E8E4DF] text-sm" value={newSetting.value} onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })} placeholder="value" />
                        <input className="lg:col-span-2 px-3 py-2 border border-[#E8E4DF] text-sm" value={newSetting.category} onChange={(e) => setNewSetting({ ...newSetting, category: e.target.value })} placeholder="category" />
                        <input className="lg:col-span-3 px-3 py-2 border border-[#E8E4DF] text-sm" value={newSetting.description} onChange={(e) => setNewSetting({ ...newSetting, description: e.target.value })} placeholder="description" />
                        <button type="button" onClick={handleCreateSetting} disabled={saving} className="lg:col-span-2 px-3 py-2 bg-[#1e293b] text-white text-xs font-medium hover:bg-[#0f172a] disabled:bg-gray-300">
                            Add Setting
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
