"""
Dashboard API Router
Dashboard statistics and metrics
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.sql import get_db
from app.models import sql_models, schemas
from datetime import datetime, timedelta

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Get dashboard statistics"""
    
    # Total books
    total_books = db.query(func.count(sql_models.Book.id)).scalar()
    
    # Total members
    total_members = db.query(func.count(sql_models.Member.id)).scalar()
    
    # Books checked out
    books_checked_out = db.query(func.count(sql_models.Transaction.id)).filter(
        sql_models.Transaction.status == "checked_out"
    ).scalar()
    
    # Books overdue
    now = datetime.utcnow()
    books_overdue = db.query(func.count(sql_models.Transaction.id)).filter(
        sql_models.Transaction.status == "checked_out",
        sql_models.Transaction.due_date < now
    ).scalar()
    
    # Active reservations
    active_reservations = db.query(func.count(sql_models.Reservation.id)).filter(
        sql_models.Reservation.status == "pending"
    ).scalar()
    
    # Total fines
    total_fines = db.query(func.sum(sql_models.Member.fines)).scalar() or 0
    
    # Books available
    books_available = db.query(func.sum(sql_models.Book.available_copies)).scalar() or 0
    
    # New members this month
    month_ago = datetime.utcnow() - timedelta(days=30)
    new_members_this_month = db.query(func.count(sql_models.Member.id)).filter(
        sql_models.Member.joined_date >= month_ago
    ).scalar()
    
    return schemas.DashboardStats(
        total_books=total_books,
        total_members=total_members,
        books_checked_out=books_checked_out,
        books_overdue=books_overdue,
        active_reservations=active_reservations,
        total_fines=total_fines,
        books_available=books_available,
        new_members_this_month=new_members_this_month
    )
