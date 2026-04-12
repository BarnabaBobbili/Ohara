/**
 * seed-neo4j.js
 * ─────────────────────────────────────────────────────────────
 * Reads ALL existing data from PostgreSQL (via Prisma) and
 * seeds it into Neo4j AuraDB.
 *
 * What this seeds:
 *   1. Book nodes  (+ Author node + Category node + HAS_TAG rels)
 *   2. Member nodes
 *   3. BORROWED relationships (from transactions table)
 *   4. INTERESTED_IN relationships (category weights per member)
 *   5. RETURNED flag on existing BORROWED relationships
 *   6. Ebook nodes (admin ebooks + member uploaded books)
 *
 * Run from backend/ directory:
 *   node seed-neo4j.js
 *
 * Safe to re-run — uses MERGE so nothing is duplicated.
 */

import dotenv from 'dotenv';
import neo4j from 'neo4j-driver';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './src/generated/prisma/client.js';

dotenv.config();

// ─── Prisma (same pg pool pattern as src/db/prisma.js) ───────
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Connect to Neo4j ────────────────────────────────────────
const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD),
    { maxConnectionPoolSize: 10 }
);

const run = (query, params = {}) => {
    const session = driver.session();
    return session.run(query, params).finally(() => session.close());
};

// ─── Progress helper ─────────────────────────────────────────
let step = 0;
const log = (msg) => {
    step++;
    const pad = String(step).padStart(2, '0');
    console.log(`\n[${pad}] ${msg}`);
};
const ok  = (msg) => console.log(`    ✓ ${msg}`);
const dim = (msg) => console.log(`    · ${msg}`);

// ─── PHASE 1: Books ──────────────────────────────────────────
async function seedBooks() {
    log('Seeding Books → Author → Category → Tags');

    const books = await prisma.books.findMany({
        where: { is_active: true },
        select: {
            id: true, title: true, author: true, isbn: true,
            category: true, publication_year: true, tags: true,
        },
    });

    dim(`Found ${books.length} active books in PostgreSQL`);

    let synced = 0;
    for (const book of books) {
        // Merge Book node + Author + Category
        await run(
            `MERGE (b:Book {id: $id})
             SET b.title            = $title,
                 b.isbn             = $isbn,
                 b.category         = $category,
                 b.publication_year = $publication_year
             WITH b
             MERGE (a:Author {name: $author})
             MERGE (b)-[:WRITTEN_BY]->(a)
             WITH b
             MERGE (c:Category {name: $category})
             MERGE (b)-[:BELONGS_TO]->(c)`,
            {
                id:               neo4j.int(book.id),
                title:            book.title,
                isbn:             book.isbn,
                category:         book.category || 'Uncategorised',
                publication_year: book.publication_year ? neo4j.int(book.publication_year) : neo4j.int(0),
                author:           book.author,
            }
        );

        // Merge Tag nodes (if any)
        if (Array.isArray(book.tags) && book.tags.length > 0) {
            for (const tag of book.tags) {
                if (!tag || !tag.trim()) continue;
                await run(
                    `MATCH (b:Book {id: $id})
                     MERGE (t:Tag {name: $tag})
                     MERGE (b)-[:HAS_TAG]->(t)`,
                    { id: neo4j.int(book.id), tag: tag.trim() }
                );
            }
        }

        synced++;
        if (synced % 20 === 0) dim(`  → ${synced}/${books.length} books done...`);
    }

    ok(`Synced ${synced} books with Authors, Categories, and Tags`);
}

// ─── PHASE 2: Members ────────────────────────────────────────
async function seedMembers() {
    log('Seeding Members');

    const members = await prisma.members.findMany({
        where: { status: 'active' },
        select: {
            id: true, name: true, card_id: true, member_type: true,
        },
    });

    dim(`Found ${members.length} active members`);

    let synced = 0;
    for (const m of members) {
        await run(
            `MERGE (m:Member {id: $id})
             SET m.name        = $name,
                 m.card_id     = $card_id,
                 m.member_type = $member_type`,
            {
                id:          neo4j.int(m.id),
                name:        m.name,
                card_id:     m.card_id,
                member_type: m.member_type,
            }
        );
        synced++;
    }

    ok(`Synced ${synced} members`);
}

// ─── PHASE 3: BORROWED relationships ─────────────────────────
async function seedBorrows() {
    log('Seeding BORROWED relationships (from transactions)');

    const transactions = await prisma.transactions.findMany({
        select: {
            id: true,
            member_id: true,
            book_id: true,
            checkout_date: true,
            return_date: true,
            status: true,
        },
    });

    dim(`Found ${transactions.length} transactions`);

    let synced = 0;
    for (const tx of transactions) {
        const returned = tx.status === 'returned' || tx.return_date !== null;
        await run(
            `MERGE (m:Member {id: $memberId})
             MERGE (b:Book   {id: $bookId})
             MERGE (m)-[r:BORROWED {tx_id: $txId}]->(b)
             SET r.checkout_date = $checkoutDate,
                 r.returned      = $returned,
                 r.return_date   = $returnDate`,
            {
                memberId:     neo4j.int(tx.member_id),
                bookId:       neo4j.int(tx.book_id),
                txId:         neo4j.int(tx.id),
                checkoutDate: tx.checkout_date.toISOString(),
                returned,
                returnDate:   tx.return_date ? tx.return_date.toISOString() : null,
            }
        );
        synced++;
        if (synced % 50 === 0) dim(`  → ${synced}/${transactions.length} borrow rels done...`);
    }

    ok(`Synced ${synced} BORROWED relationships`);
}

// ─── PHASE 4: INTERESTED_IN (category weights) ───────────────
// Count how many times each member borrowed from each category
// and write an INTERESTED_IN weight relationship.
async function seedCategoryInterests() {
    log('Computing INTERESTED_IN weights');

    // Group transactions by member + book category
    const transactions = await prisma.transactions.findMany({
        select: {
            member_id: true,
            books: { select: { category: true } },
        },
    });

    // Build a map: memberId → { category → count }
    const interestMap = new Map(); // memberId → Map(category → count)
    for (const tx of transactions) {
        const cat = tx.books?.category;
        if (!cat) continue;

        if (!interestMap.has(tx.member_id)) {
            interestMap.set(tx.member_id, new Map());
        }
        const catMap = interestMap.get(tx.member_id);
        catMap.set(cat, (catMap.get(cat) || 0) + 1);
    }

    dim(`Computing weights for ${interestMap.size} members`);

    let total = 0;
    for (const [memberId, catMap] of interestMap) {
        for (const [category, weight] of catMap) {
            await run(
                `MERGE (m:Member   {id: $memberId})
                 MERGE (c:Category {name: $category})
                 MERGE (m)-[i:INTERESTED_IN]->(c)
                 SET i.weight = $weight`,
                {
                    memberId: neo4j.int(memberId),
                    category,
                    weight:   neo4j.int(weight),
                }
            );
            total++;
        }
    }

    ok(`Created ${total} INTERESTED_IN relationships`);
}

// ─── PHASE 5: Ebooks (admin uploads) ─────────────────────────
async function seedEbooks() {
    log('Seeding Ebook nodes (admin uploads)');

    const ebooks = await prisma.ebooks.findMany({
        select: {
            id: true, title: true, author: true,
            is_public: true, file_format: true, book_id: true,
        },
    });

    dim(`Found ${ebooks.length} admin ebooks`);

    let synced = 0;
    for (const e of ebooks) {
        await run(
            `MERGE (e:Ebook {id: $id})
             SET e.title             = $title,
                 e.author            = $author,
                 e.is_public         = $is_public,
                 e.file_format       = $file_format,
                 e.uploaded_by_type  = 'admin'
             WITH e
             FOREACH (_ IN CASE WHEN $book_id IS NOT NULL THEN [1] ELSE [] END |
               MERGE (b:Book {id: $book_id})
               MERGE (e)-[:BASED_ON]->(b)
             )`,
            {
                id:         neo4j.int(e.id),
                title:      e.title,
                author:     e.author || '',
                is_public:  e.is_public,
                file_format:e.file_format || '',
                book_id:    e.book_id ? neo4j.int(e.book_id) : null,
            }
        );
        synced++;
    }

    ok(`Synced ${synced} admin ebook nodes`);
}

// ─── PHASE 6: User-uploaded books ────────────────────────────
async function seedUserUploads() {
    log('Seeding user-uploaded books as Ebook nodes');

    const uploads = await prisma.user_uploaded_books.findMany({
        select: {
            id: true, title: true, author: true,
            file_format: true, member_id: true,
        },
    });

    dim(`Found ${uploads.length} user-uploaded books`);

    let synced = 0;
    for (const u of uploads) {
        await run(
            `MERGE (e:Ebook {id: $id, uploaded_by_type: 'member'})
             SET e.title            = $title,
                 e.author           = $author,
                 e.is_public        = false,
                 e.file_format      = $file_format,
                 e.uploaded_by_type = 'member'
             WITH e
             MERGE (m:Member {id: $memberId})
             MERGE (m)-[:UPLOADED]->(e)`,
            {
                id:          neo4j.int(u.id),
                title:       u.title,
                author:      u.author || '',
                file_format: u.file_format || '',
                memberId:    neo4j.int(u.member_id),
            }
        );
        synced++;
    }

    ok(`Synced ${synced} user-uploaded book nodes`);
}

// ─── PHASE 7: Print final graph stats ────────────────────────
async function printStats() {
    log('Final Neo4j graph summary');

    const queries = [
        { label: 'Book nodes',             q: 'MATCH (n:Book)        RETURN count(n) AS c' },
        { label: 'Member nodes',           q: 'MATCH (n:Member)      RETURN count(n) AS c' },
        { label: 'Author nodes',           q: 'MATCH (n:Author)      RETURN count(n) AS c' },
        { label: 'Category nodes',         q: 'MATCH (n:Category)    RETURN count(n) AS c' },
        { label: 'Tag nodes',              q: 'MATCH (n:Tag)         RETURN count(n) AS c' },
        { label: 'Ebook nodes',            q: 'MATCH (n:Ebook)       RETURN count(n) AS c' },
        { label: 'BORROWED relationships', q: 'MATCH ()-[r:BORROWED]->() RETURN count(r) AS c' },
        { label: 'INTERESTED_IN rels',     q: 'MATCH ()-[r:INTERESTED_IN]->() RETURN count(r) AS c' },
        { label: 'HAS_TAG rels',           q: 'MATCH ()-[r:HAS_TAG]->() RETURN count(r) AS c' },
        { label: 'BASED_ON rels',          q: 'MATCH ()-[r:BASED_ON]->() RETURN count(r) AS c' },
        { label: 'UPLOADED rels',          q: 'MATCH ()-[r:UPLOADED]->() RETURN count(r) AS c' },
    ];

    console.log('\n  ┌──────────────────────────────┬──────────┐');
    console.log('  │ Entity                        │  Count   │');
    console.log('  ├──────────────────────────────┼──────────┤');
    for (const { label, q } of queries) {
        const result = await run(q);
        const count = result.records[0]?.get('c').toNumber() ?? 0;
        const padLabel = label.padEnd(30);
        const padCount = String(count).padStart(8);
        console.log(`  │ ${padLabel} │ ${padCount} │`);
    }
    console.log('  └──────────────────────────────┴──────────┘');
}

// ─── MAIN ────────────────────────────────────────────────────
async function main() {
    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║   Neo4j Seeder — Ohara Library System        ║');
    console.log('║   Reads PostgreSQL → Writes to AuraDB        ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log(`\n  Neo4j URI : ${process.env.NEO4J_URI}`);
    console.log(`  Time      : ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);

    try {
        // Verify connection
        const session = driver.session();
        await session.run('RETURN 1');
        await session.close();
        console.log('\n  ✓ Connected to Neo4j AuraDB\n');

        await seedBooks();
        await seedMembers();
        await seedBorrows();
        await seedCategoryInterests();
        await seedEbooks();
        await seedUserUploads();
        await printStats();

        console.log('\n✅ Seeding complete! Open Neo4j Aura Console to explore the graph.\n');
        console.log('   Aura Console URL: https://console.neo4j.io');
        console.log('   Or run this in Neo4j Browser to see everything:');
        console.log('   MATCH (n) RETURN n LIMIT 100\n');

    } catch (error) {
        console.error('\n❌ Seeding failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
        await pool.end();
        await driver.close();
    }
}

main();
