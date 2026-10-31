from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import timezone, datetime


class SalaryAdvance(Base):
    """Employee salary advance records"""
    __tablename__ = "salary_advances"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False, index=True)

    # Advance details
    amount = Column(Float, nullable=False)           # Amount advanced
    date = Column(Date, nullable=False)              # Date advance was given
    reason = Column(Text, nullable=True)             # Reason for advance

    # Repayment: which month/year this should be deducted from salary
    deduct_month = Column(Integer, nullable=False)   # 1-12
    deduct_year = Column(Integer, nullable=False)

    # Status
    status = Column(String, default="pending")       # pending | deducted
    payment_method = Column(String, default="cash")  # cash | bank_transfer | cheque

    # Who approved / issued
    issued_by = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    employee = relationship("Employee", back_populates="salary_advances")
    branch = relationship("Branch")
