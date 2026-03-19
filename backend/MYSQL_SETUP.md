# MySQL Audit Trail Setup Guide

## Overview
This implementation adds **MySQL database** for audit trail functionality, tracking all changes to books in the Library Management System.

## Database Architecture
- **PostgreSQL**: Core transactional data (books, members, transactions)
- **MongoDB**: Activity logging & analytics
- **Neo4j**: Graph relationships
- **MySQL**: Audit trail (change tracking) ✨ NEW

---

## 🚀 Quick Setup

### Step 1: Choose a Cloud MySQL Service

#### **Option A: Railway.app** (Recommended)
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Create new project → Add MySQL database
4. Copy the connection details provided

#### **Option B: Aiven.io**
1. Go to [aiven.io](https://aiven.io)
2. Sign up for free tier
3. Create new MySQL service
4. Get connection credentials

#### **Option C: db4free.net** (No credit card)
1. Go to [db4free.net/signup.php](https://db4free.net/signup.php)
2. Register for free account
3. Create database
4. Note your credentials

---

### Step 2: Configure Environment Variables

Add these to your `.env` file:

```env
# MySQL Configuration (for Audit Trail)
MYSQL_HOST=your-mysql-host.com
MYSQL_PORT=3306
MYSQL_USER=your-username
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=library_audit
```

**Example for Railway:**
```env
MYSQL_HOST=containers-us-west-123.railway.app
MYSQL_PORT=5432
MYSQL_USER=root
MYSQL_PASSWORD=abc123xyz
MYSQL_DATABASE=railway
```

---

### Step 3: Create Database Schema

1. Connect to your MySQL database using any client (MySQL Workbench, DBeaver, or command line)

2. Run the schema from `mysql-schema.sql`:

```bash
mysql -h your-host -u your-user -p your-database < mysql-schema.sql
```

Or copy-paste the SQL:

```sql
CREATE TABLE IF NOT EXISTS audit_trail (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    changed_by VARCHAR(100),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON,
    INDEX idx_book_id (book_id),
    INDEX idx_action (action),
    INDEX idx_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### Step 4: Install Dependencies

```bash
npm install mysql2@3.11.0
```

---

### Step 5: Start Backend

```bash
npm run dev
```

Check console output:
```
✓ MongoDB connected successfully
✓ Neo4j driver created
✓ MySQL connected successfully
```

Check health endpoint:
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "databases": {
    "postgresql": "connected",
    "mongodb": "connected",
    "neo4j": "connected",
    "mysql": "connected"
  }
}
```

---

## 📚 API Endpoints

### Audit Trail Endpoints

#### 1. Get audit history for a specific book
```http
GET /api/audit/books/:id?limit=100
```

**Example:**
```bash
curl http://localhost:8000/api/audit/books/1
```

**Response:**
```json
{
  "book_id": 1,
  "total_logs": 3,
  "logs": [
    {
      "id": 1,
      "book_id": 1,
      "action": "UPDATE",
      "field_name": "title",
      "old_value": "Old Title",
      "new_value": "New Title",
      "changed_by": "admin",
      "changed_at": "2024-02-12T16:00:00.000Z"
    }
  ]
}
```

#### 2. Get all audit logs
```http
GET /api/audit/all?limit=100&offset=0
```

#### 3. Get audit logs by action (UPDATE/DELETE)
```http
GET /api/audit/action/:action?limit=100
```

**Examples:**
```bash
# Get all updates
curl http://localhost:8000/api/audit/action/UPDATE

# Get all deletions
curl http://localhost:8000/api/audit/action/DELETE
```

---

## 🔍 How It Works

### When You Update a Book:
1. **Before**: Fetches current book data
2. **After**: Compares old vs new data
3. **Logs**: Saves each changed field to MySQL

**PostgreSQL** → Stores current book data  
**MongoDB** → Logs activity: "book_edited"  
**MySQL** → Logs audit: field_name, old_value, new_value

### When You Delete a Book:
**PostgreSQL** → Deletes the book  
**MongoDB** → Logs activity: "book_deleted"  
**MySQL** → Saves complete book snapshot before deletion

---

## 🧪 Testing

### Test 1: Update a Book
```bash
curl -X PUT http://localhost:8000/api/books/1 \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title"}'
```

Check audit log:
```bash
curl http://localhost:8000/api/audit/books/1
```

### Test 2: Delete a Book
```bash
curl -X DELETE http://localhost:8000/api/books/1
```

Check deletion audit:
```bash
curl http://localhost:8000/api/audit/action/DELETE
```

---

## 📂 Files Added/Modified

### New Files:
- `src/db/mysql.js` - MySQL connection module
- `src/db/auditLogger.js` - Audit logging helper functions
- `src/routes/audit.js` - Audit API endpoints
- `mysql-schema.sql` - MySQL database schema

### Modified Files:
- `src/index.js` - Added MySQL initialization
- `src/routes/books.js` - Added audit logging on UPDATE/DELETE
- `package.json` - Added mysql2 dependency

---

## 🎯 Benefits

✅ **Data Recovery**: Can see what was changed and revert if needed  
✅ **Compliance**: Complete audit trail for regulatory requirements  
✅ **Debugging**: Track down when/how data changed  
✅ **Polyglot Persistence**: Demonstrates multi-database architecture  
✅ **Performance**: Separates audit data from operational data

---

## 🚨 Troubleshooting

### MySQL connection failed
- Check `.env` file has correct credentials
- Verify MySQL service is running
- Test connection with MySQL client first

### Audit logs not appearing
- Check backend console for "MySQL audit logging failed" errors
- Verify `audit_trail` table exists
- Check MySQL user has INSERT permissions

### "MySQL not connected" error
- Ensure `connectMySQL()` is called in `src/index.js`
- Check if MySQL import is correct
- Restart backend server

---

## 📊 Database Comparison

| Database   | Purpose               | Example Data              |
|------------|-----------------------|---------------------------|
| PostgreSQL | Core operational data | Books, Members, Trans     |
| MongoDB    | Activity tracking     | "User X added book Y"     |
| Neo4j      | Relationships         | Book→Category graph       |
| MySQL      | Audit trail           | "Title changed A→B"       |

