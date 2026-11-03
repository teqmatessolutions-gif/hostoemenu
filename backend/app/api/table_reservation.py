from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.utils.auth import get_current_user
from app.utils.branch_scope import get_branch_id
from app.models.user import User
from app.models.branch import Branch
from app.models.restaurant_table import RestaurantTable
from app.models.table_reservation import TableReservation
from app.schemas.table_reservation import TableReservationCreate, TableReservationUpdate, TableReservationOut
from typing import List, Optional
import datetime

router = APIRouter(prefix="/table-reservations", tags=["Table Reservations"])

def resolve_target_branch_id(db: Session, current_user: Optional[User], header_branch_id: Optional[int], body_branch_id: Optional[int]) -> int:
    if body_branch_id is not None:
        return body_branch_id
    if header_branch_id is not None:
        return header_branch_id
    if current_user and current_user.branch_id is not None:
        return current_user.branch_id
    active = db.query(Branch).filter(Branch.is_active == True).first()
    if not active:
        raise HTTPException(status_code=400, detail="No active branch found.")
    return active.id

@router.get("", response_model=List[TableReservationOut])
def get_reservations(
    date: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    branch_id: Optional[int] = Depends(get_branch_id)
):
    target_branch = resolve_target_branch_id(db, current_user, header_branch_id=branch_id, body_branch_id=None)
    query = db.query(TableReservation).options(joinedload(TableReservation.table)).filter(
        TableReservation.branch_id == target_branch
    )
    if date:
        query = query.filter(TableReservation.reservation_date == date)
    if status:
        query = query.filter(TableReservation.status == status)

    reservations = query.order_by(TableReservation.reservation_date.desc(), TableReservation.reservation_time.asc()).all()
    out = []
    for r in reservations:
        item = TableReservationOut.model_validate(r)
        if r.table:
            item.table_number = r.table.table_number
        out.append(item)
    return out

@router.post("", response_model=TableReservationOut)
def create_reservation_admin(
    payload: TableReservationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    branch_id: Optional[int] = Depends(get_branch_id)
):
    target_branch = resolve_target_branch_id(db, current_user, header_branch_id=branch_id, body_branch_id=payload.branch_id)
    
    # Check if table exists
    table = None
    if payload.table_id:
        table = db.query(RestaurantTable).filter(
            RestaurantTable.id == payload.table_id,
            RestaurantTable.branch_id == target_branch
        ).first()
        if not table:
            raise HTTPException(status_code=404, detail="Selected dining table not found")

        # Allow multiple reservations on the same table at different times (check 90-min overlap)
        if payload.reservation_time:
            existing_same_day = db.query(TableReservation).filter(
                TableReservation.table_id == payload.table_id,
                TableReservation.reservation_date == payload.reservation_date,
                TableReservation.status == "confirmed"
            ).all()
            try:
                new_parts = payload.reservation_time.split(":")
                new_mins = int(new_parts[0]) * 60 + int(new_parts[1])
                for ex in existing_same_day:
                    if ex.reservation_time:
                        ex_parts = ex.reservation_time.split(":")
                        ex_mins = int(ex_parts[0]) * 60 + int(ex_parts[1])
                        if abs(new_mins - ex_mins) < 90:
                            raise HTTPException(
                                status_code=400,
                                detail=f"Table {table.table_number} is already reserved for {ex.guest_name} at {ex.reservation_time}. Please allow at least 90 minutes between reservations."
                            )
            except ValueError:
                pass

        # Only mark table status as Reserved if the reservation is occurring now
        ist = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
        now_ist = datetime.datetime.now(datetime.timezone.utc).astimezone(ist)
        today_str = now_ist.strftime("%Y-%m-%d")
        current_time_minutes = now_ist.hour * 60 + now_ist.minute
        
        is_active_now = False
        if payload.reservation_date == today_str and payload.reservation_time:
            try:
                parts = payload.reservation_time.split(":")
                diff = (int(parts[0]) * 60 + int(parts[1])) - current_time_minutes
                if -90 <= diff <= 45:
                    is_active_now = True
            except Exception:
                pass

        if is_active_now:
            table.status = "Reserved"
        elif table.status == "Reserved":
            table.status = "Available"

    reservation = TableReservation(
        branch_id=target_branch,
        table_id=payload.table_id,
        guest_name=payload.guest_name.strip(),
        guest_phone=payload.guest_phone.strip(),
        guest_email=payload.guest_email.strip() if payload.guest_email else None,
        guest_count=payload.guest_count or 2,
        reservation_date=payload.reservation_date,
        reservation_time=payload.reservation_time,
        status="confirmed",
        special_notes=payload.special_notes
    )
    db.add(reservation)
    db.commit()
    db.refresh(reservation)

    out = TableReservationOut.model_validate(reservation)
    if table:
        out.table_number = table.table_number
    return out

@router.post("/{res_id}/seat")
def seat_reserved_guests(
    res_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    branch_id: Optional[int] = Depends(get_branch_id)
):
    """Guest arrived: transition reservation to seated and table to Occupied"""
    target_branch = resolve_target_branch_id(db, current_user, header_branch_id=branch_id, body_branch_id=None)
    reservation = db.query(TableReservation).filter(
        TableReservation.id == res_id,
        TableReservation.branch_id == target_branch
    ).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    reservation.status = "seated"
    if reservation.table_id:
        table = db.query(RestaurantTable).filter(RestaurantTable.id == reservation.table_id).first()
        if table:
            table.status = "Occupied"

    db.commit()
    return {"message": f"Guest {reservation.guest_name} seated successfully!", "status": "seated"}

@router.post("/{res_id}/cancel")
def cancel_reservation(
    res_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    branch_id: Optional[int] = Depends(get_branch_id)
):
    target_branch = resolve_target_branch_id(db, current_user, header_branch_id=branch_id, body_branch_id=None)
    reservation = db.query(TableReservation).filter(
        TableReservation.id == res_id,
        TableReservation.branch_id == target_branch
    ).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    reservation.status = "cancelled"
    if reservation.table_id:
        table = db.query(RestaurantTable).filter(RestaurantTable.id == reservation.table_id).first()
        if table and table.status == "Reserved":
            table.status = "Available"

    db.commit()
    return {"message": "Reservation cancelled and table marked Available.", "status": "cancelled"}

@router.delete("/{res_id}")
def delete_reservation(
    res_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    branch_id: Optional[int] = Depends(get_branch_id)
):
    target_branch = resolve_target_branch_id(db, current_user, header_branch_id=branch_id, body_branch_id=None)
    reservation = db.query(TableReservation).filter(
        TableReservation.id == res_id,
        TableReservation.branch_id == target_branch
    ).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    if reservation.table_id:
        table = db.query(RestaurantTable).filter(RestaurantTable.id == reservation.table_id).first()
        if table and table.status == "Reserved":
            table.status = "Available"

    db.delete(reservation)
    db.commit()
    return {"message": "Reservation deleted successfully"}

