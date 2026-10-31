from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class RestaurantTable(Base):
    __tablename__ = "restaurant_tables"

    id = Column(Integer, primary_key=True, index=True)
    table_number = Column(String, nullable=False)
    seating_capacity = Column(Integer, default=4)
    status = Column(String, default="Available")  # "Available", "Occupied", "Reserved"
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False, index=True)

    branch = relationship("Branch")

    __table_args__ = (
        UniqueConstraint('table_number', 'branch_id', name='uix_table_number_branch'),
    )

    def __repr__(self):
        return f"<RestaurantTable id={self.id} number={self.table_number} status={self.status}>"
