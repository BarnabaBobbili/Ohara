import prisma from './prisma.js';

const POSTGRES_INDEX_STATEMENTS = [
    // Extension for fast ILIKE/contains search on title/author/isbn.
    'CREATE EXTENSION IF NOT EXISTS pg_trgm',

    'CREATE INDEX IF NOT EXISTS idx_books_category ON books (category)',
    'CREATE INDEX IF NOT EXISTS idx_books_author ON books (author)',
    'CREATE INDEX IF NOT EXISTS idx_books_title_trgm ON books USING gin (title gin_trgm_ops)',
    'CREATE INDEX IF NOT EXISTS idx_books_author_trgm ON books USING gin (author gin_trgm_ops)',
    'CREATE INDEX IF NOT EXISTS idx_books_isbn_trgm ON books USING gin (isbn gin_trgm_ops)',

    'CREATE INDEX IF NOT EXISTS idx_transactions_book_id ON transactions (book_id)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_member_id ON transactions (member_id)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions (status)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_checkout_date ON transactions (checkout_date DESC)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_due_date ON transactions (due_date)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_status_due_date ON transactions (status, due_date)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_member_status ON transactions (member_id, status)',

    'CREATE INDEX IF NOT EXISTS idx_members_status ON members (status)',
    'CREATE INDEX IF NOT EXISTS idx_members_member_type ON members (member_type)',
    'CREATE INDEX IF NOT EXISTS idx_members_joined_date ON members (joined_date DESC)',

    'CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations (status)',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_external_cache_source_source_id ON external_book_cache (source, source_id)',
    'CREATE INDEX IF NOT EXISTS idx_external_cache_cached_at ON external_book_cache (cached_at DESC)',
];

export const ensurePostgresIndexes = async () => {
    for (const statement of POSTGRES_INDEX_STATEMENTS) {
        try {
            await prisma.$executeRawUnsafe(statement);
        } catch (error) {
            console.warn(`PostgreSQL index setup skipped for statement: ${statement}`);
            console.warn(`Reason: ${error.message}`);
        }
    }
};
