"""
Database migration script to add password_hash column to members table
Run this script to update an existing database
"""
import sqlite3

# Connect to database
conn = sqlite3.connect('library.db')
cursor = conn.cursor()

try:
    # Check if password_hash column exists
    cursor.execute("PRAGMA table_info(members)")
    columns = [row[1] for row in cursor.fetchall()]
    
    if 'password_hash' not in columns:
        print("Adding password_hash column to members table...")
        cursor.execute("ALTER TABLE members ADD COLUMN password_hash VARCHAR(255)")
        conn.commit()
        print("✓ Successfully added password_hash column")
    else:
        print("✓ password_hash column already exists")
        
except sqlite3.Error as e:
    print(f"✗ Error: {e}")
    conn.rollback()
    
finally:
    conn.close()

print("\nDatabase migration complete!")
