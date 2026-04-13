import { useState, useEffect, useRef } from 'react';
import { ebooksAPI, booksAPI } from '../../services/api';

export default function EbookManager() {
    const [ebooks, setEbooks] = useState([]);
    const [books, setBooks] = useState([]);
    const [bookSearch, setBookSearch] = useState('');       // search inside book-link picker
    const [bookPickerOpen, setBookPickerOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingEbook, setEditingEbook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const bookPickerRef = useRef(null);
    const [formData, setFormData] = useState({
        title: '', author: '', book_id: '', is_public: true, file: null
    });

    useEffect(() => { loadEbooks(); loadBooks(); }, []);

    const getLinkedBookById = (bookId) =>
        books.find((book) => Number(book.id) === Number(bookId));

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
            // fetch all books (up to 2000) so the link picker is complete
            const data = await booksAPI.getAll({ limit: 2000, skip: 0 });
            setBooks(Array.isArray(data) ? data : (Array.isArray(data?.books) ? data.books : []));
        } catch (error) {
            console.error('Failed to load books:', error);
        }
    };

    // Close book picker when clicking outside
    useEffect(() => {
        const handler = (e) => {
            if (bookPickerRef.current && !bookPickerRef.current.contains(e.target)) {
                setBookPickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

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
        const linkedBook = getLinkedBookById(ebook.book_id);
        setEditingEbook(ebook);
        setFormData({
            title: ebook.title || linkedBook?.title || '',
            author: ebook.author || linkedBook?.author || '',
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

    const handleBookLinkChange = (book) => {
        setFormData((prev) => ({
            ...prev,
            book_id: book ? String(book.id) : '',
            title: book?.title || prev.title,
            author: book?.author || prev.author,
        }));
        setBookSearch('');
        setBookPickerOpen(false);
    };

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

    const selectedLinkedBook = getLinkedBookById(formData.book_id);

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
                {filtered.map((ebook) => {
                    const linkedBook = ebook.books || null;
                    const displayTitle = ebook.title || linkedBook?.title || 'Untitled';
                    const displayAuthor = ebook.author || linkedBook?.author || 'Unknown Author';
                    const displayCover = ebook.cover_path || linkedBook?.cover_image_url || null;

                    return (
                        <div key={ebook.id} className="bg-white border border-[#E8E4DF] overflow-hidden hover:border-[#c16549] transition-colors group">
                            <div className="flex gap-3 p-4">
                                {/* Cover */}
                                <div className="w-16 h-24 bg-gradient-to-br from-[#c16549] to-[#8d4d3f] flex-shrink-0 relative">
                                    {displayCover ? (
                                        <img src={displayCover} alt={displayTitle} className="w-full h-full object-cover" />
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
                                    <h3 className="font-medium text-sm text-[#1E1815] truncate">{displayTitle}</h3>
                                    <p className="text-xs text-[#6B6560] truncate">{displayAuthor}</p>
                                    {linkedBook?.id && (
                                        <p className="text-[10px] text-[#6B6560] mt-1 truncate">Linked: {linkedBook.title}</p>
                                    )}
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
                    );
                })}
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
                            <div ref={bookPickerRef} className="relative">
                                <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Link to Book (optional)</label>

                                {/* Search input */}
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B6560] text-[16px]">search</span>
                                    <input
                                        type="text"
                                        placeholder={selectedLinkedBook ? selectedLinkedBook.title : 'Search books…'}
                                        value={bookSearch}
                                        onChange={e => { setBookSearch(e.target.value); setBookPickerOpen(true); }}
                                        onFocus={() => setBookPickerOpen(true)}
                                        className="w-full pl-8 pr-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none"
                                    />
                                    {selectedLinkedBook && (
                                        <button type="button"
                                            onClick={() => handleBookLinkChange(null)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:text-red-500 text-[#6B6560] transition-colors">
                                            <span className="material-symbols-outlined text-[16px]">close</span>
                                        </button>
                                    )}
                                </div>

                                {/* Dropdown results */}
                                {bookPickerOpen && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-[#E8E4DF] shadow-xl max-h-56 overflow-y-auto">
                                        <div className="sticky top-0 px-3 py-1.5 bg-[#FAF7F2] border-b border-[#E8E4DF]">
                                            <span className="text-[10px] text-[#6B6560] uppercase tracking-wide">
                                                {books.filter(b =>
                                                    !bookSearch ||
                                                    b.title?.toLowerCase().includes(bookSearch.toLowerCase()) ||
                                                    b.author?.toLowerCase().includes(bookSearch.toLowerCase())
                                                ).length} books
                                            </span>
                                        </div>
                                        <button type="button"
                                            onClick={() => handleBookLinkChange(null)}
                                            className="w-full text-left px-3 py-2 text-xs text-[#6B6560] hover:bg-[#FAF7F2] border-b border-[#E8E4DF] italic">
                                            — No linked book —
                                        </button>
                                        {books
                                            .filter(b =>
                                                !bookSearch ||
                                                b.title?.toLowerCase().includes(bookSearch.toLowerCase()) ||
                                                b.author?.toLowerCase().includes(bookSearch.toLowerCase())
                                            )
                                            .slice(0, 80)
                                            .map(book => (
                                                <button type="button" key={book.id}
                                                    onClick={() => handleBookLinkChange(book)}
                                                    className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-[#FAF7F2] transition-colors border-b border-[#E8E4DF]/50 last:border-0
                                                        ${String(formData.book_id) === String(book.id) ? 'bg-[#FAF7F2]' : ''}`}>
                                                    {book.cover_image_url ? (
                                                        <img src={book.cover_image_url} alt="" className="w-7 h-10 object-cover flex-shrink-0 rounded-sm" />
                                                    ) : (
                                                        <div className="w-7 h-10 bg-[#E8E4DF] flex-shrink-0 rounded-sm flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-[12px] text-[#6B6560]">book</span>
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-medium text-[#1E1815] truncate">{book.title}</p>
                                                        <p className="text-[10px] text-[#6B6560] truncate italic">{book.author || 'Unknown'}</p>
                                                    </div>
                                                    {String(formData.book_id) === String(book.id) && (
                                                        <span className="ml-auto text-[#c16549] flex-shrink-0">
                                                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                                        </span>
                                                    )}
                                                </button>
                                            ))
                                        }
                                        {books.filter(b =>
                                            !bookSearch ||
                                            b.title?.toLowerCase().includes(bookSearch.toLowerCase()) ||
                                            b.author?.toLowerCase().includes(bookSearch.toLowerCase())
                                        ).length > 80 && (
                                            <p className="px-3 py-2 text-[10px] text-[#6B6560] italic">
                                                Showing 80 of {books.filter(b =>
                                                    !bookSearch ||
                                                    b.title?.toLowerCase().includes(bookSearch.toLowerCase()) ||
                                                    b.author?.toLowerCase().includes(bookSearch.toLowerCase())
                                                ).length} — type to narrow results
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Selected book preview */}
                                {selectedLinkedBook && (
                                    <div className="mt-2 p-2.5 border border-[#c16549]/30 bg-[#FAF7F2] flex items-center gap-3">
                                        <div className="w-10 h-14 bg-[#E8E4DF] flex-shrink-0 overflow-hidden">
                                            {selectedLinkedBook.cover_image_url ? (
                                                <img src={selectedLinkedBook.cover_image_url} alt={selectedLinkedBook.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-[#6B6560] text-base">menu_book</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-semibold text-[#1E1815] truncate">{selectedLinkedBook.title}</p>
                                            <p className="text-[11px] text-[#6B6560] truncate">{selectedLinkedBook.author || 'Unknown Author'}</p>
                                            <p className="text-[10px] text-[#c16549] mt-0.5">✓ Linked</p>
                                        </div>
                                    </div>
                                )}
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
