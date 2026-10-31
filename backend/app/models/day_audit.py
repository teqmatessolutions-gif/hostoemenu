from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date, Text, Boolean, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import timezone, datetime
from app.database import Base


class DayAudit(Base):
    """
    Tracks the business day lifecycle per branch.
    Each branch has one DayAudit record per business_date.
    All financial transactions are stamped with the active business_date.
    """
    __tablename__ = "day_audits"

    id = Column(Integer, primary_key=True, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False, index=True)
    business_date = Column(Date, nullable=False, index=True)

    # Status: "open" | "closing" | "closed"
    status = Column(String, default="open", nullable=False)

    # Day Opening
    opened_at = Column(DateTime(timezone=True), nullable=True)
    opened_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    opening_cash_balance = Column(Float, default=0.0)
    opening_account_balance = Column(Float, default=0.0)
    opening_notes = Column(Text, nullable=True)

    # Day Closing
    closed_at = Column(DateTime(timezone=True), nullable=True)
    closed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    closing_cash_balance = Column(Float, default=0.0)
    closing_account_balance = Column(Float, default=0.0)
    system_expected_cash = Column(Float, default=0.0)
    system_expected_account = Column(Float, default=0.0)
    override_reason = Column(Text, nullable=True)
    closing_notes = Column(Text, nullable=True)

    # Night Audit Summary — populated automatically at close
    total_room_revenue = Column(Float, default=0.0)
    total_food_revenue = Column(Float, default=0.0)
    total_service_revenue = Column(Float, default=0.0)
    total_gst_collected = Column(Float, default=0.0)
    total_payments_received = Column(Float, default=0.0)
    total_expenses = Column(Float, default=0.0)
    total_purchases = Column(Float, default=0.0)
    rooms_occupied = Column(Integer, default=0)      # In-house count at close
    new_checkins = Column(Integer, default=0)
    new_checkouts = Column(Integer, default=0)

    # Step-by-step audit log (JSON array of {step, status, message, ts})
    audit_log = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    branch = relationship("Branch")
    opened_by = relationship("User", foreign_keys=[opened_by_id])
    closed_by = relationship("User", foreign_keys=[closed_by_id])
    night_charges = relationship("NightCharge", back_populates="day_audit", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint('branch_id', 'business_date', name='uix_day_audit_branch_date'),
    )


class NightCharge(Base):
    """
    Auto-posted nightly room charge for each in-house booking during Day Close.
    These are the authoritative room revenue records — checkout GST calculations
    use these pre-locked amounts instead of recalculating from scratch.
    """
    __tablename__ = "night_charges"

    id = Column(Integer, primary_key=True, index=True)
    day_audit_id = Column(Integer, ForeignKey("day_audits.id"), nullable=False, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False, index=True)
    business_date = Column(Date, nullable=False, index=True)  # Night being charged

    # Charge breakdown
    room_charge = Column(Float, default=0.0)    # Base room rate for this night
    gst_rate_pct = Column(Float, default=0.0)   # % applied (5 / 12 / 18 from slab)
    gst_amount = Column(Float, default=0.0)     # room_charge * gst_rate_pct / 100
    total_charge = Column(Float, default=0.0)   # room_charge + gst_amount

    # Reversal support (in case booking is cancelled retroactively)
    is_reversed = Column(Boolean, default=False)
    reversed_at = Column(DateTime(timezone=True), nullable=True)
    reversal_reason = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    day_audit = relationship("DayAudit", back_populates="night_charges")
    branch = relationship("Branch")
