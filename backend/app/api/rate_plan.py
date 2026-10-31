from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.room import RatePlan, RoomType
from app.models.user import User
from app.schemas.rate_plan import RatePlanCreate, RatePlanUpdate, RatePlanOut
from app.utils.auth import get_current_user
from app.utils.branch_scope import get_branch_id

router = APIRouter(prefix="/rate-plans", tags=["RatePlans"])

@router.post("", response_model=RatePlanOut)
def create_rate_plan(
    plan: RatePlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    branch_id: int = Depends(get_branch_id)
):
    # Verify room type belongs to same branch
    room_type = db.query(RoomType).filter(RoomType.id == plan.room_type_id, RoomType.branch_id == branch_id).first()
    if not room_type:
        raise HTTPException(status_code=404, detail="Room type not found in this branch")
        
    db_plan = RatePlan(**plan.model_dump(), branch_id=branch_id)
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    return db_plan

@router.get("", response_model=List[RatePlanOut])
def list_rate_plans(
    room_type_id: int = None,
    db: Session = Depends(get_db),
    branch_id: int = Depends(get_branch_id)
):
    query = db.query(RatePlan).filter(RatePlan.branch_id == branch_id)
    if room_type_id:
        query = query.filter(RatePlan.room_type_id == room_type_id)
    return query.all()

@router.patch("/{plan_id}", response_model=RatePlanOut)
def update_rate_plan(
    plan_id: int,
    plan_update: RatePlanUpdate,
    db: Session = Depends(get_db),
    branch_id: int = Depends(get_branch_id)
):
    db_plan = db.query(RatePlan).filter(RatePlan.id == plan_id, RatePlan.branch_id == branch_id).first()
    if not db_plan:
        raise HTTPException(status_code=404, detail="Rate plan not found")
        
    update_data = plan_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_plan, key, value)
        
    db.commit()
    db.refresh(db_plan)
    return db_plan

@router.delete("/{plan_id}")
def delete_rate_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    branch_id: int = Depends(get_branch_id)
):
    db_plan = db.query(RatePlan).filter(RatePlan.id == plan_id, RatePlan.branch_id == branch_id).first()
    if not db_plan:
        raise HTTPException(status_code=404, detail="Rate plan not found")
        
    db.delete(db_plan)
    db.commit()
    return {"message": "Rate plan deleted successfully"}
