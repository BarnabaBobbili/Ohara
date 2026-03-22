import { useState, useEffect } from 'react';
import { booksAPI, collectionsAPI, cmsAPI } from '../../services/api';

export default function CMSManager() {
    const [tab, setTab] = useState('hero');
    const [books, setBooks] = useState([]);
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Hero featured books (up to 4)
    const [heroBooks, setHeroBooks] = useState([]);
    const [originalHeroBooks, setOriginalHeroBooks] = useState([]);
    const [heroChanged, setHeroChanged] = useState(false);
    
    // Living Library shelf books (up to 9)
    const [shelfBooks, setShelfBooks] = useState([]);
    const [originalShelfBooks, setOriginalShelfBooks] = useState([]);
    const [shelfChanged, setShelfChanged] = useState(false);
    
    // Collection management
    const [showCollectionModal, setShowCollectionModal] = useState(false);
    const [editingCollection, setEditingCollection] = useState(null);
    const [collectionForm, setCollectionForm] = useState({ name: '', description: '' });
    const [showBookPicker, setShowBookPicker] = useState(null);
    const [bookSearch, setBookSearch] = useState('');
    const [collectionSearch, setCollectionSearch] = useState('');
    const [expandedCollections, setExpandedCollections] = useState({});
    
    // Track collection changes per collection
    const [collectionChanges, setCollectionChanges] = useState({});

    useEffect(() => { loadData(); }, []);

    // Track changes for hero books
    useEffect(() => {
        const changed = JSON.stringify(heroBooks) !== JSON.stringify(originalHeroBooks);
        setHeroChanged(changed);
    }, [heroBooks, originalHeroBooks]);

    // Track changes for shelf books
    useEffect(() => {
        const changed = JSON.stringify(shelfBooks) !== JSON.stringify(originalShelfBooks);
        setShelfChanged(changed);
    }, [shelfBooks, originalShelfBooks]);

    const loadData = async () => {
        try {
            const [booksData, collectionsData, cmsData] = await Promise.all([
                booksAPI.getAll().catch(() => []),
                collectionsAPI.getAllAdmin().catch(() => []),
                cmsAPI.getSection('home', 'content').catch(() => ({}))
            ]);
            setBooks(Array.isArray(booksData) ? booksData : []);
            setCollections(Array.isArray(collectionsData) ? collectionsData : []);
            
            // Load saved hero and shelf books from CMS
            const heroData = cmsData?.heroBooks || [];
            const shelfData = cmsData?.shelfBooks || [];
            setHeroBooks(heroData);
            setOriginalHeroBooks(JSON.parse(JSON.stringify(heroData)));
            setShelfBooks(shelfData);
            setOriginalShelfBooks(JSON.parse(JSON.stringify(shelfData)));
            
            // Initialize collection changes tracking
            const changes = {};
            collectionsData.forEach(col => {
                changes[col.id] = {
                    originalName: col.name,
                    originalDescription: col.description || '',
                    originalPinned: col.is_pinned || false,
                    originalBooks: col.books?.map(b => b.id) || [],
                    currentName: col.name,
                    currentDescription: col.description || '',
                    currentPinned: col.is_pinned || false,
                    currentBooks: col.books?.map(b => b.id) || [],
                    hasChanges: false
                };
            });
            setCollectionChanges(changes);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Handle tab switching with unsaved changes warning
    const handleTabChange = (newTab) => {
        if ((tab === 'hero' && heroChanged) || (tab === 'shelf' && shelfChanged)) {
            if (confirm('You have unsaved changes. Do you want to discard them?')) {
                // Reset changes
                if (tab === 'hero') {
                    setHeroBooks(JSON.parse(JSON.stringify(originalHeroBooks)));
                    setHeroChanged(false);
                } else if (tab === 'shelf') {
                    setShelfBooks(JSON.parse(JSON.stringify(originalShelfBooks)));
                    setShelfChanged(false);
                }
                setTab(newTab);
            }
        } else {
            setTab(newTab);
        }
    };

    // Save hero books
    const saveHeroBooks = async () => {
        try {
            await cmsAPI.updateSection('home', 'content', {
                heroBooks: heroBooks,
                shelfBooks: shelfBooks
            });
            setOriginalHeroBooks(JSON.parse(JSON.stringify(heroBooks)));
            setHeroChanged(false);
            alert('Hero section saved successfully!');
        } catch (error) {
            alert('Failed to save: ' + error.message);
        }
    };

    // Save shelf books
    const saveShelfBooks = async () => {
        try {
            await cmsAPI.updateSection('home', 'content', {
                heroBooks: heroBooks,
                shelfBooks: shelfBooks
            });
            setOriginalShelfBooks(JSON.parse(JSON.stringify(shelfBooks)));
            setShelfChanged(false);
            alert('Living Library saved successfully!');
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

    // Collection inline editing
    const updateCollectionField = (collectionId, field, value) => {
        setCollections(collections.map(c => 
            c.id === collectionId ? { ...c, [field]: value } : c
        ));
        
        const change = collectionChanges[collectionId];
        if (change) {
            const newChange = { ...change };
            
            // Update the field
            if (field === 'name' || field === 'description' || field === 'is_pinned') {
                newChange[`current${field.charAt(0).toUpperCase() + field.slice(1).replace('_', '')}`] = value;
            }
            
            // Check if there are any changes
            const collection = collections.find(c => c.id === collectionId);
            const currentBookIds = collection?.books?.map(b => b.id) || [];
            
            newChange.hasChanges = 
                newChange.currentName !== newChange.originalName ||
                newChange.currentDescription !== newChange.originalDescription ||
                newChange.currentPinned !== newChange.originalPinned ||
                JSON.stringify(currentBookIds.sort()) !== JSON.stringify(newChange.originalBooks.sort());
                
            setCollectionChanges({ ...collectionChanges, [collectionId]: newChange });
        }
    };

    const saveCollectionChanges = async (collectionId) => {
        try {
            const collection = collections.find(c => c.id === collectionId);
            const change = collectionChanges[collectionId];
            
            // Save metadata changes
            await collectionsAPI.update(collectionId, {
                name: collection.name,
                description: collection.description,
                is_pinned: collection.is_pinned
            });
            
            // Handle book changes
            const currentBookIds = collection.books?.map(b => b.id) || [];
            const originalBookIds = change.originalBooks || [];
            
            // Books to add (in current but not in original)
            const booksToAdd = currentBookIds.filter(id => !originalBookIds.includes(id));
            // Books to remove (in original but not in current)
            const booksToRemove = originalBookIds.filter(id => !currentBookIds.includes(id));
            
            // Execute book changes
            for (const bookId of booksToAdd) {
                await collectionsAPI.addBook(collectionId, bookId);
            }
            for (const bookId of booksToRemove) {
                await collectionsAPI.removeBook(collectionId, bookId);
            }
            
            // Update original values
            setCollectionChanges({
                ...collectionChanges,
                [collectionId]: {
                    ...change,
                    originalName: collection.name,
                    originalDescription: collection.description,
                    originalPinned: collection.is_pinned,
                    originalBooks: currentBookIds,
                    currentBooks: currentBookIds,
                    hasChanges: false
                }
            });
            alert('Collection saved successfully!');
        } catch (error) {
            alert('Failed to save: ' + error.message);
        }
    };

    const cancelCollectionChanges = (collectionId) => {
        const change = collectionChanges[collectionId];
        if (!change) return;
        
        // Reload data to revert book changes
        loadData();
        
        setCollectionChanges({
            ...collectionChanges,
            [collectionId]: {
                ...change,
                currentName: change.originalName,
                currentDescription: change.originalDescription,
                currentPinned: change.originalPinned,
                currentBooks: change.originalBooks,
                hasChanges: false
            }
        });
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
            await collectionsAPI.remove(id);
            loadData();
        } catch (error) {
            alert('Failed to delete: ' + error.message);
        }
    };

    const toggleCollectionPin = (collectionId) => {
        const collection = collections.find(c => c.id === collectionId);
        const currentPinnedCount = collections.filter(c => c.is_pinned).length;
        
        // If trying to pin and already have 3 pinned collections
        if (!collection.is_pinned && currentPinnedCount >= 3) {
            alert('Maximum 3 collections can be pinned to the homepage. Please unpin another collection first.');
            return;
        }
        
        updateCollectionField(collectionId, 'is_pinned', !collection.is_pinned);
    };

    const toggleCollectionExpand = (collectionId) => {
        setExpandedCollections({
            ...expandedCollections,
            [collectionId]: !expandedCollections[collectionId]
        });
    };

    const addBookToCollection = (collectionId, book) => {
        const collection = collections.find(c => c.id === collectionId);
        const currentBooks = collection?.books || [];
        if (currentBooks.find(b => b.id === book.id)) {
            alert('Book already in collection');
            return;
        }
        
        // Update local state
        setCollections(collections.map(c => 
            c.id === collectionId ? {
                ...c,
                books: [...(c.books || []), book]
            } : c
        ));
        
        // Trigger change detection
        const change = collectionChanges[collectionId];
        if (change) {
            const newBookIds = [...currentBooks.map(b => b.id), book.id];
            const newChange = { ...change, currentBooks: newBookIds };
            newChange.hasChanges = 
                newChange.currentName !== newChange.originalName ||
                newChange.currentDescription !== newChange.originalDescription ||
                newChange.currentPinned !== newChange.originalPinned ||
                JSON.stringify(newBookIds.sort()) !== JSON.stringify(change.originalBooks.sort());
            setCollectionChanges({ ...collectionChanges, [collectionId]: newChange });
        }
    };

    const removeBookFromCollection = (collectionId, bookId) => {
        // Update local state
        setCollections(collections.map(c => 
            c.id === collectionId ? {
                ...c,
                books: (c.books || []).filter(b => b.id !== bookId)
            } : c
        ));
        
        // Trigger change detection
        const collection = collections.find(c => c.id === collectionId);
        const change = collectionChanges[collectionId];
        if (change) {
            const newBookIds = (collection?.books || []).filter(b => b.id !== bookId).map(b => b.id);
            const newChange = { ...change, currentBooks: newBookIds };
            newChange.hasChanges = 
                newChange.currentName !== newChange.originalName ||
                newChange.currentDescription !== newChange.originalDescription ||
                newChange.currentPinned !== newChange.originalPinned ||
                JSON.stringify(newBookIds.sort()) !== JSON.stringify(change.originalBooks.sort());
            setCollectionChanges({ ...collectionChanges, [collectionId]: newChange });
        }
    };

    const filteredBooks = books.filter(b =>
        b.title?.toLowerCase().includes(bookSearch.toLowerCase()) ||
        b.author?.toLowerCase().includes(bookSearch.toLowerCase())
    );

    const filteredCollections = collections
        .filter(c =>
            c.name?.toLowerCase().includes(collectionSearch.toLowerCase()) ||
            c.description?.toLowerCase().includes(collectionSearch.toLowerCase())
        )
        .sort((a, b) => {
            // Pinned collections first
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;
            // Then by display order
            return (a.display_order || 0) - (b.display_order || 0);
        });

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
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#E8E4DF] mb-6">
                <button onClick={() => handleTabChange('hero')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'hero' ? 'border-[#c16549] text-[#c16549]' : 'border-transparent text-[#6B6560] hover:text-[#1E1815]'}`}>
                    Hero Books {heroChanged && <span className="text-xs">●</span>}
                </button>
                <button onClick={() => handleTabChange('collections')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'collections' ? 'border-[#c16549] text-[#c16549]' : 'border-transparent text-[#6B6560] hover:text-[#1E1815]'}`}>
                    Collections
                </button>
                <button onClick={() => handleTabChange('shelf')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'shelf' ? 'border-[#c16549] text-[#c16549]' : 'border-transparent text-[#6B6560] hover:text-[#1E1815]'}`}>
                    Living Library Shelf {shelfChanged && <span className="text-xs">●</span>}
                </button>
            </div>

            {/* Hero Books Tab */}
            {tab === 'hero' && (
                <div className="space-y-4">
                    {heroChanged && (
                        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 p-3 rounded">
                            <span className="text-sm text-amber-800">You have unsaved changes</span>
                            <button onClick={saveHeroBooks} className="flex items-center gap-2 bg-[#c16549] text-white px-4 py-2 text-sm font-medium hover:bg-[#a85443] transition-colors">
                                <span className="material-symbols-outlined text-lg">save</span>
                                Save Changes
                            </button>
                        </div>
                    )}
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
                                                {book.cover_image_url && <img src={book.cover_image_url} alt="" className="w-full h-full object-cover" />}
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
                                            {book.cover_image_url && <img src={book.cover_image_url} alt="" className="w-full h-full object-cover" />}
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
                </div>
            )}

            {/* Collections Tab */}
            {tab === 'collections' && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex-1 max-w-md">
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6560] text-lg">search</span>
                                <input
                                    type="text"
                                    placeholder="Search collections..."
                                    value={collectionSearch}
                                    onChange={(e) => setCollectionSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-[#E8E4DF] text-sm focus:border-[#c16549] focus:outline-none"
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setEditingCollection(null);
                                setCollectionForm({ name: '', description: '' });
                                setShowCollectionModal(true);
                            }}
                            className="flex items-center gap-1 text-sm text-white bg-[#c16549] hover:bg-[#a85443] px-4 py-2 ml-4"
                        >
                            <span className="material-symbols-outlined text-lg">add</span>
                            New Collection
                        </button>
                    </div>
                    <div className="space-y-4">
                        {filteredCollections.map(collection => {
                            const hasChanges = collectionChanges[collection.id]?.hasChanges;
                            const isExpanded = expandedCollections[collection.id];
                            
                            return (
                                <div key={collection.id} className="bg-white border border-[#E8E4DF]">
                                    <div className="p-4 border-b border-[#E8E4DF]">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 space-y-2 max-w-3xl">
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="text"
                                                        value={collection.name}
                                                        onChange={(e) => updateCollectionField(collection.id, 'name', e.target.value)}
                                                        className="font-bold text-lg text-[#1E1815] border-b-2 border-transparent hover:border-[#E8E4DF] focus:border-[#c16549] focus:outline-none px-1 py-0.5 bg-transparent w-auto min-w-[200px]"
                                                        style={{ width: `${Math.max(collection.name.length * 10, 200)}px` }}
                                                    />
                                                    {collection.is_pinned && (
                                                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-[#c16549] text-white rounded">Pinned</span>
                                                    )}
                                                </div>
                                                <textarea
                                                    value={collection.description || ''}
                                                    onChange={(e) => updateCollectionField(collection.id, 'description', e.target.value)}
                                                    placeholder="Add description..."
                                                    className="w-full max-w-2xl text-sm text-[#6B6560] border border-transparent hover:border-[#E8E4DF] focus:border-[#c16549] focus:outline-none p-2 resize-none rounded"
                                                    rows="2"
                                                />
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {hasChanges && (
                                                    <>
                                                        <button 
                                                            onClick={() => saveCollectionChanges(collection.id)}
                                                            className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                                                            title="Save changes"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">check_circle</span>
                                                        </button>
                                                        <button 
                                                            onClick={() => cancelCollectionChanges(collection.id)}
                                                            className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                            title="Cancel changes"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">cancel</span>
                                                        </button>
                                                    </>
                                                )}
                                                <button 
                                                    onClick={() => toggleCollectionPin(collection.id)} 
                                                    className={`p-1.5 hover:bg-[#FFF5F0] rounded transition-colors ${collection.is_pinned ? 'text-[#c16549]' : 'text-[#6B6560]'}`}
                                                    title={collection.is_pinned ? 'Unpin from homepage' : 'Pin to homepage'}
                                                >
                                                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: collection.is_pinned ? '"FILL" 1' : '"FILL" 0' }}>
                                                        push_pin
                                                    </span>
                                                </button>
                                                <button 
                                                    onClick={() => toggleCollectionExpand(collection.id)}
                                                    className="p-1.5 text-[#6B6560] hover:text-[#c16549] hover:bg-[#FFF5F0] rounded transition-colors"
                                                    title={isExpanded ? 'Collapse books' : 'Expand books'}
                                                >
                                                    <span className="material-symbols-outlined text-lg">
                                                        {isExpanded ? 'expand_less' : 'expand_more'}
                                                    </span>
                                                </button>
                                                <button onClick={() => setShowBookPicker(showBookPicker === collection.id ? null : collection.id)} className="p-1.5 text-[#6B6560] hover:text-[#c16549] hover:bg-[#FFF5F0] rounded transition-colors">
                                                    <span className="material-symbols-outlined text-lg">
                                                        {showBookPicker === collection.id ? 'close' : 'add_circle'}
                                                    </span>
                                                </button>
                                                <button onClick={() => deleteCollection(collection.id)} className="p-1.5 text-[#6B6560] hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Expanded Books View */}
                                    {isExpanded && (
                                        <div className="p-4 bg-[#FAF7F2]">
                                            {(!collection.books || collection.books.length === 0) ? (
                                                <p className="text-xs text-[#6B6560]">No books in this collection. Click the + icon to add books.</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    <p className="text-xs font-semibold text-[#1E1815]">{collection.books.length} book{collection.books.length !== 1 ? 's' : ''} in collection</p>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                                        {collection.books.map(book => (
                                                            <div key={book.id} className="relative group">
                                                                <div className="aspect-[2/3] bg-gradient-to-br from-[#c16549] to-[#8d4d3f] overflow-hidden rounded">
                                                                    {book.cover_image_url ? (
                                                                        <img src={book.cover_image_url} alt={book.title} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center p-2">
                                                                            <span className="text-white text-[9px] text-center leading-tight">{book.title}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <button 
                                                                    onClick={() => removeBookFromCollection(collection.id, book.id)}
                                                                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    <span className="material-symbols-outlined text-xs">close</span>
                                                                </button>
                                                                <div className="mt-1">
                                                                    <p className="text-[10px] text-[#1E1815] truncate font-medium">{book.title}</p>
                                                                    <p className="text-[9px] text-[#6B6560] truncate">{book.author}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    {showBookPicker === collection.id && (
                                        <div className="p-4 bg-[#FAF7F2] border-t border-[#E8E4DF]">
                                            {/* Currently Added Books */}
                                            {collection.books && collection.books.length > 0 && (
                                                <div className="mb-4">
                                                    <h4 className="text-xs font-semibold text-[#1E1815] uppercase tracking-wide mb-2">Books in Collection ({collection.books.length})</h4>
                                                    <div className="grid grid-cols-2 gap-2 mb-3 max-h-32 overflow-y-auto">
                                                        {collection.books.map(book => (
                                                            <div key={book.id} className="flex items-center gap-2 p-2 bg-white border border-[#E8E4DF] text-xs">
                                                                <div className="w-8 h-12 bg-gradient-to-br from-[#c16549] to-[#8d4d3f] flex-shrink-0">
                                                                    {book.cover_image_url && <img src={book.cover_image_url} alt="" className="w-full h-full object-cover" />}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="truncate font-medium text-[#1E1815]">{book.title}</p>
                                                                    <p className="truncate text-[#6B6560] text-[10px]">{book.author}</p>
                                                                </div>
                                                                <button onClick={() => removeBookFromCollection(collection.id, book.id)} className="text-red-500 hover:text-red-600 flex-shrink-0">
                                                                    <span className="material-symbols-outlined text-sm">close</span>
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="h-px bg-[#E8E4DF] my-3"></div>
                                                </div>
                                            )}
                                            
                                            {/* Search & Add Books */}
                                            <h4 className="text-xs font-semibold text-[#1E1815] uppercase tracking-wide mb-2">Add Books</h4>
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
                                            <div className="max-h-48 overflow-y-auto space-y-1">
                                                {filteredBooks.slice(0, 20).map(book => {
                                                    const isAdded = collection.books?.find(b => b.id === book.id);
                                                    return (
                                                        <button 
                                                            key={book.id} 
                                                            onClick={() => !isAdded && addBookToCollection(collection.id, book)} 
                                                            disabled={isAdded}
                                                            className={`w-full flex items-center gap-2 p-2 text-left text-sm transition-all ${
                                                                isAdded 
                                                                    ? 'opacity-40 cursor-not-allowed bg-[#E8E4DF]' 
                                                                    : 'hover:bg-white cursor-pointer'
                                                            }`}
                                                        >
                                                            <div className="w-8 h-11 bg-gradient-to-br from-[#c16549] to-[#8d4d3f] flex-shrink-0">
                                                                {book.cover_image_url && <img src={book.cover_image_url} alt="" className="w-full h-full object-cover" />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="truncate font-medium">{book.title}</p>
                                                                <p className="truncate text-[#6B6560] text-xs">{book.author}</p>
                                                            </div>
                                                            <span className={`material-symbols-outlined text-sm ${isAdded ? 'text-green-600' : 'text-[#c16549]'}`}>
                                                                {isAdded ? 'check_circle' : 'add_circle'}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {filteredCollections.length === 0 && (
                            <div className="py-12 text-center border-2 border-dashed border-[#E8E4DF]">
                                <span className="material-symbols-outlined text-4xl text-[#E8E4DF]">collections_bookmark</span>
                                <p className="text-sm text-[#6B6560] mt-2">
                                    {collectionSearch ? 'No collections found' : 'No collections yet'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Shelf Books Tab */}
            {tab === 'shelf' && (
                <div className="space-y-4">
                    {shelfChanged && (
                        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 p-3 rounded">
                            <span className="text-sm text-amber-800">You have unsaved changes</span>
                            <button onClick={saveShelfBooks} className="flex items-center gap-2 bg-[#c16549] text-white px-4 py-2 text-sm font-medium hover:bg-[#a85443] transition-colors">
                                <span className="material-symbols-outlined text-lg">save</span>
                                Save Changes
                            </button>
                        </div>
                    )}
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
                                                {book.cover_image_url ? (
                                                    <img src={book.cover_image_url} alt="" className="w-full h-full object-cover" />
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
                                            <div className="mt-1">
                                                <p className="text-[10px] text-[#1E1815] truncate font-medium">{book.title}</p>
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
                                            {book.cover_image_url && <img src={book.cover_image_url} alt="" className="w-full h-full object-cover" />}
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
                </div>
            )}

            {/* Collection Modal */}
            {showCollectionModal && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-lg shadow-2xl">
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
