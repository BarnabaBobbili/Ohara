"""
Add cover_image_url column to books table
"""
import sys
sys.path.insert(0, '..')
from app.database.sql import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        # Check if column exists
        result = conn.execute(text("PRAGMA table_info(books)"))
        columns = [row[1] for row in result]
        
        if 'cover_image_url' not in columns:
            print("Adding cover_image_url column...")
            conn.execute(text("ALTER TABLE books ADD COLUMN cover_image_url VARCHAR(500)"))
            conn.commit()
            print("✓ Migration complete!")
        else:
            print("✓ Column already exists, no migration needed")

if __name__ == "__main__":
    migrate()
