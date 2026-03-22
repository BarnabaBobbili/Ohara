import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

async function setupNeo4j() {
    let driver = null;
    let session = null;
    
    try {
        console.log('🔄 Connecting to Neo4j...');
        
        const uri = process.env.NEO4J_URI;
        const user = process.env.NEO4J_USER;
        const password = process.env.NEO4J_PASSWORD;
        
        if (!uri || !user || !password) {
            throw new Error('NEO4J_URI, NEO4J_USER, or NEO4J_PASSWORD not found in .env file');
        }

        driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
        await driver.verifyConnectivity();
        console.log('✓ Connected to Neo4j');

        session = driver.session();

        // ============================================================
        // CLEAR EXISTING DATA (OPTIONAL - BE CAREFUL!)
        // ============================================================
        console.log('\n⚠️  Clearing existing data...');
        await session.run('MATCH (n) DETACH DELETE n');
        console.log('✓ All nodes and relationships deleted');

        // Drop existing constraints and indexes
        console.log('\n🗑️  Dropping existing constraints and indexes...');
        try {
            await session.run('DROP CONSTRAINT book_id_unique IF EXISTS');
            await session.run('DROP CONSTRAINT member_id_unique IF EXISTS');
            await session.run('DROP CONSTRAINT author_name_unique IF EXISTS');
            await session.run('DROP CONSTRAINT category_name_unique IF EXISTS');
            console.log('✓ Existing constraints dropped');
        } catch (err) {
            console.log('  (No existing constraints to drop)');
        }

        // ============================================================
        // 1. CREATE CONSTRAINTS
        // ============================================================
        console.log('\n📝 Creating constraints...');
        
        await session.run(`
            CREATE CONSTRAINT book_id_unique IF NOT EXISTS
            FOR (b:Book) REQUIRE b.id IS UNIQUE
        `);
        console.log('✓ Constraint: Book.id (unique)');

        await session.run(`
            CREATE CONSTRAINT member_id_unique IF NOT EXISTS
            FOR (m:Member) REQUIRE m.id IS UNIQUE
        `);
        console.log('✓ Constraint: Member.id (unique)');

        await session.run(`
            CREATE CONSTRAINT author_name_unique IF NOT EXISTS
            FOR (a:Author) REQUIRE a.name IS UNIQUE
        `);
        console.log('✓ Constraint: Author.name (unique)');

        await session.run(`
            CREATE CONSTRAINT category_name_unique IF NOT EXISTS
            FOR (c:Category) REQUIRE c.name IS UNIQUE
        `);
        console.log('✓ Constraint: Category.name (unique)');

        // ============================================================
        // 2. CREATE INDEXES FOR PERFORMANCE
        // ============================================================
        console.log('\n📝 Creating indexes...');
        
        await session.run(`
            CREATE INDEX book_title_idx IF NOT EXISTS
            FOR (b:Book) ON (b.title)
        `);
        console.log('✓ Index: Book.title');

        await session.run(`
            CREATE INDEX book_isbn_idx IF NOT EXISTS
            FOR (b:Book) ON (b.isbn)
        `);
        console.log('✓ Index: Book.isbn');

        await session.run(`
            CREATE INDEX member_card_id_idx IF NOT EXISTS
            FOR (m:Member) ON (m.card_id)
        `);
        console.log('✓ Index: Member.card_id');

        // ============================================================
        // 3. VERIFY SETUP
        // ============================================================
        console.log('\n🔍 Verifying setup...');
        
        const constraintResult = await session.run('SHOW CONSTRAINTS');
        console.log(`✓ Total constraints: ${constraintResult.records.length}`);

        const indexResult = await session.run('SHOW INDEXES');
        console.log(`✓ Total indexes: ${indexResult.records.length}`);

        console.log('\n✅ Neo4j setup completed successfully!');
        console.log('\n📊 Summary:');
        console.log('  - Node Labels: Book, Member, Author, Category');
        console.log('  - Relationships: BORROWED, WRITTEN_BY, BELONGS_TO, INTERESTED_IN, SIMILAR_TO');
        console.log('  - Constraints: 4 unique constraints');
        console.log('  - Indexes: 3 property indexes');
        console.log('\n💡 Note: Graph data will be synced automatically when you:');
        console.log('  - Add/update books in PostgreSQL');
        console.log('  - Add members in PostgreSQL');
        console.log('  - Checkout/return books via circulation');

    } catch (error) {
        console.error('\n❌ Neo4j setup failed:', error.message);
        if (error.code) {
            console.error('Error code:', error.code);
        }
        process.exit(1);
    } finally {
        if (session) {
            await session.close();
        }
        if (driver) {
            await driver.close();
            console.log('\n🔌 Neo4j connection closed');
        }
    }
}

// Run setup
setupNeo4j();
