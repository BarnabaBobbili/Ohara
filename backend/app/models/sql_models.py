"""
SQLAlchemy ORM Models for Library Management System
Defines database schema for SQLite
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database.sql import Base
from datetime import datetime


class Book(Base):
    """Book catalog table"""
    __tablename__ = "books"
    
    id = Column(Integer, primary_key=True, index=True)
    isbn = Column(String(13), unique=True, index=True, nullable=False)
    title = Column(String(255), index=True, nullable=False)
    author = Column(String(255), nullable=False)
    publisher = Column(String(255))
    publication_year = Column(Integer)
    category = Column(String(100), index=True)
    language = Column(String(50), default="English")
    pages = Column(Integer)
    description = Column(Text)
    cover_image_url = Column(String(500))  # URL to book cover image
    
    # Inventory
    total_copies = Column(Integer, default=1, nullable=False)
    available_copies = Column(Integer, default=1, nullable=False)
    location = Column(String(100))  # Shelf location
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    transactions = relationship("Transaction", back_populates="book")
    reservations = relationship("Reservation", back_populates="book")


class Member(Base):
    """Library members/patrons table"""
    __tablename__ = "members"
    
    id = Column(Integer, primary_key=True, index=True)
    card_id = Column(String(20), unique=True, index=True, nullable=False)
    
    # Personal Information
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20))
    address = Column(Text)
    
    # Member Details
    member_type = Column(String(50), nullable=False)  # student, faculty, public
    status = Column(String(20), default="active")  # active, suspended, inactive
    
    # Financial
    fines = Column(Float, default=0.0)
    
    # Metadata
    joined_date = Column(DateTime, default=datetime.utcnow)
    expiry_date = Column(DateTime)
    last_visit = Column(DateTime)
    
    # Relationships
    transactions = relationship("Transaction", back_populates="member")
    reservations = relationship("Reservation", back_populates="member")


class Transaction(Base):
    """Book checkout/return transactions"""
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign Keys
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False)
    member_id = Column(Integer, ForeignKey("members.id"), nullable=False)
    staff_id = Column(Integer, ForeignKey("staff.id"))
    
    # Transaction Details
    checkout_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    due_date = Column(DateTime, nullable=False)
    return_date = Column(DateTime)
    
    # Status
    status = Column(String(20), default="checked_out")  # checked_out, returned, overdue
    
    # Condition
    checkout_condition = Column(String(20), default="good")  # good, fair, damaged
    return_condition = Column(String(20))
    
    # Fines
    fine_amount = Column(Float, default=0.0)
    fine_paid = Column(Boolean, default=False)
    
    # Notes
    notes = Column(Text)
    
    # Relationships
    book = relationship("Book", back_populates="transactions")
    member = relationship("Member", back_populates="transactions")
    staff = relationship("Staff", back_populates="transactions")


class Reservation(Base):
    """Book reservations/holds"""
    __tablename__ = "reservations"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign Keys
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False)
    member_id = Column(Integer, ForeignKey("members.id"), nullable=False)
    
    # Reservation Details
    reservation_date = Column(DateTime, default=datetime.utcnow)
    expiry_date = Column(DateTime)
    status = Column(String(20), default="pending")  # pending, fulfilled, cancelled, expired
    
    # Notification
    notified = Column(Boolean, default=False)
    
    # Relationships
    book = relationship("Book", back_populates="reservations")
    member = relationship("Member", back_populates="reservations")


class Staff(Base):
    """Library staff/admin users"""
    __tablename__ = "staff"
    
    id = Column(Integer, primary_key=True, index=True)
    staff_id = Column(String(20), unique=True, index=True, nullable=False)
    
    # Personal Information
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(20))
    
    # Authentication
    password_hash = Column(String(255), nullable=False)
    
    # Role & Permissions
    role = Column(String(50), nullable=False)  # admin, librarian, assistant
    permissions = Column(Text)  # JSON string of permissions
    
    # Status
    status = Column(String(20), default="active")  # active, inactive
    
    # Metadata
    hired_date = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime)
    
    # Relationships
    transactions = relationship("Transaction", back_populates="staff")
