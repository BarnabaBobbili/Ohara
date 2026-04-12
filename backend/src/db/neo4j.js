import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

let driver = null;

// ─── Connection ──────────────────────────────────────────────

export const connectNeo4j = () => {
    try {
        if (driver) return driver;

        driver = neo4j.driver(
            process.env.NEO4J_URI,
            neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD),
            { maxConnectionPoolSize: 50, connectionAcquisitionTimeout: 2000 }
        );
        console.log('✓ Neo4j driver created');
        return driver;
    } catch (error) {
        console.error('✗ Neo4j connection failed:', error.message);
        throw error;
    }
};

export const getNeo4jDriver = () => {
    if (!driver) throw new Error('Neo4j not connected. Call connectNeo4j first.');
    return driver;
};

export const closeNeo4j = async () => {
    if (driver) {
        await driver.close();
        driver = null;
    }
};

export const checkNeo4jConnection = async () => {
    try {
        if (!driver) return false;
        const session = driver.session();
        await session.run('RETURN 1');
        await session.close();
        return true;
    } catch {
        return false;
    }
};

// ─── Safe query runner ───────────────────────────────────────

export const runNeo4jQuery = async (query, params = {}) => {
    const session = driver.session();
    try {
        const result = await session.run(query, params);
        return result.records;
    } finally {
        await session.close();
    }
};

// ─── Graph Sync Functions ─────────────────────────────────────
// Called after PostgreSQL operations to keep Neo4j in sync.
// Neo4j is read-only for recommendations — PostgreSQL is the source of truth.

/**
 * Sync a book to Neo4j (on create or update)
 */
export const syncBookToNeo4j = async (book) => {
    if (!driver) return;
    try {
        await runNeo4jQuery(
            `MERGE (b:Book {id: $id})
             SET b.title = $title,
                 b.isbn  = $isbn,
                 b.category = $category,
                 b.publication_year = $publication_year
             WITH b
             MERGE (a:Author {name: $author})
             MERGE (b)-[:WRITTEN_BY]->(a)
             WITH b
             MERGE (c:Category {name: $category})
             MERGE (b)-[:BELONGS_TO]->(c)`,
            {
                id: neo4j.int(book.id),
                title: book.title,
                isbn: book.isbn,
                author: book.author,
                category: book.category || 'Uncategorized',
                publication_year: neo4j.int(book.publication_year || 0),
            }
        );
    } catch (error) {
        console.error('Neo4j syncBook failed:', error.message);
    }
};

/**
 * Sync a member to Neo4j (on create)
 */
export const syncMemberToNeo4j = async (member) => {
    if (!driver) return;
    try {
        await runNeo4jQuery(
            `MERGE (m:Member {id: $id})
             SET m.name = $name,
                 m.card_id = $card_id,
                 m.member_type = $member_type`,
            {
                id: neo4j.int(member.id),
                name: member.name,
                card_id: member.card_id,
                member_type: member.member_type,
            }
        );
    } catch (error) {
        console.error('Neo4j syncMember failed:', error.message);
    }
};

/**
 * Sync a checkout event to Neo4j
 */
export const syncCheckoutToNeo4j = async (transaction) => {
    if (!driver) return;
    try {
        await runNeo4jQuery(
            `MERGE (m:Member {id: $member_id})
             MERGE (b:Book   {id: $book_id})
             MERGE (m)-[r:BORROWED {transaction_id: $tx_id}]->(b)
             SET r.checkout_date = $checkout_date,
                 r.returned = false`,
            {
                member_id:     neo4j.int(transaction.member_id),
                book_id:       neo4j.int(transaction.book_id),
                tx_id:         neo4j.int(transaction.id),
                checkout_date: transaction.checkout_date?.toISOString() || new Date().toISOString(),
            }
        );

        // Update member's interest in the category
        await runNeo4jQuery(
            `MATCH (m:Member {id: $member_id})-[:BORROWED]->(b:Book)-[:BELONGS_TO]->(c:Category)
             MERGE (m)-[i:INTERESTED_IN]->(c)
             SET i.weight = coalesce(i.weight, 0) + 1`,
            { member_id: neo4j.int(transaction.member_id) }
        );
    } catch (error) {
        console.error('Neo4j syncCheckout failed:', error.message);
    }
};

/**
 * Sync a return event to Neo4j
 */
export const syncReturnToNeo4j = async (transaction) => {
    if (!driver) return;
    try {
        await runNeo4jQuery(
            `MATCH (m:Member {id: $member_id})-[r:BORROWED {transaction_id: $tx_id}]->(b:Book {id: $book_id})
             SET r.returned = true,
                 r.return_date = $return_date`,
            {
                member_id:   neo4j.int(transaction.member_id),
                book_id:     neo4j.int(transaction.book_id),
                tx_id:       neo4j.int(transaction.id),
                return_date: transaction.return_date?.toISOString() || new Date().toISOString(),
            }
        );
    } catch (error) {
        console.error('Neo4j syncReturn failed:', error.message);
    }
};

/**
 * Sync a review-like event to Neo4j for lightweight engagement recommendations.
 */
export const syncReviewLikeToNeo4j = async (memberId, reviewBookId) => {
    if (!driver) return;
    try {
        await runNeo4jQuery(
            `MERGE (m:Member {id: $memberId})
             MERGE (b:Book {id: $bookId})
             MERGE (m)-[r:LIKED_REVIEW_OF]->(b)
             SET r.updated_at = $updated_at`,
            {
                memberId: neo4j.int(memberId),
                bookId: neo4j.int(reviewBookId),
                updated_at: new Date().toISOString(),
            }
        );
    } catch (error) {
        console.error('Neo4j syncReviewLike failed:', error.message);
    }
};

export const removeReviewLikeFromNeo4j = async (memberId, reviewBookId) => {
    if (!driver) return;
    try {
        await runNeo4jQuery(
            `MATCH (m:Member {id: $memberId})-[r:LIKED_REVIEW_OF]->(b:Book {id: $bookId})
             DELETE r`,
            {
                memberId: neo4j.int(memberId),
                bookId: neo4j.int(reviewBookId),
            }
        );
    } catch (error) {
        console.error('Neo4j removeReviewLike failed:', error.message);
    }
};

// ─── Recommendation Queries ───────────────────────────────────

/**
 * Collaborative filtering — "Members who borrowed this also borrowed..."
 */
export const getRecommendationsForMember = async (memberId, limit = 10) => {
    if (!driver) return [];
    try {
        const records = await runNeo4jQuery(
            `MATCH (m:Member {id: $memberId})-[:BORROWED]->(b:Book)<-[:BORROWED]-(other:Member)
             MATCH (other)-[:BORROWED]->(rec:Book)
             WHERE NOT (m)-[:BORROWED]->(rec)
             RETURN DISTINCT rec.id AS book_id, rec.title AS title, count(other) AS score
             ORDER BY score DESC
             LIMIT $limit`,
            { memberId: neo4j.int(memberId), limit: neo4j.int(limit) }
        );
        return records.map(r => ({
            book_id: r.get('book_id').toNumber(),
            title:   r.get('title'),
            score:   r.get('score').toNumber(),
        }));
    } catch (error) {
        console.error('Neo4j recommendations failed:', error.message);
        return [];
    }
};

/**
 * Content-based — books by same author or same category
 */
export const getRelatedBooks = async (bookId, limit = 8) => {
    if (!driver) return [];
    try {
        const records = await runNeo4jQuery(
            `MATCH (b:Book {id: $bookId})-[:WRITTEN_BY]->(a:Author)<-[:WRITTEN_BY]-(related:Book)
             WHERE related.id <> $bookId
             RETURN DISTINCT related.id AS book_id, related.title AS title, 'same_author' AS reason
             UNION
             MATCH (b:Book {id: $bookId})-[:BELONGS_TO]->(c:Category)<-[:BELONGS_TO]-(related:Book)
             WHERE related.id <> $bookId
             RETURN DISTINCT related.id AS book_id, related.title AS title, 'same_category' AS reason
             LIMIT $limit`,
            { bookId: neo4j.int(bookId), limit: neo4j.int(limit) }
        );
        return records.map(r => ({
            book_id: r.get('book_id').toNumber(),
            title:   r.get('title'),
            reason:  r.get('reason'),
        }));
    } catch (error) {
        console.error('Neo4j related books failed:', error.message);
        return [];
    }
};

/**
 * Popular books — most borrowed across all members
 */
export const getPopularBooks = async (limit = 10) => {
    if (!driver) return [];
    try {
        const records = await runNeo4jQuery(
            `MATCH (b:Book)<-[:BORROWED]-(m:Member)
             RETURN b.id AS book_id, b.title AS title, count(m) AS borrow_count
             ORDER BY borrow_count DESC
             LIMIT $limit`,
            { limit: neo4j.int(limit) }
        );
        return records.map(r => ({
            book_id:      r.get('book_id').toNumber(),
            title:        r.get('title'),
            borrow_count: r.get('borrow_count').toNumber(),
        }));
    } catch (error) {
        console.error('Neo4j popular books failed:', error.message);
        return [];
    }
};

// ─── Ebook Sync ───────────────────────────────────────────────
export const syncEbookToNeo4j = async (ebook) => {
    if (!driver) return;
    try {
        const session = driver.session();
        try {
            await session.run(
                `MERGE (e:Ebook {id: $id})
                 SET e.title = $title,
                     e.author = $author,
                     e.is_public = $is_public,
                     e.file_format = $file_format,
                     e.uploaded_by_type = $uploaded_by_type
                 WITH e
                 FOREACH (_ IN CASE WHEN $book_id IS NOT NULL THEN [1] ELSE [] END |
                   MERGE (b:Book {id: $book_id})
                   MERGE (e)-[:BASED_ON]->(b)
                 )`,
                {
                    id: neo4j.int(ebook.id),
                    title: ebook.title || '',
                    author: ebook.author || '',
                    is_public: ebook.is_public || false,
                    file_format: ebook.file_format || '',
                    uploaded_by_type: ebook.uploaded_by_type || 'admin',
                    book_id: ebook.book_id ? neo4j.int(ebook.book_id) : null,
                }
            );
        } finally {
            await session.close();
        }
    } catch (error) {
        console.error('Neo4j syncEbook failed:', error.message);
    }
};

// ─── Wishlist ─────────────────────────────────────────────────
export const addToWishlist = async (memberId, bookId) => {
    if (!driver) return;
    try {
        const session = driver.session();
        try {
            const now = new Date().toISOString();
            await session.run(
                `MERGE (m:Member {id: $memberId})
                 MERGE (b:Book {id: $bookId})
                 MERGE (m)-[w:WISHLISTED]->(b)
                 SET w.added_at = $now`,
                { memberId: neo4j.int(memberId), bookId: neo4j.int(bookId), now }
            );
        } finally {
            await session.close();
        }
    } catch (error) {
        console.error('Neo4j addToWishlist failed:', error.message);
    }
};

export const removeFromWishlist = async (memberId, bookId) => {
    if (!driver) return;
    try {
        const session = driver.session();
        try {
            await session.run(
                `MATCH (m:Member {id: $memberId})-[w:WISHLISTED]->(b:Book {id: $bookId})
                 DELETE w`,
                { memberId: neo4j.int(memberId), bookId: neo4j.int(bookId) }
            );
        } finally {
            await session.close();
        }
    } catch (error) {
        console.error('Neo4j removeFromWishlist failed:', error.message);
    }
};

export const getWishlist = async (memberId) => {
    if (!driver) return [];
    try {
        const session = driver.session();
        try {
            const result = await session.run(
                `MATCH (m:Member {id: $memberId})-[w:WISHLISTED]->(b:Book)
                 RETURN b.id AS book_id, w.added_at AS added_at
                 ORDER BY w.added_at DESC`,
                { memberId: neo4j.int(memberId) }
            );
            return result.records.map(r => ({
                book_id: r.get('book_id').toNumber(),
                added_at: r.get('added_at'),
            }));
        } finally {
            await session.close();
        }
    } catch (error) {
        console.error('Neo4j getWishlist failed:', error.message);
        return [];
    }
};

export const isWishlisted = async (memberId, bookId) => {
    if (!driver) return false;
    try {
        const session = driver.session();
        try {
            const result = await session.run(
                `MATCH (m:Member {id: $memberId})-[:WISHLISTED]->(b:Book {id: $bookId})
                 RETURN count(*) AS cnt`,
                { memberId: neo4j.int(memberId), bookId: neo4j.int(bookId) }
            );
            return result.records[0]?.get('cnt').toNumber() > 0;
        } finally {
            await session.close();
        }
    } catch (error) {
        console.error('Neo4j isWishlisted failed:', error.message);
        return false;
    }
};

export const getWishlistRecommendations = async (memberId, limit = 8) => {
    if (!driver) return [];
    try {
        const session = driver.session();
        try {
            const result = await session.run(
                `MATCH (m:Member {id: $memberId})-[:WISHLISTED]->(b:Book)
                       <-[:WISHLISTED]-(peer:Member)
                 MATCH (peer)-[:WISHLISTED|BORROWED]->(rec:Book)
                 WHERE NOT (m)-[:WISHLISTED|BORROWED]->(rec)
                 RETURN DISTINCT rec.id AS book_id, rec.title AS title, count(peer) AS score
                 ORDER BY score DESC LIMIT $limit`,
                { memberId: neo4j.int(memberId), limit: neo4j.int(limit) }
            );
            return result.records.map(r => ({
                book_id: r.get('book_id').toNumber(),
                title: r.get('title'),
                score: r.get('score').toNumber(),
            }));
        } finally {
            await session.close();
        }
    } catch (error) {
        console.error('Neo4j getWishlistRecommendations failed:', error.message);
        return [];
    }
};

// ─── Trending ─────────────────────────────────────────────────
export const getPopularBooksInPeriod = async (sinceDays = 7, limit = 10) => {
    if (!driver) return [];
    try {
        const session = driver.session();
        try {
            const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();
            const result = await session.run(
                `MATCH (b:Book)<-[r:BORROWED]-(m:Member)
                 WHERE r.checkout_date >= $since
                 RETURN b.id AS book_id, b.title AS title, count(r) AS borrow_count
                 ORDER BY borrow_count DESC LIMIT $limit`,
                { since, limit: neo4j.int(limit) }
            );
            return result.records.map(r => ({
                book_id: r.get('book_id').toNumber(),
                title: r.get('title'),
                borrow_count: r.get('borrow_count').toNumber(),
            }));
        } finally {
            await session.close();
        }
    } catch (error) {
        console.error('Neo4j getPopularBooksInPeriod failed:', error.message);
        return [];
    }
};

// ─── Also Borrowed (Co-borrow) ────────────────────────────────
export const getAlsoBorrowed = async (bookId, limit = 6) => {
    if (!driver) return [];
    try {
        const session = driver.session();
        try {
            const result = await session.run(
                `MATCH (b:Book {id: $bookId})<-[:BORROWED]-(m:Member)-[:BORROWED]->(other:Book)
                 WHERE other.id <> $bookId
                 RETURN other.id AS book_id, other.title AS title, count(m) AS times_together
                 ORDER BY times_together DESC LIMIT $limit`,
                { bookId: neo4j.int(bookId), limit: neo4j.int(limit) }
            );
            return result.records.map(r => ({
                book_id: r.get('book_id').toNumber(),
                title: r.get('title'),
                times_together: r.get('times_together').toNumber(),
            }));
        } finally {
            await session.close();
        }
    } catch (error) {
        console.error('Neo4j getAlsoBorrowed failed:', error.message);
        return [];
    }
};

// ─── Reading Profile ──────────────────────────────────────────
export const getMemberCategoryInterests = async (memberId) => {
    if (!driver) return [];
    try {
        const session = driver.session();
        try {
            const result = await session.run(
                `MATCH (m:Member {id: $memberId})-[i:INTERESTED_IN]->(c:Category)
                 RETURN c.name AS category, i.weight AS interest_score
                 ORDER BY interest_score DESC LIMIT 5`,
                { memberId: neo4j.int(memberId) }
            );
            return result.records.map(r => ({
                category: r.get('category'),
                interest_score: r.get('interest_score').toNumber(),
            }));
        } finally {
            await session.close();
        }
    } catch (error) {
        console.error('Neo4j getMemberCategoryInterests failed:', error.message);
        return [];
    }
};

// ─── Admin Graph Stats ────────────────────────────────────────
export const getNeo4jGraphStats = async () => {
    if (!driver) return { books: 0, members: 0, borrows: 0, wishlisted: 0, authors: 0, categories: 0 };
    try {
        const session = driver.session();
        try {
            const result = await session.run(
                `MATCH (b:Book) WITH count(b) AS books
                 MATCH (m:Member) WITH books, count(m) AS members
                 OPTIONAL MATCH ()-[r:BORROWED]->() WITH books, members, count(r) AS borrows
                 OPTIONAL MATCH ()-[w:WISHLISTED]->() WITH books, members, borrows, count(w) AS wishlisted
                 MATCH (a:Author) WITH books, members, borrows, wishlisted, count(a) AS authors
                 MATCH (c:Category) RETURN books, members, borrows, wishlisted, authors, count(c) AS categories`
            );
            const rec = result.records[0];
            if (!rec) return { books: 0, members: 0, borrows: 0, wishlisted: 0, authors: 0, categories: 0 };
            return {
                books: rec.get('books').toNumber(),
                members: rec.get('members').toNumber(),
                borrows: rec.get('borrows').toNumber(),
                wishlisted: rec.get('wishlisted').toNumber(),
                authors: rec.get('authors').toNumber(),
                categories: rec.get('categories').toNumber(),
            };
        } finally {
            await session.close();
        }
    } catch (error) {
        console.error('Neo4j getGraphStats failed:', error.message);
        return { books: 0, members: 0, borrows: 0, wishlisted: 0, authors: 0, categories: 0 };
    }
};

export default {
    connectNeo4j,
    getNeo4jDriver,
    closeNeo4j,
    checkNeo4jConnection,
    runNeo4jQuery,
    syncBookToNeo4j,
    syncMemberToNeo4j,
    syncCheckoutToNeo4j,
    syncReturnToNeo4j,
    syncReviewLikeToNeo4j,
    removeReviewLikeFromNeo4j,
    syncEbookToNeo4j,
    getRecommendationsForMember,
    getRelatedBooks,
    getPopularBooks,
    addToWishlist,
    removeFromWishlist,
    getWishlist,
    isWishlisted,
    getWishlistRecommendations,
    getPopularBooksInPeriod,
    getAlsoBorrowed,
    getMemberCategoryInterests,
    getNeo4jGraphStats,
};
