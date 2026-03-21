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
        cover_image: '', published_year: '', publisher: '', total_copies: 1
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
        setFormData({ title: '', author: '', isbn: '', genre: '', description: '', cover_image: '', published_year: '', publisher: '', total_copies: 1 });
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
            cover_image: book.cover_image || '',
            published_year: book.published_year || '',
            publisher: book.publisher || '',
            total_copies: book.total_copies || 1
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
                                {book.cover_image ? (
                                    <img src={book.cover_image} alt={book.title} className="w-full h-full object-cover" />
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
                            </div>
                            <div className="p-3">
                                <h3 className="font-medium text-sm text-[#1E1815] truncate">{book.title}</h3>
                                <p className="text-xs text-[#6B6560] truncate">{book.author}</p>
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
                                <th className="text-left p-3 text-xs font-semibold text-[#6B6560] uppercase tracking-wide">Genre</th>
                                <th className="text-left p-3 text-xs font-semibold text-[#6B6560] uppercase tracking-wide">Copies</th>
                                <th className="text-right p-3 text-xs font-semibold text-[#6B6560] uppercase tracking-wide">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E8E4DF]">
                            {filtered.map((book) => (
                                <tr key={book.id} className="hover:bg-[#FAF7F2]">
                                    <td className="p-3 text-sm text-[#1E1815]">{book.title}</td>
                                    <td className="p-3 text-sm text-[#6B6560]">{book.author}</td>
                                    <td className="p-3 text-sm text-[#6B6560] font-mono">{book.isbn}</td>
                                    <td className="p-3 text-sm text-[#6B6560]">{book.genre}</td>
                                    <td className="p-3 text-sm text-[#6B6560]">{book.total_copies}</td>
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
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-4 border-b border-[#E8E4DF] flex items-center justify-between">
                            <h2 className="text-lg font-bold text-[#1E1815]">{editingBook ? 'Edit Book' : 'Add Book'}</h2>
                            <button onClick={closeModal} className="p-1 hover:bg-[#FAF7F2] rounded">
                                <span className="material-symbols-outlined text-[#6B6560]">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Title *</label>
                                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Author *</label>
                                <input required value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">ISBN</label>
                                    <input value={formData.isbn} onChange={e => setFormData({...formData, isbn: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Genre</label>
                                    <input value={formData.genre} onChange={e => setFormData({...formData, genre: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Year</label>
                                    <input type="number" value={formData.published_year} onChange={e => setFormData({...formData, published_year: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Copies</label>
                                    <input type="number" min="1" value={formData.total_copies} onChange={e => setFormData({...formData, total_copies: parseInt(e.target.value)})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Publisher</label>
                                <input value={formData.publisher} onChange={e => setFormData({...formData, publisher: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Cover Image URL</label>
                                <input value={formData.cover_image} onChange={e => setFormData({...formData, cover_image: e.target.value})} placeholder="https://..." className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Description</label>
                                <textarea rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none resize-none" />
                            </div>
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
