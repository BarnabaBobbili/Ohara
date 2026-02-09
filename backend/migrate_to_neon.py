"""
Data Migration Script: SQLite to Neon PostgreSQL
Migrates all data from local SQLite database to Neon PostgreSQL
"""
import sqlite3
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# Connection strings
SQLITE_URL = "sqlite:///./library.db"
POSTGRES_URL = "postgresql://neondb_owner:npg_jJStDT7Zqy4G@ep-noisy-breeze-afovmful-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require"

def migrate_data():
    """Migrate all data from SQLite to PostgreSQL"""
    
    print("=" * 60)
    print("Starting Data Migration: SQLite → Neon PostgreSQL")
    print("=" * 60)
    
    # Connect to SQLite
    print("\n1. Connecting to SQLite...")
    sqlite_engine = create_engine(SQLITE_URL)
    SQLiteSession = sessionmaker(bind=sqlite_engine)
    sqlite_session = SQLiteSession()
    
    # Connect to PostgreSQL
    print("2. Connecting to Neon PostgreSQL...")
    postgres_engine = create_engine(POSTGRES_URL, pool_pre_ping=True)
    PostgresSession = sessionmaker(bind=postgres_engine)
    postgres_session = PostgresSession()
    
    try:
        # Get table names
        tables = ['books', 'members', 'transactions']
        
        for table in tables:
            print(f"\n{'='*60}")
            print(f"Migrating table: {table}")
            print(f"{'='*60}")
            
            # Count records in SQLite
            result = sqlite_session.execute(text(f"SELECT COUNT(*) as count FROM {table}"))
            count = result.fetchone().count
            print(f"  → Found {count} records in SQLite")
            
            if count == 0:
                print(f"  → Skipping {table} (no data)")
                continue
            
            # Fetch all data from SQLite
            result = sqlite_session.execute(text(f"SELECT * FROM {table}"))
            rows = result.fetchall()
            columns = result.keys()
            
            # Insert into PostgreSQL
            inserted = 0
            for row in rows:
                # Convert row to dictionary
                row_dict = dict(zip(columns, row))
                
                # Build INSERT query
                cols = ', '.join(row_dict.keys())
                placeholders = ', '.join([f':{key}' for key in row_dict.keys()])
                query = f"INSERT INTO {table} ({cols}) VALUES ({placeholders})"
                
                try:
                    postgres_session.execute(text(query), row_dict)
                    inserted += 1
                except Exception as e:
                    print(f"  ⚠️  Error inserting row: {e}")
                    continue
            
            # Commit after each table
            postgres_session.commit()
            print(f"  ✅ Successfully migrated {inserted}/{count} records")
        
        print("\n" + "=" * 60)
        print("Migration Summary")
        print("=" * 60)
        
        # Verify counts in PostgreSQL
        for table in tables:
            result = postgres_session.execute(text(f"SELECT COUNT(*) as count FROM {table}"))
            count = result.fetchone().count
            print(f"  {table}: {count} records")
        
        print("\n✅ Migration completed successfully!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        postgres_session.rollback()
        raise
    
    finally:
        sqlite_session.close()
        postgres_session.close()
        print("\nDatabase connections closed.")

if __name__ == "__main__":
    migrate_data()
