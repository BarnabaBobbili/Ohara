import fs from 'fs';
import readline from 'readline';
import dotenv from 'dotenv';
import pg from 'pg';
import neo4j from 'neo4j-driver';
import bcrypt from 'bcryptjs';
import { MongoClient, ObjectId } from 'mongodb';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './src/generated/prisma/client.js';

dotenv.config();

const DEFAULT_DATASET_PATH = 'E:\\MTech\\MTech Sem2\\DBMS\\kaggledb\\library_data.json';
const DEFAULT_BOOKS_CSV_PATH = 'E:\\MTech\\MTech Sem2\\DBMS\\kaggledb\\books_data\\books.csv';
const DEFAULT_SEED_PASSWORD = 'Password@123';

const [datasetPathArg, booksCsvPathArg] = process.argv.slice(2);
const datasetPath = datasetPathArg || DEFAULT_DATASET_PATH;
const booksCsvPath = booksCsvPathArg || DEFAULT_BOOKS_CSV_PATH;

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const nowIso = () => new Date().toISOString();

const clamp = (value, max) => {
    const text = typeof value === 'string' ? value.trim() : '';
    return text.length > max ? text.slice(0, max) : text;
};

const normalizeIsbn = (value) => clamp(String(value ?? '').replace(/^"+|"+$/g, '').trim(), 20);

const parseDateTime = (value) => {
    if (!value) return null;
    const asString = String(value).trim();
    if (!asString) return null;
    const date = new Date(asString);
    return Number.isNaN(date.getTime()) ? null : date;
};

const parseDateOnly = (value) => {
    if (!value) return null;
    const asString = String(value).trim();
    if (!asString) return null;
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(asString) ? `${asString}T00:00:00.000Z` : asString;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
};

const toSafeNumber = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const toSafeInteger = (value, fallback = 0, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) => {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (!Number.isInteger(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
};

const safeBigInt = (value) => {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (!Number.isInteger(parsed) || parsed < 0) return null;
    return BigInt(parsed);
};

const buildAvatarInitials = (name) => {
    const parts = String(name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2);
    if (parts.length === 0) return '??';
    return parts.map((part) => part[0]?.toUpperCase() || '').join('');
};

const stringHash = (value) => {
    let hash = 0;
    const text = String(value ?? '');
    for (let i = 0; i < text.length; i += 1) {
        hash = ((hash * 31) + text.charCodeAt(i)) >>> 0;
    }
    return hash;
};

const CATEGORY_RULES = [
    { category: 'Science & Technology', genre: 'Non-Fiction', keywords: ['science', 'technology', 'computer', 'data', 'algorithm', 'engineering', 'physics', 'chemistry'] },
    { category: 'History', genre: 'Historical', keywords: ['history', 'war', 'empire', 'civilization', 'ancient', 'world war', 'biography'] },
    { category: 'Literature', genre: 'Classic', keywords: ['poems', 'poetry', 'classic', 'literature', 'novel'] },
    { category: 'Mystery & Thriller', genre: 'Thriller', keywords: ['murder', 'mystery', 'detective', 'thriller', 'crime'] },
    { category: 'Fantasy', genre: 'Fantasy', keywords: ['wizard', 'magic', 'dragon', 'sword', 'kingdom', 'fantasy'] },
    { category: 'Romance', genre: 'Romance', keywords: ['love', 'romance', 'heart', 'marriage'] },
    { category: 'Young Adult', genre: 'YA Fiction', keywords: ['young', 'teen', 'school', 'coming of age'] },
    { category: 'Self Help', genre: 'Motivational', keywords: ['habit', 'success', 'mindset', 'guide', 'improve', 'self'] },
];

const FALLBACK_CATEGORIES = [
    { category: 'General Fiction', genre: 'Fiction' },
    { category: 'Contemporary', genre: 'Drama' },
    { category: 'Adventure', genre: 'Adventure' },
    { category: 'Academic', genre: 'Reference' },
    { category: 'Popular Reads', genre: 'Bestseller' },
    { category: 'Classics', genre: 'Classic' },
];

const inferCategoryGenre = (title, author, isbn) => {
    const text = `${title || ''} ${author || ''}`.toLowerCase();
    for (const rule of CATEGORY_RULES) {
        if (rule.keywords.some((keyword) => text.includes(keyword))) {
            return { category: rule.category, genre: rule.genre };
        }
    }
    return FALLBACK_CATEGORIES[stringHash(isbn) % FALLBACK_CATEGORIES.length];
};

const inferShelfLocation = (isbn) => {
    const hash = stringHash(isbn);
    const section = String.fromCharCode(65 + (hash % 26));
    const shelf = (hash % 15) + 1;
    return `Shelf ${section}${shelf}`;
};

const parsePublicationYear = (value) => {
    const parsed = Number.parseInt(String(value ?? '').trim(), 10);
    const currentYear = new Date().getUTCFullYear() + 1;
    if (!Number.isInteger(parsed) || parsed < 1450 || parsed > currentYear) return null;
    return parsed;
};

const parseSemicolonCsvLine = (line) => {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (char === ';' && !inQuotes) {
            values.push(current);
            current = '';
            continue;
        }

        current += char;
    }

    values.push(current);
    return values;
};

const validateDataset = (data) => {
    const requiredArrays = [
        'members',
        'transactions',
        'reservations',
        'wishlist',
        'book_ratings',
        'reviews',
        'review_reactions',
        'reading_progress',
        'user_uploaded_books',
    ];

    const errors = [];
    const warnings = [];

    for (const key of requiredArrays) {
        if (!Array.isArray(data?.[key])) {
            errors.push(`Missing or invalid array: ${key}`);
        }
    }
    if (errors.length > 0) return { errors, warnings };

    const memberRefs = new Set();
    const ratingPairs = new Set();
    const reviewPairs = new Set();
    const reviewIds = new Set();
    const uploadIds = new Set();
    const wishlistPairs = new Set();

    for (const member of data.members) {
        const ref = String(member.member_ref || '').trim();
        if (!ref) {
            errors.push('members[] entry with empty member_ref');
            continue;
        }
        if (memberRefs.has(ref)) errors.push(`Duplicate member_ref: ${ref}`);
        memberRefs.add(ref);
    }

    for (const rating of data.book_ratings) {
        const key = `${rating.member_ref}::${rating.book_isbn}`;
        if (ratingPairs.has(key)) errors.push(`Duplicate rating pair: ${key}`);
        ratingPairs.add(key);
        const value = Number(rating.rating);
        if (!Number.isInteger(value) || value < 1 || value > 5) {
            errors.push(`Invalid rating value for ${key}: ${rating.rating}`);
        }
    }

    for (const review of data.reviews) {
        const ext = String(review.external_review_id || '').trim();
        const pair = `${review.member_ref}::${review.book_isbn}`;
        if (reviewPairs.has(pair)) errors.push(`Duplicate review pair: ${pair}`);
        reviewPairs.add(pair);
        if (!ratingPairs.has(pair)) errors.push(`Review without matching rating: ${pair}`);
        if (!ext) errors.push('reviews[] entry with empty external_review_id');
        if (ext && reviewIds.has(ext)) errors.push(`Duplicate external_review_id: ${ext}`);
        if (ext) reviewIds.add(ext);
    }

    for (const upload of data.user_uploaded_books) {
        const ext = String(upload.external_upload_id || '').trim();
        if (!ext) errors.push('user_uploaded_books[] entry with empty external_upload_id');
        if (ext && uploadIds.has(ext)) errors.push(`Duplicate external_upload_id: ${ext}`);
        if (ext) uploadIds.add(ext);
    }

    for (const item of data.wishlist) {
        const key = `${item.member_ref}::${item.book_isbn}`;
        if (wishlistPairs.has(key)) warnings.push(`Duplicate wishlist pair detected: ${key}`);
        wishlistPairs.add(key);
    }

    return { errors, warnings };
};

const gatherNeededIsbns = (data) => {
    const needed = new Set();
    const withIsbn = ['transactions', 'reservations', 'wishlist', 'book_ratings', 'reviews'];
    for (const key of withIsbn) {
        for (const row of data[key] || []) {
            const isbn = normalizeIsbn(row.book_isbn);
            if (isbn) needed.add(isbn);
        }
    }
    for (const row of data.reading_progress || []) {
        if (row.book_type !== 'catalog') continue;
        const isbn = normalizeIsbn(row.book_ref);
        if (isbn) needed.add(isbn);
    }
    return needed;
};

const loadBooksMetadata = async (csvPath, neededIsbns) => {
    if (!fs.existsSync(csvPath)) {
        throw new Error(`Books CSV not found: ${csvPath}`);
    }

    const metadata = new Map();
    const stream = fs.createReadStream(csvPath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    let header = null;
    let isbnIndex = -1;
    let titleIndex = -1;
    let authorIndex = -1;
    let yearIndex = -1;
    let publisherIndex = -1;
    let imageSIndex = -1;
    let imageMIndex = -1;
    let imageLIndex = -1;

    for await (const rawLine of rl) {
        const line = rawLine?.replace(/^\uFEFF/, '') || '';
        if (!line.trim()) continue;

        if (!header) {
            header = parseSemicolonCsvLine(line);
            isbnIndex = header.indexOf('ISBN');
            titleIndex = header.indexOf('Book-Title');
            authorIndex = header.indexOf('Book-Author');
            yearIndex = header.indexOf('Year-Of-Publication');
            publisherIndex = header.indexOf('Publisher');
            imageSIndex = header.indexOf('Image-URL-S');
            imageMIndex = header.indexOf('Image-URL-M');
            imageLIndex = header.indexOf('Image-URL-L');
            continue;
        }

        const fields = parseSemicolonCsvLine(line);
        const isbn = normalizeIsbn(fields[isbnIndex] || '');
        if (!isbn || !neededIsbns.has(isbn) || metadata.has(isbn)) continue;

        metadata.set(isbn, {
            isbn,
            title: clamp(fields[titleIndex] || 'Untitled', 500) || 'Untitled',
            author: clamp(fields[authorIndex] || 'Unknown Author', 300) || 'Unknown Author',
            publication_year: parsePublicationYear(fields[yearIndex]),
            publisher: clamp(fields[publisherIndex] || '', 300) || null,
            image_url_s: clamp(fields[imageSIndex] || '', 2000) || null,
            image_url_m: clamp(fields[imageMIndex] || '', 2000) || null,
            image_url_l: clamp(fields[imageLIndex] || '', 2000) || null,
        });

        if (metadata.size >= neededIsbns.size) break;
    }

    rl.close();
    stream.close();
    return metadata;
};

const buildTxSeedTag = (externalId) => `[seed_ext_tx:${String(externalId || '').trim()}]`;
const buildReservationSeedTag = (externalId) => `[seed_ext_res:${String(externalId || '').trim()}]`;

const mergeSeedNote = (seedTag, note) => {
    const userNote = typeof note === 'string' ? note.trim() : '';
    return userNote ? `${seedTag} | ${userNote}` : seedTag;
};

const extractSeedExternalId = (note, kind) => {
    if (!note) return null;
    const regex = kind === 'tx'
        ? /\[seed_ext_tx:([^\]]+)\]/
        : /\[seed_ext_res:([^\]]+)\]/;
    const match = String(note).match(regex);
    return match?.[1] || null;
};

const safeReviewStatus = (status) => {
    const allowed = new Set(['pending', 'approved', 'flagged', 'removed']);
    return allowed.has(status) ? status : 'approved';
};

const safeReservationStatus = (status) => {
    const allowed = new Set(['pending', 'ready', 'fulfilled', 'cancelled', 'expired']);
    return allowed.has(status) ? status : 'pending';
};

const safeTransactionStatus = (status) => {
    const allowed = new Set(['checked_out', 'returned', 'overdue']);
    return allowed.has(status) ? status : 'checked_out';
};

const ensureIsoString = (value) => {
    const parsed = parseDateTime(value);
    return parsed ? parsed.toISOString() : nowIso();
};

const chunk = (items, size) => {
    const chunks = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
};

const bulkWriteInChunks = async (collection, operations, batchSize = 500) => {
    const summary = { matched: 0, modified: 0, upserted: 0 };
    for (const ops of chunk(operations, batchSize)) {
        if (ops.length === 0) continue;
        const result = await collection.bulkWrite(ops, { ordered: false });
        summary.matched += result.matchedCount || 0;
        summary.modified += result.modifiedCount || 0;
        summary.upserted += result.upsertedCount || 0;
    }
    return summary;
};

const seedBooks = async (data, booksMetadataByIsbn) => {
    const neededIsbns = [...gatherNeededIsbns(data)];
    const activeBorrowByIsbn = new Map();
    const pendingReservationByIsbn = new Map();

    for (const tx of data.transactions) {
        const isbn = normalizeIsbn(tx.book_isbn);
        if (!isbn) continue;
        if (safeTransactionStatus(tx.status) !== 'returned' && !tx.return_date) {
            activeBorrowByIsbn.set(isbn, (activeBorrowByIsbn.get(isbn) || 0) + 1);
        }
    }

    for (const reservation of data.reservations) {
        const isbn = normalizeIsbn(reservation.book_isbn);
        if (!isbn) continue;
        const status = safeReservationStatus(reservation.status);
        if (status === 'pending' || status === 'ready') {
            pendingReservationByIsbn.set(isbn, (pendingReservationByIsbn.get(isbn) || 0) + 1);
        }
    }

    const existingBooks = await prisma.books.findMany({
        where: { isbn: { in: neededIsbns } },
        select: { isbn: true },
    });
    const existingIsbnSet = new Set(existingBooks.map((book) => book.isbn));

    const creates = [];
    let missingMetadata = 0;

    for (const isbn of neededIsbns) {
        if (existingIsbnSet.has(isbn)) continue;
        const metadata = booksMetadataByIsbn.get(isbn);
        if (!metadata) {
            missingMetadata += 1;
            continue;
        }

        const { category, genre } = inferCategoryGenre(metadata.title, metadata.author, isbn);
        const activeCount = activeBorrowByIsbn.get(isbn) || 0;
        const pendingCount = pendingReservationByIsbn.get(isbn) || 0;
        const baseCopies = 2 + (stringHash(isbn) % 5);
        const totalCopies = Math.max(baseCopies, activeCount + 1, pendingCount + 1);
        const availableCopies = Math.max(totalCopies - activeCount, 0);
        const tags = [...new Set([category, genre].filter(Boolean).map((tag) => clamp(tag, 50)))];

        creates.push({
            isbn,
            title: metadata.title,
            author: metadata.author,
            publisher: metadata.publisher,
            publication_year: metadata.publication_year,
            category: clamp(category, 100),
            genre: clamp(genre, 100),
            language: 'English',
            pages: null,
            description: `Catalog import title by ${metadata.author}.`,
            cover_image_url: metadata.image_url_l || metadata.image_url_m || metadata.image_url_s,
            total_copies: totalCopies,
            available_copies: availableCopies,
            location: clamp(inferShelfLocation(isbn), 100),
            edition: 'Catalog Seed 2026',
            format: stringHash(isbn) % 2 === 0 ? 'Paperback' : 'Hardcover',
            tags,
            is_reference_only: false,
            is_active: true,
        });
    }

    let createdCount = 0;
    for (const batch of chunk(creates, 200)) {
        const result = await prisma.books.createMany({
            data: batch,
            skipDuplicates: true,
        });
        createdCount += result.count;
    }

    const allBooks = await prisma.books.findMany({
        where: { isbn: { in: neededIsbns } },
        select: { id: true, isbn: true, title: true, author: true, category: true },
    });

    const byIsbn = new Map(allBooks.map((book) => [book.isbn, book]));
    return {
        created: createdCount,
        existing: existingBooks.length,
        missingMetadata,
        byIsbn,
    };
};

const seedMembers = async (members) => {
    const memberRefMap = new Map();
    const memberByRef = new Map();
    const passwordHash = await bcrypt.hash(DEFAULT_SEED_PASSWORD, 10);
    let created = 0;
    let updated = 0;

    for (const member of members) {
        const email = clamp(member.email, 255).toLowerCase();
        if (!email) continue;
        const existing = await prisma.members.findUnique({
            where: { email },
            select: { id: true },
        });

        const joinedDate = parseDateTime(member.joined_date) || new Date();
        const lastVisit = parseDateTime(member.last_visit);
        const expiryDate = parseDateOnly(member.expiry_date);
        const dob = parseDateOnly(member.date_of_birth);

        const createData = {
            card_id: clamp(member.card_id, 30) || `LIB${Date.now()}${Math.floor(Math.random() * 1000)}`,
            name: clamp(member.name, 200) || 'Library Member',
            email,
            phone: clamp(member.phone, 20) || null,
            address: typeof member.address === 'string' ? member.address.trim() : null,
            date_of_birth: dob,
            gender: clamp(member.gender, 20) || null,
            password_hash: passwordHash,
            member_type: clamp(member.member_type, 30) || 'regular',
            status: clamp(member.status, 20) || 'active',
            fines: toSafeNumber(member.fines, 0),
            max_books_allowed: toSafeInteger(member.max_books_allowed, 5, 1, 20),
            loan_period_days: toSafeInteger(member.loan_period_days, 14, 1, 90),
            joined_date: joinedDate,
            expiry_date: expiryDate,
            last_visit: lastVisit,
            notes: typeof member.notes === 'string' ? member.notes.trim() : null,
            emergency_contact: clamp(member.emergency_contact, 200) || null,
            emergency_phone: clamp(member.emergency_phone, 20) || null,
            role: clamp(member.role, 30) || 'member',
        };

        const updateData = {
            card_id: createData.card_id,
            name: createData.name,
            phone: createData.phone,
            address: createData.address,
            date_of_birth: createData.date_of_birth,
            gender: createData.gender,
            member_type: createData.member_type,
            status: createData.status,
            fines: createData.fines,
            max_books_allowed: createData.max_books_allowed,
            loan_period_days: createData.loan_period_days,
            joined_date: createData.joined_date,
            expiry_date: createData.expiry_date,
            last_visit: createData.last_visit,
            notes: createData.notes,
            emergency_contact: createData.emergency_contact,
            emergency_phone: createData.emergency_phone,
            role: createData.role,
            updated_at: new Date(),
        };

        const saved = await prisma.members.upsert({
            where: { email },
            create: createData,
            update: updateData,
            select: {
                id: true,
                card_id: true,
                name: true,
                email: true,
                member_type: true,
                role: true,
            },
        });

        if (existing) updated += 1;
        else created += 1;

        const memberRef = String(member.member_ref || '').trim();
        if (memberRef) {
            memberRefMap.set(memberRef, saved.id);
            memberByRef.set(memberRef, saved);
        }
    }

    return { created, updated, memberRefMap, memberByRef };
};

const seedUserUploadedBooks = async (uploads, memberRefMap) => {
    const existingSeedUploads = await prisma.user_uploaded_books.findMany({
        where: { file_path: { startsWith: 'seed_uploads/' } },
        select: { id: true, file_path: true },
    });

    const extIdToExisting = new Map();
    for (const upload of existingSeedUploads) {
        const match = upload.file_path.match(/^seed_uploads\/([^./]+)\./);
        if (match?.[1]) extIdToExisting.set(match[1], upload.id);
    }

    const uploadRefMap = new Map();
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const upload of uploads) {
        const extId = String(upload.external_upload_id || '').trim();
        if (!extId) {
            skipped += 1;
            continue;
        }
        const memberId = memberRefMap.get(String(upload.member_ref || '').trim());
        if (!memberId) {
            skipped += 1;
            continue;
        }

        const format = ['pdf', 'epub'].includes(String(upload.file_format || '').toLowerCase())
            ? String(upload.file_format).toLowerCase()
            : 'pdf';
        const filePath = `seed_uploads/${extId}.${format}`;
        const payload = {
            member_id: memberId,
            title: clamp(upload.title, 500) || `Uploaded Book ${extId}`,
            author: clamp(upload.author, 300) || 'Unknown Author',
            file_path: filePath,
            file_format: clamp(format, 20),
            file_size_bytes: safeBigInt(upload.file_size_bytes),
            uploaded_at: parseDateTime(upload.uploaded_at) || new Date(),
        };

        const existingId = extIdToExisting.get(extId);
        let saved;
        if (existingId) {
            saved = await prisma.user_uploaded_books.update({
                where: { id: existingId },
                data: payload,
                select: { id: true },
            });
            updated += 1;
        } else {
            saved = await prisma.user_uploaded_books.create({
                data: payload,
                select: { id: true },
            });
            created += 1;
            extIdToExisting.set(extId, saved.id);
        }

        uploadRefMap.set(extId, saved.id);
    }

    return { created, updated, skipped, uploadRefMap };
};

const seedTransactions = async (transactions, memberRefMap, bookByIsbn) => {
    const existingSeedTransactions = await prisma.transactions.findMany({
        where: { notes: { contains: '[seed_ext_tx:' } },
        select: { id: true, notes: true },
    });
    const extToExisting = new Map();
    for (const tx of existingSeedTransactions) {
        const ext = extractSeedExternalId(tx.notes, 'tx');
        if (ext) extToExisting.set(ext, tx.id);
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const tx of transactions) {
        const extId = String(tx.external_tx_id || '').trim();
        const memberId = memberRefMap.get(String(tx.member_ref || '').trim());
        const book = bookByIsbn.get(normalizeIsbn(tx.book_isbn));
        if (!extId || !memberId || !book) {
            skipped += 1;
            continue;
        }

        const checkoutDate = parseDateTime(tx.checkout_date) || new Date();
        const dueDate = parseDateTime(tx.due_date) || checkoutDate;
        const returnDate = parseDateTime(tx.return_date);
        const status = safeTransactionStatus(tx.status);
        const payload = {
            book_id: book.id,
            member_id: memberId,
            checkout_date: checkoutDate,
            due_date: dueDate,
            return_date: returnDate,
            status,
            checkout_condition: clamp(tx.checkout_condition, 30) || 'good',
            return_condition: tx.return_condition ? clamp(tx.return_condition, 30) : null,
            fine_amount: Math.max(toSafeNumber(tx.fine_amount, 0), 0),
            fine_paid: Boolean(tx.fine_paid),
            fine_paid_date: parseDateTime(tx.fine_paid_date),
            renewal_count: toSafeInteger(tx.renewal_count, 0, 0, 10),
            max_renewals: toSafeInteger(tx.max_renewals, 2, 0, 10),
            notes: mergeSeedNote(buildTxSeedTag(extId), tx.notes),
            created_at: checkoutDate,
            updated_at: returnDate || new Date(),
        };

        const existingId = extToExisting.get(extId);
        if (existingId) {
            await prisma.transactions.update({
                where: { id: existingId },
                data: payload,
            });
            updated += 1;
        } else {
            const saved = await prisma.transactions.create({
                data: payload,
                select: { id: true },
            });
            extToExisting.set(extId, saved.id);
            created += 1;
        }
    }

    return { created, updated, skipped };
};

const seedReservations = async (reservations, memberRefMap, bookByIsbn) => {
    const existingSeedReservations = await prisma.reservations.findMany({
        where: { notes: { contains: '[seed_ext_res:' } },
        select: { id: true, notes: true },
    });
    const extToExisting = new Map();
    for (const reservation of existingSeedReservations) {
        const ext = extractSeedExternalId(reservation.notes, 'res');
        if (ext) extToExisting.set(ext, reservation.id);
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const reservation of reservations) {
        const extId = String(reservation.external_reservation_id || '').trim();
        const memberId = memberRefMap.get(String(reservation.member_ref || '').trim());
        const book = bookByIsbn.get(normalizeIsbn(reservation.book_isbn));
        if (!extId || !memberId || !book) {
            skipped += 1;
            continue;
        }

        const reservationDate = parseDateTime(reservation.reservation_date) || new Date();
        const payload = {
            book_id: book.id,
            member_id: memberId,
            reservation_date: reservationDate,
            expiry_date: parseDateTime(reservation.expiry_date),
            status: safeReservationStatus(reservation.status),
            notified: Boolean(reservation.notified),
            notified_at: parseDateTime(reservation.notified_at),
            position_in_queue: reservation.position_in_queue === null || reservation.position_in_queue === undefined
                ? null
                : toSafeInteger(reservation.position_in_queue, 1, 1, 999),
            notes: mergeSeedNote(buildReservationSeedTag(extId), reservation.notes),
            created_at: reservationDate,
            updated_at: new Date(),
        };

        const existingId = extToExisting.get(extId);
        if (existingId) {
            await prisma.reservations.update({
                where: { id: existingId },
                data: payload,
            });
            updated += 1;
        } else {
            const saved = await prisma.reservations.create({
                data: payload,
                select: { id: true },
            });
            extToExisting.set(extId, saved.id);
            created += 1;
        }
    }

    return { created, updated, skipped };
};

const seedBookRatings = async (ratings, memberRefMap, bookByIsbn) => {
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const rating of ratings) {
        const memberId = memberRefMap.get(String(rating.member_ref || '').trim());
        const book = bookByIsbn.get(normalizeIsbn(rating.book_isbn));
        if (!memberId || !book) {
            skipped += 1;
            continue;
        }

        const score = toSafeInteger(rating.rating, 0, 1, 5);
        if (score < 1 || score > 5) {
            skipped += 1;
            continue;
        }

        const existing = await prisma.book_ratings.findUnique({
            where: {
                book_id_member_id: {
                    book_id: book.id,
                    member_id: memberId,
                },
            },
            select: { id: true },
        });

        await prisma.book_ratings.upsert({
            where: {
                book_id_member_id: {
                    book_id: book.id,
                    member_id: memberId,
                },
            },
            create: {
                book_id: book.id,
                member_id: memberId,
                rating: score,
                created_at: parseDateTime(rating.created_at) || new Date(),
                updated_at: parseDateTime(rating.updated_at) || new Date(),
            },
            update: {
                rating: score,
                updated_at: parseDateTime(rating.updated_at) || new Date(),
            },
        });

        if (existing) updated += 1;
        else created += 1;
    }

    return { created, updated, skipped };
};

const seedReadingProgress = async (progressRows, memberRefMap, bookByIsbn, uploadRefMap) => {
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const progress of progressRows) {
        const memberId = memberRefMap.get(String(progress.member_ref || '').trim());
        if (!memberId) {
            skipped += 1;
            continue;
        }

        const bookType = progress.book_type === 'uploaded' ? 'uploaded' : 'catalog';
        let storedBookId = null;
        if (bookType === 'catalog') {
            const book = bookByIsbn.get(normalizeIsbn(progress.book_ref));
            if (!book) {
                skipped += 1;
                continue;
            }
            storedBookId = String(book.id);
        } else {
            const uploadId = uploadRefMap.get(String(progress.book_ref || '').trim());
            if (!uploadId) {
                skipped += 1;
                continue;
            }
            storedBookId = String(uploadId);
        }

        const existing = await prisma.reading_progress.findUnique({
            where: {
                member_id_book_type_book_id: {
                    member_id: memberId,
                    book_type: bookType,
                    book_id: storedBookId,
                },
            },
            select: { id: true },
        });

        await prisma.reading_progress.upsert({
            where: {
                member_id_book_type_book_id: {
                    member_id: memberId,
                    book_type: bookType,
                    book_id: storedBookId,
                },
            },
            create: {
                member_id: memberId,
                book_type: bookType,
                book_id: storedBookId,
                current_location: typeof progress.current_location === 'string'
                    ? progress.current_location.trim()
                    : null,
                progress_percent: Math.min(Math.max(toSafeNumber(progress.progress_percent, 0), 0), 100),
                last_read_at: parseDateTime(progress.last_read_at) || new Date(),
            },
            update: {
                current_location: typeof progress.current_location === 'string'
                    ? progress.current_location.trim()
                    : null,
                progress_percent: Math.min(Math.max(toSafeNumber(progress.progress_percent, 0), 0), 100),
                last_read_at: parseDateTime(progress.last_read_at) || new Date(),
            },
        });

        if (existing) updated += 1;
        else created += 1;
    }

    return { created, updated, skipped };
};

const normalizeReviewComments = (comments, memberByRef) => {
    const result = [];
    const safeComments = Array.isArray(comments) ? comments : [];

    for (const comment of safeComments) {
        const commentMember = memberByRef.get(String(comment.member_ref || '').trim());
        if (!commentMember) continue;
        const replies = [];

        const safeReplies = Array.isArray(comment.replies) ? comment.replies : [];
        for (const reply of safeReplies) {
            const replyMember = memberByRef.get(String(reply.member_ref || '').trim());
            if (!replyMember) continue;
            replies.push({
                comment_id: String(reply.comment_id || '').trim() || `reply-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
                member_id: replyMember.id,
                member_name: replyMember.name,
                member_avatar_initials: buildAvatarInitials(replyMember.name),
                text: typeof reply.text === 'string' ? reply.text.trim() : '',
                giphy_attachment: null,
                created_at: parseDateTime(reply.created_at) || new Date(),
            });
        }

        result.push({
            comment_id: String(comment.comment_id || '').trim() || `comment-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
            member_id: commentMember.id,
            member_name: commentMember.name,
            member_avatar_initials: buildAvatarInitials(commentMember.name),
            text: typeof comment.text === 'string' ? comment.text.trim() : '',
            giphy_attachment: null,
            created_at: parseDateTime(comment.created_at) || new Date(),
            replies,
        });
    }

    return result;
};

const countCommentsAndReplies = (comments) => {
    let total = 0;
    for (const comment of comments) {
        total += 1;
        total += Array.isArray(comment.replies) ? comment.replies.length : 0;
    }
    return total;
};

const seedMongoReviewsAndReactions = async (data, memberRefMap, memberByRef, bookByIsbn) => {
    if (!process.env.MONGODB_URL) {
        return {
            skipped: true,
            reason: 'MONGODB_URL is not configured',
        };
    }

    const client = new MongoClient(process.env.MONGODB_URL, {
        maxPoolSize: Number.parseInt(process.env.MONGO_POOL_MAX || '20', 10),
        minPoolSize: Number.parseInt(process.env.MONGO_POOL_MIN || '1', 10),
    });

    const reviewExternalToMongoId = new Map();
    const reviewExternalToBookId = new Map();
    let reviewsCreated = 0;
    let reviewsUpdated = 0;
    let reviewsSkipped = 0;
    let reactionsSkipped = 0;

    try {
        await client.connect();
        const db = client.db(process.env.MONGODB_DB_NAME || 'LMS');
        const reviewsCollection = db.collection('reviews');
        const reactionsCollection = db.collection('review_reactions');

        for (const review of data.reviews) {
            const memberRef = String(review.member_ref || '').trim();
            const memberId = memberRefMap.get(memberRef);
            const member = memberByRef.get(memberRef);
            const book = bookByIsbn.get(normalizeIsbn(review.book_isbn));
            const externalReviewId = String(review.external_review_id || '').trim();
            if (!memberId || !member || !book || !externalReviewId) {
                reviewsSkipped += 1;
                continue;
            }

            const normalizedComments = normalizeReviewComments(review.comments, memberByRef);
            const commentsCount = countCommentsAndReplies(normalizedComments);
            const filter = { book_id: book.id, member_id: memberId };
            const existing = await reviewsCollection.findOne(filter, { projection: { _id: 1 } });

            await reviewsCollection.updateOne(
                filter,
                {
                    $set: {
                        external_review_id: externalReviewId,
                        book_id: book.id,
                        member_id: memberId,
                        member_name: member.name,
                        member_avatar_initials: buildAvatarInitials(member.name),
                        review_text: typeof review.review_text === 'string' ? review.review_text.trim() : '',
                        spoiler: Boolean(review.spoiler),
                        giphy_attachments: Array.isArray(review.giphy_attachments) ? review.giphy_attachments : [],
                        comments: normalizedComments,
                        comments_count: commentsCount,
                        likes_count: 0,
                        status: safeReviewStatus(review.status),
                        flagged_reason: typeof review.flagged_reason === 'string' ? review.flagged_reason.trim() : null,
                        admin_notes: typeof review.admin_notes === 'string' ? review.admin_notes.trim() : null,
                        updated_at: parseDateTime(review.updated_at) || new Date(),
                    },
                    $setOnInsert: {
                        created_at: parseDateTime(review.created_at) || new Date(),
                    },
                },
                { upsert: true }
            );

            const saved = existing || await reviewsCollection.findOne(filter, { projection: { _id: 1 } });
            if (!saved?._id) {
                reviewsSkipped += 1;
                continue;
            }
            if (existing) reviewsUpdated += 1;
            else reviewsCreated += 1;

            reviewExternalToMongoId.set(externalReviewId, String(saved._id));
            reviewExternalToBookId.set(externalReviewId, book.id);
        }

        const reactionOps = [];
        for (const reaction of data.review_reactions) {
            const externalReviewId = String(reaction.external_review_id || '').trim();
            const reviewId = reviewExternalToMongoId.get(externalReviewId);
            const memberId = memberRefMap.get(String(reaction.member_ref || '').trim());
            if (!reviewId || !memberId || reaction.type !== 'like') {
                reactionsSkipped += 1;
                continue;
            }

            reactionOps.push({
                updateOne: {
                    filter: { review_id: reviewId, member_id: memberId, type: 'like' },
                    update: {
                        $set: {
                            created_at: parseDateTime(reaction.created_at) || new Date(),
                        },
                    },
                    upsert: true,
                },
            });
        }

        const reactionWrite = await bulkWriteInChunks(reactionsCollection, reactionOps, 500);

        const reviewIds = [...reviewExternalToMongoId.values()];
        const groupedLikes = reviewIds.length === 0
            ? []
            : await reactionsCollection.aggregate([
                { $match: { review_id: { $in: reviewIds }, type: 'like' } },
                { $group: { _id: '$review_id', count: { $sum: 1 } } },
            ]).toArray();

        const likesByReviewId = new Map(groupedLikes.map((row) => [String(row._id), Number(row.count || 0)]));
        const likesUpdateOps = reviewIds.map((reviewId) => ({
            updateOne: {
                filter: { _id: new ObjectId(reviewId) },
                update: {
                    $set: {
                        likes_count: likesByReviewId.get(reviewId) || 0,
                        updated_at: new Date(),
                    },
                },
            },
        }));
        await bulkWriteInChunks(reviewsCollection, likesUpdateOps, 500);

        return {
            skipped: false,
            reviews: {
                created: reviewsCreated,
                updated: reviewsUpdated,
                skipped: reviewsSkipped,
            },
            reactions: {
                upserted: reactionWrite.upserted,
                matched: reactionWrite.matched,
                modified: reactionWrite.modified,
                skipped: reactionsSkipped,
            },
            reviewExternalToBookId,
        };
    } finally {
        await client.close();
    }
};

const seedNeo4jGraph = async (data, memberByRef, bookByIsbn, reviewExternalToBookId) => {
    if (!process.env.NEO4J_URI || !process.env.NEO4J_USER || !process.env.NEO4J_PASSWORD) {
        return { skipped: true, reason: 'Neo4j credentials are not configured' };
    }

    const driver = neo4j.driver(
        process.env.NEO4J_URI,
        neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD),
        { maxConnectionPoolSize: 20 }
    );

    let wishlistProcessed = 0;
    let reviewLikeProcessed = 0;
    let wishlistSkipped = 0;
    let reviewLikesSkipped = 0;

    try {
        await driver.verifyConnectivity();
        const session = driver.session();
        try {
            const wishlistRows = [];
            const wishlistKeySet = new Set();
            for (const item of data.wishlist) {
                const member = memberByRef.get(String(item.member_ref || '').trim());
                const book = bookByIsbn.get(normalizeIsbn(item.book_isbn));
                if (!member || !book) {
                    wishlistSkipped += 1;
                    continue;
                }
                const key = `${member.id}::${book.id}`;
                if (wishlistKeySet.has(key)) continue;
                wishlistKeySet.add(key);
                wishlistRows.push({
                    member_id: member.id,
                    member_name: member.name,
                    card_id: member.card_id,
                    member_type: member.member_type,
                    book_id: book.id,
                    book_title: book.title,
                    book_isbn: book.isbn,
                    book_category: book.category || 'General',
                    added_at: ensureIsoString(item.added_at),
                });
            }

            for (const rows of chunk(wishlistRows, 300)) {
                if (rows.length === 0) continue;
                await session.run(
                    `UNWIND $rows AS row
                     MERGE (m:Member {id: toInteger(row.member_id)})
                       ON CREATE SET m.name = row.member_name,
                                     m.card_id = row.card_id,
                                     m.member_type = row.member_type
                     MERGE (b:Book {id: toInteger(row.book_id)})
                       ON CREATE SET b.title = row.book_title,
                                     b.isbn = row.book_isbn,
                                     b.category = row.book_category
                     MERGE (m)-[w:WISHLISTED]->(b)
                     SET w.added_at = row.added_at`,
                    { rows }
                );
                wishlistProcessed += rows.length;
            }

            const reviewLikeRows = [];
            const likeKeySet = new Set();
            for (const reaction of data.review_reactions) {
                if (reaction.type !== 'like') continue;
                const member = memberByRef.get(String(reaction.member_ref || '').trim());
                const bookId = reviewExternalToBookId.get(String(reaction.external_review_id || '').trim());
                if (!member || !bookId) {
                    reviewLikesSkipped += 1;
                    continue;
                }
                const key = `${member.id}::${bookId}`;
                if (likeKeySet.has(key)) continue;
                likeKeySet.add(key);
                reviewLikeRows.push({
                    member_id: member.id,
                    book_id: bookId,
                    updated_at: ensureIsoString(reaction.created_at),
                });
            }

            for (const rows of chunk(reviewLikeRows, 300)) {
                if (rows.length === 0) continue;
                await session.run(
                    `UNWIND $rows AS row
                     MERGE (m:Member {id: toInteger(row.member_id)})
                     MERGE (b:Book {id: toInteger(row.book_id)})
                     MERGE (m)-[r:LIKED_REVIEW_OF]->(b)
                     SET r.updated_at = row.updated_at`,
                    { rows }
                );
                reviewLikeProcessed += rows.length;
            }
        } finally {
            await session.close();
        }

        return {
            skipped: false,
            wishlist: { processed: wishlistProcessed, skipped: wishlistSkipped },
            reviewLikes: { processed: reviewLikeProcessed, skipped: reviewLikesSkipped },
        };
    } finally {
        await driver.close();
    }
};

const main = async () => {
    const start = Date.now();
    console.log('='.repeat(70));
    console.log('Library realistic data seeder');
    console.log('='.repeat(70));
    console.log(`Dataset path : ${datasetPath}`);
    console.log(`Books CSV    : ${booksCsvPath}`);

    if (!fs.existsSync(datasetPath)) {
        throw new Error(`Dataset file not found: ${datasetPath}`);
    }

    const data = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
    const validation = validateDataset(data);
    if (validation.errors.length > 0) {
        console.error('\nDataset validation failed with fatal errors:');
        validation.errors.slice(0, 40).forEach((error) => console.error(` - ${error}`));
        throw new Error(`Validation failed (${validation.errors.length} issues)`);
    }
    if (validation.warnings.length > 0) {
        console.warn(`\nValidation warnings (${validation.warnings.length}):`);
        validation.warnings.slice(0, 20).forEach((warning) => console.warn(` - ${warning}`));
    }

    const neededIsbns = gatherNeededIsbns(data);
    console.log(`\nDistinct ISBN references in dataset: ${neededIsbns.size}`);

    const booksMetadataByIsbn = await loadBooksMetadata(booksCsvPath, neededIsbns);
    console.log(`Book metadata resolved from CSV   : ${booksMetadataByIsbn.size}`);

    const summary = {};
    try {
        await prisma.$queryRaw`SELECT 1`;
        summary.books = await seedBooks(data, booksMetadataByIsbn);
        console.log(`Books seeded: created=${summary.books.created}, existing=${summary.books.existing}, missing_metadata=${summary.books.missingMetadata}`);

        const membersResult = await seedMembers(data.members);
        summary.members = { created: membersResult.created, updated: membersResult.updated };
        console.log(`Members seeded: created=${membersResult.created}, updated=${membersResult.updated}`);

        const uploadsResult = await seedUserUploadedBooks(data.user_uploaded_books, membersResult.memberRefMap);
        summary.user_uploaded_books = { created: uploadsResult.created, updated: uploadsResult.updated, skipped: uploadsResult.skipped };
        console.log(`User uploads seeded: created=${uploadsResult.created}, updated=${uploadsResult.updated}, skipped=${uploadsResult.skipped}`);

        const transactionsResult = await seedTransactions(data.transactions, membersResult.memberRefMap, summary.books.byIsbn);
        summary.transactions = transactionsResult;
        console.log(`Transactions seeded: created=${transactionsResult.created}, updated=${transactionsResult.updated}, skipped=${transactionsResult.skipped}`);

        const reservationsResult = await seedReservations(data.reservations, membersResult.memberRefMap, summary.books.byIsbn);
        summary.reservations = reservationsResult;
        console.log(`Reservations seeded: created=${reservationsResult.created}, updated=${reservationsResult.updated}, skipped=${reservationsResult.skipped}`);

        const ratingsResult = await seedBookRatings(data.book_ratings, membersResult.memberRefMap, summary.books.byIsbn);
        summary.book_ratings = ratingsResult;
        console.log(`Book ratings seeded: created=${ratingsResult.created}, updated=${ratingsResult.updated}, skipped=${ratingsResult.skipped}`);

        const progressResult = await seedReadingProgress(
            data.reading_progress,
            membersResult.memberRefMap,
            summary.books.byIsbn,
            uploadsResult.uploadRefMap
        );
        summary.reading_progress = progressResult;
        console.log(`Reading progress seeded: created=${progressResult.created}, updated=${progressResult.updated}, skipped=${progressResult.skipped}`);

        const mongoResult = await seedMongoReviewsAndReactions(
            data,
            membersResult.memberRefMap,
            membersResult.memberByRef,
            summary.books.byIsbn
        );
        summary.mongo = mongoResult;
        if (mongoResult.skipped) {
            console.warn(`MongoDB seeding skipped: ${mongoResult.reason}`);
        } else {
            console.log(`Mongo reviews seeded: created=${mongoResult.reviews.created}, updated=${mongoResult.reviews.updated}, skipped=${mongoResult.reviews.skipped}`);
            console.log(`Mongo reactions upserted=${mongoResult.reactions.upserted}, matched=${mongoResult.reactions.matched}, modified=${mongoResult.reactions.modified}, skipped=${mongoResult.reactions.skipped}`);
        }

        const neo4jResult = await seedNeo4jGraph(
            data,
            membersResult.memberByRef,
            summary.books.byIsbn,
            mongoResult.reviewExternalToBookId || new Map()
        );
        summary.neo4j = neo4jResult;
        if (neo4jResult.skipped) {
            console.warn(`Neo4j seeding skipped: ${neo4jResult.reason}`);
        } else {
            console.log(`Neo4j wishlist relationships processed=${neo4jResult.wishlist.processed}, skipped=${neo4jResult.wishlist.skipped}`);
            console.log(`Neo4j liked-review relationships processed=${neo4jResult.reviewLikes.processed}, skipped=${neo4jResult.reviewLikes.skipped}`);
        }

        console.log('\n'.concat('='.repeat(70)));
        console.log('Seeding complete');
        console.log(`Duration: ${Math.round((Date.now() - start) / 1000)}s`);
        console.log('='.repeat(70));
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
};

main().catch((error) => {
    console.error('\nSeeding failed:', error.message);
    process.exit(1);
});
