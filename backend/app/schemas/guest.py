from pydantic import BaseModel, validator
from typing import Optional

class GuestSuggestion(BaseModel):
    guest_name: str
    guest_email: Optional[str] = None
    guest_mobile: Optional[str] = None

    @validator('guest_email', pre=True)
    def blank_email_to_none(cls, v):
        if v == "" or v is None:
            return None
        return v

    class Config:
        from_attributes = True
