from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from app.schemas.rate_plan import RatePlanOut

class RoomTypeBase(BaseModel):
    name: str
    total_inventory: int = 0
    base_price: float = 0.0
    weekend_price: Optional[float] = None
    long_weekend_price: Optional[float] = None
    holiday_price: Optional[float] = None
    adults_capacity: int = 2
    children_capacity: int = 0
    extra_adult_price: Optional[float] = 0.0
    extra_child_price: Optional[float] = 0.0
    channel_manager_id: Optional[str] = None
    online_inventory: Optional[int] = None
    
    # Images
    image_url: Optional[str] = None
    extra_images: Optional[str] = None
    
    # Amenities
    air_conditioning: bool = False
    wifi: bool = False
    bathroom: bool = False
    living_area: bool = False
    terrace: bool = False
    parking: bool = False
    kitchen: bool = False
    family_room: bool = False
    bbq: bool = False
    garden: bool = False
    dining: bool = False
    breakfast: bool = False
    tv: bool = False
    balcony: bool = False
    mountain_view: bool = False
    ocean_view: bool = False
    private_pool: bool = False
    hot_tub: bool = False
    fireplace: bool = False
    pet_friendly: bool = False
    wheelchair_accessible: bool = False
    safe_box: bool = False
    room_service: bool = False
    laundry_service: bool = False
    gym_access: bool = False
    spa_access: bool = False
    housekeeping: bool = False
    mini_bar: bool = False

class RoomTypeCreate(RoomTypeBase):
    branch_id: int = 1

class RoomTypeUpdate(BaseModel):
    name: Optional[str] = None
    total_inventory: Optional[int] = None
    base_price: Optional[float] = None
    weekend_price: Optional[float] = None
    long_weekend_price: Optional[float] = None
    holiday_price: Optional[float] = None
    adults_capacity: Optional[int] = None
    children_capacity: Optional[int] = None
    extra_adult_price: Optional[float] = None
    extra_child_price: Optional[float] = None
    channel_manager_id: Optional[str] = None
    online_inventory: Optional[int] = None
    
    # Amenities
    air_conditioning: Optional[bool] = None
    wifi: Optional[bool] = None
    bathroom: Optional[bool] = None
    living_area: Optional[bool] = None
    terrace: Optional[bool] = None
    parking: Optional[bool] = None
    kitchen: Optional[bool] = None
    family_room: Optional[bool] = None
    bbq: Optional[bool] = None
    garden: Optional[bool] = None
    dining: Optional[bool] = None
    breakfast: Optional[bool] = None
    tv: Optional[bool] = None
    balcony: Optional[bool] = None
    mountain_view: Optional[bool] = None
    ocean_view: Optional[bool] = None
    private_pool: Optional[bool] = None
    hot_tub: Optional[bool] = None
    fireplace: Optional[bool] = None
    pet_friendly: Optional[bool] = None
    wheelchair_accessible: Optional[bool] = None
    safe_box: Optional[bool] = None
    room_service: Optional[bool] = None
    laundry_service: Optional[bool] = None
    gym_access: Optional[bool] = None
    spa_access: Optional[bool] = None
    housekeeping: Optional[bool] = None
    mini_bar: Optional[bool] = None

class RoomType(RoomTypeBase):
    id: int
    branch_id: int
    room_count: int = 0
    rate_plans: List[RatePlanOut] = []

    class Config:
        from_attributes = True

class RoomTypeAvailability(BaseModel):
    room_type_id: int
    name: str
    available_count: int
    total_inventory: int
    base_price: float
