from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.schemas.restaurant_table import RestaurantTableCreate, RestaurantTableOut, RestaurantTableUpdate
from app.curd import restaurant_table as crud
from app.utils.auth import get_db, get_current_user
from app.utils.branch_scope import get_branch_id
from app.models.user import User
from app.models.branch import Branch
from app.models.restaurant_table import RestaurantTable
from typing import List, Optional

router = APIRouter(prefix="/restaurant-tables", tags=["Restaurant Tables"])

def resolve_target_branch_id(db: Session, current_user: User, header_branch_id: Optional[int], body_branch_id: Optional[int]) -> int:
    """Resolve a valid, non-null branch_id with complete fallback hierarchy"""
    if body_branch_id is not None:
        return body_branch_id
    if header_branch_id is not None:
        return header_branch_id
    if current_user.branch_id is not None:
        return current_user.branch_id
    
    # SuperAdmin without specific branch selected: default to first active branch
    active_branch = db.query(Branch).filter(Branch.is_active == True).first()
    if not active_branch:
        raise HTTPException(status_code=400, detail="No active branch found. Please create a restaurant branch first.")
    return active_branch.id

@router.get("", response_model=List[RestaurantTableOut])
def get_tables(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    branch_id: Optional[int] = Depends(get_branch_id),
    skip: int = 0,
    limit: int = 100
):
    # If branch_id is None and user has a branch, scope to user's branch
    effective_branch = branch_id if branch_id is not None else current_user.branch_id
    return crud.get_restaurant_tables(db, branch_id=effective_branch, skip=skip, limit=limit)

@router.get("/", response_model=List[RestaurantTableOut])
def get_tables_slash(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    branch_id: Optional[int] = Depends(get_branch_id),
    skip: int = 0,
    limit: int = 100
):
    return get_tables(db, current_user, branch_id, skip, limit)

@router.post("", response_model=RestaurantTableOut)
def create_table(
    table_data: RestaurantTableCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    branch_id: Optional[int] = Depends(get_branch_id)
):
    target_branch_id = resolve_target_branch_id(
        db, current_user, header_branch_id=branch_id, body_branch_id=table_data.branch_id
    )

    # Check if table number already exists in this target branch
    existing = db.query(RestaurantTable).filter(
        RestaurantTable.table_number == table_data.table_number.strip(),
        RestaurantTable.branch_id == target_branch_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Table '{table_data.table_number.strip()}' already exists in this branch"
        )
    
    return crud.create_restaurant_table(db, table_data, branch_id=target_branch_id)

@router.post("/", response_model=RestaurantTableOut)
def create_table_slash(
    table_data: RestaurantTableCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    branch_id: Optional[int] = Depends(get_branch_id)
):
    return create_table(table_data, db, current_user, branch_id)

@router.put("/{table_id}", response_model=RestaurantTableOut)
def update_table(
    table_id: int,
    table_update: RestaurantTableUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    branch_id: Optional[int] = Depends(get_branch_id)
):
    effective_branch = branch_id if branch_id is not None else current_user.branch_id
    updated = crud.update_restaurant_table(db, table_id, table_update, branch_id=effective_branch)
    if not updated:
        raise HTTPException(status_code=404, detail="Table not found")
    return updated

@router.put("/{table_id}/", response_model=RestaurantTableOut)
def update_table_slash(
    table_id: int,
    table_update: RestaurantTableUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    branch_id: Optional[int] = Depends(get_branch_id)
):
    return update_table(table_id, table_update, db, current_user, branch_id)

@router.delete("/{table_id}")
def delete_table(
    table_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    branch_id: Optional[int] = Depends(get_branch_id)
):
    effective_branch = branch_id if branch_id is not None else current_user.branch_id
    deleted = crud.delete_restaurant_table(db, table_id, branch_id=effective_branch)
    if not deleted:
        raise HTTPException(status_code=404, detail="Table not found")
    return {"message": "Table deleted successfully"}
