from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class TableReservationBase(BaseModel):
    branch_id: Optional[int] = None
    table_id: Optional[int] = None
    guest_name: str
    guest_phone: str
    guest_email: Optional[str] = None
    guest_count: Optional[int] = 2
    reservation_date: str
    reservation_time: str
    special_notes: Optional[str] = None

class TableReservationCreate(TableReservationBase):
    pass

class TableReservationUpdate(BaseModel):
    status: Optional[str] = None
    table_id: Optional[int] = None
    reservation_date: Optional[str] = None
    reservation_time: Optional[str] = None
    guest_count: Optional[int] = None
    special_notes: Optional[str] = None

class TableReservationOut(TableReservationBase):
    id: int
    status: str
    created_at: Optional[datetime] = None
    table_number: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

