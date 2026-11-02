from sqlalchemy.orm import Session
from app.models.restaurant_table import RestaurantTable
from app.schemas.restaurant_table import RestaurantTableCreate, RestaurantTableUpdate

def get_restaurant_tables(db: Session, branch_id: int = None, skip: int = 0, limit: int = 100):
    query = db.query(RestaurantTable)
    if branch_id is not None:
        query = query.filter(RestaurantTable.branch_id == branch_id)
    return (
        query
        .order_by(RestaurantTable.table_number.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )

def create_restaurant_table(db: Session, table_data: RestaurantTableCreate, branch_id: int):
    table = RestaurantTable(
        table_number=table_data.table_number,
        seating_capacity=table_data.seating_capacity or 4,
        status=table_data.status or "Available",
        branch_id=branch_id
    )
    db.add(table)
    db.commit()
    db.refresh(table)
    return table

def update_restaurant_table(db: Session, table_id: int, table_update: RestaurantTableUpdate, branch_id: int = None):
    query = db.query(RestaurantTable).filter(RestaurantTable.id == table_id)
    if branch_id is not None:
        query = query.filter(RestaurantTable.branch_id == branch_id)
    table = query.first()
    if not table:
        return None
    
    if table_update.table_number is not None:
        table.table_number = table_update.table_number
    if table_update.seating_capacity is not None:
        table.seating_capacity = table_update.seating_capacity
    if table_update.status is not None:
        table.status = table_update.status
    if table_update.branch_id is not None:
        table.branch_id = table_update.branch_id
        
    db.commit()
    db.refresh(table)
    return table

def delete_restaurant_table(db: Session, table_id: int, branch_id: int = None):
    query = db.query(RestaurantTable).filter(RestaurantTable.id == table_id)
    if branch_id is not None:
        query = query.filter(RestaurantTable.branch_id == branch_id)
    table = query.first()
    if table:
        db.delete(table)
        db.commit()
        return True
    return False
