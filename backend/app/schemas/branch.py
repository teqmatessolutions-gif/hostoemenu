from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime

class BranchBase(BaseModel):
    name: str
    code: str
    tenant_id: Optional[int] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gst_number: Optional[str] = None
    image_url: Optional[str] = None
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    twitter: Optional[str] = None
    linkedin: Optional[str] = None
    location: Optional[str] = None
    is_active: bool = True

    @field_validator('email', mode='before')
    @classmethod
    def validate_email(cls, v):
        if v is None:
            return None
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

class BranchCreate(BranchBase):
    pass

class BranchUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    tenant_id: Optional[int] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gst_number: Optional[str] = None
    image_url: Optional[str] = None
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    twitter: Optional[str] = None
    linkedin: Optional[str] = None
    location: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator('email', mode='before')
    @classmethod
    def validate_email(cls, v):
        if v is None:
            return None
        if isinstance(v, str) and v.strip() == "":
            return None
        return v

class Branch(BranchBase):
    id: int
    tenant_id: Optional[int] = None
    tenant_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
