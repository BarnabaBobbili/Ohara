import { useState, useEffect } from 'react';
import { ADMIN_COLORS } from '../../styles/adminTheme';
import { booksAPI } from '../../services/api';

export default function BookManagement() {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingBook, setEditingBook] = useState(null);

    useEffect(() => {
        loadBooks();
    }, []);

    const loadBooks = async () => {
        try {
            setLoading(true);
            const data = await booksAPI.getAll({ search: searchTerm });
            setBooks(data);
        } catch (error) {
            console.error('Failed to load books:', error);
            alert('Failed to load books');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        loadBooks();
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this book?')) return;

        try {
            await booksAPI.delete(id);
            alert('Book deleted successfully');
            loadBooks();
        } catch (error) {
            alert('Failed to delete book: ' + error.message);
        }
    };

    const filteredBooks = selectedCategory === 'all'
        ? books
        : books.filter(book => book.category === selectedCategory);

    const categories = ['all', ...new Set(books.map(b => b.category).filter(Boolean))];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen" style={{ backgroundColor: ADMIN_COLORS.primaryBg }}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4" style={{ borderColor: ADMIN_COLORS.burgundy }}></div>
                    <p style={{ color: ADMIN_COLORS.textMuted }}>Loading books...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen" style={{ backgroundColor: ADMIN_COLORS.primaryBg }}>
            {/* Header */}
            <header className="px-8 py-6 flex justify-between items-end gap-4" style={{ borderBottom: `1px solid ${ADMIN_COLORS.border}`, backgroundColor: ADMIN_COLORS.cardBg }}>
                <div>
                    <p className="text-xs font-medium uppercase tracking-wider" style={{ color: ADMIN_COLORS.textMuted }}>Collection Management</p>
                    <h2 className="text-3xl font-semibold italic" style={{ fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textPrimary }}>Book Catalog</h2>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 rounded flex items-center gap-2 hover:opacity-90 transition"
                    style={{ backgroundColor: ADMIN_COLORS.burgundy, color: 'white' }}
                >
                    <span className="material-symbols-outlined">add</span>
                    Add New Book
                </button>
            </header>

            {/* Filters */}
            <div className="p-8">
                <div className="max-w-7xl mx-auto">
                    {/* Search and Category Filter */}
                    <div className="flex gap-4 mb-6">
                        <div className="flex-1">
                            <div className="relative flex items-center h-12 rounded border shadow-sm"
                                style={{ borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.cardBg }}>
                                <div className="absolute left-4" style={{ color: ADMIN_COLORS.burgundy }}>
                                    <span className="material-symbols-outlined">search</span>
                                </div>
                                <input
                                    className="w-full h-full bg-transparent border-none pl-12 pr-4 focus:ring-0"
                                    placeholder="Search by title, author, or ISBN..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    style={{ fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textPrimary }}
                                />
                                <button
                                    onClick={handleSearch}
                                    className="mr-2 px-4 py-1 rounded text-sm"
                                    style={{ backgroundColor: ADMIN_COLORS.burgundy, color: 'white' }}
                                >
                                    Search
                                </button>
                            </div>
                        </div>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="px-4 py-2 rounded border"
                            style={{ borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.cardBg, color: ADMIN_COLORS.textPrimary }}
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>
                                    {cat === 'all' ? 'All Categories' : cat}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Books Table */}
                    <div className="border rounded shadow-sm overflow-hidden"
                        style={{ backgroundColor: ADMIN_COLORS.cardBg, borderColor: ADMIN_COLORS.border }}>
                        <table className="w-full">
                            <thead>
                                <tr style={{ borderBottom: `2px solid ${ADMIN_COLORS.border}`, backgroundColor: `${ADMIN_COLORS.secondaryBg}50` }}>
                                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: ADMIN_COLORS.textMuted }}>Cover</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: ADMIN_COLORS.textMuted }}>ISBN</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: ADMIN_COLORS.textMuted }}>Title</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: ADMIN_COLORS.textMuted }}>Author</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: ADMIN_COLORS.textMuted }}>Category</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider" style={{ color: ADMIN_COLORS.textMuted }}>Copies</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider" style={{ color: ADMIN_COLORS.textMuted }}>Available</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider" style={{ color: ADMIN_COLORS.textMuted }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBooks.length > 0 ? filteredBooks.map((book) => (
                                    <tr key={book.id} className="hover:bg-opacity-10 transition" style={{ borderBottom: `1px solid ${ADMIN_COLORS.border}` }}>
                                        <td className="px-6 py-4">
                                            {book.cover_image_url ? (
                                                <img src={book.cover_image_url} alt={book.title} className="w-12 h-16 object-cover rounded shadow-sm" />
                                            ) : (
                                                <div className="w-12 h-16 rounded flex items-center justify-center" style={{ backgroundColor: ADMIN_COLORS.secondaryBg }}>
                                                    <span className="material-symbols-outlined text-sm" style={{ color: ADMIN_COLORS.textMuted }}>book</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm" style={{ color: ADMIN_COLORS.textMuted }}>{book.isbn}</td>
                                        <td className="px-6 py-4 font-medium" style={{ color: ADMIN_COLORS.textPrimary }}>{book.title}</td>
                                        <td className="px-6 py-4" style={{ color: ADMIN_COLORS.textPrimary }}>{book.author}</td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: `${ADMIN_COLORS.burgundy}20`, color: ADMIN_COLORS.burgundy }}>
                                                {book.category || 'Uncategorized'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center" style={{ color: ADMIN_COLORS.textPrimary }}>{book.total_copies}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-bold" style={{ color: book.available_copies > 0 ? ADMIN_COLORS.green : ADMIN_COLORS.red }}>
                                                {book.available_copies}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setEditingBook(book)}
                                                className="mr-2 px-3 py-1 rounded text-sm hover:opacity-80"
                                                style={{ backgroundColor: ADMIN_COLORS.tan, color: 'white' }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(book.id)}
                                                className="px-3 py-1 rounded text-sm hover:opacity-80"
                                                style={{ backgroundColor: ADMIN_COLORS.red, color: 'white' }}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-12 text-center" style={{ color: ADMIN_COLORS.textMuted }}>
                                            No books found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {(showAddModal || editingBook) && (
                <BookFormModal
                    book={editingBook}
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingBook(null);
                    }}
                    onSave={() => {
                        setShowAddModal(false);
                        setEditingBook(null);
                        loadBooks();
                    }}
                />
            )}
        </div>
    );
}

function BookFormModal({ book, onClose, onSave }) {
    const [formData, setFormData] = useState(book || {
        isbn: '',
        title: '',
        author: '',
        publisher: '',
        publication_year: '',
        category: '',
        language: 'English',
        pages: '',
        description: '',
        total_copies: 1,
        location: '',
        cover_image_url: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Clean up data - remove empty strings and convert types
            const cleanData = {
                isbn: formData.isbn,
                title: formData.title,
                author: formData.author,
                publisher: formData.publisher || undefined,
                publication_year: formData.publication_year ? parseInt(formData.publication_year) : undefined,
                category: formData.category || undefined,
                language: formData.language || 'English',
                pages: formData.pages ? parseInt(formData.pages) : undefined,
                description: formData.description || undefined,
                cover_image_url: formData.cover_image_url || undefined,
                total_copies: parseInt(formData.total_copies) || 1,
                location: formData.location || undefined
            };

            // Remove undefined values
            Object.keys(cleanData).forEach(key =>
                cleanData[key] === undefined && delete cleanData[key]
            );

            if (book) {
                await booksAPI.update(book.id, cleanData);
                alert('Book updated successfully');
            } else {
                await booksAPI.create(cleanData);
                alert('Book added successfully');
            }
            onSave();
        } catch (error) {
            console.error('Error saving book:', error);
            alert('Failed to save book: ' + error.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-lg shadow-xl"
                style={{ backgroundColor: ADMIN_COLORS.cardBg }}>
                <div className="p-6 border-b" style={{ borderColor: ADMIN_COLORS.border }}>
                    <h3 className="text-2xl font-semibold" style={{ fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textPrimary }}>
                        {book ? 'Edit Book' : 'Add New Book'}
                    </h3>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Cover Image Preview */}
                    {formData.cover_image_url && (
                        <div className="flex justify-center">
                            <img
                                src={formData.cover_image_url}
                                alt="Book cover preview"
                                className="w-32 h-48 object-cover rounded shadow-lg"
                                onError={(e) => e.target.style.display = 'none'}
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: ADMIN_COLORS.textMuted }}>Cover Image URL</label>
                        <input
                            type="url"
                            value={formData.cover_image_url}
                            onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                            placeholder="https://example.com/cover.jpg"
                            className="w-full px-3 py-2 rounded border"
                            style={{ borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.primaryBg, color: ADMIN_COLORS.textPrimary }}
                        />
                        <p className="text-xs mt-1" style={{ color: ADMIN_COLORS.textMuted }}>Enter a URL to an image (e.g., from Google Books API)</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: ADMIN_COLORS.textMuted }}>ISBN *</label>
                            <input
                                required
                                value={formData.isbn}
                                onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                                className="w-full px-3 py-2 rounded border"
                                style={{ borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.primaryBg, color: ADMIN_COLORS.textPrimary }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: ADMIN_COLORS.textMuted }}>Category</label>
                            <input
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-3 py-2 rounded border"
                                style={{ borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.primaryBg, color: ADMIN_COLORS.textPrimary }}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: ADMIN_COLORS.textMuted }}>Title *</label>
                        <input
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-3 py-2 rounded border"
                            style={{ borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.primaryBg, color: ADMIN_COLORS.textPrimary }}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: ADMIN_COLORS.textMuted }}>Author *</label>
                            <input
                                required
                                value={formData.author}
                                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                                className="w-full px-3 py-2 rounded border"
                                style={{ borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.primaryBg, color: ADMIN_COLORS.textPrimary }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: ADMIN_COLORS.textMuted }}>Publisher</label>
                            <input
                                value={formData.publisher}
                                onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                                className="w-full px-3 py-2 rounded border"
                                style={{ borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.primaryBg, color: ADMIN_COLORS.textPrimary }}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: ADMIN_COLORS.textMuted }}>Year</label>
                            <input
                                type="number"
                                value={formData.publication_year}
                                onChange={(e) => setFormData({ ...formData, publication_year: e.target.value })}
                                className="w-full px-3 py-2 rounded border"
                                style={{ borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.primaryBg, color: ADMIN_COLORS.textPrimary }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: ADMIN_COLORS.textMuted }}>Total Copies</label>
                            <input
                                type="number"
                                min="1"
                                value={formData.total_copies}
                                onChange={(e) => setFormData({ ...formData, total_copies: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 rounded border"
                                style={{ borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.primaryBg, color: ADMIN_COLORS.textPrimary }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: ADMIN_COLORS.textMuted }}>Location</label>
                            <input
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                className="w-full px-3 py-2 rounded border"
                                placeholder="Shelf A1"
                                style={{ borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.primaryBg, color: ADMIN_COLORS.textPrimary }}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: ADMIN_COLORS.textMuted }}>Description</label>
                        <textarea
                            rows="3"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 rounded border"
                            style={{ borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.primaryBg, color: ADMIN_COLORS.textPrimary }}
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 rounded hover:opacity-90 transition"
                            style={{ backgroundColor: ADMIN_COLORS.burgundy, color: 'white' }}
                        >
                            {book ? 'Update Book' : 'Add Book'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 rounded border hover:bg-opacity-10 transition"
                            style={{ borderColor: ADMIN_COLORS.border, color: ADMIN_COLORS.textPrimary }}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
