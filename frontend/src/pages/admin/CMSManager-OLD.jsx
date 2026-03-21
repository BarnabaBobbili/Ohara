import { useEffect, useState } from 'react';
import { ADMIN_COLORS } from '../../styles/adminTheme';
import { booksAPI, cmsAPI, collectionsAPI } from '../../services/api';

const DEFAULT_CONTENT = {
    hero: {
        headline: "Find the book that's been waiting for you.",
        subtitle: 'Browse 50,000+ titles. Reserve instantly.\nYour reading journey, organized.',
        quick_links: [
            { label: 'Browse Catalog', url: '/search' },
            { label: 'New Arrivals', url: '/search?filter=new' },
            { label: 'Staff Picks', url: '/search?filter=staff-picks' },
            { label: 'My Reservations', url: '/dashboard' },
        ],
        stats: {
            readers_count: 12847,
            rating: 4.9,
            reviews_count: 2340,
        },
    },
    bookshelf: {
        headline: 'The Living Library',
        subtitle: 'Real-time updates from shelves around the world. Join a community that leaves notes in the margins and see what others are discovering right now.',
    },
    philosophy: {
        label: '04 — Philosophy',
        headline: 'Ohara Philosophy',
        body_paragraphs: [
            "In an era defined by algorithmic noise and infinite scrolling, we built a sanctuary. Ohara is not just a feature; it is a commitment to the preservation of attention. We eschew the dopamine loops of modern software in favor of a slower, more deliberate pace.",
            "We believe that the act of cataloging one's library is a form of meditation. It connects us to the physical reality of the books we love-the weight of the paper, the smell of the binding, the memories attached to each spine.",
            "There are no notifications here. No social feeds clamoring for your engagement. Just your collection, your thoughts, and the quiet space to organize them.",
        ],
    },
    membership_cta: {
        headline: 'Begin your journey.',
        subtitle: 'Unlock intelligent cataloging and rediscover the art of your collection. Curate your legacy, one volume at a time.',
        button_text: 'Request Access',
    },
    footer: {
        columns: [
            {
                title: 'The Archives',
                links: [
                    { label: 'Search Catalog', url: '/search' },
                    { label: 'Curated Lists', url: '/search?filter=collections' },
                    { label: 'New Arrivals', url: '/search?filter=new' },
                    { label: 'Borrowing History', url: '/dashboard' },
                ],
            },
            {
                title: 'The Community',
                links: [
                    { label: 'About Ohara', url: '/about' },
                    { label: 'Upcoming Events', url: '/events' },
                    { label: 'Member Portal', url: '/dashboard' },
                ],
            },
            {
                title: 'The Keepers',
                links: [
                    { label: 'About Us', url: '/about' },
                    { label: 'Contact Librarian', url: '/contact' },
                    { label: 'Support / FAQ', url: '/faq' },
                    { label: 'Privacy Policy', url: '/privacy' },
                ],
            },
        ],
        newsletter_label: 'Join the Registry',
        copyright_text: '© 2025 Ohara Library. All rights reserved.',
    },
};

const EMPTY_COLLECTION_FORM = {
    name: '',
    description: '',
    cover_image: '',
    display_order: 0,
};

const normalizeHero = (hero = {}) => ({
    ...DEFAULT_CONTENT.hero,
    ...hero,
    stats: {
        ...DEFAULT_CONTENT.hero.stats,
        ...(hero.stats || {}),
    },
    quick_links: DEFAULT_CONTENT.hero.quick_links.map((link, index) => ({
        ...link,
        ...(hero.quick_links?.[index] || {}),
    })),
});

const normalizeFooter = (footer = {}) => ({
    ...DEFAULT_CONTENT.footer,
    ...footer,
    columns: DEFAULT_CONTENT.footer.columns.map((column, columnIndex) => ({
        ...column,
        ...(footer.columns?.[columnIndex] || {}),
        links: column.links.map((link, linkIndex) => ({
            ...link,
            ...(footer.columns?.[columnIndex]?.links?.[linkIndex] || {}),
        })),
    })),
});

const normalizeContent = (pageContent = {}) => ({
    hero: normalizeHero(pageContent.hero),
    bookshelf: {
        ...DEFAULT_CONTENT.bookshelf,
        ...(pageContent.bookshelf || {}),
    },
    philosophy: {
        ...DEFAULT_CONTENT.philosophy,
        ...(pageContent.philosophy || {}),
        body_paragraphs: DEFAULT_CONTENT.philosophy.body_paragraphs.map((paragraph, index) =>
            pageContent.philosophy?.body_paragraphs?.[index] || paragraph
        ),
    },
    membership_cta: {
        ...DEFAULT_CONTENT.membership_cta,
        ...(pageContent.membership_cta || {}),
    },
    footer: normalizeFooter(pageContent.footer),
});

export default function CMSManager() {
    const [loading, setLoading] = useState(true);
    const [savingSection, setSavingSection] = useState('');
    const [sectionStatus, setSectionStatus] = useState({});
    const [content, setContent] = useState(DEFAULT_CONTENT);
    const [collections, setCollections] = useState([]);
    const [books, setBooks] = useState([]);
    const [collectionForm, setCollectionForm] = useState(EMPTY_COLLECTION_FORM);
    const [editingCollectionId, setEditingCollectionId] = useState(null);
    const [selectedCollectionId, setSelectedCollectionId] = useState(null);
    const [selectedBookId, setSelectedBookId] = useState('');
    const [selectedBookOrder, setSelectedBookOrder] = useState(0);
    const [collectionStatus, setCollectionStatus] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [pageContent, collectionsData, booksData] = await Promise.all([
                cmsAPI.getPage('home').catch(() => ({})),
                collectionsAPI.getAllAdmin(),
                booksAPI.getAll({ limit: 200 }),
            ]);

            setContent(normalizeContent(pageContent));
            setCollections(Array.isArray(collectionsData) ? collectionsData : []);
            setBooks(Array.isArray(booksData) ? booksData : []);
            setSelectedCollectionId((current) => current || collectionsData?.[0]?.id || null);
        } catch (error) {
            console.error('Failed to load CMS manager data:', error);
            setCollectionStatus(`Failed to load content: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const saveSection = async (section) => {
        try {
            setSavingSection(section);
            setSectionStatus((current) => ({ ...current, [section]: '' }));
            await cmsAPI.updateSection('home', section, content[section]);
            setSectionStatus((current) => ({ ...current, [section]: 'Saved.' }));
        } catch (error) {
            console.error(`Failed to save ${section}:`, error);
            setSectionStatus((current) => ({ ...current, [section]: `Failed to save: ${error.message}` }));
        } finally {
            setSavingSection('');
        }
    };

    const resetSection = async (section) => {
        try {
            setSavingSection(section);
            await cmsAPI.resetSection('home', section);
            const pageContent = await cmsAPI.getPage('home').catch(() => ({}));
            setContent(normalizeContent(pageContent));
            setSectionStatus((current) => ({ ...current, [section]: 'Reset to defaults.' }));
        } catch (error) {
            console.error(`Failed to reset ${section}:`, error);
            setSectionStatus((current) => ({ ...current, [section]: `Failed to reset: ${error.message}` }));
        } finally {
            setSavingSection('');
        }
    };

    const selectedCollection = collections.find((collection) => collection.id === selectedCollectionId) || null;
    const availableBooks = books.filter((book) => Number.isInteger(book?.id) && !selectedCollection?.books?.some((item) => item.id === book.id));

    const startEditingCollection = (collection) => {
        setEditingCollectionId(collection.id);
        setSelectedCollectionId(collection.id);
        setCollectionForm({
            name: collection.name || '',
            description: collection.description || '',
            cover_image: collection.cover_image || '',
            display_order: collection.display_order || 0,
        });
        setCollectionStatus('');
    };

    const resetCollectionEditor = () => {
        setEditingCollectionId(null);
        setCollectionForm(EMPTY_COLLECTION_FORM);
    };

    const saveCollection = async (event) => {
        event.preventDefault();

        try {
            setCollectionStatus('');
            const payload = {
                ...collectionForm,
                display_order: Number(collectionForm.display_order) || 0,
            };

            if (editingCollectionId) {
                await collectionsAPI.update(editingCollectionId, payload);
            } else {
                await collectionsAPI.create(payload);
            }

            resetCollectionEditor();
            await loadData();
            setCollectionStatus('Collection saved.');
        } catch (error) {
            console.error('Failed to save collection:', error);
            setCollectionStatus(`Failed to save collection: ${error.message}`);
        }
    };

    const deleteCollection = async (collectionId) => {
        if (!confirm('Delete this collection?')) return;

        try {
            await collectionsAPI.remove(collectionId);
            if (editingCollectionId === collectionId) {
                resetCollectionEditor();
            }
            if (selectedCollectionId === collectionId) {
                setSelectedCollectionId(null);
            }
            await loadData();
            setCollectionStatus('Collection deleted.');
        } catch (error) {
            console.error('Failed to delete collection:', error);
            setCollectionStatus(`Failed to delete collection: ${error.message}`);
        }
    };

    const addBookToCollection = async () => {
        if (!selectedCollectionId || !selectedBookId) return;

        try {
            const parsedBookId = Number.parseInt(String(selectedBookId), 10);

            if (!Number.isInteger(parsedBookId)) {
                setCollectionStatus('Select a valid book before adding it.');
                return;
            }

            await collectionsAPI.addBook(selectedCollectionId, parsedBookId, Number(selectedBookOrder) || 0);
            setSelectedBookId('');
            setSelectedBookOrder(0);
            await loadData();
            setCollectionStatus('Book added to collection.');
        } catch (error) {
            console.error('Failed to add book to collection:', error);
            setCollectionStatus(`Failed to add book: ${error.message}`);
        }
    };

    const removeBookFromCollection = async (collectionId, bookId) => {
        try {
            await collectionsAPI.removeBook(collectionId, bookId);
            await loadData();
            setCollectionStatus('Book removed from collection.');
        } catch (error) {
            console.error('Failed to remove book from collection:', error);
            setCollectionStatus(`Failed to remove book: ${error.message}`);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: ADMIN_COLORS.primaryBg }}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4" style={{ borderColor: ADMIN_COLORS.burgundy }}></div>
                    <p style={{ color: ADMIN_COLORS.textMuted }}>Loading CMS studio...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen" style={{ backgroundColor: ADMIN_COLORS.primaryBg }}>
            <header className="px-8 py-6 flex justify-between items-end gap-4" style={{ borderBottom: `1px solid ${ADMIN_COLORS.border}`, backgroundColor: ADMIN_COLORS.cardBg }}>
                <div>
                    <p className="text-xs font-medium uppercase tracking-wider" style={{ color: ADMIN_COLORS.textMuted }}>Content Management</p>
                    <h2 className="text-3xl font-semibold italic" style={{ fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textPrimary }}>Landing Page CMS</h2>
                </div>
            </header>

            <div className="p-8">
                <div className="max-w-7xl mx-auto flex flex-col gap-8">
                    <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <SectionCard
                            title="Hero Section"
                            status={sectionStatus.hero}
                            saving={savingSection === 'hero'}
                            onSave={() => saveSection('hero')}
                            onReset={() => resetSection('hero')}
                        >
                            <TextField
                                label="Headline"
                                value={content.hero.headline}
                                onChange={(value) => setContent((current) => ({ ...current, hero: { ...current.hero, headline: value } }))}
                            />
                            <TextAreaField
                                label="Subtitle"
                                rows={3}
                                value={content.hero.subtitle}
                                onChange={(value) => setContent((current) => ({ ...current, hero: { ...current.hero, subtitle: value } }))}
                            />
                            <div className="grid grid-cols-3 gap-3">
                                <TextField
                                    label="Readers Count"
                                    value={content.hero.stats.readers_count}
                                    onChange={(value) => setContent((current) => ({
                                        ...current,
                                        hero: { ...current.hero, stats: { ...current.hero.stats, readers_count: value } },
                                    }))}
                                />
                                <TextField
                                    label="Rating"
                                    value={content.hero.stats.rating}
                                    onChange={(value) => setContent((current) => ({
                                        ...current,
                                        hero: { ...current.hero, stats: { ...current.hero.stats, rating: value } },
                                    }))}
                                />
                                <TextField
                                    label="Reviews Count"
                                    value={content.hero.stats.reviews_count}
                                    onChange={(value) => setContent((current) => ({
                                        ...current,
                                        hero: { ...current.hero, stats: { ...current.hero.stats, reviews_count: value } },
                                    }))}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {content.hero.quick_links.map((link, index) => (
                                    <div key={`${link.label}-${index}`} className="rounded border p-3" style={{ borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.primaryBg }}>
                                        <TextField
                                            label={`Quick Link ${index + 1} Label`}
                                            value={link.label}
                                            onChange={(value) => setContent((current) => ({
                                                ...current,
                                                hero: {
                                                    ...current.hero,
                                                    quick_links: current.hero.quick_links.map((currentLink, currentIndex) => (
                                                        currentIndex === index ? { ...currentLink, label: value } : currentLink
                                                    )),
                                                },
                                            }))}
                                        />
                                        <TextField
                                            label="URL"
                                            value={link.url}
                                            onChange={(value) => setContent((current) => ({
                                                ...current,
                                                hero: {
                                                    ...current.hero,
                                                    quick_links: current.hero.quick_links.map((currentLink, currentIndex) => (
                                                        currentIndex === index ? { ...currentLink, url: value } : currentLink
                                                    )),
                                                },
                                            }))}
                                        />
                                    </div>
                                ))}
                            </div>
                        </SectionCard>

                        <SectionCard
                            title="Live Bookshelf"
                            status={sectionStatus.bookshelf}
                            saving={savingSection === 'bookshelf'}
                            onSave={() => saveSection('bookshelf')}
                            onReset={() => resetSection('bookshelf')}
                        >
                            <TextField
                                label="Headline"
                                value={content.bookshelf.headline}
                                onChange={(value) => setContent((current) => ({ ...current, bookshelf: { ...current.bookshelf, headline: value } }))}
                            />
                            <TextAreaField
                                label="Subtitle"
                                rows={5}
                                value={content.bookshelf.subtitle}
                                onChange={(value) => setContent((current) => ({ ...current, bookshelf: { ...current.bookshelf, subtitle: value } }))}
                            />
                        </SectionCard>

                        <SectionCard
                            title="Philosophy"
                            status={sectionStatus.philosophy}
                            saving={savingSection === 'philosophy'}
                            onSave={() => saveSection('philosophy')}
                            onReset={() => resetSection('philosophy')}
                        >
                            <TextField
                                label="Section Label"
                                value={content.philosophy.label}
                                onChange={(value) => setContent((current) => ({ ...current, philosophy: { ...current.philosophy, label: value } }))}
                            />
                            <TextField
                                label="Headline"
                                value={content.philosophy.headline}
                                onChange={(value) => setContent((current) => ({ ...current, philosophy: { ...current.philosophy, headline: value } }))}
                            />
                            {content.philosophy.body_paragraphs.map((paragraph, index) => (
                                <TextAreaField
                                    key={`paragraph-${index + 1}`}
                                    label={`Paragraph ${index + 1}`}
                                    rows={4}
                                    value={paragraph}
                                    onChange={(value) => setContent((current) => ({
                                        ...current,
                                        philosophy: {
                                            ...current.philosophy,
                                            body_paragraphs: current.philosophy.body_paragraphs.map((currentParagraph, currentIndex) => (
                                                currentIndex === index ? value : currentParagraph
                                            )),
                                        },
                                    }))}
                                />
                            ))}
                        </SectionCard>

                        <SectionCard
                            title="Membership CTA"
                            status={sectionStatus.membership_cta}
                            saving={savingSection === 'membership_cta'}
                            onSave={() => saveSection('membership_cta')}
                            onReset={() => resetSection('membership_cta')}
                        >
                            <TextField
                                label="Headline"
                                value={content.membership_cta.headline}
                                onChange={(value) => setContent((current) => ({ ...current, membership_cta: { ...current.membership_cta, headline: value } }))}
                            />
                            <TextAreaField
                                label="Subtitle"
                                rows={4}
                                value={content.membership_cta.subtitle}
                                onChange={(value) => setContent((current) => ({ ...current, membership_cta: { ...current.membership_cta, subtitle: value } }))}
                            />
                            <TextField
                                label="Button Text"
                                value={content.membership_cta.button_text}
                                onChange={(value) => setContent((current) => ({ ...current, membership_cta: { ...current.membership_cta, button_text: value } }))}
                            />
                        </SectionCard>
                    </section>

                    <SectionCard
                        title="Footer"
                        status={sectionStatus.footer}
                        saving={savingSection === 'footer'}
                        onSave={() => saveSection('footer')}
                        onReset={() => resetSection('footer')}
                    >
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {content.footer.columns.map((column, columnIndex) => (
                                <div key={`footer-column-${columnIndex}`} className="rounded border p-4 flex flex-col gap-3" style={{ borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.primaryBg }}>
                                    <TextField
                                        label={`Column ${columnIndex + 1} Title`}
                                        value={column.title}
                                        onChange={(value) => setContent((current) => ({
                                            ...current,
                                            footer: {
                                                ...current.footer,
                                                columns: current.footer.columns.map((currentColumn, currentIndex) => (
                                                    currentIndex === columnIndex ? { ...currentColumn, title: value } : currentColumn
                                                )),
                                            },
                                        }))}
                                    />
                                    {column.links.map((link, linkIndex) => (
                                        <div key={`footer-link-${columnIndex}-${linkIndex}`} className="grid grid-cols-2 gap-2">
                                            <TextField
                                                label="Label"
                                                value={link.label}
                                                onChange={(value) => setContent((current) => ({
                                                    ...current,
                                                    footer: {
                                                        ...current.footer,
                                                        columns: current.footer.columns.map((currentColumn, currentIndex) => (
                                                            currentIndex === columnIndex
                                                                ? {
                                                                    ...currentColumn,
                                                                    links: currentColumn.links.map((currentLink, currentLinkIndex) => (
                                                                        currentLinkIndex === linkIndex ? { ...currentLink, label: value } : currentLink
                                                                    )),
                                                                }
                                                                : currentColumn
                                                        )),
                                                    },
                                                }))}
                                            />
                                            <TextField
                                                label="URL"
                                                value={link.url}
                                                onChange={(value) => setContent((current) => ({
                                                    ...current,
                                                    footer: {
                                                        ...current.footer,
                                                        columns: current.footer.columns.map((currentColumn, currentIndex) => (
                                                            currentIndex === columnIndex
                                                                ? {
                                                                    ...currentColumn,
                                                                    links: currentColumn.links.map((currentLink, currentLinkIndex) => (
                                                                        currentLinkIndex === linkIndex ? { ...currentLink, url: value } : currentLink
                                                                    )),
                                                                }
                                                                : currentColumn
                                                        )),
                                                    },
                                                }))}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <TextField
                                label="Newsletter Label"
                                value={content.footer.newsletter_label}
                                onChange={(value) => setContent((current) => ({ ...current, footer: { ...current.footer, newsletter_label: value } }))}
                            />
                            <TextField
                                label="Copyright Text"
                                value={content.footer.copyright_text}
                                onChange={(value) => setContent((current) => ({ ...current, footer: { ...current.footer, copyright_text: value } }))}
                            />
                        </div>
                    </SectionCard>

                    <section className="grid grid-cols-1 xl:grid-cols-[1.1fr_1.4fr] gap-6">
                        <div className="rounded border shadow-sm p-6 flex flex-col gap-4" style={{ backgroundColor: ADMIN_COLORS.cardBg, borderColor: ADMIN_COLORS.border }}>
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl italic" style={{ fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textPrimary }}>Collections</h3>
                                {editingCollectionId && (
                                    <button type="button" onClick={resetCollectionEditor} className="text-sm hover:underline" style={{ color: ADMIN_COLORS.burgundy }}>
                                        New Collection
                                    </button>
                                )}
                            </div>
                            <form onSubmit={saveCollection} className="flex flex-col gap-4">
                                <TextField
                                    label="Collection Name"
                                    value={collectionForm.name}
                                    onChange={(value) => setCollectionForm((current) => ({ ...current, name: value }))}
                                />
                                <TextAreaField
                                    label="Description"
                                    rows={3}
                                    value={collectionForm.description}
                                    onChange={(value) => setCollectionForm((current) => ({ ...current, description: value }))}
                                />
                                <TextField
                                    label="Cover Image URL"
                                    value={collectionForm.cover_image}
                                    onChange={(value) => setCollectionForm((current) => ({ ...current, cover_image: value }))}
                                />
                                <TextField
                                    label="Display Order"
                                    value={collectionForm.display_order}
                                    onChange={(value) => setCollectionForm((current) => ({ ...current, display_order: value }))}
                                    type="number"
                                />
                                <div className="flex gap-3">
                                    <button type="submit" className="px-4 py-2 rounded hover:opacity-90 transition" style={{ backgroundColor: ADMIN_COLORS.burgundy, color: 'white' }}>
                                        {editingCollectionId ? 'Update Collection' : 'Create Collection'}
                                    </button>
                                    <button type="button" onClick={resetCollectionEditor} className="px-4 py-2 rounded border hover:bg-black/5 transition" style={{ borderColor: ADMIN_COLORS.border, color: ADMIN_COLORS.textPrimary }}>
                                        Clear
                                    </button>
                                </div>
                            </form>

                            <div className="flex flex-col gap-3 pt-2" style={{ borderTop: `1px solid ${ADMIN_COLORS.border}` }}>
                                {collections.length === 0 && (
                                    <p style={{ color: ADMIN_COLORS.textMuted }}>No collections created yet.</p>
                                )}
                                {collections.map((collection) => (
                                    <div
                                        key={collection.id}
                                        className="rounded border p-3 cursor-pointer transition-colors hover:bg-[#faf6f0]"
                                        style={{
                                            borderColor: selectedCollectionId === collection.id ? ADMIN_COLORS.burgundy : ADMIN_COLORS.border,
                                            backgroundColor: selectedCollectionId === collection.id ? `${ADMIN_COLORS.burgundy}10` : ADMIN_COLORS.cardBg,
                                        }}
                                        onClick={() => setSelectedCollectionId(collection.id)}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <h4 className="font-semibold" style={{ color: ADMIN_COLORS.textPrimary }}>{collection.name}</h4>
                                                <p className="text-sm mt-1" style={{ color: ADMIN_COLORS.textSecondary }}>{collection.description || 'No description'}</p>
                                            </div>
                                            <div className="flex gap-2 shrink-0">
                                                <button type="button" onClick={(event) => { event.stopPropagation(); startEditingCollection(collection); }} className="text-sm hover:underline" style={{ color: ADMIN_COLORS.burgundy }}>
                                                    Edit
                                                </button>
                                                <button type="button" onClick={(event) => { event.stopPropagation(); deleteCollection(collection.id); }} className="text-sm hover:underline" style={{ color: ADMIN_COLORS.red }}>
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {collectionStatus && (
                                <p className="text-sm" style={{ color: collectionStatus.startsWith('Failed') ? ADMIN_COLORS.red : ADMIN_COLORS.textMuted }}>
                                    {collectionStatus}
                                </p>
                            )}
                        </div>

                        <div className="rounded border shadow-sm p-6 flex flex-col gap-4" style={{ backgroundColor: ADMIN_COLORS.cardBg, borderColor: ADMIN_COLORS.border }}>
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl italic" style={{ fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textPrimary }}>
                                    {selectedCollection ? `${selectedCollection.name} Books` : 'Collection Books'}
                                </h3>
                            </div>

                            {selectedCollection ? (
                                <>
                                    <div className="grid grid-cols-[1fr_auto_auto] gap-3">
                                        <select
                                            value={selectedBookId}
                                            onChange={(event) => setSelectedBookId(event.target.value)}
                                            className="px-3 py-2 rounded border"
                                            style={{ borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.primaryBg, color: ADMIN_COLORS.textPrimary }}
                                        >
                                            <option value="">Select a book to add</option>
                                            {availableBooks.map((book) => (
                                                <option key={book.id} value={String(book.id)}>{book.title} · {book.author}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            value={selectedBookOrder}
                                            onChange={(event) => setSelectedBookOrder(event.target.value)}
                                            className="px-3 py-2 rounded border w-28"
                                            style={{ borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.primaryBg, color: ADMIN_COLORS.textPrimary }}
                                        />
                                        <button
                                            type="button"
                                            onClick={addBookToCollection}
                                            disabled={!selectedBookId}
                                            className="px-4 py-2 rounded hover:opacity-90 transition disabled:opacity-60"
                                            style={{ backgroundColor: ADMIN_COLORS.burgundy, color: 'white' }}
                                        >
                                            Add Book
                                        </button>
                                    </div>

                                    <div className="overflow-hidden border rounded" style={{ borderColor: ADMIN_COLORS.border }}>
                                        <table className="w-full">
                                            <thead style={{ backgroundColor: `${ADMIN_COLORS.secondaryBg}70` }}>
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider" style={{ color: ADMIN_COLORS.textMuted }}>Title</th>
                                                    <th className="px-4 py-3 text-left text-xs uppercase tracking-wider" style={{ color: ADMIN_COLORS.textMuted }}>Author</th>
                                                    <th className="px-4 py-3 text-center text-xs uppercase tracking-wider" style={{ color: ADMIN_COLORS.textMuted }}>Available</th>
                                                    <th className="px-4 py-3 text-right text-xs uppercase tracking-wider" style={{ color: ADMIN_COLORS.textMuted }}>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedCollection.books?.length ? selectedCollection.books.map((book) => (
                                                    <tr key={`${selectedCollection.id}-${book.id}`} style={{ borderTop: `1px solid ${ADMIN_COLORS.border}` }}>
                                                        <td className="px-4 py-3" style={{ color: ADMIN_COLORS.textPrimary }}>{book.title}</td>
                                                        <td className="px-4 py-3" style={{ color: ADMIN_COLORS.textSecondary }}>{book.author}</td>
                                                        <td className="px-4 py-3 text-center" style={{ color: book.available_copies > 0 ? ADMIN_COLORS.green : ADMIN_COLORS.red }}>
                                                            {book.available_copies}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <button type="button" onClick={() => removeBookFromCollection(selectedCollection.id, book.id)} className="text-sm hover:underline" style={{ color: ADMIN_COLORS.red }}>
                                                                Remove
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )) : (
                                                    <tr>
                                                        <td colSpan="4" className="px-4 py-6 text-center" style={{ color: ADMIN_COLORS.textMuted }}>
                                                            No books in this collection yet.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            ) : (
                                <p style={{ color: ADMIN_COLORS.textMuted }}>Select a collection to manage its books.</p>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

function SectionCard({ title, status, saving, onSave, onReset, children }) {
    return (
        <section className="rounded border shadow-sm p-6 flex flex-col gap-4" style={{ backgroundColor: ADMIN_COLORS.cardBg, borderColor: ADMIN_COLORS.border }}>
            <div className="flex items-center justify-between gap-4">
                <h3 className="text-xl italic" style={{ fontFamily: "'Newsreader', serif", color: ADMIN_COLORS.textPrimary }}>{title}</h3>
                <div className="flex items-center gap-3">
                    {status && (
                        <span className="text-sm" style={{ color: status.startsWith('Failed') ? ADMIN_COLORS.red : ADMIN_COLORS.textMuted }}>{status}</span>
                    )}
                    <button type="button" onClick={onReset} className="px-3 py-2 rounded border hover:bg-black/5 transition" style={{ borderColor: ADMIN_COLORS.border, color: ADMIN_COLORS.textPrimary }}>
                        Reset
                    </button>
                    <button type="button" onClick={onSave} disabled={saving} className="px-4 py-2 rounded hover:opacity-90 transition disabled:opacity-60" style={{ backgroundColor: ADMIN_COLORS.burgundy, color: 'white' }}>
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
            {children}
        </section>
    );
}

function TextField({ label, value, onChange, type = 'text' }) {
    return (
        <label className="flex flex-col gap-2">
            <span className="text-sm font-medium" style={{ color: ADMIN_COLORS.textSecondary }}>{label}</span>
            <input
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-full px-3 py-2 rounded border"
                style={{ borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.primaryBg, color: ADMIN_COLORS.textPrimary }}
            />
        </label>
    );
}

function TextAreaField({ label, value, onChange, rows = 3 }) {
    return (
        <label className="flex flex-col gap-2">
            <span className="text-sm font-medium" style={{ color: ADMIN_COLORS.textSecondary }}>{label}</span>
            <textarea
                rows={rows}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-full px-3 py-2 rounded border resize-y"
                style={{ borderColor: ADMIN_COLORS.border, backgroundColor: ADMIN_COLORS.primaryBg, color: ADMIN_COLORS.textPrimary }}
            />
        </label>
    );
}
