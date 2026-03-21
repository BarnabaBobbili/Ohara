import { useState, useEffect } from 'react';
import { booksAPI, collectionsAPI, cmsAPI } from '../../services/api';

export default function CMSManager() {
    const [tab, setTab] = useState('hero');
    const [books, setBooks] = useState([]);
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Hero featured books (up to 4)
    const [heroBooks, setHeroBooks] = useState([]);
    
    // Living Library shelf books (up to 9)
    const [shelfBooks, setShelfBooks] = useState([]);
    
    // Collection management
    const [showCollectionModal, setShowCollectionModal] = useState(false);
    const [editingCollection, setEditingCollection] = useState(null);
    const [collectionForm, setCollectionForm] = useState({ name: '', description: '' });
    const [showBookPicker, setShowBookPicker] = useState(null);
    const [bookSearch, setBookSearch] = useState('');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [booksData, collectionsData, cmsData] = await Promise.all([
                booksAPI.getAll().catch(() => []),
                collectionsAPI.getAllAdmin().catch(() => []),
                cmsAPI.getPage('homepage').catch(() => ({}))
            ]);
            setBooks(Array.isArray(booksData) ? booksData : []);
            setCollections(Array.isArray(collectionsData) ? collectionsData : []);
            
            // Load saved hero and shelf books from CMS
            if (cmsData?.content) {
                setHeroBooks(cmsData.content.heroBooks || []);
                setShelfBooks(cmsData.content.shelfBooks || []);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Save hero/shelf configuration
    const saveCMSConfig = async () => {
        try {
            await cmsAPI.updatePage('homepage', {
                heroBooks: heroBooks,
                shelfBooks: shelfBooks
            });
            alert('Configuration saved!');
        } catch (error) {
            alert('Failed to save: ' + error.message);
        }
    };

    // Hero book management
    const addHeroBook = (book) => {
        if (heroBooks.length >= 4) {
            alert('Maximum 4 books for hero section');
            return;
        }
        if (heroBooks.find(b => b.id === book.id)) {
            alert('Book already in hero section');
            return;
        }
        setHeroBooks([...heroBooks, book]);
    };

    const removeHeroBook = (bookId) => {
        setHeroBooks(heroBooks.filter(b => b.id !== bookId));
    };

    const moveHeroBook = (index, direction) => {
        const newBooks = [...heroBooks];
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= newBooks.length) return;
        [newBooks[index], newBooks[newIndex]] = [newBooks[newIndex], newBooks[index]];
        setHeroBooks(newBooks);
    };

    // Shelf book management
    const addShelfBook = (book) => {
        if (shelfBooks.length >= 9) {
            alert('Maximum 9 books for bookshelf');
            return;
        }
        if (shelfBooks.find(b => b.id === book.id)) {
            alert('Book already on shelf');
            return;
        }
        setShelfBooks([...shelfBooks, book]);
    };

    const removeShelfBook = (bookId) => {
        setShelfBooks(shelfBooks.filter(b => b.id !== bookId));
    };

    const moveShelfBook = (index, direction) => {
        const newBooks = [...shelfBooks];
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= newBooks.length) return;
        [newBooks[index], newBooks[newIndex]] = [newBooks[newIndex], newBooks[index]];
        setShelfBooks(newBooks);
    };

    // Collection management
    const handleCollectionSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingCollection) {
                await collectionsAPI.update(editingCollection.id, collectionForm);
            } else {
                await collectionsAPI.create(collectionForm);
            }
            loadData();
            setShowCollectionModal(false);
            setEditingCollection(null);
            setCollectionForm({ name: '', description: '' });
        } catch (error) {
            alert('Failed to save: ' + error.message);
        }
    };

    const deleteCollection = async (id) => {
        if (!confirm('Delete this collection?')) return;
        try {
            await collectionsAPI.delete(id);
            loadData();
        } catch (error) {
            alert('Failed to delete: ' + error.message);
        }
    };

    const toggleCollectionPin = async (collection) => {
        try {
            await collectionsAPI.update(collection.id, { is_pinned: !collection.is_pinned });
            loadData();
        } catch (error) {
            alert('Failed to update: ' + error.message);
        }
    };

    const addBookToCollection = async (collectionId, book) => {
        try {
            const collection = collections.find(c => c.id === collectionId);
            const currentBooks = collection?.books || [];
            if (currentBooks.find(b => b.id === book.id)) {
                alert('Book already in collection');
                return;
            }
            await collectionsAPI.update(collectionId, {
                books: [...currentBooks.map(b => b.id), book.id]
            });
            loadData();
        } catch (error) {
            alert('Failed to add book: ' + error.message);
        }
    };

    const removeBookFromCollection = async (collectionId, bookId) => {
        try {
            const collection = collections.find(c => c.id === collectionId);
            const currentBooks = (collection?.books || []).filter(b => b.id !== bookId);
            await collectionsAPI.update(collectionId, {
                books: currentBooks.map(b => b.id)
            });
            loadData();
        } catch (error) {
            alert('Failed to remove book: ' + error.message);
        }
    };

    const filteredBooks = books.filter(b =>
        b.title?.toLowerCase().includes(bookSearch.toLowerCase()) ||
        b.author?.toLowerCase().includes(bookSearch.toLowerCase())
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
                        <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#c16549]">Content Studio</span>
                    </div>
                    <h1 className="text-3xl font-bold text-[#1E1815]">CMS Manager</h1>
                    <p className="text-sm text-[#6B6560] mt-1">Manage featured books on your landing page</p>
                </div>
                <button onClick={saveCMSConfig} className="flex items-center gap-2 bg-[#c16549] text-white px-4 py-2 text-sm font-medium hover:bg-[#a85443] transition-colors">
                    <span className="material-symbols-outlined text-lg">save</span>
                    Save Changes
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#E8E4DF] mb-6">
                <button onClick={() => setTab('hero')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'hero' ? 'border-[#c16549] text-[#c16549]' : 'border-transparent text-[#6B6560] hover:text-[#1E1815]'}`}>
                    Hero Books
                </button>
                <button onClick={() => setTab('collections')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'collections' ? 'border-[#c16549] text-[#c16549]' : 'border-transparent text-[#6B6560] hover:text-[#1E1815]'}`}>
                    Collections
                </button>
                <button onClick={() => setTab('shelf')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'shelf' ? 'border-[#c16549] text-[#c16549]' : 'border-transparent text-[#6B6560] hover:text-[#1E1815]'}`}>
                    Living Library Shelf
                </button>
            </div>

            {/* Hero Books Tab */}
            {tab === 'hero' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Selected Books */}
                    <div className="bg-white border border-[#E8E4DF] p-4">
                        <h2 className="text-sm font-bold text-[#1E1815] mb-3">Featured Books ({heroBooks.length}/4)</h2>
                        <p className="text-xs text-[#6B6560] mb-4">These books appear in the hero section on the right side</p>
                        {heroBooks.length === 0 ? (
                            <div className="py-8 text-center border-2 border-dashed border-[#E8E4DF]">
                                <span className="material-symbols-outlined text-3xl text-[#E8E4DF]">library_books</span>
                                <p className="text-sm text-[#6B6560] mt-2">No books selected</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {heroBooks.map((book, i) => (
                                    <div key={book.id} className="flex items-center gap-3 p-2 bg-[#FAF7F2] border border-[#E8E4DF]">
                                        <div className="w-10 h-14 bg-gradient-to-br from-[#c16549] to-[#8d4d3f] flex-shrink-0">
                                            {book.cover_image && <img src={book.cover_image} alt="" className="w-full h-full object-cover" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-[#1E1815] truncate">{book.title}</p>
                                            <p className="text-xs text-[#6B6560]">{book.author}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => moveHeroBook(i, -1)} disabled={i === 0} className="p-1 text-[#6B6560] hover:text-[#1E1815] disabled:opacity-30">
                                                <span className="material-symbols-outlined text-sm">arrow_upward</span>
                                            </button>
                                            <button onClick={() => moveHeroBook(i, 1)} disabled={i === heroBooks.length - 1} className="p-1 text-[#6B6560] hover:text-[#1E1815] disabled:opacity-30">
                                                <span className="material-symbols-outlined text-sm">arrow_downward</span>
                                            </button>
                                            <button onClick={() => removeHeroBook(book.id)} className="p-1 text-red-500 hover:text-red-600">
                                                <span className="material-symbols-outlined text-sm">close</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Book Picker */}
                    <div className="bg-white border border-[#E8E4DF] p-4">
                        <h2 className="text-sm font-bold text-[#1E1815] mb-3">Select Books</h2>
                        <div className="relative mb-3">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6560] text-lg">search</span>
                            <input
                                type="text"
                                placeholder="Search books..."
                                value={bookSearch}
                                onChange={(e) => setBookSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none"
                            />
                        </div>
                        <div className="max-h-80 overflow-y-auto space-y-1">
                            {filteredBooks.slice(0, 20).map(book => (
                                <button
                                    key={book.id}
                                    onClick={() => addHeroBook(book)}
                                    disabled={heroBooks.find(b => b.id === book.id)}
                                    className="w-full flex items-center gap-3 p-2 text-left hover:bg-[#FAF7F2] border border-transparent hover:border-[#E8E4DF] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="w-8 h-12 bg-gradient-to-br from-[#c16549] to-[#8d4d3f] flex-shrink-0">
                                        {book.cover_image && <img src={book.cover_image} alt="" className="w-full h-full object-cover" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-[#1E1815] truncate">{book.title}</p>
                                        <p className="text-xs text-[#6B6560]">{book.author}</p>
                                    </div>
                                    <span className="material-symbols-outlined text-[#c16549] text-lg">add</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Collections Tab */}
            {tab === 'collections' && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-[#6B6560]">{collections.length} collections</p>
                        <button
                            onClick={() => {
                                setEditingCollection(null);
                                setCollectionForm({ name: '', description: '' });
                                setShowCollectionModal(true);
                            }}
                            className="flex items-center gap-1 text-sm text-[#c16549] hover:text-[#a85443]"
                        >
                            <span className="material-symbols-outlined text-lg">add</span>
                            New Collection
                        </button>
                    </div>
                    <div className="space-y-4">
                        {collections.map(collection => (
                            <div key={collection.id} className="bg-white border border-[#E8E4DF]">
                                <div className="p-4 border-b border-[#E8E4DF] flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-medium text-sm text-[#1E1815]">{collection.name}</h3>
                                        {collection.is_pinned && (
                                            <span className="px-1.5 py-0.5 text-[9px] font-medium uppercase bg-[#c16549] text-white">Pinned</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => toggleCollectionPin(collection)} className="p-1 text-[#6B6560] hover:text-[#c16549]" title={collection.is_pinned ? 'Unpin' : 'Pin to homepage'}>
                                            <span className="material-symbols-outlined text-lg">{collection.is_pinned ? 'push_pin' : 'push_pin'}</span>
                                        </button>
                                        <button onClick={() => setShowBookPicker(showBookPicker === collection.id ? null : collection.id)} className="p-1 text-[#6B6560] hover:text-[#c16549]">
                                            <span className="material-symbols-outlined text-lg">add_circle</span>
                                        </button>
                                        <button onClick={() => {
                                            setEditingCollection(collection);
                                            setCollectionForm({ name: collection.name, description: collection.description || '' });
                                            setShowCollectionModal(true);
                                        }} className="p-1 text-[#6B6560] hover:text-[#c16549]">
                                            <span className="material-symbols-outlined text-lg">edit</span>
                                        </button>
                                        <button onClick={() => deleteCollection(collection.id)} className="p-1 text-[#6B6560] hover:text-red-500">
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    </div>
                                </div>
                                {showBookPicker === collection.id && (
                                    <div className="p-4 bg-[#FAF7F2] border-b border-[#E8E4DF]">
                                        <div className="relative mb-2">
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6560] text-sm">search</span>
                                            <input
                                                type="text"
                                                placeholder="Search books to add..."
                                                value={bookSearch}
                                                onChange={(e) => setBookSearch(e.target.value)}
                                                className="w-full pl-9 pr-4 py-1.5 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none"
                                            />
                                        </div>
                                        <div className="max-h-40 overflow-y-auto space-y-1">
                                            {filteredBooks.slice(0, 10).map(book => (
                                                <button key={book.id} onClick={() => addBookToCollection(collection.id, book)} className="w-full flex items-center gap-2 p-1.5 text-left hover:bg-white text-sm">
                                                    <span className="material-symbols-outlined text-[#c16549] text-sm">add</span>
                                                    <span className="truncate">{book.title}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="p-4">
                                    {collection.description && <p className="text-xs text-[#6B6560] mb-3">{collection.description}</p>}
                                    {(!collection.books || collection.books.length === 0) ? (
                                        <p className="text-xs text-[#6B6560]">No books in this collection</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {collection.books.map(book => (
                                                <div key={book.id} className="flex items-center gap-2 px-2 py-1 bg-[#FAF7F2] text-xs">
                                                    <span className="truncate max-w-[150px]">{book.title}</span>
                                                    <button onClick={() => removeBookFromCollection(collection.id, book.id)} className="text-red-500 hover:text-red-600">
                                                        <span className="material-symbols-outlined text-sm">close</span>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {collections.length === 0 && (
                            <div className="py-12 text-center border-2 border-dashed border-[#E8E4DF]">
                                <span className="material-symbols-outlined text-4xl text-[#E8E4DF]">collections_bookmark</span>
                                <p className="text-sm text-[#6B6560] mt-2">No collections yet</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Shelf Books Tab */}
            {tab === 'shelf' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Selected Books */}
                    <div className="bg-white border border-[#E8E4DF] p-4">
                        <h2 className="text-sm font-bold text-[#1E1815] mb-3">Shelf Books ({shelfBooks.length}/9)</h2>
                        <p className="text-xs text-[#6B6560] mb-4">These books appear on the Living Library bookshelf</p>
                        {shelfBooks.length === 0 ? (
                            <div className="py-8 text-center border-2 border-dashed border-[#E8E4DF]">
                                <span className="material-symbols-outlined text-3xl text-[#E8E4DF]">shelves</span>
                                <p className="text-sm text-[#6B6560] mt-2">No books selected</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-2">
                                {shelfBooks.map((book, i) => (
                                    <div key={book.id} className="relative group">
                                        <div className="aspect-[2/3] bg-gradient-to-br from-[#c16549] to-[#8d4d3f]">
                                            {book.cover_image ? (
                                                <img src={book.cover_image} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center p-1">
                                                    <span className="text-white text-[8px] text-center leading-tight">{book.title}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                            <button onClick={() => moveShelfBook(i, -1)} disabled={i === 0} className="p-1 bg-white rounded disabled:opacity-30">
                                                <span className="material-symbols-outlined text-xs">arrow_back</span>
                                            </button>
                                            <button onClick={() => removeShelfBook(book.id)} className="p-1 bg-red-500 text-white rounded">
                                                <span className="material-symbols-outlined text-xs">close</span>
                                            </button>
                                            <button onClick={() => moveShelfBook(i, 1)} disabled={i === shelfBooks.length - 1} className="p-1 bg-white rounded disabled:opacity-30">
                                                <span className="material-symbols-outlined text-xs">arrow_forward</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Book Picker */}
                    <div className="bg-white border border-[#E8E4DF] p-4">
                        <h2 className="text-sm font-bold text-[#1E1815] mb-3">Select Books</h2>
                        <div className="relative mb-3">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6560] text-lg">search</span>
                            <input
                                type="text"
                                placeholder="Search books..."
                                value={bookSearch}
                                onChange={(e) => setBookSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none"
                            />
                        </div>
                        <div className="max-h-80 overflow-y-auto space-y-1">
                            {filteredBooks.slice(0, 20).map(book => (
                                <button
                                    key={book.id}
                                    onClick={() => addShelfBook(book)}
                                    disabled={shelfBooks.find(b => b.id === book.id)}
                                    className="w-full flex items-center gap-3 p-2 text-left hover:bg-[#FAF7F2] border border-transparent hover:border-[#E8E4DF] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="w-8 h-12 bg-gradient-to-br from-[#c16549] to-[#8d4d3f] flex-shrink-0">
                                        {book.cover_image && <img src={book.cover_image} alt="" className="w-full h-full object-cover" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-[#1E1815] truncate">{book.title}</p>
                                        <p className="text-xs text-[#6B6560]">{book.author}</p>
                                    </div>
                                    <span className="material-symbols-outlined text-[#c16549] text-lg">add</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Collection Modal */}
            {showCollectionModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md">
                        <div className="p-4 border-b border-[#E8E4DF] flex items-center justify-between">
                            <h2 className="text-lg font-bold text-[#1E1815]">{editingCollection ? 'Edit Collection' : 'New Collection'}</h2>
                            <button onClick={() => { setShowCollectionModal(false); setEditingCollection(null); }} className="p-1 hover:bg-[#FAF7F2] rounded">
                                <span className="material-symbols-outlined text-[#6B6560]">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleCollectionSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Name *</label>
                                <input required value={collectionForm.name} onChange={e => setCollectionForm({...collectionForm, name: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[#6B6560] uppercase tracking-wide mb-1">Description</label>
                                <textarea rows="3" value={collectionForm.description} onChange={e => setCollectionForm({...collectionForm, description: e.target.value})} className="w-full px-3 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none resize-none" />
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => { setShowCollectionModal(false); setEditingCollection(null); }} className="flex-1 px-4 py-2 border border-[#E8E4DF] text-sm font-medium hover:bg-[#FAF7F2] transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-[#c16549] text-white text-sm font-medium hover:bg-[#a85443] transition-colors">{editingCollection ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
