// ============================================================
// NEO4J FRESH SCHEMA — OHARA LIBRARY
// Neo4j Aura — Recommendation Graph
// Run in Neo4j Browser or Aura Console
// ============================================================

// ============================================================
// CLEANUP (Optional - removes all data!)
// ============================================================

// Delete all nodes and relationships
// MATCH (n) DETACH DELETE n;

// ============================================================
// 1. CONSTRAINTS (Unique IDs)
// ============================================================

// Book constraint
CREATE CONSTRAINT book_id IF NOT EXISTS 
FOR (b:Book) REQUIRE b.id IS UNIQUE;

// Member constraint
CREATE CONSTRAINT member_id IF NOT EXISTS 
FOR (m:Member) REQUIRE m.id IS UNIQUE;

// Category constraint
CREATE CONSTRAINT category_name IF NOT EXISTS 
FOR (c:Category) REQUIRE c.name IS UNIQUE;

// Author constraint
CREATE CONSTRAINT author_name IF NOT EXISTS 
FOR (a:Author) REQUIRE a.name IS UNIQUE;

// ============================================================
// 2. INDEXES (Performance)
// ============================================================

CREATE INDEX book_title IF NOT EXISTS FOR (b:Book) ON (b.title);
CREATE INDEX book_isbn IF NOT EXISTS FOR (b:Book) ON (b.isbn);
CREATE INDEX book_category IF NOT EXISTS FOR (b:Book) ON (b.category);
CREATE INDEX member_card IF NOT EXISTS FOR (m:Member) ON (m.card_id);
CREATE INDEX member_type IF NOT EXISTS FOR (m:Member) ON (m.member_type);

// ============================================================
// 3. NODE LABELS
// ============================================================

// :Book
// Properties:
//   - id: INT (unique, from PostgreSQL books.id)
//   - title: STRING
//   - isbn: STRING
//   - author: STRING
//   - category: STRING
//   - publication_year: INT
//   - available_copies: INT
//   - cover_image_url: STRING

// :Member
// Properties:
//   - id: INT (unique, from PostgreSQL members.id)
//   - name: STRING
//   - card_id: STRING
//   - email: STRING
//   - member_type: STRING (regular, student, senior, premium)

// :Category
// Properties:
//   - name: STRING (unique)
//   - description: STRING

// :Author
// Properties:
//   - name: STRING (unique)

// ============================================================
// 4. RELATIONSHIP TYPES
// ============================================================

// (:Member)-[:BORROWED]->(:Book)
// Properties:
//   - transaction_id: INT
//   - checkout_date: DATETIME
//   - return_date: DATETIME
//   - rating: INT (1-5, optional)
//   - reviewed: BOOLEAN

// (:Member)-[:RESERVED]->(:Book)
// Properties:
//   - reservation_date: DATETIME
//   - status: STRING

// (:Member)-[:INTERESTED_IN]->(:Category)
// Properties:
//   - weight: FLOAT (based on borrowing frequency)

// (:Book)-[:IN_CATEGORY]->(:Category)

// (:Book)-[:WRITTEN_BY]->(:Author)

// (:Book)-[:SIMILAR_TO]->(:Book)
// Properties:
//   - score: FLOAT (similarity score 0-1)
//   - reason: STRING (same_author, same_category, co_borrowed)

// (:Member)-[:SIMILAR_TASTE]->(:Member)
// Properties:
//   - score: FLOAT (similarity score)
//   - common_books: INT

// ============================================================
// 5. SAMPLE CYPHER QUERIES
// ============================================================

// ----- SYNC FROM POSTGRESQL -----

// Add a book
// CREATE (b:Book {
//     id: 1,
//     title: "The Great Gatsby",
//     isbn: "978-0743273565",
//     author: "F. Scott Fitzgerald",
//     category: "Classic Literature",
//     publication_year: 1925,
//     available_copies: 3,
//     cover_image_url: "https://..."
// });

// Add a member
// CREATE (m:Member {
//     id: 1,
//     name: "John Doe",
//     card_id: "LIB123456",
//     email: "john@example.com",
//     member_type: "regular"
// });

// Record a checkout (create BORROWED relationship)
// MATCH (m:Member {id: 1}), (b:Book {id: 1})
// CREATE (m)-[:BORROWED {
//     transaction_id: 101,
//     checkout_date: datetime(),
//     return_date: null
// }]->(b);

// Record a return (update BORROWED relationship)
// MATCH (m:Member {id: 1})-[r:BORROWED {transaction_id: 101}]->(b:Book {id: 1})
// SET r.return_date = datetime();

// ----- RECOMMENDATIONS -----

// Get popular books (most borrowed)
// MATCH (b:Book)<-[r:BORROWED]-()
// RETURN b.id AS book_id, b.title, b.author, b.cover_image_url, COUNT(r) AS borrow_count
// ORDER BY borrow_count DESC
// LIMIT 10;

// Get recommendations for a member (books borrowed by similar readers)
// MATCH (m:Member {id: $memberId})-[:BORROWED]->(b:Book)<-[:BORROWED]-(other:Member)
// WHERE m <> other
// MATCH (other)-[:BORROWED]->(rec:Book)
// WHERE NOT (m)-[:BORROWED]->(rec)
// RETURN rec.id AS book_id, rec.title, rec.author, rec.cover_image_url, 
//        COUNT(DISTINCT other) AS score
// ORDER BY score DESC
// LIMIT 10;

// Get related books (same category + same author)
// MATCH (b:Book {id: $bookId})
// MATCH (similar:Book)
// WHERE b <> similar 
//   AND (similar.category = b.category OR similar.author = b.author)
// RETURN similar.id AS book_id, similar.title, similar.author, similar.cover_image_url,
//        CASE 
//          WHEN similar.author = b.author AND similar.category = b.category THEN 2
//          WHEN similar.author = b.author THEN 1.5
//          ELSE 1
//        END AS score
// ORDER BY score DESC
// LIMIT 8;

// Get books borrowed together (co-borrowing pattern)
// MATCH (b:Book {id: $bookId})<-[:BORROWED]-(m:Member)-[:BORROWED]->(other:Book)
// WHERE b <> other
// RETURN other.id AS book_id, other.title, other.author, COUNT(m) AS co_borrowed_count
// ORDER BY co_borrowed_count DESC
// LIMIT 8;

// Calculate member interests (categories they borrow most)
// MATCH (m:Member {id: $memberId})-[:BORROWED]->(b:Book)
// RETURN b.category AS category, COUNT(*) AS count
// ORDER BY count DESC;

// Find members with similar taste
// MATCH (m:Member {id: $memberId})-[:BORROWED]->(b:Book)<-[:BORROWED]-(other:Member)
// WHERE m <> other
// WITH other, COUNT(DISTINCT b) AS common_books
// WHERE common_books >= 3
// RETURN other.id, other.name, common_books
// ORDER BY common_books DESC
// LIMIT 5;

// ----- ANALYTICS -----

// Top categories by borrowing
// MATCH ()-[:BORROWED]->(b:Book)
// RETURN b.category, COUNT(*) AS borrows
// ORDER BY borrows DESC;

// Reading patterns by member type
// MATCH (m:Member)-[:BORROWED]->(b:Book)
// RETURN m.member_type, b.category, COUNT(*) AS count
// ORDER BY m.member_type, count DESC;

// ============================================================
// 6. UTILITY PROCEDURES
// ============================================================

// Create similarity relationships (run periodically)
// MATCH (b1:Book)<-[:BORROWED]-(m:Member)-[:BORROWED]->(b2:Book)
// WHERE b1.id < b2.id
// WITH b1, b2, COUNT(DISTINCT m) AS common_borrowers
// WHERE common_borrowers >= 2
// MERGE (b1)-[s:SIMILAR_TO]-(b2)
// SET s.score = common_borrowers * 0.1,
//     s.reason = 'co_borrowed';

// Update member interest weights
// MATCH (m:Member)-[:BORROWED]->(b:Book)
// WITH m, b.category AS cat, COUNT(*) AS borrows
// MERGE (c:Category {name: cat})
// MERGE (m)-[i:INTERESTED_IN]->(c)
// SET i.weight = borrows;

// ============================================================
// DONE!
// ============================================================

// After running this schema:
// 1. Books and Members are synced from PostgreSQL via backend
// 2. BORROWED relationships are created on checkout, updated on return
// 3. Recommendations are generated using the queries above
// 4. Run similarity calculations periodically (daily/weekly)
