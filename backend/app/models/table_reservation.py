from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class TableReservation(Base):
    __tablename__ = "table_reservations"

    id = Column(Integer, primary_key=True, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False, index=True)
    table_id = Column(Integer, ForeignKey("restaurant_tables.id"), nullable=True, index=True)
    guest_name = Column(String(100), nullable=False)
    guest_phone = Column(String(30), nullable=False)
    guest_email = Column(String(100), nullable=True)
    guest_count = Column(Integer, default=2)
    reservation_date = Column(String(20), nullable=False)
    reservation_time = Column(String(20), nullable=False)
    status = Column(String(30), default="confirmed")  # confirmed, seated, cancelled, completed
    special_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    branch = relationship("Branch")
    table = relationship("RestaurantTable")

