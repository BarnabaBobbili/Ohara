import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupMongoDB() {
    let client = null;
    try {
        console.log('🔄 Connecting to MongoDB...');
        
        const uri = process.env.MONGODB_URL;
        const dbName = process.env.MONGODB_DB_NAME || 'LMS';
        
        if (!uri) {
            throw new Error('MONGODB_URL not found in .env file');
        }

        client = new MongoClient(uri);
        await client.connect();
        const db = client.db(dbName);
        
        console.log(`✓ Connected to MongoDB database: ${dbName}`);

        // Drop existing collections (optional)
        console.log('\n⚠️  Dropping existing collections...');
        const collections = await db.listCollections().toArray();
        for (const coll of collections) {
            if (['activity_logs', 'cms_pages', 'analytics'].includes(coll.name)) {
                await db.collection(coll.name).drop();
                console.log(`  ✓ Dropped: ${coll.name}`);
            }
        }

        // ============================================================
        // 1. ACTIVITY_LOGS COLLECTION
        // ============================================================
        console.log('\n📝 Creating activity_logs collection...');
        await db.createCollection("activity_logs", {
            validator: {
                $jsonSchema: {
                    bsonType: "object",
                    required: ["action", "entity_type", "entity_id", "timestamp"],
                    properties: {
                        _id: { bsonType: "objectId" },
                        action: {
                            bsonType: "string",
                            enum: [
                                "book_added", "book_updated", "book_deleted",
                                "member_added", "member_updated", "member_deleted", "member_suspended", "member_activated",
                                "checkout", "checkin", "renewal", "overdue_marked", "lost_marked",
                                "reservation_created", "reservation_cancelled", "reservation_fulfilled", "reservation_expired",
                                "fine_charged", "fine_paid", "fine_waived",
                                "collection_created", "collection_updated", "collection_deleted",
                                "staff_login", "staff_logout", "staff_added", "staff_updated",
                                "settings_updated", "system_event", "backup_created"
                            ]
                        },
                        entity_type: {
                            bsonType: "string",
                            enum: ["book", "member", "transaction", "reservation", "collection", "staff", "setting", "system"]
                        },
                        entity_id: { bsonType: "int" },
                        entity_details: {
                            bsonType: "object",
                            properties: {
                                title: { bsonType: "string" },
                                name: { bsonType: "string" },
                                isbn: { bsonType: "string" },
                                card_id: { bsonType: "string" }
                            }
                        },
                        fields_changed: {
                            bsonType: "array",
                            items: { bsonType: "string" }
                        },
                        performed_by: { bsonType: "string" },
                        timestamp: { bsonType: "date" },
                        metadata: { bsonType: "object" }
                    }
                }
            }
        });

        // Create indexes for activity_logs
        await db.collection('activity_logs').createIndex({ timestamp: -1 }, { name: 'idx_timestamp_desc' });
        await db.collection('activity_logs').createIndex({ action: 1, timestamp: -1 }, { name: 'idx_action_timestamp' });
        await db.collection('activity_logs').createIndex({ entity_type: 1, entity_id: 1 }, { name: 'idx_entity' });
        console.log('✓ activity_logs collection created with indexes');

        // ============================================================
        // 2. CMS_PAGES COLLECTION
        // ============================================================
        console.log('\n📝 Creating cms_pages collection...');
        await db.createCollection("cms_pages", {
            validator: {
                $jsonSchema: {
                    bsonType: "object",
                    required: ["page", "section", "content", "is_active"],
                    properties: {
                        _id: { bsonType: "objectId" },
                        page: {
                            bsonType: "string",
                            enum: ["home", "about", "contact", "events", "faq", "privacy"]
                        },
                        section: { bsonType: "string" },
                        content: { bsonType: "object" },
                        is_active: { bsonType: "bool" },
                        updated_at: { bsonType: "date" },
                        updated_by: { bsonType: "string" }
                    }
                }
            }
        });

        // Create unique index for cms_pages
        await db.collection('cms_pages').createIndex({ page: 1, section: 1 }, { unique: true, name: 'idx_page_section' });
        console.log('✓ cms_pages collection created with unique index');

        // Insert default CMS content
        console.log('\n📄 Inserting default CMS content...');
        const DEFAULT_CMS_CONTENT = [
            {
                page: 'home',
                section: 'hero',
                content: {
                    headline: "Find the book that's been waiting for you.",
                    subtitle: 'Browse 50,000+ titles. Reserve instantly.\nYour reading journey, organized.',
                    quick_links: [
                        { label: 'Browse Catalog', url: '/search' },
                        { label: 'New Arrivals', url: '/search?filter=new' },
                        { label: 'Staff Picks', url: '/search?filter=staff-picks' },
                        { label: 'My Reservations', url: '/dashboard' },
                    ],
                    stats: { readers_count: 12847, rating: 4.9, reviews_count: 2340 }
                },
                is_active: true,
                updated_at: new Date(),
                updated_by: 'system'
            },
            {
                page: 'home',
                section: 'bookshelf',
                content: {
                    headline: 'The Living Library',
                    subtitle: 'Real-time updates from shelves around the world. Join a community that leaves notes in the margins and see what others are discovering right now.'
                },
                is_active: true,
                updated_at: new Date(),
                updated_by: 'system'
            },
            {
                page: 'home',
                section: 'philosophy',
                content: {
                    label: '04 — Philosophy',
                    headline: 'Ohara Philosophy',
                    body_paragraphs: [
                        "In an era defined by algorithmic noise and infinite scrolling, we built a sanctuary. Ohara is not just a feature; it is a commitment to the preservation of attention.",
                        "We believe that the act of cataloging one's library is a form of meditation. It connects us to the physical reality of the books we love.",
                        "There are no notifications here. No social feeds clamoring for your engagement. Just your collection, your thoughts, and the quiet space to organize them."
                    ]
                },
                is_active: true,
                updated_at: new Date(),
                updated_by: 'system'
            },
            {
                page: 'home',
                section: 'membership_cta',
                content: {
                    headline: 'Begin your journey.',
                    subtitle: 'Unlock intelligent cataloging and rediscover the art of your collection.',
                    button_text: 'Request Access'
                },
                is_active: true,
                updated_at: new Date(),
                updated_by: 'system'
            },
            {
                page: 'home',
                section: 'footer',
                content: {
                    columns: [
                        {
                            title: 'The Archives',
                            links: [
                                { label: 'Search Catalog', url: '/search' },
                                { label: 'Curated Lists', url: '/search?filter=collections' },
                                { label: 'New Arrivals', url: '/search?filter=new' }
                            ]
                        },
                        {
                            title: 'The Community',
                            links: [
                                { label: 'About Ohara', url: '/about' },
                                { label: 'Upcoming Events', url: '/events' },
                                { label: 'Member Portal', url: '/dashboard' }
                            ]
                        },
                        {
                            title: 'The Keepers',
                            links: [
                                { label: 'About Us', url: '/about' },
                                { label: 'Contact Librarian', url: '/contact' },
                                { label: 'Support / FAQ', url: '/faq' }
                            ]
                        }
                    ],
                    newsletter_label: 'Join the Registry',
                    copyright_text: '© 2025 Ohara Library. All rights reserved.'
                },
                is_active: true,
                updated_at: new Date(),
                updated_by: 'system'
            }
        ];

        await db.collection('cms_pages').insertMany(DEFAULT_CMS_CONTENT);
        console.log(`✓ Inserted ${DEFAULT_CMS_CONTENT.length} default CMS sections`);

        // ============================================================
        // 3. ANALYTICS COLLECTION
        // ============================================================
        console.log('\n📝 Creating analytics collection...');
        await db.createCollection("analytics", {
            validator: {
                $jsonSchema: {
                    bsonType: "object",
                    required: ["type", "timestamp"],
                    properties: {
                        _id: { bsonType: "objectId" },
                        type: {
                            bsonType: "string",
                            enum: ["search", "borrow", "return", "reservation", "view", "login", "system"]
                        },
                        timestamp: { bsonType: "date" },
                        data: { bsonType: "object" }
                    }
                }
            }
        });

        // Create indexes and TTL for analytics
        await db.collection('analytics').createIndex({ type: 1, timestamp: -1 }, { name: 'idx_type_timestamp' });
        await db.collection('analytics').createIndex({ timestamp: -1 }, { name: 'idx_timestamp_desc' });
        await db.collection('analytics').createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000, name: 'idx_ttl_90days' }); // 90 days TTL
        console.log('✓ analytics collection created with indexes and TTL (90 days)');

        console.log('\n✅ MongoDB setup completed successfully!');
        console.log('\n📊 Summary:');
        console.log('  - activity_logs: Activity registry for dashboard');
        console.log('  - cms_pages: Content management (5 sections)');
        console.log('  - analytics: Event tracking (90-day TTL)');

    } catch (error) {
        console.error('\n❌ MongoDB setup failed:', error.message);
        process.exit(1);
    } finally {
        if (client) {
            await client.close();
            console.log('\n🔌 MongoDB connection closed');
        }
    }
}

// Run setup
setupMongoDB();
