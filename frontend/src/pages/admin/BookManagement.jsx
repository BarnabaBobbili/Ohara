import { useState, useEffect } from 'react';
import { booksAPI, collectionsAPI } from '../../services/api';

export default function BookManagement() {
    const [books, setBooks] = useState([]);
    const [view, setView] = useState('grid');
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingBook, setEditingBook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        title: '', author: '', isbn: '', genre: '', description: '',
        cover_image_url: '', publication_year: '', publisher: '', total_copies: 1,
        category: '', language: 'English', pages: '', location: '', edition: '',
        format: 'Hardcover', is_reference_only: false
    });

    useEffect(() => { loadBooks(); }, []);

    const loadBooks = async () => {
        try {
            const data = await booksAPI.getAll();
            setBooks(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load books:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingBook) {
                await booksAPI.update(editingBook.id, formData);
            } else {
                await booksAPI.create(formData);
            }
            loadBooks();
            closeModal();
        } catch (error) {
            alert('Failed to save book: ' + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this book?')) return;
        try {
            await booksAPI.delete(id);
            loadBooks();
        } catch (error) {
            alert('Failed to delete: ' + error.message);
        }
    };

    const openAddModal = () => {
        setEditingBook(null);
        setFormData({ 
            title: '', author: '', isbn: '', genre: '', description: '', 
            cover_image_url: '', publication_year: '', publisher: '', total_copies: 1,
            category: '', language: 'English', pages: '', location: '', edition: '',
            format: 'Hardcover', is_reference_only: false
        });
        setShowModal(true);
    };

    const openEditModal = (book) => {
        setEditingBook(book);
        setFormData({
            title: book.title || '',
            author: book.author || '',
            isbn: book.isbn || '',
            genre: book.genre || '',
            description: book.description || '',
            cover_image_url: book.cover_image_url || '',
            publication_year: book.publication_year || '',
            publisher: book.publisher || '',
            total_copies: book.total_copies || 1,
            category: book.category || '',
            language: book.language || 'English',
            pages: book.pages || '',
            location: book.location || '',
            edition: book.edition || '',
            format: book.format || 'Hardcover',
            is_reference_only: book.is_reference_only || false
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingBook(null);
    };

    const filtered = books.filter(b => 
        b.title?.toLowerCase().includes(search.toLowerCase()) ||
        b.author?.toLowerCase().includes(search.toLowerCase())
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
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="h-[2px] w-8 bg-[#c16549]"></div>
                        <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#c16549]">Catalog</span>
                    </div>
                    <h1 className="text-3xl font-bold text-[#1E1815]">Book Management</h1>
                </div>
                <button onClick={openAddModal} className="flex items-center gap-2 bg-[#c16549] text-white px-4 py-2 text-sm font-medium hover:bg-[#a85443] transition-colors">
                    <span className="material-symbols-outlined text-lg">add</span>
                    Add Book
                </button>
            </div>

            {/* Search & View Toggle */}
            <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6560] text-lg">search</span>
                    <input
                        type="text"
                        placeholder="Search books..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-[#E8E4DF] bg-white text-sm focus:border-[#c16549] focus:outline-none"
                    />
                </div>
                <div className="flex border border-[#E8E4DF] bg-white">
                    <button onClick={() => setView('grid')} className={`p-2 ${view === 'grid' ? 'bg-[#c16549] text-white' : 'text-[#6B6560] hover:bg-[#FAF7F2]'}`}>
                        <span className="material-symbols-outlined text-lg">grid_view</span>
                    </button>
                    <button onClick={() => setView('table')} className={`p-2 ${view === 'table' ? 'bg-[#c16549] text-white' : 'text-[#6B6560] hover:bg-[#FAF7F2]'}`}>
                        <span className="material-symbols-outlined text-lg">view_list</span>
                    </button>
                </div>
            </div>

            {/* Book Count */}
            <p className="text-sm text-[#6B6560] mb-4">{filtered.length} books</p>

            {/* Grid View */}
            {view === 'grid' && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filtered.map((book) => (
                        <div key={book.id} className="group bg-white border border-[#E8E4DF] overflow-hidden hover:border-[#c16549] transition-colors">
                            <div className="aspect-[2/3] bg-gradient-to-br from-[#c16549] to-[#8d4d3f] relative">
                                {book.cover_image_url ? (
                                    <img src={book.cover_image_url} alt={book.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center p-2">
                                        <span className="text-white text-xs text-center font-medium">{book.title}</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button onClick={() => openEditModal(book)} className="p-2 bg-white rounded-full hover:bg-[#FAF7F2]">
                                        <span className="material-symbols-outlined text-[#1E1815] text-sm">edit</span>
                                    </button>
                                    <button onClick={() => handleDelete(book.id)} className="p-2 bg-white rounded-full hover:bg-red-50">
                                        <span className="material-symbols-outlined text-red-500 text-sm">delete</span>
                                    </button>
                                </div>
                                {book.is_reference_only && (
                                    <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-yellow-500 text-white text-[9px] font-bold uppercase">Ref Only</span>
                                )}
                            </div>
                            <div className="p-3">
                                <h3 className="font-medium text-sm text-[#1E1815] truncate">{book.title}</h3>
                                <p className="text-xs text-[#6B6560] truncate">{book.author}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    {book.publication_year && <span className="text-[10px] text-[#6B6560]">{book.publication_year}</span>}
                                    <span className="text-[10px] text-[#6B6560]">{book.available_copies}/{book.total_copies} avail</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Table View */}
            {view === 'table' && (
                <div className="bg-white border border-[#E8E4DF] overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-[#FAF7F2]">
                            <tr>
                                <th className="text-left p-3 text-xs font-semibold text-[#6B6560] uppercase tracking-wide">Title</th>
                                <th className="text-left p-3 text-xs font-semibold text-[#6B6560] uppercase tracking-wide">Author</th>
                                <th className="text-left p-3 text-xs font-semibold text-[#6B6560] uppercase tracking-wide">ISBN</th>
                                <th className="text-left p-3 text-xs font-semibold text-[#6B6560] uppercase tracking-wide">Category</th>
                                <th className="text-left p-3 text-xs font-semibold text-[#6B6560] uppercase tracking-wide">Year</th>
                                <th className="text-left p-3 text-xs font-semibold text-[#6B6560] uppercase tracking-wide">Copies</th>
                                <th className="text-left p-3 text-xs font-semibold text-[#6B6560] uppercase tracking-wide">Status</th>
                                <th className="text-right p-3 text-xs font-semibold text-[#6B6560] uppercase tracking-wide">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8E4DF]">
                            {filtered.map((book) => (
                                <tr key={book.id} className="hover:bg-[#FAF7F2]">
                                    <td className="p-3 text-sm text-[#1E1815]">{book.title}</td>
                                    <td className="p-3 text-sm text-[#6B6560]">{book.author}</td>
                                    <td className="p-3 text-sm text-[#6B6560] font-mono">{book.isbn}</td>
                                    <td className="p-3 text-sm text-[#6B6560]">{book.category || book.genre || '-'}</td>
                                    <td className="p-3 text-sm text-[#6B6560]">{book.publication_year || '-'}</td>
                                    <td className="p-3 text-sm text-[#6B6560]">{book.available_copies}/{book.total_copies}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                                            book.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                        }`}>{book.is_active ? 'Active' : 'Inactive'}</span>
                                    </td>
                                    <td className="p-3 text-right">
                                        <button onClick={() => openEditModal(book)} className="text-[#c16549] hover:text-[#a85443] p-1">
                                            <span className="material-symbols-outlined text-lg">edit</span>
                                        </button>
                                        <button onClick={() => handleDelete(book.id)} className="text-red-500 hover:text-red-600 p-1 ml-1">
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-lg shadow-2xl">
                        <div className="p-4 border-b border-[#E8E4DF] flex items-center justify-between">
                            <h2 className="text-lg font-bold text-[#1E1815]">{editingBook ? 'Edit Book' : 'Add Book'}</h2>
                            <button onClick={closeModal} className="p-1 hover:bg-[#FAF7F2] rounded">
                                <span className="material-symbols-outlined text-[#6B6560]">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Title *</label>
                                    <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Author *</label>
                                    <input required value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">ISBN *</label>
                                    <input required value={formData.isbn} onChange={e => setFormData({...formData, isbn: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                                </div>
                            </div>

                            {/* Category & Genre */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Category</label>
                                    <input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="e.g., Fiction, Science" className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Genre</label>
                                    <input value={formData.genre} onChange={e => setFormData({...formData, genre: e.target.value})} placeholder="e.g., Mystery, Romance" className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                                </div>
                            </div>

                            {/* Publication Info */}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Publisher</label>
                                    <input value={formData.publisher} onChange={e => setFormData({...formData, publisher: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Publication Year</label>
                                    <input type="number" min="1000" max="2100" value={formData.publication_year} onChange={e => setFormData({...formData, publication_year: e.target.value ? parseInt(e.target.value) : ''})} placeholder="e.g., 2024" className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Edition</label>
                                    <input value={formData.edition} onChange={e => setFormData({...formData, edition: e.target.value})} placeholder="e.g., 1st, 2nd" className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                                </div>
                            </div>

                            {/* Physical Info */}
                            <div className="grid grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Pages</label>
                                    <input type="number" min="1" value={formData.pages} onChange={e => setFormData({...formData, pages: e.target.value ? parseInt(e.target.value) : ''})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Language</label>
                                    <select value={formData.language} onChange={e => setFormData({...formData, language: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none">
                                        <option value="English">English</option>
                                        <option value="Hindi">Hindi</option>
                                        <option value="Telugu">Telugu</option>
                                        <option value="Tamil">Tamil</option>
                                        <option value="Spanish">Spanish</option>
                                        <option value="French">French</option>
                                        <option value="German">German</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Format</label>
                                    <select value={formData.format} onChange={e => setFormData({...formData, format: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none">
                                        <option value="Hardcover">Hardcover</option>
                                        <option value="Paperback">Paperback</option>
                                        <option value="eBook">eBook</option>
                                        <option value="Audiobook">Audiobook</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Location</label>
                                    <input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="e.g., Shelf A-12" className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                                </div>
                            </div>

                            {/* Copies & Reference */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Total Copies</label>
                                    <input type="number" min="1" value={formData.total_copies} onChange={e => setFormData({...formData, total_copies: parseInt(e.target.value) || 1})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                                </div>
                                <div className="flex items-end pb-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={formData.is_reference_only} onChange={e => setFormData({...formData, is_reference_only: e.target.checked})} className="w-4 h-4 accent-[#c16549]" />
                                        <span className="text-sm text-[#6B6560]">Reference Only (cannot be borrowed)</span>
                                    </label>
                                </div>
                            </div>

                            {/* Cover Image */}
                            <div>
                                <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Cover Image URL</label>
                                <input value={formData.cover_image_url} onChange={e => setFormData({...formData, cover_image_url: e.target.value})} placeholder="https://..." className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Description</label>
                                <textarea rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none resize-none" />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 border border-[#E8E4DF] text-sm font-medium hover:bg-[#FAF7F2] transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-[#c16549] text-white text-sm font-medium hover:bg-[#a85443] transition-colors">{editingBook ? 'Update' : 'Add'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
