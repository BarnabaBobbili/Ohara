import dotenv from 'dotenv';
import prisma, { closePostgresPool } from './src/db/prisma.js';
import { connectMySQL, getMySQLPool, closeMySQL } from './src/db/mysql.js';

dotenv.config();

const NEWS_TABLE = 'library_news';
const NEWS_SEED_MARKER = 'seed:site-content:v1';
const COLLECTION_SLUG_PREFIX = 'seed-curated-';
const MAX_BOOKS_PER_COLLECTION = 16;
const MIN_BOOKS_PER_COLLECTION = 8;

const clamp = (value, max) => {
    const text = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
    return text.length > max ? text.slice(0, max) : text;
};

const slugify = (value) => clamp(
    String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-'),
    200
);

const dedupeBooks = (books) => {
    const seen = new Set();
    const result = [];
    for (const book of books) {
        if (!book?.id || seen.has(book.id)) continue;
        seen.add(book.id);
        result.push(book);
    }
    return result;
};

const naturalJoin = (items) => {
    const safeItems = items.filter(Boolean);
    if (safeItems.length === 0) return '';
    if (safeItems.length === 1) return safeItems[0];
    if (safeItems.length === 2) return `${safeItems[0]} and ${safeItems[1]}`;
    return `${safeItems.slice(0, -1).join(', ')}, and ${safeItems[safeItems.length - 1]}`;
};

const daysAgo = (days) => new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

const selectCollectionBooks = (primary, fallback, maxCount = MAX_BOOKS_PER_COLLECTION) => (
    dedupeBooks([...primary, ...fallback]).slice(0, maxCount)
);

const fetchBookSignals = async () => {
    const booksRaw = await prisma.books.findMany({
        where: { is_active: true },
        select: {
            id: true,
            title: true,
            author: true,
            category: true,
            cover_image_url: true,
            publication_year: true,
            available_copies: true,
            created_at: true,
            _count: {
                select: {
                    transactions: true,
                },
            },
        },
    });

    const ratingRows = await prisma.book_ratings.groupBy({
        by: ['book_id'],
        _avg: { rating: true },
        _count: { _all: true },
    });
    const ratingsByBookId = new Map(
        ratingRows.map((row) => [
            row.book_id,
            {
                avg: Number(row._avg?.rating || 0),
                count: Number(row._count?._all || 0),
            },
        ])
    );

    const demandRows = await prisma.reservations.groupBy({
        by: ['book_id'],
        where: {
            status: { in: ['pending', 'ready'] },
        },
        _count: { _all: true },
    });
    const pendingByBookId = new Map(
        demandRows.map((row) => [row.book_id, Number(row._count?._all || 0)])
    );

    const currentYear = new Date().getUTCFullYear();
    const books = booksRaw.map((book) => {
        const rating = ratingsByBookId.get(book.id) || { avg: 0, count: 0 };
        const borrowCount = Number(book._count?.transactions || 0);
        const pendingCount = pendingByBookId.get(book.id) || 0;
        const recencyBoost = book.publication_year && book.publication_year >= currentYear - 2 ? 4 : 0;
        const availabilityBoost = book.available_copies > 0 ? 5 : 0;
        const score = (borrowCount * 3)
            + (pendingCount * 4)
            + (rating.avg * Math.min(rating.count, 6))
            + recencyBoost
            + availabilityBoost;

        return {
            ...book,
            borrow_count: borrowCount,
            pending_count: pendingCount,
            avg_rating: Number(rating.avg.toFixed(2)),
            rating_count: rating.count,
            curation_score: Number(score.toFixed(2)),
        };
    });

    const categoryMap = new Map();
    for (const book of books) {
        const categoryName = clamp(book.category || 'General', 100) || 'General';
        const current = categoryMap.get(categoryName) || { name: categoryName, count: 0, books: [] };
        current.count += 1;
        current.books.push(book);
        categoryMap.set(categoryName, current);
    }

    const topCategories = [...categoryMap.values()]
        .map((entry) => ({
            ...entry,
            books: entry.books.sort((a, b) => (
                b.curation_score - a.curation_score
                || b.borrow_count - a.borrow_count
                || b.avg_rating - a.avg_rating
                || a.title.localeCompare(b.title)
            )),
        }))
        .sort((a, b) => b.count - a.count);

    return { books, topCategories };
};

const buildCollectionDefinitions = ({ books, topCategories }) => {
    const currentYear = new Date().getUTCFullYear();
    const sixtyDaysAgo = daysAgo(60);

    const byPopularity = [...books].sort((a, b) => (
        b.borrow_count - a.borrow_count
        || b.pending_count - a.pending_count
        || b.avg_rating - a.avg_rating
        || a.title.localeCompare(b.title)
    ));
    const byRating = [...books]
        .filter((book) => book.rating_count >= 2)
        .sort((a, b) => (
            b.avg_rating - a.avg_rating
            || b.rating_count - a.rating_count
            || b.borrow_count - a.borrow_count
            || a.title.localeCompare(b.title)
        ));
    const byFreshness = [...books]
        .filter((book) => (
            (book.publication_year && book.publication_year >= currentYear - 2)
            || (book.created_at && new Date(book.created_at) >= sixtyDaysAgo)
        ))
        .sort((a, b) => (
            (b.publication_year || 0) - (a.publication_year || 0)
            || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            || b.curation_score - a.curation_score
        ));
    const byDemand = [...books]
        .filter((book) => book.pending_count > 0)
        .sort((a, b) => (
            b.pending_count - a.pending_count
            || b.borrow_count - a.borrow_count
            || b.avg_rating - a.avg_rating
            || a.title.localeCompare(b.title)
        ));
    const byAvailable = [...books]
        .filter((book) => book.available_copies > 0)
        .sort((a, b) => (
            b.curation_score - a.curation_score
            || b.borrow_count - a.borrow_count
            || b.avg_rating - a.avg_rating
            || a.title.localeCompare(b.title)
        ));
    const byScore = [...books].sort((a, b) => (
        b.curation_score - a.curation_score
        || b.borrow_count - a.borrow_count
        || b.avg_rating - a.avg_rating
        || a.title.localeCompare(b.title)
    ));

    const definitions = [
        {
            slug: `${COLLECTION_SLUG_PREFIX}readers-favorites`,
            name: 'Readers\' Favorites',
            description: 'Most-borrowed titles that are consistently loved by our readers.',
            books: selectCollectionBooks(byPopularity, byScore),
        },
        {
            slug: `${COLLECTION_SLUG_PREFIX}highly-rated-picks`,
            name: 'Highly Rated Picks',
            description: 'Books with strong member ratings and sustained reading momentum.',
            books: selectCollectionBooks(byRating.length ? byRating : byScore, byScore),
        },
        {
            slug: `${COLLECTION_SLUG_PREFIX}new-noteworthy`,
            name: 'New & Noteworthy',
            description: 'Recent arrivals and fresh publications currently drawing attention.',
            books: selectCollectionBooks(byFreshness.length ? byFreshness : byAvailable, byScore),
        },
        {
            slug: `${COLLECTION_SLUG_PREFIX}high-demand-holds`,
            name: 'In High Demand',
            description: 'Books with active hold queues and strong community interest.',
            books: selectCollectionBooks(byDemand.length ? byDemand : byPopularity, byScore),
        },
        {
            slug: `${COLLECTION_SLUG_PREFIX}available-now`,
            name: 'Available Right Now',
            description: 'Great picks you can borrow immediately without waiting in line.',
            books: selectCollectionBooks(byAvailable.length ? byAvailable : byScore, byScore),
        },
    ];

    const categorySpotlights = topCategories
        .slice(0, 3)
        .map((category) => ({
            slug: `${COLLECTION_SLUG_PREFIX}${slugify(category.name)}-spotlight`,
            name: `${category.name} Spotlight`,
            description: `A curated shelf for ${category.name.toLowerCase()} readers, based on borrowing and ratings.`,
            books: selectCollectionBooks(category.books, byScore),
        }));

    return [...definitions, ...categorySpotlights]
        .map((collection, index) => {
            const selectedBooks = dedupeBooks(collection.books).slice(0, MAX_BOOKS_PER_COLLECTION);
            const coverImage = selectedBooks.find((book) => book.cover_image_url)?.cover_image_url || null;
            return {
                ...collection,
                description: clamp(collection.description, 1000),
                books: selectedBooks,
                cover_image: coverImage,
                display_order: index + 1,
                is_pinned: index < 3,
                is_featured: index < 3,
            };
        })
        .filter((collection) => collection.books.length >= MIN_BOOKS_PER_COLLECTION);
};

const seedCollections = async (definitions) => {
    const targetSlugs = definitions.map((definition) => definition.slug);
    const cleanupResult = await prisma.collections.deleteMany({
        where: {
            AND: [
                { slug: { startsWith: COLLECTION_SLUG_PREFIX } },
                { slug: { notIn: targetSlugs } },
            ],
        },
    });

    let created = 0;
    let updated = 0;
    let linksInserted = 0;

    for (const definition of definitions) {
        const existing = await prisma.collections.findUnique({
            where: { slug: definition.slug },
            select: { id: true },
        });

        const collection = await prisma.collections.upsert({
            where: { slug: definition.slug },
            create: {
                name: clamp(definition.name, 200),
                slug: definition.slug,
                description: definition.description,
                cover_image: definition.cover_image,
                display_order: definition.display_order,
                is_active: true,
                is_featured: definition.is_featured,
                is_pinned: definition.is_pinned,
                created_by: null,
            },
            update: {
                name: clamp(definition.name, 200),
                description: definition.description,
                cover_image: definition.cover_image,
                display_order: definition.display_order,
                is_active: true,
                is_featured: definition.is_featured,
                is_pinned: definition.is_pinned,
                updated_at: new Date(),
            },
            select: { id: true },
        });

        if (existing) updated += 1;
        else created += 1;

        await prisma.collection_books.deleteMany({
            where: { collection_id: collection.id },
        });

        if (definition.books.length > 0) {
            const bookLinks = definition.books.map((book, index) => ({
                collection_id: collection.id,
                book_id: book.id,
                display_order: index + 1,
                added_by: null,
            }));
            const inserted = await prisma.collection_books.createMany({
                data: bookLinks,
                skipDuplicates: true,
            });
            linksInserted += inserted.count;
        }
    }

    return {
        deletedLegacySeedCollections: cleanupResult.count,
        created,
        updated,
        linksInserted,
    };
};

const ensureNewsTable = async (mysqlPool) => {
    await mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS ${NEWS_TABLE} (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(500) NOT NULL,
            content TEXT NOT NULL,
            summary VARCHAR(500),
            image_url VARCHAR(1000),
            category VARCHAR(100) DEFAULT 'general',
            author VARCHAR(200),
            is_featured BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            created_by VARCHAR(200)
        )
    `);
};

const buildNewsArticles = ({ books, topCategories, collections }) => {
    const byPopularity = [...books].sort((a, b) => (
        b.borrow_count - a.borrow_count
        || b.pending_count - a.pending_count
        || b.avg_rating - a.avg_rating
    ));
    const byRating = [...books].sort((a, b) => (
        b.avg_rating - a.avg_rating
        || b.rating_count - a.rating_count
        || b.borrow_count - a.borrow_count
    ));
    const byDemand = [...books].sort((a, b) => (
        b.pending_count - a.pending_count
        || b.borrow_count - a.borrow_count
        || b.avg_rating - a.avg_rating
    ));

    const topBook = byPopularity[0];
    const topRated = byRating[0];
    const highDemand = byDemand[0];

    const collectionNames = collections.slice(0, 3).map((collection) => collection.name);
    const highlightedCategories = topCategories.slice(0, 3).map((category) => category.name);

    const authorScores = new Map();
    for (const book of books) {
        const authorName = clamp(book.author || '', 300);
        if (!authorName) continue;
        const current = authorScores.get(authorName) || { score: 0, count: 0 };
        current.score += book.borrow_count + book.pending_count + book.rating_count;
        current.count += 1;
        authorScores.set(authorName, current);
    }
    const featuredAuthor = [...authorScores.entries()]
        .sort((a, b) => b[1].score - a[1].score || b[1].count - a[1].count)[0]?.[0] || 'Our Library Team';

    const images = [
        'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=900&h=600&fit=crop',
        'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=900&h=600&fit=crop',
        'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=900&h=600&fit=crop',
        'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=900&h=600&fit=crop',
        'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=900&h=600&fit=crop',
        'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=900&h=600&fit=crop',
        'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=900&h=600&fit=crop',
        'https://images.unsplash.com/photo-1463320726281-696a485928c7?w=900&h=600&fit=crop',
    ];

    const totalBooks = books.length;
    const categorySummary = naturalJoin(highlightedCategories);
    const collectionSummary = naturalJoin(collectionNames);

    return [
        {
            title: topBook
                ? `${topBook.title} is this week\'s most borrowed title`
                : 'This week\'s borrowing highlights are now live',
            summary: topBook
                ? `Readers checked out "${topBook.title}" by ${topBook.author} more than any other title this week.`
                : 'Borrowing trends have been refreshed with this week\'s top picks.',
            content: topBook
                ? `Our borrowing activity shows strong momentum around "${topBook.title}" by ${topBook.author}.\n\nMembers looking for similar reads can now browse updated shelves and recommendation blocks across the site.\n\nIf this title is currently in demand, placing a reservation is the fastest way to secure your copy.`
                : 'This week\'s library usage report is now available on the member dashboard.\n\nBorrowing trends, reservations, and active categories have been refreshed.\n\nCheck the catalog and collections page to discover what other readers are exploring.',
            category: 'update',
            author: 'Circulation Desk',
            image_url: images[0],
            is_featured: true,
            published_at: daysAgo(0),
        },
        {
            title: 'New curated shelves added to the library homepage',
            summary: collectionSummary
                ? `We just published fresh collections including ${collectionSummary}.`
                : 'Freshly curated shelves are now available in Collections.',
            content: collectionSummary
                ? `Our librarians have prepared updated collections to make discovery easier.\n\nFeatured shelves now include ${collectionSummary}, each built from real borrowing, rating, and demand patterns.\n\nVisit the Collections page to explore each shelf and jump directly into book details.`
                : 'Our librarians have prepared updated collections to make discovery easier.\n\nEach shelf is built from recent borrowing and rating patterns.\n\nVisit the Collections page to explore and borrow directly.',
            category: 'collection',
            author: 'Curation Team',
            image_url: images[1],
            is_featured: true,
            published_at: daysAgo(1),
        },
        {
            title: 'Category spotlight round-up',
            summary: categorySummary
                ? `Top reading momentum this month: ${categorySummary}.`
                : 'Explore this month\'s most active reading categories.',
            content: categorySummary
                ? `Community reading trends this month show strong activity in ${categorySummary}.\n\nTo help members discover more in each area, we added category spotlight shelves with top-performing books.\n\nUse filters in the catalog or open a spotlight collection to continue exploring.`
                : 'Community reading trends have shifted this month with fresh category momentum.\n\nTo help members discover more quickly, spotlight shelves have been refreshed.\n\nUse filters in the catalog or open a spotlight collection to continue exploring.',
            category: 'collection',
            author: 'Discovery Desk',
            image_url: images[2],
            is_featured: false,
            published_at: daysAgo(2),
        },
        {
            title: 'Weekend author spotlight at Ohara Library',
            summary: `This weekend we are highlighting works by ${featuredAuthor}.`,
            content: `This weekend\'s in-library display will feature notable titles by ${featuredAuthor}.\n\nMembers can browse physical copies, related recommendations, and librarian notes at the front display.\n\nIf a title is currently checked out, place a quick reservation to join the queue.`,
            category: 'event',
            author: 'Events Team',
            image_url: images[3],
            is_featured: false,
            published_at: daysAgo(3),
        },
        {
            title: 'Extended quiet-study hours announced',
            summary: 'The library will run extended evening hours on peak study days this month.',
            content: 'To support students and working professionals, we are extending evening quiet-study access on peak weekdays this month.\n\nCirculation and help-desk services will remain available during extended hours.\n\nPlease check the homepage banner and front desk notices for exact timings.',
            category: 'hours',
            author: 'Administration',
            image_url: images[4],
            is_featured: false,
            published_at: daysAgo(4),
        },
        {
            title: highDemand
                ? `High-demand alert: ${highDemand.title}`
                : 'High-demand books and reservation tips',
            summary: highDemand
                ? `"${highDemand.title}" currently has one of the busiest hold queues in our catalog.`
                : 'A quick guide to reserving books that are currently in high demand.',
            content: highDemand
                ? `"${highDemand.title}" is currently one of our most requested books.\n\nIf you are waiting for this title, keep notifications enabled in your account so you can confirm quickly when it becomes available.\n\nYou can also browse the new high-demand shelf for similar alternatives while you wait.`
                : 'Some titles are currently seeing heavy reservation activity.\n\nKeep notifications enabled in your account so you can confirm quickly when books become available.\n\nYou can also browse the high-demand shelf for similar alternatives while you wait.',
            category: 'update',
            author: 'Member Services',
            image_url: images[5],
            is_featured: false,
            published_at: daysAgo(5),
        },
        {
            title: 'Community reading circle registrations open',
            summary: 'Join this month\'s guided reading circle and discussion sessions.',
            content: 'Registrations are now open for this month\'s community reading circles.\n\nParticipants will receive discussion prompts, recommended reading lists, and moderated sessions in the library.\n\nDrop by the help desk or register through your member account to reserve a seat.',
            category: 'program',
            author: 'Programs Team',
            image_url: images[6],
            is_featured: false,
            published_at: daysAgo(6),
        },
        {
            title: topRated
                ? `Reader ratings spotlight: ${topRated.title}`
                : 'Reader ratings spotlight is live',
            summary: topRated
                ? `"${topRated.title}" is one of the highest-rated picks among active members.`
                : 'Highly rated books are now highlighted across collections and recommendations.',
            content: topRated
                ? `Members continue to rate "${topRated.title}" as one of this month\'s strongest picks.\n\nOur Highly Rated Picks shelf has been refreshed so you can find more titles with consistently strong feedback.\n\nRate books after borrowing to improve recommendation quality for everyone.`
                : 'Our Highly Rated Picks shelf has been refreshed so you can find more titles with consistently strong feedback.\n\nRating books after borrowing improves recommendation quality for the entire community.\n\nOpen any book detail page to leave your rating and review.',
            category: 'general',
            author: 'Library Newsroom',
            image_url: images[7],
            is_featured: false,
            published_at: daysAgo(7),
        },
        {
            title: `Monthly catalog snapshot: ${totalBooks} active titles`,
            summary: `Our active catalog now includes ${totalBooks} titles across multiple reader interests.`,
            content: `The catalog currently includes ${totalBooks} active titles and refreshed discovery shelves.\n\nThis month\'s highlights combine circulation trends, demand signals, and member ratings to improve what appears across home, catalog, and recommendations.\n\nKeep checking the News section for fresh programs, events, and curated picks.`,
            category: 'general',
            author: 'Library Operations',
            image_url: images[0],
            is_featured: false,
            published_at: daysAgo(8),
        },
    ].map((article) => ({
        ...article,
        title: clamp(article.title, 500),
        summary: clamp(article.summary, 500) || null,
        content: article.content || article.summary || article.title,
        category: clamp(article.category || 'general', 100) || 'general',
        author: clamp(article.author || 'Library Team', 200) || 'Library Team',
        image_url: clamp(article.image_url || '', 1000) || null,
    }));
};

const seedNewsArticles = async (mysqlPool, articles) => {
    await ensureNewsTable(mysqlPool);

    const [deleteResult] = await mysqlPool.query(
        `DELETE FROM ${NEWS_TABLE} WHERE created_by = ?`,
        [NEWS_SEED_MARKER]
    );

    let inserted = 0;
    for (const article of articles) {
        const [result] = await mysqlPool.query(
            `INSERT INTO ${NEWS_TABLE}
             (title, content, summary, image_url, category, author, is_featured, is_active, published_at, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                article.title,
                article.content,
                article.summary,
                article.image_url,
                article.category,
                article.author,
                Boolean(article.is_featured),
                true,
                article.published_at,
                NEWS_SEED_MARKER,
            ]
        );
        inserted += Number(result?.affectedRows || 0);
    }

    return {
        removedPreviousSeedNews: Number(deleteResult?.affectedRows || 0),
        inserted,
    };
};

const main = async () => {
    const startedAt = Date.now();
    console.log('='.repeat(70));
    console.log('Seeding curated collections and library news');
    console.log('='.repeat(70));

    try {
        await prisma.$queryRaw`SELECT 1`;
        await connectMySQL();
        const mysqlPool = getMySQLPool();

        const signals = await fetchBookSignals();
        if (signals.books.length === 0) {
            throw new Error('No active books found. Seed your catalog books first.');
        }

        const collections = buildCollectionDefinitions(signals);
        if (collections.length === 0) {
            throw new Error('Not enough catalog data to build curated collections.');
        }

        const collectionSummary = await seedCollections(collections);
        const newsArticles = buildNewsArticles({
            books: signals.books,
            topCategories: signals.topCategories,
            collections,
        });
        const newsSummary = await seedNewsArticles(mysqlPool, newsArticles);

        console.log(`Collections: created=${collectionSummary.created}, updated=${collectionSummary.updated}, links=${collectionSummary.linksInserted}, removed_old_seeded=${collectionSummary.deletedLegacySeedCollections}`);
        console.log(`News: inserted=${newsSummary.inserted}, removed_old_seeded=${newsSummary.removedPreviousSeedNews}`);
        console.log(`Duration: ${Math.round((Date.now() - startedAt) / 1000)}s`);
        console.log('='.repeat(70));
    } finally {
        await Promise.allSettled([
            prisma.$disconnect(),
            closePostgresPool(),
            closeMySQL(),
        ]);
    }
};

main().catch((error) => {
    console.error('\nSeeding failed:', error.message);
    process.exit(1);
});
