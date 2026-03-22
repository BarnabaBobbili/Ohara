// ============================================================
// MONGODB FRESH SCHEMA — OHARA LIBRARY
// MongoDB Atlas — Activity Logs, CMS & Analytics
// Run in MongoDB Shell or Atlas UI
// ============================================================

// ============================================================
// 1. ACTIVITY_LOGS COLLECTION (Registry)
// High-level activity tracking for admin dashboard
// ============================================================

// Drop existing collection (optional - removes all data!)
// db.activity_logs.drop();

// Create collection with validation
db.createCollection("activity_logs", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["action", "entity_type", "entity_id", "timestamp"],
            properties: {
                _id: { bsonType: "objectId" },
                
                // Action performed
                action: {
                    bsonType: "string",
                    enum: [
                        // Book actions
                        "book_added", "book_updated", "book_deleted",
                        // Member actions
                        "member_added", "member_updated", "member_deleted", "member_suspended", "member_activated",
                        // Circulation actions
                        "checkout", "checkin", "renewal", "overdue_marked", "lost_marked",
                        // Reservation actions
                        "reservation_created", "reservation_cancelled", "reservation_fulfilled", "reservation_expired",
                        // Financial actions
                        "fine_charged", "fine_paid", "fine_waived",
                        // Collection actions
                        "collection_created", "collection_updated", "collection_deleted",
                        // Staff actions
                        "staff_login", "staff_logout", "staff_added", "staff_updated",
                        // System actions
                        "settings_updated", "system_event", "backup_created"
                    ],
                    description: "Type of action performed"
                },
                
                // Entity that was affected
                entity_type: {
                    bsonType: "string",
                    enum: ["book", "member", "transaction", "reservation", "collection", "staff", "settings", "system"],
                    description: "Type of entity affected"
                },
                entity_id: {
                    bsonType: ["int", "string", "objectId"],
                    description: "ID of the affected entity"
                },
                
                // Entity details for quick display (denormalized - no need to JOIN)
                entity_details: {
                    bsonType: "object",
                    properties: {
                        // For books
                        title: { bsonType: "string" },
                        author: { bsonType: "string" },
                        isbn: { bsonType: "string" },
                        // For members
                        name: { bsonType: "string" },
                        email: { bsonType: "string" },
                        card_id: { bsonType: "string" },
                        // For transactions
                        transaction_id: { bsonType: "int" },
                        fine_amount: { bsonType: "double" }
                    },
                    description: "Denormalized entity info for display"
                },
                
                // What changed (for updates) - just field names
                fields_changed: {
                    bsonType: "array",
                    items: { bsonType: "string" },
                    description: "List of field names that were modified"
                },
                
                // Who performed the action
                performed_by: {
                    bsonType: "object",
                    properties: {
                        type: { bsonType: "string", enum: ["staff", "member", "system"] },
                        id: { bsonType: ["int", "string"] },
                        name: { bsonType: "string" },
                        email: { bsonType: "string" }
                    },
                    description: "Who performed this action"
                },
                
                // Additional context
                metadata: {
                    bsonType: "object",
                    description: "Additional context (IP, user agent, related IDs, etc.)"
                },
                
                // Timestamp (stored in UTC, displayed in IST)
                timestamp: {
                    bsonType: "date",
                    description: "When the action occurred"
                }
            }
        }
    }
});

// Create indexes for activity_logs
db.activity_logs.createIndex({ "timestamp": -1 });
db.activity_logs.createIndex({ "action": 1, "timestamp": -1 });
db.activity_logs.createIndex({ "entity_type": 1, "entity_id": 1 });
db.activity_logs.createIndex({ "performed_by.id": 1 });
db.activity_logs.createIndex({ "entity_details.title": 1 });

// TTL index - auto-delete logs older than 1 year (365 days)
db.activity_logs.createIndex(
    { "timestamp": 1 }, 
    { expireAfterSeconds: 31536000 }
);

// ============================================================
// 2. CMS_PAGES COLLECTION (Dynamic Content)
// ============================================================

// db.cms_pages.drop();

db.createCollection("cms_pages", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["page", "section", "content"],
            properties: {
                _id: { bsonType: "objectId" },
                page: { 
                    bsonType: "string",
                    description: "Page identifier (home, about, contact)"
                },
                section: { 
                    bsonType: "string",
                    description: "Section within the page (hero, features, footer)"
                },
                content: { 
                    bsonType: "object",
                    description: "Flexible content structure"
                },
                is_active: { bsonType: "bool" },
                display_order: { bsonType: "int" },
                updated_at: { bsonType: "date" },
                updated_by: { bsonType: "string" }
            }
        }
    }
});

// Unique index on page + section
db.cms_pages.createIndex({ "page": 1, "section": 1 }, { unique: true });
db.cms_pages.createIndex({ "page": 1, "display_order": 1 });

// Insert default CMS content for landing page
db.cms_pages.insertMany([
    {
        page: "home",
        section: "hero",
        content: {
            headline: "Find the book\nthat's been\nwaiting for you.",
            subtitle: "Browse 50,000+ titles. Reserve instantly.\nYour reading journey, organized.",
            quick_links: [
                { label: "Browse Catalog", url: "/search" },
                { label: "New Arrivals", url: "/search?filter=new" },
                { label: "Staff Picks", url: "/search?filter=staff-picks" },
                { label: "My Reservations", url: "/dashboard" }
            ],
            stats: { readers_count: 12847, rating: 4.9, reviews_count: 2340 }
        },
        is_active: true,
        display_order: 1,
        updated_at: new Date(),
        updated_by: "system"
    },
    {
        page: "home",
        section: "bookshelf",
        content: {
            headline: "The Living Library",
            subtitle: "Real-time updates from shelves around the world. Join a community that leaves notes in the margins and see what others are discovering right now."
        },
        is_active: true,
        display_order: 3,
        updated_at: new Date(),
        updated_by: "system"
    },
    {
        page: "home",
        section: "philosophy",
        content: {
            headline: "Our Philosophy",
            subtitle: "More than just books",
            description: "We believe that every book has a reader waiting to discover it, and every reader has a book waiting to transform them."
        },
        is_active: true,
        display_order: 4,
        updated_at: new Date(),
        updated_by: "system"
    },
    {
        page: "home",
        section: "membership",
        content: {
            headline: "Join Our Community",
            subtitle: "Become a member today",
            benefits: [
                "Borrow up to 5 books at a time",
                "Access to digital library",
                "Priority reservations",
                "Exclusive events"
            ],
            cta_text: "Get Your Library Card",
            cta_url: "/signup"
        },
        is_active: true,
        display_order: 5,
        updated_at: new Date(),
        updated_by: "system"
    },
    {
        page: "home",
        section: "footer",
        content: {
            library_name: "Ohara Library",
            tagline: "Where stories come alive",
            contact: {
                email: "contact@oharalibrary.com",
                phone: "+91 1234567890",
                address: "123 Library Street, City, State 123456"
            },
            hours: {
                weekdays: "9:00 AM - 8:00 PM",
                saturday: "10:00 AM - 6:00 PM",
                sunday: "Closed"
            },
            social: {
                twitter: "https://twitter.com/oharalibrary",
                instagram: "https://instagram.com/oharalibrary",
                facebook: "https://facebook.com/oharalibrary"
            }
        },
        is_active: true,
        display_order: 6,
        updated_at: new Date(),
        updated_by: "system"
    }
]);

// ============================================================
// 3. ANALYTICS COLLECTION
// Track usage patterns, searches, page views
// ============================================================

// db.analytics.drop();

db.createCollection("analytics", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["event_type", "timestamp"],
            properties: {
                _id: { bsonType: "objectId" },
                event_type: {
                    bsonType: "string",
                    enum: ["page_view", "search", "book_view", "category_browse", "download", "login", "logout", "reservation", "checkout"]
                },
                page: { bsonType: "string" },
                search_query: { bsonType: "string" },
                search_results_count: { bsonType: "int" },
                book_id: { bsonType: "int" },
                book_title: { bsonType: "string" },
                category: { bsonType: "string" },
                member_id: { bsonType: "int" },
                session_id: { bsonType: "string" },
                user_agent: { bsonType: "string" },
                ip_address: { bsonType: "string" },
                referrer: { bsonType: "string" },
                duration_seconds: { bsonType: "int" },
                timestamp: { bsonType: "date" }
            }
        }
    }
});

// Indexes for analytics
db.analytics.createIndex({ "timestamp": -1 });
db.analytics.createIndex({ "event_type": 1, "timestamp": -1 });
db.analytics.createIndex({ "book_id": 1 });
db.analytics.createIndex({ "member_id": 1 });
db.analytics.createIndex({ "search_query": 1 });

// TTL index - auto-delete analytics older than 90 days
db.analytics.createIndex(
    { "timestamp": 1 }, 
    { expireAfterSeconds: 7776000 }
);

// ============================================================
// USEFUL QUERIES (Reference)
// ============================================================

// Get recent activity logs (formatted for IST display)
// db.activity_logs.find().sort({ timestamp: -1 }).limit(10);

// Get activity logs for a specific book
// db.activity_logs.find({ 
//     entity_type: "book", 
//     entity_id: 1 
// }).sort({ timestamp: -1 });

// Get all book updates with fields changed
// db.activity_logs.find({ 
//     action: "book_updated",
//     fields_changed: { $exists: true, $ne: [] }
// }).sort({ timestamp: -1 });

// Get CMS content for a page
// db.cms_pages.find({ page: "home", is_active: true }).sort({ display_order: 1 });

// Get hero section content
// db.cms_pages.findOne({ page: "home", section: "hero" });

// Get popular searches
// db.analytics.aggregate([
//     { $match: { event_type: "search" } },
//     { $group: { _id: "$search_query", count: { $sum: 1 } } },
//     { $sort: { count: -1 } },
//     { $limit: 10 }
// ]);

// Get most viewed books
// db.analytics.aggregate([
//     { $match: { event_type: "book_view" } },
//     { $group: { _id: "$book_id", title: { $first: "$book_title" }, views: { $sum: 1 } } },
//     { $sort: { views: -1 } },
//     { $limit: 10 }
// ]);

// ============================================================
// SAMPLE DATA FOR TESTING
// ============================================================

// Insert sample activity logs
db.activity_logs.insertMany([
    {
        action: "book_added",
        entity_type: "book",
        entity_id: 1,
        entity_details: {
            title: "The Great Gatsby",
            author: "F. Scott Fitzgerald",
            isbn: "978-0743273565"
        },
        performed_by: {
            type: "staff",
            id: 1,
            name: "Admin",
            email: "admin@oharalibrary.com"
        },
        timestamp: new Date()
    },
    {
        action: "book_updated",
        entity_type: "book",
        entity_id: 1,
        entity_details: {
            title: "The Great Gatsby",
            author: "F. Scott Fitzgerald",
            isbn: "978-0743273565"
        },
        fields_changed: ["description", "total_copies"],
        performed_by: {
            type: "staff",
            id: 1,
            name: "Admin",
            email: "admin@oharalibrary.com"
        },
        timestamp: new Date()
    }
]);

// ============================================================
// DONE!
// ============================================================

print("MongoDB schema created successfully!");
print("Collections: activity_logs, cms_pages, analytics");
print("Indexes created for optimal query performance.");
print("TTL indexes set: activity_logs (1 year), analytics (90 days)");
