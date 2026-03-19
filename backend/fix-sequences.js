import pool from './src/db/connection.js';

async function fixSequences() {
    try {
        console.log('Fixing PostgreSQL sequences...');

        // Fix books sequence
        await pool.query(`
      SELECT setval(
        pg_get_serial_sequence('books', 'id'), 
        COALESCE((SELECT MAX(id) FROM books), 1)
      )
    `);
        console.log('✓ Books sequence fixed');

        // Fix members sequence
        await pool.query(`
      SELECT setval(
        pg_get_serial_sequence('members', 'id'), 
        COALESCE((SELECT MAX(id) FROM members), 1)
      )
    `);
        console.log('✓ Members sequence fixed');

        // Fix transactions sequence
        await pool.query(`
      SELECT setval(
        pg_get_serial_sequence('transactions', 'id'), 
        COALESCE((SELECT MAX(id) FROM transactions), 1)
      )
    `);
        console.log('✓ Transactions sequence fixed');

        console.log('All sequences updated successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixSequences();
