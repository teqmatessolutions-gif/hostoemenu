from pydantic import BaseModel
from typing import Optional

class RatePlanBase(BaseModel):
    name: str
    occupancy: int = 2
    meal_plan: Optional[str] = None
    channel_manager_id: Optional[str] = None
    base_price: float = 0.0
    weekend_price: Optional[float] = None
    price_offset: float = 0.0
    extra_adult_price: Optional[float] = 0.0
    extra_child_price: Optional[float] = 0.0

class RatePlanCreate(RatePlanBase):
    room_type_id: int

class RatePlanUpdate(BaseModel):
    name: Optional[str] = None
    occupancy: Optional[int] = None
    meal_plan: Optional[str] = None
    channel_manager_id: Optional[str] = None
    base_price: Optional[float] = None
    weekend_price: Optional[float] = None
    price_offset: Optional[float] = None
    extra_adult_price: Optional[float] = None
    extra_child_price: Optional[float] = None

class RatePlanOut(RatePlanBase):
    id: int
    room_type_id: int
    branch_id: int

    class Config:
        from_attributes = True
