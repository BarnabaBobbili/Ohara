import express from 'express';
import axios from 'axios';
import prisma from '../db/prisma.js';
import { withCache } from '../utils/cache.js';
import { parseSkipLimitPagination } from '../utils/pagination.js';

const router = express.Router();
const EXTERNAL_SEARCH_CACHE_MS = Number.parseInt(process.env.EXTERNAL_SEARCH_CACHE_MS || '120000', 10);

// ============ API Client Classes ============

class OpenLibraryAPI {
    constructor() {
        this.baseUrl = 'https://openlibrary.org';
        this.coversUrl = 'https://covers.openlibrary.org/b';
    }

    async search(query, limit = 10) {
        try {
            const res = await axios.get(`${this.baseUrl}/search.json`, {
                params: { q: query, limit },
                timeout: 10000,
            });
            return (res.data.docs || []).map(doc => ({
                source: 'openlibrary',
                source_id: doc.key?.replace('/works/', '') || '',
                title: doc.title || 'Unknown',
                author: doc.author_name?.[0] || 'Unknown',
                isbn: doc.isbn?.[0] || null,
                cover_url: doc.cover_i ? `${this.coversUrl}/id/${doc.cover_i}-M.jpg` : null,
                first_publish_year: doc.first_publish_year,
                is_public_domain: this._checkPublicDomain(doc.first_publish_year),
            }));
        } catch (e) {
            console.error('OpenLibrary search error:', e.message);
            return [];
        }
    }

    async getBook(workId) {
        try {
            const res = await axios.get(`${this.baseUrl}/works/${workId}.json`, { timeout: 10000 });
            const data = res.data;
            return {
                source: 'openlibrary',
                source_id: workId,
                title: data.title,
                author: typeof data.authors?.[0]?.author === 'object'
                    ? data.authors[0].author.key : 'Unknown',
                description: typeof data.description === 'string'
                    ? data.description : data.description?.value || '',
                cover_url: data.covers?.[0]
                    ? `${this.coversUrl}/id/${data.covers[0]}-L.jpg` : null,
                subjects: data.subjects?.slice(0, 10) || [],
            };
        } catch (e) {
            console.error('OpenLibrary getBook error:', e.message);
            return null;
        }
    }

    _checkPublicDomain(year) {
        return year ? year < 1928 : false;
    }
}

class GutendexAPI {
    constructor() {
        this.baseUrl = 'https://gutendex.com';
    }

    async search(query, limit = 10) {
        try {
            const res = await axios.get(`${this.baseUrl}/books`, {
                params: { search: query, page_size: limit },
                timeout: 10000,
            });
            return (res.data.results || []).map(book => ({
                source: 'gutendex',
                source_id: String(book.id),
                title: book.title || 'Unknown',
                author: book.authors?.[0]?.name || 'Unknown',
                cover_url: book.formats?.['image/jpeg'] || null,
                is_public_domain: true,
                formats: this._extractFormats(book.formats || {}),
            }));
        } catch (e) {
            console.error('Gutendex search error:', e.message);
            return [];
        }
    }

    async getBook(bookId) {
        try {
            const res = await axios.get(`${this.baseUrl}/books/${bookId}`, { timeout: 10000 });
            const book = res.data;
            return {
                source: 'gutendex',
                source_id: String(book.id),
                title: book.title,
                author: book.authors?.[0]?.name || 'Unknown',
                cover_url: book.formats?.['image/jpeg'] || null,
                subjects: book.subjects || [],
                is_public_domain: true,
                formats: this._extractFormats(book.formats || {}),
                download_count: book.download_count,
            };
        } catch (e) {
            console.error('Gutendex getBook error:', e.message);
            return null;
        }
    }

    _extractFormats(formats) {
        const result = {};
        if (formats['application/epub+zip']) result.epub = formats['application/epub+zip'];
        if (formats['application/x-mobipocket-ebook']) result.mobi = formats['application/x-mobipocket-ebook'];
        if (formats['text/html']) result.html = formats['text/html'];
        if (formats['text/plain; charset=utf-8']) result.txt = formats['text/plain; charset=utf-8'];
        return result;
    }
}

class InternetArchiveAPI {
    constructor() {
        this.baseUrl = 'https://archive.org';
    }

    async search(query, limit = 10) {
        try {
            const res = await axios.get(`${this.baseUrl}/advancedsearch.php`, {
                params: {
                    q: `${query} AND mediatype:texts`,
                    fl: 'identifier,title,creator,description,year,downloads,subject',
                    rows: limit,
                    output: 'json',
                },
                timeout: 15000,
            });
            return (res.data.response?.docs || []).map(doc => ({
                source: 'internet_archive',
                source_id: doc.identifier,
                title: doc.title || 'Unknown',
                author: Array.isArray(doc.creator) ? doc.creator[0] : (doc.creator || 'Unknown'),
                cover_url: `${this.baseUrl}/services/img/${doc.identifier}`,
                year: doc.year,
                downloads: doc.downloads,
            }));
        } catch (e) {
            console.error('InternetArchive search error:', e.message);
            return [];
        }
    }

    async getBook(identifier) {
        try {
            const res = await axios.get(`${this.baseUrl}/metadata/${identifier}`, {
                timeout: 15000,
            });
            const metadata = res.data.metadata || {};
            const files = res.data.files || [];

            const formats = {};
            for (const file of files) {
                if (file.format === 'EPUB') formats.epub = `${this.baseUrl}/download/${identifier}/${file.name}`;
                if (file.format === 'DjVuTXT' || file.format === 'Text PDF') {
                    formats.pdf = `${this.baseUrl}/download/${identifier}/${file.name}`;
                }
            }

            return {
                source: 'internet_archive',
                source_id: identifier,
                title: metadata.title || 'Unknown',
                author: Array.isArray(metadata.creator) ? metadata.creator[0] : (metadata.creator || 'Unknown'),
                description: Array.isArray(metadata.description) ? metadata.description[0] : (metadata.description || ''),
                cover_url: `${this.baseUrl}/services/img/${identifier}`,
                subjects: Array.isArray(metadata.subject) ? metadata.subject : (metadata.subject ? [metadata.subject] : []),
                year: metadata.year || metadata.date,
                formats,
                read_url: `${this.baseUrl}/details/${identifier}`,
            };
        } catch (e) {
            console.error('InternetArchive getBook error:', e.message);
            return null;
        }
    }
}

class GoogleBooksAPI {
    constructor(apiKey) {
        this.baseUrl = 'https://www.googleapis.com/books/v1';
        this.apiKey = apiKey;
    }

    async search(query, limit = 10) {
        try {
            const params = { q: query, maxResults: limit };
            if (this.apiKey) params.key = this.apiKey;

            const res = await axios.get(`${this.baseUrl}/volumes`, {
                params,
                timeout: 10000,
            });
            return (res.data.items || []).map(item => {
                const info = item.volumeInfo || {};
                return {
                    source: 'google_books',
                    source_id: item.id,
                    title: info.title || 'Unknown',
                    author: info.authors?.[0] || 'Unknown',
                    isbn: this._getISBN(info.industryIdentifiers || []),
                    cover_url: info.imageLinks?.thumbnail || null,
                    description: info.description || '',
                    published_date: info.publishedDate,
                    categories: info.categories || [],
                };
            });
        } catch (e) {
            console.error('GoogleBooks search error:', e.message);
            return [];
        }
    }

    async getVolume(volumeId) {
        try {
            const params = {};
            if (this.apiKey) params.key = this.apiKey;
            const res = await axios.get(`${this.baseUrl}/volumes/${volumeId}`, { params, timeout: 10000 });
            const info = res.data.volumeInfo || {};
            return {
                source: 'google_books',
                source_id: res.data.id,
                title: info.title,
                author: info.authors?.join(', ') || 'Unknown',
                isbn: this._getISBN(info.industryIdentifiers || []),
                cover_url: info.imageLinks?.large || info.imageLinks?.thumbnail || null,
                description: info.description || '',
                publisher: info.publisher,
                published_date: info.publishedDate,
                page_count: info.pageCount,
                categories: info.categories || [],
                preview_link: info.previewLink,
            };
        } catch (e) {
            console.error('GoogleBooks getVolume error:', e.message);
            return null;
        }
    }

    _getISBN(identifiers) {
        const isbn13 = identifiers.find(i => i.type === 'ISBN_13');
        const isbn10 = identifiers.find(i => i.type === 'ISBN_10');
        return isbn13?.identifier || isbn10?.identifier || null;
    }
}

// ============ Singleton instances ============
const openLibrary = new OpenLibraryAPI();
const gutendex = new GutendexAPI();
const internetArchive = new InternetArchiveAPI();
const googleBooks = new GoogleBooksAPI(process.env.GOOGLE_BOOKS_API_KEY);

// ============ Routes ============

// GET /api/external-books/search - Search across all sources
router.get('/search', async (req, res) => {
    try {
        const { q, source } = req.query;
        if (!q) return res.status(400).json({ detail: 'Query parameter "q" is required' });

        const { limit } = parseSkipLimitPagination(
            { limit: req.query.limit, skip: 0 },
            { defaultLimit: 10, maxLimit: 20, maxSkip: 0 }
        );
        const cacheKey = `external:search:${source || 'all'}:${String(q).toLowerCase()}:${limit}`;

        const results = await withCache(cacheKey, EXTERNAL_SEARCH_CACHE_MS, async () => {
            let aggregated = [];

            if (!source || source === 'all') {
                const [ol, gx, ia, gb] = await Promise.allSettled([
                    openLibrary.search(q, limit),
                    gutendex.search(q, limit),
                    internetArchive.search(q, limit),
                    googleBooks.search(q, limit),
                ]);
                aggregated = [
                    ...(ol.status === 'fulfilled' ? ol.value : []),
                    ...(gx.status === 'fulfilled' ? gx.value : []),
                    ...(ia.status === 'fulfilled' ? ia.value : []),
                    ...(gb.status === 'fulfilled' ? gb.value : []),
                ];
            } else {
                const apis = { openlibrary: openLibrary, gutendex, internet_archive: internetArchive, google_books: googleBooks };
                const api = apis[source];
                if (!api) return null;
                aggregated = await api.search(q, limit);
            }

            return aggregated;
        });

        if (results === null) {
            return res.status(400).json({ detail: `Unknown source: ${source}` });
        }

        res.json({
            query: q,
            source: source || 'all',
            total_results: results.length,
            results,
        });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// GET /api/external-books/sources - List available sources
router.get('/sources', (req, res) => {
    res.json([
        { id: 'openlibrary', name: 'Open Library', description: 'Free lending library' },
        { id: 'gutendex', name: 'Project Gutenberg', description: 'Free public domain ebooks' },
        { id: 'internet_archive', name: 'Internet Archive', description: 'Digital library' },
        { id: 'google_books', name: 'Google Books', description: 'Metadata and previews' },
    ]);
});

// GET /api/external-books/:source/:sourceId - Get book details from a source
router.get('/:source/:sourceId', async (req, res) => {
    try {
        const { source, sourceId } = req.params;
        let book = null;

        switch (source) {
            case 'openlibrary': book = await openLibrary.getBook(sourceId); break;
            case 'gutendex': book = await gutendex.getBook(sourceId); break;
            case 'internet_archive': book = await internetArchive.getBook(sourceId); break;
            case 'google_books': book = await googleBooks.getVolume(sourceId); break;
            default: return res.status(400).json({ detail: `Unknown source: ${source}` });
        }

        if (!book) return res.status(404).json({ detail: 'Book not found' });

        // Cache the result in PostgreSQL without forcing failed upserts.
        try {
            const existing = await prisma.external_book_cache.findFirst({
                where: { source, source_id: sourceId },
                select: { id: true },
            });

            if (existing) {
                await prisma.external_book_cache.update({
                    where: { id: existing.id },
                    data: {
                        title: book.title,
                        author: book.author,
                        cover_url: book.cover_url,
                        description: book.description || '',
                        subjects: JSON.stringify(book.subjects || []),
                        formats_available: JSON.stringify(book.formats || {}),
                        is_public_domain: book.is_public_domain || false,
                        cached_at: new Date(),
                    },
                });
            } else {
                await prisma.external_book_cache.create({
                    data: {
                        source,
                        source_id: sourceId,
                        title: book.title,
                        author: book.author,
                        cover_url: book.cover_url,
                        description: book.description || '',
                        subjects: JSON.stringify(book.subjects || []),
                        formats_available: JSON.stringify(book.formats || {}),
                        is_public_domain: book.is_public_domain || false,
                    },
                });
            }
        } catch (cacheError) {
            console.error('Cache write failed:', cacheError.message);
        }

        res.json(book);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// POST /api/external-books/enrich - Enrich metadata via Google Books
router.post('/enrich', async (req, res) => {
    try {
        const { isbn, title, author } = req.body;
        let query = isbn || `${title} ${author}`;
        const results = await googleBooks.search(query, 1);

        if (results.length === 0) {
            return res.status(404).json({ detail: 'No enrichment data found' });
        }

        const volumeId = results[0].source_id;
        const detailed = await googleBooks.getVolume(volumeId);
        res.json(detailed);
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// GET /api/external-books/:source/:sourceId/read-url - Get read/download URL
router.get('/:source/:sourceId/read-url', async (req, res) => {
    try {
        const { source, sourceId } = req.params;
        let readUrl = null;

        switch (source) {
            case 'openlibrary':
                readUrl = `https://openlibrary.org/works/${sourceId}`;
                break;
            case 'gutendex': {
                const book = await gutendex.getBook(sourceId);
                readUrl = book?.formats?.html || book?.formats?.epub || `https://www.gutenberg.org/ebooks/${sourceId}`;
                break;
            }
            case 'internet_archive':
                readUrl = `https://archive.org/details/${sourceId}`;
                break;
            case 'google_books': {
                const vol = await googleBooks.getVolume(sourceId);
                readUrl = vol?.preview_link || `https://books.google.com/books?id=${sourceId}`;
                break;
            }
            default:
                return res.status(400).json({ detail: `Unknown source: ${source}` });
        }

        res.json({ read_url: readUrl });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

export default router;

