import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function setupMySQL() {
    console.log('='.repeat(60));
    console.log('MySQL Audit Trail Setup');
    console.log('='.repeat(60));

    try {
        console.log('\n1. Connecting to MySQL...');
        console.log(`   Host: ${process.env.MYSQL_HOST}`);
        console.log(`   Port: ${process.env.MYSQL_PORT}`);
        console.log(`   Database: ${process.env.MYSQL_DATABASE}`);

        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            port: process.env.MYSQL_PORT || 3306,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            ssl: {
                rejectUnauthorized: false  // For cloud MySQL (Aiven, Railway, etc.)
            },
            connectTimeout: 10000  // 10 second timeout
        });

        console.log('✓ Connected to MySQL successfully!\n');

        console.log('2. Creating audit_trail table...');

        // Read and execute schema
        const schema = `
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
        `;

        await connection.query(schema);
        console.log('✓ Table created successfully!\n');

        console.log('3. Verifying table structure...');
        const [rows] = await connection.query('DESCRIBE audit_trail');
        console.log('✓ Table structure:');
        console.table(rows);

        await connection.end();

        console.log('\n' + '='.repeat(60));
        console.log('✅ MySQL setup complete!');
        console.log('='.repeat(60));
        console.log('\nNext steps:');
        console.log('1. Run: npm run dev');
        console.log('2. Check health: http://localhost:8000/health');
        console.log('3. Test audit trail by updating a book');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        console.error('\nDetails:', error);
        process.exit(1);
    }
}

setupMySQL();
