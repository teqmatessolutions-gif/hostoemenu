from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session, joinedload
from app.schemas.restaurant_table import RestaurantTableCreate, RestaurantTableOut, RestaurantTableUpdate
from app.curd import restaurant_table as crud
from app.utils.auth import get_db, get_current_user
from app.utils.branch_scope import get_branch_id
from app.models.user import User
from app.models.branch import Branch
from app.models.restaurant_table import RestaurantTable
from app.models.foodorder import FoodOrder, FoodOrderItem
from typing import List, Optional
import datetime

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

@router.get("/live-status")
def get_live_tables_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    branch_id: Optional[int] = Depends(get_branch_id)
):
    """
    Returns live table-wise preview:
    - Status: 'Vacant', 'Occupied', or 'Waiting for Bill'
    - Current Guest running bill amount (if occupied/waiting for bill)
    - Active order count, seated duration, guest name, and items summary
    """
    target_branch_id = resolve_target_branch_id(db, current_user, header_branch_id=branch_id, body_branch_id=None)

    # 1. All tables for target branch
    tables = db.query(RestaurantTable).filter(
        RestaurantTable.branch_id == target_branch_id
    ).order_by(RestaurantTable.table_number.asc()).all()

    # 2. All active orders for target branch
    active_orders = db.query(FoodOrder).options(
        joinedload(FoodOrder.items).joinedload(FoodOrderItem.food_item)
    ).filter(
        FoodOrder.branch_id == target_branch_id,
        FoodOrder.table_id != None,
        FoodOrder.is_deleted == False,
        FoodOrder.status.notin_(["completed", "cancelled"]),
        FoodOrder.billing_status != "paid"
    ).all()

    # Group orders by table_id
    orders_by_table = {}
    for o in active_orders:
        if o.table_id not in orders_by_table:
            orders_by_table[o.table_id] = []
        orders_by_table[o.table_id].append(o)

    live_tables = []
    for t in tables:
        t_orders = orders_by_table.get(t.id, [])
        total_bill = 0.0
        active_items = []
        guest_name = ""
        seated_time = None
        has_waiting_bill = False

        if t_orders:
            for o in t_orders:
                amt = o.total_with_gst if o.total_with_gst is not None and o.total_with_gst > 0 else (o.amount or 0.0)
                total_bill += amt
                if o.billing_status in ["billed", "waiting_for_bill"] or o.status in ["billed", "waiting_for_bill"]:
                    has_waiting_bill = True
                if not seated_time or (o.created_at and o.created_at < seated_time):
                    seated_time = o.created_at
                
                # Extract guest info if present
                if o.delivery_request and "Guest:" in o.delivery_request:
                    try:
                        g_part = o.delivery_request.split("Guest:")[1].split("|")[0].strip()
                        if g_part and not guest_name:
                            guest_name = g_part
                    except Exception:
                        pass

                # Items summary
                for it in o.items:
                    name = it.food_item.name if it.food_item else f"Dish #{it.food_item_id}"
                    active_items.append({"name": name, "quantity": it.quantity})

            if has_waiting_bill or t.status in ["Waiting for Bill", "waiting_for_bill"]:
                effective_status = "Waiting for Bill"
            else:
                effective_status = "Occupied"
        else:
            if t.status in ["Occupied", "Waiting for Bill", "Reserved"]:
                effective_status = t.status
            else:
                effective_status = "Vacant"

        live_tables.append({
            "id": t.id,
            "table_number": t.table_number,
            "seating_capacity": t.seating_capacity or 4,
            "status": effective_status,
            "manual_status": t.status,
            "branch_id": t.branch_id,
            "active_orders_count": len(t_orders),
            "current_bill_amount": round(total_bill, 2),
            "seated_at": seated_time.isoformat() if seated_time else None,
            "guest_name": guest_name,
            "items": active_items,
            "active_order_ids": [o.id for o in t_orders]
        })

    return {
        "tables": live_tables,
        "summary": {
            "total_tables": len(live_tables),
            "vacant": len([t for t in live_tables if t["status"] == "Vacant"]),
            "occupied": len([t for t in live_tables if t["status"] == "Occupied"]),
            "waiting_for_bill": len([t for t in live_tables if t["status"] == "Waiting for Bill"]),
            "total_active_sales": round(sum(t["current_bill_amount"] for t in live_tables), 2)
        }
    }

@router.post("/{table_id}/status")
def update_table_live_status(
    table_id: int,
    status_payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    branch_id: Optional[int] = Depends(get_branch_id)
):
    target_branch_id = resolve_target_branch_id(db, current_user, header_branch_id=branch_id, body_branch_id=None)
    table = db.query(RestaurantTable).filter(
        RestaurantTable.id == table_id,
        RestaurantTable.branch_id == target_branch_id
    ).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    new_status = status_payload.get("status", "Available")
    table.status = new_status

    if new_status in ["Available", "Vacant"] and status_payload.get("settle_orders", False):
        orders = db.query(FoodOrder).filter(
            FoodOrder.table_id == table_id,
            FoodOrder.status.notin_(["completed", "cancelled"])
        ).all()
        for o in orders:
            o.status = "completed"
            o.billing_status = "paid"

    db.commit()
    db.refresh(table)
    return {"message": f"Table {table.table_number} status updated to {new_status}", "table_id": table.id, "status": table.status}

@router.post("/{table_id}/settle")
def settle_table_bill(
    table_id: int,
    settle_data: dict = Body(default={}),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    branch_id: Optional[int] = Depends(get_branch_id)
):
    target_branch_id = resolve_target_branch_id(db, current_user, header_branch_id=branch_id, body_branch_id=None)
    table = db.query(RestaurantTable).filter(
        RestaurantTable.id == table_id,
        RestaurantTable.branch_id == target_branch_id
    ).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    payment_method = settle_data.get("payment_method", "cash")
    orders = db.query(FoodOrder).filter(
        FoodOrder.table_id == table_id,
        FoodOrder.status.notin_(["completed", "cancelled"])
    ).all()

    total_settled = 0.0
    for o in orders:
        amt = o.total_with_gst if o.total_with_gst and o.total_with_gst > 0 else (o.amount or 0.0)
        total_settled += amt
        o.status = "completed"
        o.billing_status = "paid"
        o.payment_method = payment_method
        o.payment_time = datetime.datetime.now()

    # Free the table
    table.status = "Available"
    db.commit()

    return {
        "message": f"Table {table.table_number} bill settled and table marked Vacant.",
        "settled_amount": round(total_settled, 2),
        "orders_closed": len(orders)
    }

@router.get("", response_model=List[RestaurantTableOut])
def get_tables(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    branch_id: Optional[int] = Depends(get_branch_id),
    skip: int = 0,
    limit: int = 100
):
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
