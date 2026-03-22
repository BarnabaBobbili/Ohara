import { useState, useEffect, useRef } from 'react';
import { ebooksAPI, booksAPI } from '../../services/api';

export default function EbookManager() {
    const [ebooks, setEbooks] = useState([]);
    const [books, setBooks] = useState([]);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingEbook, setEditingEbook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const [formData, setFormData] = useState({
        title: '', author: '', book_id: '', is_public: true, file: null
    });

    useEffect(() => { loadEbooks(); loadBooks(); }, []);

    const loadEbooks = async () => {
        try {
            const data = await ebooksAPI.getAll();
            setEbooks(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load ebooks:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadBooks = async () => {
        try {
            const data = await booksAPI.getAll();
            setBooks(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load books:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setUploading(true);
            if (editingEbook) {
                await ebooksAPI.update(editingEbook.id, {
                    title: formData.title,
                    author: formData.author,
                    book_id: formData.book_id || null,
                    is_public: formData.is_public
                });
            } else {
                if (!formData.file) {
                    alert('Please select a file to upload');
                    return;
                }
                const data = new FormData();
                data.append('file', formData.file);
                data.append('title', formData.title);
                data.append('author', formData.author);
                if (formData.book_id) data.append('book_id', formData.book_id);
                data.append('is_public', formData.is_public);
                await ebooksAPI.create(data);
            }
            loadEbooks();
            closeModal();
        } catch (error) {
            alert('Failed to save ebook: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this ebook?')) return;
        try {
            await ebooksAPI.remove(id);
            loadEbooks();
        } catch (error) {
            alert('Failed to delete: ' + error.message);
        }
    };

    const openAddModal = () => {
        setEditingEbook(null);
        setFormData({
            title: '', author: '', book_id: '', is_public: true, file: null
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
        setShowModal(true);
    };

    const openEditModal = (ebook) => {
        setEditingEbook(ebook);
        setFormData({
            title: ebook.title || '',
            author: ebook.author || '',
            book_id: ebook.book_id || '',
            is_public: ebook.is_public !== false,
            file: null
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingEbook(null);
    };

    const filtered = ebooks.filter(e =>
        e.title?.toLowerCase().includes(search.toLowerCase()) ||
        e.author?.toLowerCase().includes(search.toLowerCase())
    );

    const formatFileSize = (bytes) => {
        if (!bytes) return '-';
        const mb = Number(bytes) / (1024 * 1024);
        return mb.toFixed(1) + ' MB';
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData(prev => ({
                ...prev,
                file,
                title: prev.title || file.name.replace(/\.[^/.]+$/, '')
            }));
        }
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
                        <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#c16549]">Digital Library</span>
                    </div>
                    <h1 className="text-3xl font-bold text-[#1E1815]">E-Book Manager</h1>
                </div>
                <button onClick={openAddModal} className="flex items-center gap-2 bg-[#c16549] text-white px-4 py-2 text-sm font-medium hover:bg-[#a85443] transition-colors">
                    <span className="material-symbols-outlined text-lg">upload_file</span>
                    Add E-Book
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white border border-[#E8E4DF] p-4">
                    <p className="text-xs text-[#6B6560] uppercase tracking-wide mb-1">Total E-Books</p>
                    <p className="text-2xl font-bold text-[#1E1815]">{ebooks.length}</p>
                </div>
                <div className="bg-white border border-[#E8E4DF] p-4">
                    <p className="text-xs text-[#6B6560] uppercase tracking-wide mb-1">Public</p>
                    <p className="text-2xl font-bold text-green-600">{ebooks.filter(e => e.is_public !== false).length}</p>
                </div>
                <div className="bg-white border border-[#E8E4DF] p-4">
                    <p className="text-xs text-[#6B6560] uppercase tracking-wide mb-1">Private</p>
                    <p className="text-2xl font-bold text-[#c16549]">{ebooks.filter(e => e.is_public === false).length}</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6560] text-lg">search</span>
                <input
                    type="text"
                    placeholder="Search e-books..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-[#E8E4DF] bg-white text-sm focus:border-[#c16549] focus:outline-none"
                />
            </div>

            {/* E-Books Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((ebook) => (
                    <div key={ebook.id} className="bg-white border border-[#E8E4DF] overflow-hidden hover:border-[#c16549] transition-colors group">
                        <div className="flex gap-3 p-4">
                            {/* Cover */}
                            <div className="w-16 h-24 bg-gradient-to-br from-[#c16549] to-[#8d4d3f] flex-shrink-0 relative">
                                {ebook.cover_path ? (
                                    <img src={ebook.cover_path} alt={ebook.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-white/50 text-2xl">menu_book</span>
                                    </div>
                                )}
                                <div className="absolute top-1 right-1 bg-white/90 px-1 py-0.5 text-[8px] font-bold uppercase">
                                    {ebook.file_format || 'PDF'}
                                </div>
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-sm text-[#1E1815] truncate">{ebook.title}</h3>
                                <p className="text-xs text-[#6B6560] truncate">{ebook.author}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className={`px-1.5 py-0.5 text-[9px] font-medium uppercase ${ebook.is_public !== false ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {ebook.is_public !== false ? 'Public' : 'Private'}
                                    </span>
                                    <span className="text-[10px] text-[#6B6560]">{formatFileSize(ebook.file_size_bytes)}</span>
                                </div>
                                <div className="flex items-center gap-1 mt-2">
                                    <button onClick={() => openEditModal(ebook)} className="p-1 text-[#6B6560] hover:text-[#c16549]">
                                        <span className="material-symbols-outlined text-base">edit</span>
                                    </button>
                                    <button onClick={() => handleDelete(ebook.id)} className="p-1 text-[#6B6560] hover:text-red-500">
                                        <span className="material-symbols-outlined text-base">delete</span>
                                    </button>
                                    {ebook.file_path && (
                                        <a href={`/api/ebooks/${ebook.id}/download`} className="p-1 text-[#6B6560] hover:text-blue-500">
                                            <span className="material-symbols-outlined text-base">download</span>
                                        </a>
                                    )}
                                    {ebook.download_count > 0 && (
                                        <span className="text-[10px] text-[#6B6560] ml-1">{ebook.download_count} downloads</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className="col-span-full text-center py-12">
                        <span className="material-symbols-outlined text-4xl text-[#E8E4DF] mb-2">library_books</span>
                        <p className="text-sm text-[#6B6560]">No e-books found. Add your first e-book!</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-lg shadow-2xl">
                        <div className="p-4 border-b border-[#E8E4DF] flex items-center justify-between">
                            <h2 className="text-lg font-bold text-[#1E1815]">{editingEbook ? 'Edit E-Book' : 'Add E-Book'}</h2>
                            <button onClick={closeModal} className="p-1 hover:bg-[#FAF7F2] rounded">
                                <span className="material-symbols-outlined text-[#6B6560]">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            {!editingEbook && (
                                <div>
                                    <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">File (PDF/EPUB) *</label>
                                    <input 
                                        ref={fileInputRef}
                                        type="file" 
                                        accept=".pdf,.epub" 
                                        onChange={handleFileChange}
                                        className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" 
                                    />
                                    {formData.file && (
                                        <p className="text-xs text-green-600 mt-1">Selected: {formData.file.name}</p>
                                    )}
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Title *</label>
                                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Author</label>
                                <input value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Link to Book (optional)</label>
                                <select value={formData.book_id} onChange={e => setFormData({...formData, book_id: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none">
                                    <option value="">-- No linked book --</option>
                                    {books.map(book => (
                                        <option key={book.id} value={book.id}>{book.title} - {book.author}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-3">
                                <input type="checkbox" id="is_public" checked={formData.is_public} onChange={e => setFormData({...formData, is_public: e.target.checked})} className="w-4 h-4 text-[#c16549]" />
                                <label htmlFor="is_public" className="text-sm text-[#1E1815]">Make publicly accessible</label>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 border border-[#E8E4DF] text-sm font-medium hover:bg-[#FAF7F2] transition-colors">Cancel</button>
                                <button type="submit" disabled={uploading} className="flex-1 px-4 py-2 bg-[#c16549] text-white text-sm font-medium hover:bg-[#a85443] transition-colors disabled:opacity-50">
                                    {uploading ? 'Uploading...' : (editingEbook ? 'Update' : 'Upload')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
