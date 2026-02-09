"""
Reports API Router
Analytics and reporting endpoints - Using Raw SQL
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database.sql import get_db
from app.database.mongodb import get_activity_logs_collection
from datetime import datetime, timedelta
from typing import List, Dict, Any

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/activity-logs")
def get_activity_logs(
    limit: int = 100,
    skip: int = 0
):
    """Get recent activity logs from MongoDB"""
    try:
        logs_collection = get_activity_logs_collection()
        if logs_collection is None:
            return {"error": "MongoDB not connected", "logs": []}
        
        logs = list(logs_collection.find(
            {},
            {"_id": 0}
        ).sort("timestamp", -1).skip(skip).limit(limit))
        
        # Convert datetime to string for JSON serialization
        for log in logs:
            if "timestamp" in log:
                log["timestamp"] = log["timestamp"].isoformat()
        
        return {"logs": logs, "total": logs_collection.count_documents({})}
    except Exception as e:
        return {"error": str(e), "logs": []}


@router.get("/circulation-stats")
def get_circulation_stats(db: Session = Depends(get_db)):
    """Get circulation statistics"""
    now = datetime.utcnow()
    
    # Today's checkouts
    today_start = datetime(now.year, now.month, now.day)
    result = db.execute(
        text("SELECT COUNT(*) as count FROM transactions WHERE checkout_date >= :today_start"),
        {"today_start": today_start}
    )
    today_checkouts = result.fetchone().count
    
    # This week's checkouts
    week_start = now - timedelta(days=now.weekday())
    result = db.execute(
        text("SELECT COUNT(*) as count FROM transactions WHERE checkout_date >= :week_start"),
        {"week_start": week_start}
    )
    week_checkouts = result.fetchone().count
    
    # This month's checkouts
    month_start = datetime(now.year, now.month, 1)
    result = db.execute(
        text("SELECT COUNT(*) as count FROM transactions WHERE checkout_date >= :month_start"),
        {"month_start": month_start}
    )
    month_checkouts = result.fetchone().count
    
    # Average checkout duration
    result = db.execute(
        text("""
            SELECT 
                AVG(EXTRACT(EPOCH FROM (return_date - checkout_date))/86400) as avg_duration
            FROM transactions 
            WHERE return_date IS NOT NULL
        """)
    )
    avg_row = result.fetchone()
    avg_duration = avg_row.avg_duration if avg_row.avg_duration else 0
    
    return {
        "today_checkouts": today_checkouts,
        "week_checkouts": week_checkouts,
        "month_checkouts": month_checkouts,
        "average_checkout_duration_days": round(avg_duration, 2)
    }


@router.get("/popular-books")
def get_popular_books(limit: int = 10, db: Session = Depends(get_db)):
    """Get most borrowed books"""
    result = db.execute(
        text("""
            SELECT 
                b.id,
                b.title,
                b.author,
                COUNT(t.id) as borrow_count
            FROM books b
            JOIN transactions t ON b.id = t.book_id
            GROUP BY b.id, b.title, b.author
            ORDER BY borrow_count DESC
            LIMIT :limit
        """),
        {"limit": limit}
    )
    popular = result.fetchall()
    
    return [
        {
            "book_id": row.id,
            "title": row.title,
            "author": row.author,
            "borrow_count": row.borrow_count
        }
        for row in popular
    ]


@router.get("/category-distribution")
def get_category_distribution(db: Session = Depends(get_db)):
    """Get book distribution by category"""
    result = db.execute(
        text("""
            SELECT 
                category,
                COUNT(id) as count
            FROM books
            GROUP BY category
        """)
    )
    categories = result.fetchall()
    
    return [
        {"category": cat.category or "Uncategorized", "count": cat.count}
        for cat in categories
    ]


@router.get("/member-stats")
def get_member_stats(db: Session = Depends(get_db)):
    """Get member statistics by type"""
    result = db.execute(
        text("""
            SELECT 
                member_type,
                COUNT(id) as count
            FROM members
            GROUP BY member_type
        """)
    )
    member_types = result.fetchall()
    
    result = db.execute(
        text("SELECT COUNT(*) as count FROM members WHERE status = 'active'")
    )
    active_members = result.fetchone().count
    
    return {
        "by_type": [
            {"type": mt.member_type, "count": mt.count}
            for mt in member_types
        ],
        "active_members": active_members
    }


@router.get("/fine-report")
def get_fine_report(db: Session = Depends(get_db)):
    """Get fine collection report"""
    # Total outstanding fines
    result = db.execute(
        text("SELECT SUM(fines) as total FROM members")
    )
    outstanding = result.fetchone().total or 0
    
    # Collected fines (from paid transactions)
    result = db.execute(
        text("SELECT SUM(fine_amount) as total FROM transactions WHERE fine_paid = TRUE")
    )
    collected = result.fetchone().total or 0
    
    # Unpaid fines
    result = db.execute(
        text("SELECT SUM(fine_amount) as total FROM transactions WHERE fine_paid = FALSE AND fine_amount > 0")
    )
    unpaid = result.fetchone().total or 0
    
    # Members with fines
    result = db.execute(
        text("SELECT COUNT(*) as count FROM members WHERE fines > 0")
    )
    members_with_fines = result.fetchone().count
    
    return {
        "outstanding_fines": round(outstanding, 2),
        "collected_fines": round(collected, 2),
        "unpaid_fines": round(unpaid, 2),
        "members_with_fines": members_with_fines
    }


@router.get("/monthly-trend")
def get_monthly_trend(db: Session = Depends(get_db)):
    """Get monthly checkout trend for the last 6 months"""
    now = datetime.utcnow()
    six_months_ago = now - timedelta(days=180)
    
    # PostgreSQL date extraction
    result = db.execute(
        text("""
            SELECT 
                EXTRACT(YEAR FROM checkout_date)::INTEGER as year,
                EXTRACT(MONTH FROM checkout_date)::INTEGER as month,
                COUNT(id) as count
            FROM transactions
            WHERE checkout_date >= :six_months_ago
            GROUP BY year, month
            ORDER BY year, month
        """),
        {"six_months_ago": six_months_ago}
    )
    monthly_data = result.fetchall()
    
    return [
        {
            "year": row.year,
            "month": row.month,
            "checkouts": row.count
        }
        for row in monthly_data
    ]
