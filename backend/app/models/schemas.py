"""
Pydantic Schemas for API Request/Response Validation
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


# ============= Book Schemas =============

class BookBase(BaseModel):
    """Base schema for Book"""
    isbn: str = Field(..., min_length=10, max_length=13)
    title: str = Field(..., min_length=1, max_length=255)
    author: str = Field(..., min_length=1, max_length=255)
    publisher: Optional[str] = None
    publication_year: Optional[int] = None
    category: Optional[str] = None
    language: str = "English"
    pages: Optional[int] = None
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    total_copies: int = 1
    location: Optional[str] = None


class BookCreate(BookBase):
    """Schema for creating a new book"""
    pass


class BookUpdate(BaseModel):
    """Schema for updating a book (all fields optional)"""
    title: Optional[str] = None
    author: Optional[str] = None
    publisher: Optional[str] = None
    publication_year: Optional[int] = None
    category: Optional[str] = None
    language: Optional[str] = None
    pages: Optional[int] = None
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    total_copies: Optional[int] = None
    available_copies: Optional[int] = None
    location: Optional[str] = None


class Book(BookBase):
    """Schema for book response"""
    id: int
    available_copies: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ============= Member Schemas =============

class MemberBase(BaseModel):
    """Base schema for Member"""
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    member_type: str = Field(..., pattern="^(student|faculty|public)$")


class MemberCreate(MemberBase):
    """Schema for creating a new member"""
    pass


class MemberUpdate(BaseModel):
    """Schema for updating a member"""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    member_type: Optional[str] = None
    status: Optional[str] = None


class Member(MemberBase):
    """Schema for member response"""
    id: int
    card_id: str
    status: str
    fines: float
    joined_date: datetime
    expiry_date: Optional[datetime]
    last_visit: Optional[datetime]
    
    class Config:
        from_attributes = True


# ============= Transaction Schemas =============

class TransactionBase(BaseModel):
    """Base schema for Transaction"""
    book_id: int
    member_id: int
    due_date: datetime
    checkout_condition: str = "good"
    notes: Optional[str] = None


class TransactionCreate(TransactionBase):
    """Schema for creating a checkout transaction"""
    pass


class TransactionReturn(BaseModel):
    """Schema for returning a book"""
    return_condition: str = "good"
    notes: Optional[str] = None


class Transaction(TransactionBase):
    """Schema for transaction response"""
    id: int
    staff_id: Optional[int]
    checkout_date: datetime
    return_date: Optional[datetime]
    status: str
    return_condition: Optional[str]
    fine_amount: float
    fine_paid: bool
    
    class Config:
        from_attributes = True


# ============= Reservation Schemas =============

class ReservationBase(BaseModel):
    """Base schema for Reservation"""
    book_id: int
    member_id: int


class ReservationCreate(ReservationBase):
    """Schema for creating a reservation"""
    pass


class Reservation(ReservationBase):
    """Schema for reservation response"""
    id: int
    reservation_date: datetime
    expiry_date: Optional[datetime]
    status: str
    notified: bool
    
    class Config:
        from_attributes = True


# ============= Staff Schemas =============

class StaffBase(BaseModel):
    """Base schema for Staff"""
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    phone: Optional[str] = None
    role: str = Field(..., pattern="^(admin|librarian|assistant)$")


class StaffCreate(StaffBase):
    """Schema for creating staff"""
    password: str = Field(..., min_length=8)


class StaffLogin(BaseModel):
    """Schema for staff login"""
    email: EmailStr
    password: str


class Staff(StaffBase):
    """Schema for staff response"""
    id: int
    staff_id: str
    status: str
    hired_date: datetime
    last_login: Optional[datetime]
    
    class Config:
        from_attributes = True


# ============= Dashboard Schemas =============

class DashboardStats(BaseModel):
    """Schema for dashboard statistics"""
    total_books: int
    total_members: int
    books_checked_out: int
    books_overdue: int
    active_reservations: int
    total_fines: float
    books_available: int
    new_members_this_month: int
