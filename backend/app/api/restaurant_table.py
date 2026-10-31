from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.schemas.restaurant_table import RestaurantTableCreate, RestaurantTableOut, RestaurantTableUpdate
from app.curd import restaurant_table as crud
from app.utils.auth import get_db, get_current_user
from app.utils.branch_scope import get_branch_id
from app.models.user import User
from typing import List

router = APIRouter(prefix="/restaurant-tables", tags=["Restaurant Tables"])

@router.get("", response_model=List[RestaurantTableOut])
def get_tables(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    branch_id: int = Depends(get_branch_id),
    skip: int = 0,
    limit: int = 100
):
    return crud.get_restaurant_tables(db, branch_id=branch_id, skip=skip, limit=limit)

@router.get("/", response_model=List[RestaurantTableOut])
def get_tables_slash(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    branch_id: int = Depends(get_branch_id),
    skip: int = 0,
    limit: int = 100
):
    return crud.get_restaurant_tables(db, branch_id=branch_id, skip=skip, limit=limit)

@router.post("", response_model=RestaurantTableOut)
def create_table(
    table_data: RestaurantTableCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    branch_id: int = Depends(get_branch_id)
):
    # Check if table number already exists
    from app.models.restaurant_table import RestaurantTable
    existing = db.query(RestaurantTable).filter(
        RestaurantTable.table_number == table_data.table_number,
        RestaurantTable.branch_id == branch_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Table '{table_data.table_number}' already exists in this branch")
    
    return crud.create_restaurant_table(db, table_data, branch_id=branch_id)

@router.post("/", response_model=RestaurantTableOut)
def create_table_slash(
    table_data: RestaurantTableCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    branch_id: int = Depends(get_branch_id)
):
    return create_table(table_data, db, current_user, branch_id)

@router.put("/{table_id}", response_model=RestaurantTableOut)
def update_table(
    table_id: int,
    table_update: RestaurantTableUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    branch_id: int = Depends(get_branch_id)
):
    updated = crud.update_restaurant_table(db, table_id, table_update, branch_id=branch_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Table not found")
    return updated

@router.put("/{table_id}/", response_model=RestaurantTableOut)
def update_table_slash(
    table_id: int,
    table_update: RestaurantTableUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    branch_id: int = Depends(get_branch_id)
):
    return update_table(table_id, table_update, db, current_user, branch_id)

@router.delete("/{table_id}")
def delete_table(
    table_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    branch_id: int = Depends(get_branch_id)
):
    deleted = crud.delete_restaurant_table(db, table_id, branch_id=branch_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Table not found")
    return {"message": "Table deleted successfully"}
