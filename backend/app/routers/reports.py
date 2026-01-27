"""
Reports API Router
Analytics and reporting endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from app.database.sql import get_db
from app.database.mongodb import get_activity_logs_collection
from app.models import sql_models
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
    today_checkouts = db.query(func.count(sql_models.Transaction.id)).filter(
        sql_models.Transaction.checkout_date >= today_start
    ).scalar()
    
    # This week's checkouts
    week_start = now - timedelta(days=now.weekday())
    week_checkouts = db.query(func.count(sql_models.Transaction.id)).filter(
        sql_models.Transaction.checkout_date >= week_start
    ).scalar()
    
    # This month's checkouts
    month_start = datetime(now.year, now.month, 1)
    month_checkouts = db.query(func.count(sql_models.Transaction.id)).filter(
        sql_models.Transaction.checkout_date >= month_start
    ).scalar()
    
    # Average checkout duration
    returned_transactions = db.query(sql_models.Transaction).filter(
        sql_models.Transaction.return_date.isnot(None)
    ).all()
    
    if returned_transactions:
        total_days = sum([
            (t.return_date - t.checkout_date).days 
            for t in returned_transactions
        ])
        avg_duration = total_days / len(returned_transactions)
    else:
        avg_duration = 0
    
    return {
        "today_checkouts": today_checkouts,
        "week_checkouts": week_checkouts,
        "month_checkouts": month_checkouts,
        "average_checkout_duration_days": round(avg_duration, 2)
    }


@router.get("/popular-books")
def get_popular_books(limit: int = 10, db: Session = Depends(get_db)):
    """Get most borrowed books"""
    popular = db.query(
        sql_models.Book.id,
        sql_models.Book.title,
        sql_models.Book.author,
        func.count(sql_models.Transaction.id).label("borrow_count")
    ).join(
        sql_models.Transaction
    ).group_by(
        sql_models.Book.id,
        sql_models.Book.title,
        sql_models.Book.author
    ).order_by(
        func.count(sql_models.Transaction.id).desc()
    ).limit(limit).all()
    
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
    categories = db.query(
        sql_models.Book.category,
        func.count(sql_models.Book.id).label("count")
    ).group_by(
        sql_models.Book.category
    ).all()
    
    return [
        {"category": cat.category or "Uncategorized", "count": cat.count}
        for cat in categories
    ]


@router.get("/member-stats")
def get_member_stats(db: Session = Depends(get_db)):
    """Get member statistics by type"""
    member_types = db.query(
        sql_models.Member.member_type,
        func.count(sql_models.Member.id).label("count")
    ).group_by(
        sql_models.Member.member_type
    ).all()
    
    active_members = db.query(func.count(sql_models.Member.id)).filter(
        sql_models.Member.status == "active"
    ).scalar()
    
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
    outstanding = db.query(func.sum(sql_models.Member.fines)).scalar() or 0
    
    # Collected fines (from paid transactions)
    collected = db.query(func.sum(sql_models.Transaction.fine_amount)).filter(
        sql_models.Transaction.fine_paid == True
    ).scalar() or 0
    
    # Unpaid fines
    unpaid = db.query(func.sum(sql_models.Transaction.fine_amount)).filter(
        sql_models.Transaction.fine_paid == False,
        sql_models.Transaction.fine_amount > 0
    ).scalar() or 0
    
    # Members with fines
    members_with_fines = db.query(func.count(sql_models.Member.id)).filter(
        sql_models.Member.fines > 0
    ).scalar()
    
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
    
    monthly_data = db.query(
        extract('year', sql_models.Transaction.checkout_date).label('year'),
        extract('month', sql_models.Transaction.checkout_date).label('month'),
        func.count(sql_models.Transaction.id).label('count')
    ).filter(
        sql_models.Transaction.checkout_date >= six_months_ago
    ).group_by('year', 'month').order_by('year', 'month').all()
    
    return [
        {
            "year": int(row.year),
            "month": int(row.month),
            "checkouts": row.count
        }
        for row in monthly_data
    ]
