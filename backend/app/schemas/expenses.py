from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class ExpenseBase(BaseModel):
    category: str
    amount: float
    date: date
    description: Optional[str] = None
    employee_id: int
    department: Optional[str] = None  # Restaurant, Facility, Hotel, Office, Security, Fire & Safety, Housekeeping
    status: Optional[str] = "Pending"
    payment_mode: Optional[str] = "Cash"
    # RCM fields
    rcm_applicable: Optional[bool] = False
    rcm_tax_rate: Optional[float] = None
    nature_of_supply: Optional[str] = None  # GTA, Legal Services, Import of Service, Security Services
    original_bill_no: Optional[str] = None
    vendor_id: Optional[int] = None
    rcm_liability_date: Optional[date] = None
    itc_eligible: Optional[bool] = True

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    category: Optional[str]
    amount: Optional[float]
    date: Optional[date]
    description: Optional[str]
    employee_id: Optional[int]
    department: Optional[str]
    status: Optional[str]
    payment_mode: Optional[str]

class ExpenseOut(BaseModel):
    id: int
    category: str
    amount: float
    date: date
    description: Optional[str]
    employee_id: Optional[int] = None
    image: Optional[str]
    department: Optional[str]
    status: str
    payment_mode: str
    employee_name: str
    created_at: datetime

    class Config:
        from_attributes = True
