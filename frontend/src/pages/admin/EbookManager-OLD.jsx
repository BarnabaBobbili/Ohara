import { useEffect, useState } from 'react';
import { ADMIN_COLORS } from '../../styles/adminTheme';
import { booksAPI, ebooksAPI } from '../../services/api';

const EMPTY_UPLOAD_FORM = {
    title: '',
    author: '',
    book_id: '',
    is_public: false,
    file: null,
};

const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function EbookManager() {
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [ebooks, setEbooks] = useState([]);
    const [books, setBooks] = useState([]);
    const [uploadForm, setUploadForm] = useState(EMPTY_UPLOAD_FORM);
    const [editingEbook, setEditingEbook] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [ebooksData, booksData] = await Promise.all([
                ebooksAPI.getAll(),
                booksAPI.getAll({ limit: 200 }),
            ]);

            setEbooks(Array.isArray(ebooksData) ? ebooksData : []);
            setBooks(Array.isArray(booksData) ? booksData : []);
        } catch (error) {
            console.error('Failed to load ebook data:', error);
            setStatusMessage(`Failed to load ebooks: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (event) => {
        event.preventDefault();

        if (!uploadForm.file) {
            setStatusMessage('Choose an EPUB or PDF file first.');
            return;
        }

        try {
            setUploading(true);
            setStatusMessage('');
            const formData = new FormData();
            formData.append('title', uploadForm.title);
            formData.append('author', uploadForm.author);
            formData.append('book_id', uploadForm.book_id);
            formData.append('is_public', String(uploadForm.is_public));
            formData.append('file', uploadForm.file);

            await ebooksAPI.create(formData);
            setUploadForm(EMPTY_UPLOAD_FORM);
            await loadData();
            setStatusMessage('Ebook uploaded.');
        } catch (error) {
            console.error('Failed to upload ebook:', error);
            setStatusMessage(`Failed to upload ebook: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (ebookId) => {
        if (!confirm('Delete this ebook record?')) return;

        try {
            await ebooksAPI.remove(ebookId);
            if (editingEbook?.id === ebookId) {
                setEditingEbook(null);
            }
            await loadData();
            setStatusMessage('Ebook deleted.');
        } catch (error) {
            console.error('Failed to delete ebook:', error);
            setStatusMessage(`Failed to delete ebook: ${error.message}`);
        }
    };

    const publicCount = ebooks.filter((ebook) => ebook.is_public).length;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: ADMIN_COLORS.primaryBg }}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4" style={{ borderColor: ADMIN_COLORS.burgundy }}></div>
                    <p style={{ color: ADMIN_COLORS.textMuted }}>Loading ebook manager...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen" style={{ backgroundColor: ADMIN_COLORS.primaryBg }}>
            <header className="px-8 py-6 flex justify-between items-end gap-4" style={{ borderBottom: `1px solid ${ADMIN_COLORS.border}`, backgroundColor: ADMIN_COLORS.cardBg }}>
                <div>
                    <p className="text-xs font-medium uppercase tracking-wider" style={{ color: ADMIN_COLORS.textMuted }}>Digital Collection</p>
                    <h2 className="text-3xl font-semibold italic" style={{ fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textPrimary }}>Ebook Manager</h2>
                </div>
            </header>

            <div className="p-8">
                <div className="max-w-7xl mx-auto flex flex-col gap-8">
                    <section className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
                        <div className="rounded border shadow-sm p-6" style={{ backgroundColor: ADMIN_COLORS.cardBg, borderColor: ADMIN_COLORS.border }}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl italic" style={{ fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textPrimary }}>Upload Ebook</h3>
                            </div>

                            <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field
                                    label="Title"
                                    value={uploadForm.title}
                                    onChange={(value) => setUploadForm((current) => ({ ...current, title: value }))}
                                />
                                <Field
                                    label="Author"
                                    value={uploadForm.author}
                                    onChange={(value) => setUploadForm((current) => ({ ...current, author: value }))}
                                />
                                <label className="flex flex-col gap-2">
                                    <span className="text-sm font-medium" style={{ color: ADMIN_COLORS.textSecondary }}>Linked Book</span>
                                    <select
                                        value={uploadForm.book_id}
                                        onChange={(event) => setUploadForm((current) => ({ ...current, book_id: event.target.value }))}
                                        className="w-full px-3 py-2 rounded border"
                                        style={{ borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.primaryBg, color: ADMIN_COLORS.textPrimary }}
                                    >
                                        <option value="">Standalone ebook</option>
                                        {books.map((book) => (
                                            <option key={book.id} value={book.id}>{book.title} · {book.author}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-sm font-medium" style={{ color: ADMIN_COLORS.textSecondary }}>File</span>
                                    <input
                                        type="file"
                                        accept=".epub,.pdf"
                                        onChange={(event) => setUploadForm((current) => ({ ...current, file: event.target.files?.[0] || null }))}
                                        className="w-full px-3 py-[9px] rounded border"
                                        style={{ borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.primaryBg, color: ADMIN_COLORS.textPrimary }}
                                    />
                                </label>
                                <label className="md:col-span-2 flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={uploadForm.is_public}
                                        onChange={(event) => setUploadForm((current) => ({ ...current, is_public: event.target.checked }))}
                                    />
                                    <span style={{ color: ADMIN_COLORS.textPrimary }}>Publicly readable by members</span>
                                </label>
                                <div className="md:col-span-2 flex items-center gap-3">
                                    <button type="submit" disabled={uploading} className="px-4 py-2 rounded hover:opacity-90 transition disabled:opacity-60" style={{ backgroundColor: ADMIN_COLORS.burgundy, color: 'white' }}>
                                        {uploading ? 'Uploading...' : 'Upload Ebook'}
                                    </button>
                                    {statusMessage && (
                                        <span className="text-sm" style={{ color: statusMessage.startsWith('Failed') ? ADMIN_COLORS.red : ADMIN_COLORS.textMuted }}>
                                            {statusMessage}
                                        </span>
                                    )}
                                </div>
                            </form>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-4">
                            <StatCard label="Total Files" value={ebooks.length} icon="menu_book" />
                            <StatCard label="Public Titles" value={publicCount} icon="visibility" />
                            <StatCard label="Formats" value={new Set(ebooks.map((ebook) => ebook.file_format).filter(Boolean)).size} icon="folder_zip" />
                        </div>
                    </section>

                    <section className="rounded border shadow-sm overflow-hidden" style={{ backgroundColor: ADMIN_COLORS.cardBg, borderColor: ADMIN_COLORS.border }}>
                        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${ADMIN_COLORS.border}` }}>
                            <h3 className="text-xl italic" style={{ fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textPrimary }}>Uploaded Ebooks</h3>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[900px]">
                                <thead style={{ backgroundColor: `${ADMIN_COLORS.secondaryBg}70` }}>
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: ADMIN_COLORS.textMuted }}>Title</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: ADMIN_COLORS.textMuted }}>Linked Book</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: ADMIN_COLORS.textMuted }}>Format</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: ADMIN_COLORS.textMuted }}>Size</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider" style={{ color: ADMIN_COLORS.textMuted }}>Visibility</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: ADMIN_COLORS.textMuted }}>Uploaded</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider" style={{ color: ADMIN_COLORS.textMuted }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ebooks.length ? ebooks.map((ebook) => (
                                        <tr key={ebook.id} style={{ borderTop: `1px solid ${ADMIN_COLORS.border}` }}>
                                            <td className="px-6 py-4">
                                                <div className="font-medium" style={{ color: ADMIN_COLORS.textPrimary }}>{ebook.title}</div>
                                                <div className="text-sm" style={{ color: ADMIN_COLORS.textSecondary }}>{ebook.author || 'Unknown author'}</div>
                                            </td>
                                            <td className="px-6 py-4" style={{ color: ADMIN_COLORS.textSecondary }}>
                                                {ebook.book?.title || 'Standalone'}
                                            </td>
                                            <td className="px-6 py-4 uppercase" style={{ color: ADMIN_COLORS.textPrimary }}>{ebook.file_format}</td>
                                            <td className="px-6 py-4" style={{ color: ADMIN_COLORS.textSecondary }}>{formatFileSize(ebook.file_size)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: ebook.is_public ? `${ADMIN_COLORS.green}20` : `${ADMIN_COLORS.textMuted}20`, color: ebook.is_public ? ADMIN_COLORS.green : ADMIN_COLORS.textMuted }}>
                                                    {ebook.is_public ? 'Public' : 'Private'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4" style={{ color: ADMIN_COLORS.textSecondary }}>
                                                {new Date(ebook.uploaded_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button type="button" onClick={() => setEditingEbook(ebook)} className="mr-3 text-sm hover:underline" style={{ color: ADMIN_COLORS.burgundy }}>
                                                    Edit
                                                </button>
                                                <button type="button" onClick={() => handleDelete(ebook.id)} className="text-sm hover:underline" style={{ color: ADMIN_COLORS.red }}>
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-10 text-center" style={{ color: ADMIN_COLORS.textMuted }}>
                                                No ebooks uploaded yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </div>

            {editingEbook && (
                <EditEbookModal
                    books={books}
                    ebook={editingEbook}
                    onClose={() => setEditingEbook(null)}
                    onSave={async (payload) => {
                        try {
                            await ebooksAPI.update(editingEbook.id, payload);
                            setEditingEbook(null);
                            await loadData();
                            setStatusMessage('Ebook updated.');
                        } catch (error) {
                            console.error('Failed to update ebook:', error);
                            setStatusMessage(`Failed to update ebook: ${error.message}`);
                        }
                    }}
                />
            )}
        </div>
    );
}

function Field({ label, value, onChange }) {
    return (
        <label className="flex flex-col gap-2">
            <span className="text-sm font-medium" style={{ color: ADMIN_COLORS.textSecondary }}>{label}</span>
            <input
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-full px-3 py-2 rounded border"
                style={{ borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.primaryBg, color: ADMIN_COLORS.textPrimary }}
            />
        </label>
    );
}

function StatCard({ label, value, icon }) {
    return (
        <div className="rounded border shadow-sm p-5" style={{ backgroundColor: ADMIN_COLORS.cardBg, borderColor: ADMIN_COLORS.border }}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider" style={{ color: ADMIN_COLORS.textMuted }}>{label}</span>
                <span className="material-symbols-outlined" style={{ color: ADMIN_COLORS.burgundy }}>{icon}</span>
            </div>
            <div className="text-3xl font-semibold" style={{ fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textPrimary }}>{value}</div>
        </div>
    );
}

function EditEbookModal({ books, ebook, onClose, onSave }) {
    const [form, setForm] = useState({
        title: ebook.title || '',
        author: ebook.author || '',
        book_id: ebook.book_id || '',
        is_public: Boolean(ebook.is_public),
    });

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded border shadow-xl p-6" style={{ backgroundColor: ADMIN_COLORS.cardBg, borderColor: ADMIN_COLORS.border }}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl italic" style={{ fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textPrimary }}>Edit Ebook</h3>
                    <button type="button" onClick={onClose} className="text-sm hover:underline" style={{ color: ADMIN_COLORS.textMuted }}>
                        Close
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Title" value={form.title} onChange={(value) => setForm((current) => ({ ...current, title: value }))} />
                    <Field label="Author" value={form.author} onChange={(value) => setForm((current) => ({ ...current, author: value }))} />
                    <label className="flex flex-col gap-2 md:col-span-2">
                        <span className="text-sm font-medium" style={{ color: ADMIN_COLORS.textSecondary }}>Linked Book</span>
                        <select
                            value={form.book_id}
                            onChange={(event) => setForm((current) => ({ ...current, book_id: event.target.value }))}
                            className="w-full px-3 py-2 rounded border"
                            style={{ borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.primaryBg, color: ADMIN_COLORS.textPrimary }}
                        >
                            <option value="">Standalone ebook</option>
                            {books.map((book) => (
                                <option key={book.id} value={book.id}>{book.title} · {book.author}</option>
                            ))}
                        </select>
                    </label>
                    <label className="md:col-span-2 flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={form.is_public}
                            onChange={(event) => setForm((current) => ({ ...current, is_public: event.target.checked }))}
                        />
                        <span style={{ color: ADMIN_COLORS.textPrimary }}>Visible to members</span>
                    </label>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded border hover:bg-black/5 transition" style={{ borderColor: ADMIN_COLORS.border, color: ADMIN_COLORS.textPrimary }}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => onSave({
                            title: form.title,
                            author: form.author,
                            book_id: form.book_id || null,
                            is_public: form.is_public,
                        })}
                        className="px-4 py-2 rounded hover:opacity-90 transition"
                        style={{ backgroundColor: ADMIN_COLORS.burgundy, color: 'white' }}
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
