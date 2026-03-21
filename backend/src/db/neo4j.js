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
    getRecommendationsForMember,
    getRelatedBooks,
    getPopularBooks,
};
