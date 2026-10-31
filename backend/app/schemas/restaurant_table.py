from pydantic import BaseModel, ConfigDict
from typing import Optional

class RestaurantTableBase(BaseModel):
    table_number: str
    seating_capacity: Optional[int] = 4
    status: Optional[str] = "Available"  # "Available", "Occupied", "Reserved"

class RestaurantTableCreate(RestaurantTableBase):
    pass

class RestaurantTableUpdate(BaseModel):
    table_number: Optional[str] = None
    seating_capacity: Optional[int] = None
    status: Optional[str] = None

class RestaurantTableOut(RestaurantTableBase):
    id: int
    branch_id: int

    model_config = ConfigDict(from_attributes=True)
