from sqlalchemy.orm import Session
from app.models.foodorder import FoodOrder, FoodOrderItem
from app.models.booking import Booking, BookingRoom
from app.models.Package import PackageBooking, PackageBookingRoom
from app.models.service_request import ServiceRequest
from app.schemas.foodorder import FoodOrderCreate, FoodOrderUpdate
from datetime import timezone, datetime, timedelta
import re
from app.curd.notification import notify_food_order_created, notify_food_order_status_changed

def get_ist_now():
    """Get current time in Indian Standard Time (naive)"""
    from app.utils.timezone import get_system_timezone
    return datetime.now(get_system_timezone()).replace(tzinfo=None)


def get_booking_for_room(room_id, db: Session, branch_id: int, reference_date=None) -> tuple:
    """Get active booking for a room from either regular or package bookings within a branch"""

    if not room_id:
        return None, False
    
    # Ensure reference_date is a datetime or date object (defaults to IST Now)
    ref_dt = reference_date if reference_date else get_ist_now()
    ref_date = ref_dt.date() if isinstance(ref_dt, datetime) else ref_dt
    
    # 1. Check regular bookings (Primary Selection: include date overlap AND active status)
    active_booking = (
        db.query(Booking)
        .join(BookingRoom)
        .filter(BookingRoom.room_id == room_id, Booking.branch_id == branch_id)
        .filter(Booking.status.in_(["booked", "checked-in", "checked_in"]))
        .filter(Booking.check_in <= ref_date)
        .filter(Booking.check_out >= ref_date)
        .order_by(Booking.id.desc()).first()
    )
    
    if active_booking:
        return active_booking.id, False
    
    # 2. Check package bookings (Primary Selection: include date overlap AND active status)
    active_package_booking = (
        db.query(PackageBooking)
        .join(PackageBookingRoom)
        .filter(PackageBookingRoom.room_id == room_id, PackageBooking.branch_id == branch_id)
        .filter(PackageBooking.status.in_(["booked", "checked-in", "checked_in"]))
        .filter(PackageBooking.check_in <= ref_date)
        .filter(PackageBooking.check_out >= ref_date)
        .order_by(PackageBooking.id.desc()).first()
    )
    
    if active_package_booking:
        return active_package_booking.id, True
    
    # Fallback: Just find ANY active booking (checked-in) for this room if date check was too strict
    fallback = db.query(Booking).join(BookingRoom).filter(
        BookingRoom.room_id == room_id,
        Booking.status.in_(["checked-in", "checked_in"]),
        Booking.branch_id == branch_id
    ).order_by(Booking.id.desc()).first()

    if fallback: return fallback.id, False
    
    fallback_pkg = db.query(PackageBooking).join(PackageBookingRoom).filter(
        PackageBookingRoom.room_id == room_id,
        PackageBooking.status.in_(["checked-in", "checked_in"]),
        PackageBooking.branch_id == branch_id
    ).order_by(PackageBooking.id.desc()).first()

    if fallback_pkg: return fallback_pkg.id, True
    
    return None, False

def get_guest_for_room(room_id, db: Session, branch_id: int, reference_date=None):
    """Get guest name for a room within a specific branch"""
    if not room_id:
        return None
    
    # Ensure reference_date is a date object for comparison with Date columns
    ref_date = reference_date.date() if reference_date and isinstance(reference_date, datetime) else reference_date
    
    # Check regular bookings first
    query = (
        db.query(Booking)
        .join(BookingRoom)
        .filter(BookingRoom.room_id == room_id, Booking.branch_id == branch_id)
    )
    
    if ref_date:
        # Find booking covering the reference date
        query = query.filter(Booking.check_in <= ref_date)\
                     .filter(Booking.check_out >= ref_date)\
                     .filter(Booking.status != "cancelled")
    else:
        # Check active bookings
        query = query.filter(Booking.status.in_(["checked-in", "booked"]))
        
    active_booking = query.order_by(Booking.id.desc()).first()
    
    if active_booking:
        return active_booking.guest_name
    
    # Check package bookings
    pkg_query = (
        db.query(PackageBooking)
        .join(PackageBookingRoom)
        .filter(PackageBookingRoom.room_id == room_id, PackageBooking.branch_id == branch_id)
    )
    
    if ref_date:
        pkg_query = pkg_query.filter(PackageBooking.check_in <= ref_date)\
                             .filter(PackageBooking.check_out >= ref_date)\
                             .filter(PackageBooking.status != "cancelled")
    else:
        pkg_query = pkg_query.filter(PackageBooking.status.in_(["checked-in", "booked"]))
        
    active_package_booking = pkg_query.order_by(PackageBooking.id.desc()).first()
    
    if active_package_booking:
        return active_package_booking.guest_name
    
    # Fallback: Just find ANY active booking for this room if date filter was too strict
    if ref_date:
        fallback = db.query(Booking).join(BookingRoom).filter(
            BookingRoom.room_id == room_id,
            Booking.status.in_(["checked-in", "booked"]),
            Booking.branch_id == branch_id
        ).order_by(Booking.id.desc()).first()
        if fallback: return fallback.guest_name
        
        fallback_pkg = db.query(PackageBooking).join(PackageBookingRoom).filter(
            PackageBookingRoom.room_id == room_id,
            PackageBooking.status.in_(["checked-in", "booked"]),
            PackageBooking.branch_id == branch_id
        ).order_by(PackageBooking.id.desc()).first()
        if fallback_pkg: return fallback_pkg.guest_name

    
    return None

def resolve_food_item_price(item_model, order_type="dine_in"):
    """Helper to resolve price based on time and order type."""
    import json
    from datetime import timezone, datetime
    
    # 1. Resolve Time-Wise Prices
    twp = item_model.time_wise_prices
    if twp:
        try:
            if isinstance(twp, str):
                twp_list = json.loads(twp)
            else:
                twp_list = twp
                
            if isinstance(twp_list, list) and len(twp_list) > 0:
                now = get_ist_now()
                current_time = now.strftime("%H:%M")
                
                for rule in twp_list:
                    from_t = rule.get("from_time")
                    to_t = rule.get("to_time")
                    rule_price = rule.get("price")
                    
                    if from_t and to_t and rule_price is not None:
                        if from_t <= to_t:
                            if from_t <= current_time <= to_t:
                                return float(rule_price)
                        else:
                            # Over midnight
                            if current_time >= from_t or current_time <= to_t:
                                return float(rule_price)
        except Exception as e:
            print(f"Error resolving time-wise price: {e}")

    # 2. Resolve Room Service Price
    if order_type == "room_service" and item_model.room_service_price:
        return float(item_model.room_service_price)
        
    # 3. Fallback to base price
    resolved = float(item_model.price or 0.0)
    # print(f"[DEBUG-PRICE] Resolved {item_model.name} to {resolved}")
    return resolved

def _populate_order_item_prices(order):
    """Helper to populate price and subtotal for each item in an order."""
    if not order or not order.items:
        return order
    
    # Check if order was billed as inclusive by comparing catalog total to total_with_gst
    catalog_total = 0.0
    for item in order.items:
        if item.food_item:
            price = resolve_food_item_price(item.food_item, order.order_type)
            catalog_total += price * (item.quantity or 0)
            
    is_inclusive = False
    if order.total_with_gst and order.amount and order.total_with_gst > order.amount:
        # If catalog total matches total_with_gst, it was inclusive!
        if abs(catalog_total - order.total_with_gst) < 1.0:
            is_inclusive = True

    for item in order.items:
        if item.food_item:
            item.price = resolve_food_item_price(item.food_item, order.order_type)
            if is_inclusive and order.total_with_gst > 0:
                # scale down the price to pre-tax amount
                item.price = item.price * (order.amount / order.total_with_gst)
            item.subtotal = item.price * (item.quantity or 0)
        else:
            item.price = 0.0
            item.subtotal = 0.0
    return order

def create_food_order(db: Session, order_data: FoodOrderCreate, branch_id: int):
    from app.models.food_item import FoodItem

    status = getattr(order_data, 'status', 'pending')
    billing_status = getattr(order_data, 'billing_status', 'unbilled')
    order_type = getattr(order_data, 'order_type', 'dine_in')

    # Resolve actual prices from database instead of trusting frontend amount
    calculated_amount = 0.0
    for item_data in order_data.items:
        food_item = db.query(FoodItem).filter(FoodItem.id == item_data.food_item_id, FoodItem.branch_id == branch_id).first()
        if food_item:
            unit_price = resolve_food_item_price(food_item, order_type)
            calculated_amount += unit_price * item_data.quantity

    # If amount is explicitly passed as 0, it's complimentary - but we keep calculated amount for logging? 
    # Usually we trust the calculated amount unless it's a specific "complimentary" flag (not in schema yet)
    # However, for now, we will trust the backend calculation if amount is not provided or different.
    final_amount = calculated_amount if (order_data.amount is None or order_data.amount == 0) else order_data.amount
    
    # Preserve order_type if passed, default to room_service only if complimentary and unassigned
    if final_amount == 0 and not getattr(order_data, 'order_type', None):
        order_type = 'room_service'

    # Try to link to a booking if not provided
    booking_id = getattr(order_data, 'booking_id', None)
    package_booking_id = getattr(order_data, 'package_booking_id', None)
    
    if not booking_id and not package_booking_id and order_data.room_id is not None:
        b_id, is_pkg = get_booking_for_room(order_data.room_id, db, branch_id=branch_id)

        if b_id:
            if is_pkg:
                package_booking_id = b_id
            else:
                booking_id = b_id

    from app.utils.settings_helpers import get_gst_settings
    gst_settings = get_gst_settings(db, branch_id)
    explicit_apply_gst = getattr(order_data, 'apply_gst', None)
    if explicit_apply_gst is not None:
        gst_enabled = bool(explicit_apply_gst)
    else:
        gst_enabled = gst_settings.get("gst_enabled", False)
    
    gst_rate = float(gst_settings.get("food_gst_rate", 5.0)) / 100.0 if gst_enabled else 0.0
    
    if gst_settings.get("gst_inclusive", False) and gst_rate > 0:
        total_with_gst = final_amount
        gst_amount = round(total_with_gst - (total_with_gst / (1 + gst_rate)), 2)
        final_amount = round(total_with_gst - gst_amount, 2)
    else:
        gst_amount = round(final_amount * gst_rate, 2)
        total_with_gst = round(final_amount + gst_amount, 2)

    order = FoodOrder(
        room_id=order_data.room_id,
        table_id=getattr(order_data, 'table_id', None),
        booking_id=booking_id,
        package_booking_id=package_booking_id,
        amount=final_amount,
        gst_amount=gst_amount,
        total_with_gst=total_with_gst,
        assigned_employee_id=order_data.assigned_employee_id,
        prepared_by_id=order_data.prepared_by_id,
        status=status,
        billing_status=billing_status,
        order_type=order_type,
        delivery_request=getattr(order_data, 'delivery_request', None),
        created_by_id=getattr(order_data, 'created_by_id', None) or order_data.assigned_employee_id,
        created_at=get_ist_now(), # Use IST for consistent creation time
        branch_id=branch_id
    )

    db.add(order)
    db.commit()
    db.refresh(order)

    for item_data in order_data.items:
        item = FoodOrderItem(
            order_id=order.id,
            food_item_id=item_data.food_item_id,
            quantity=item_data.quantity,
            branch_id=branch_id
        )

        db.add(item)
    db.commit()
    db.refresh(order)
    
    # Populate for response
    _populate_order_item_prices(order)
    
    # 1. Create Kitchen Task for the Chef (Bypassed as per user request: food orders decoupled from services)
    # if order.prepared_by_id:
    #     existing_kitchen_task = db.query(ServiceRequest).filter(
    #         ServiceRequest.food_order_id == order.id,
    #         ServiceRequest.request_type == "kitchen_preparation"
    #     ).first()
    #     if not existing_kitchen_task:
    #         kitchen_task = ServiceRequest(
    #             food_order_id=order.id,
    #             room_id=order.room_id,
    #             table_id=order.table_id,
    #             employee_id=order.prepared_by_id,
    #             request_type="kitchen_preparation",
    #             description=f"Kitchen Preparation for food order #{order.id}",
    #             status="pending" if status != "scheduled" else "scheduled",
    #             branch_id=branch_id
    #         )
    #         db.add(kitchen_task)
    #         db.commit()

    # 2. Create Delivery Task for the Delivery Person (Room Service / Dining Table) (Bypassed as per user request)
    # if order.assigned_employee_id:
    #     existing_delivery_task = db.query(ServiceRequest).filter(
    #         ServiceRequest.food_order_id == order.id,
    #         ServiceRequest.request_type == "food_delivery"
    #     ).first()
    #     if not existing_delivery_task:
    #         delivery_task = ServiceRequest(
    #             food_order_id=order.id,
    #             room_id=order.room_id,
    #             table_id=order.table_id,
    #             employee_id=order.assigned_employee_id,
    #             request_type="food_delivery",
    #             description=order.delivery_request or f"Delivery/service task for food order #{order.id}",
    #             status="pending" if status != "scheduled" else "scheduled",
    #             branch_id=branch_id
    #         )
    #         db.add(delivery_task)
    #         db.commit()

    # Automatically create a delivery ServiceRequest if the order type is "room_service"
    if order.order_type == "room_service":
        existing_delivery_task = db.query(ServiceRequest).filter(
            ServiceRequest.food_order_id == order.id,
            ServiceRequest.request_type == "room_service"
        ).first()
        if not existing_delivery_task:
            delivery_task = ServiceRequest(
                food_order_id=order.id,
                room_id=order.room_id,
                table_id=order.table_id,
                employee_id=order.assigned_employee_id,
                request_type="room_service",
                description=order.delivery_request or f"Room Service Delivery for food order #{order.id}",
                status="pending" if order.status != "scheduled" else "scheduled",
                branch_id=branch_id
            )
            db.add(delivery_task)
            db.commit()
    
    
    # Notify about new order
    try:
        room_number = "Unknown"
        if order.room_id:
            from app.models.room import Room
            room = db.query(Room).filter(Room.id == order.room_id, Room.branch_id == branch_id).first()
            room_number = room.number if room else "Unknown"
        elif order.table_id:
            from app.models.restaurant_table import RestaurantTable
            table = db.query(RestaurantTable).filter(RestaurantTable.id == order.table_id, RestaurantTable.branch_id == branch_id).first()
            room_number = table.table_number if table else "Unknown"
            
        notify_food_order_created(db, room_number, order.id, branch_id=branch_id)
        
        # If order is created as PAID immediately, record accounting entry
        if order.billing_status == "paid":
            try:
                from app.utils.accounting_helpers import create_food_order_journal_entry
                create_food_order_journal_entry(
                    db=db,
                    food_order_id=order.id,
                    amount=order.total_with_gst or order.amount,
                    room_number=room_number,
                    branch_id=branch_id,
                    gst_rate=5.0, # Default
                    payment_method=order.payment_method or "Cash" # Default to Cash if paid but method missing
                )
                print(f"[INFO] Created journal entry for food order {order.id} created as PAID")
            except Exception as je_err:
                print(f"[ERROR] Failed to create journal entry for new paid order: {je_err}")
                
    except Exception as e:
        print(f"Post-creation logic error: {e}")
    
    
    # Reload order with relationships to ensure response has all data (especially food_item_name)
    from sqlalchemy.orm import joinedload
    order = (
        db.query(FoodOrder)
        .options(
            joinedload(FoodOrder.items).joinedload(FoodOrderItem.food_item)
        )
        .filter(FoodOrder.id == order.id, FoodOrder.branch_id == branch_id)
        .first()

    )

    return order

def get_food_orders(db: Session, branch_id: int, skip: int = 0, limit: int = 100, room_id: int = None, table_id: int = None, booking_id: int = None, package_booking_id: int = None, user_id: int = None):

    from sqlalchemy.orm import joinedload
    
    # Cap limit to prevent performance issues
    if limit > 200:
        limit = 200
    if limit < 1:
        limit = 20
    
    # Eager load relationships so guest/employee names are available
    try:
        query = db.query(FoodOrder)
        
        if branch_id is not None:
             query = query.filter(FoodOrder.branch_id == branch_id)

        if room_id:
            query = query.filter(FoodOrder.room_id == room_id)
        if table_id:
            query = query.filter(FoodOrder.table_id == table_id)
        if booking_id:
            query = query.filter(FoodOrder.booking_id == booking_id)
        if package_booking_id:
            query = query.filter(FoodOrder.package_booking_id == package_booking_id)
        if user_id:
            from sqlalchemy import or_
            query = query.outerjoin(FoodOrder.booking).outerjoin(FoodOrder.package_booking).filter(
                or_(
                    Booking.user_id == user_id,
                    PackageBooking.user_id == user_id
                )
            )
            
        orders = (
            query
            .options(
                joinedload(FoodOrder.employee),  # Load employee for employee name
                joinedload(FoodOrder.creator),   # Load creator name
                joinedload(FoodOrder.chef),      # Load chef name
                joinedload(FoodOrder.room),      # Load room for room number
                joinedload(FoodOrder.table),     # Load table for table number
                joinedload(FoodOrder.booking),   # Load booking for guest name
                joinedload(FoodOrder.package_booking), # Load package booking
                joinedload(FoodOrder.items).joinedload(FoodOrderItem.food_item)  # Load items and food details
            )
            .order_by(FoodOrder.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        
        # Populate computed fields
        for order in orders:
            # Set employee name
            if order.employee:
                order.employee_name = order.employee.name
            else:
                order.employee_name = None
            
            # Set room number
            if order.room:
                order.room_number = order.room.number
            else:
                order.room_number = None

            # Set table number
            if order.table:
                order.table_number = order.table.table_number
            else:
                order.table_number = None
            
            # Set additional names
            order.creator_name = order.creator.name if order.creator else "Unknown"
            order.chef_name = order.chef.name if order.chef else "Not Started"
            
            # Set guest name significantly improved logic:
            if order.booking:
                order.guest_name = order.booking.guest_name
            elif order.package_booking:
                order.guest_name = order.package_booking.guest_name
            else:
                # Fallback: Search for booking that was active at the time the order was created
                order.guest_name = get_guest_for_room(order.room_id, db, branch_id=branch_id, reference_date=order.created_at)

            # Populate item prices and subtotals for the UI
            _populate_order_item_prices(order)

        
        return orders
    except Exception as e:
        print(f"[ERROR] Error in get_food_orders: {str(e)}")
        import traceback
        traceback.print_exc()
        return []

def delete_food_order(db: Session, order_id: int, branch_id: int):
    order = db.query(FoodOrder).filter(FoodOrder.id == order_id, FoodOrder.branch_id == branch_id).first()

    if order:
        db.delete(order)
        db.commit()
    return order

def sync_food_order_to_requests(db: Session, order_id: int, status: str = None, billing_status: str = None, branch_id: int = None):
    """Sync FoodOrder status and billing to linked ServiceRequests"""
    try:
        query = db.query(ServiceRequest).filter(ServiceRequest.food_order_id == order_id)
        if branch_id is not None:
            query = query.filter(ServiceRequest.branch_id == branch_id)
        
        requests = query.all()
        for req in requests:
            if status is not None:
                status_to_set = status
                if status_to_set in ["cooking", "preparing", "accepted"]:
                    status_to_set = "in_progress"
                req.status = status_to_set
            if billing_status is not None:
                req.billing_status = billing_status
        db.commit()
    except Exception as e:
        print(f"[ERROR] Failed to sync food order to requests: {e}")

def update_food_order_status(db: Session, order_id: int, status: str, branch_id: int):
    order = db.query(FoodOrder).filter(FoodOrder.id == order_id, FoodOrder.branch_id == branch_id).first()

    if order:
        old_status = order.status
        
        status_to_set = status
        if status_to_set in ["cooking", "preparing", "accepted"]:
            status_to_set = "in_progress"
            
        order.status = status_to_set
        
        # If moving to cooking/preparing, set the chef
        # (This usually happens via the kitchen staff's UI)
        # Note: We don't have the context of 'current_user' here, 
        # but the caller (API) can pass prepared_by_id if needed.
        
        db.commit()
        db.refresh(order)
        
        # Sync to linked ServiceRequests
        sync_food_order_to_requests(db, order.id, status=status, branch_id=branch_id)
        
        # Process inventory usage if completed
        if old_status != "completed" and status == "completed":
            try:
                from app.curd.inventory import process_food_order_usage
                process_food_order_usage(db, order.id)
                db.commit()
            except Exception as e:
                db.rollback()
                print(f"Failed to process inventory usage: {e}")
        
            try:
                from app.models.room import Room
                from app.models.employee import Employee
                
                room = db.query(Room).filter(Room.id == order.room_id, Room.branch_id == branch_id).first()
                room_number = room.number if room else "Unknown"
                
                recipient_id = None
                if order.assigned_employee_id:
                    emp = db.query(Employee).filter(Employee.id == order.assigned_employee_id, Employee.branch_id == branch_id).first()
                    if emp:
                        recipient_id = emp.user_id
                
                notify_food_order_status_changed(db, room_number, status, order.id, branch_id=branch_id, recipient_id=recipient_id)
            except Exception as e:
                print(f"Notification error: {e}")
            
    return order

def update_food_order(db: Session, order_id: int, update_data: FoodOrderUpdate, branch_id: int):
    query = db.query(FoodOrder).filter(FoodOrder.id == order_id)
    if branch_id is not None:
         query = query.filter(FoodOrder.branch_id == branch_id)
    order = query.first()

    if not order:
        return None

    if update_data.room_id is not None:
        order.room_id = update_data.room_id
        # Automatically resolve booking if not explicitly provided
        if getattr(update_data, 'booking_id', None) is None and getattr(update_data, 'package_booking_id', None) is None:
            b_id, is_pkg = get_booking_for_room(update_data.room_id, db, branch_id=branch_id)
            if b_id:
                if is_pkg:
                    order.package_booking_id = b_id
                    order.booking_id = None
                else:
                    order.booking_id = b_id
                    order.package_booking_id = None
            else:
                order.booking_id = None
                order.package_booking_id = None
    if getattr(update_data, 'table_id', None) is not None:
        order.table_id = update_data.table_id
    from app.utils.settings_helpers import get_gst_settings
    b_id = branch_id or order.branch_id or 1
    gst_settings = get_gst_settings(db, b_id)
    explicit_apply_gst = getattr(update_data, 'apply_gst', None)
    
    if explicit_apply_gst is not None:
        should_apply_gst = bool(explicit_apply_gst)
    elif update_data.amount is not None:
        should_apply_gst = (order.gst_amount is not None and order.gst_amount > 0) or gst_settings.get("gst_enabled", False)
    else:
        should_apply_gst = None

    if update_data.amount is not None or explicit_apply_gst is not None:
        amt = update_data.amount if update_data.amount is not None else (order.amount or 0.0)
        order.amount = amt
        if should_apply_gst:
            rate = float(gst_settings.get("food_gst_rate", 5.0)) / 100.0
            order.gst_amount = round(amt * rate, 2)
            order.total_with_gst = round(amt + order.gst_amount, 2)
        else:
            order.gst_amount = 0.0
            order.total_with_gst = round(amt, 2)
    if update_data.assigned_employee_id is not None:
        order.assigned_employee_id = update_data.assigned_employee_id
    if update_data.status is not None:
        old_status = order.status
        
        status_to_set = update_data.status
        if status_to_set in ["cooking", "preparing", "accepted"]:
            status_to_set = "in_progress"
            
        order.status = status_to_set
        
        # If status moved to cooking/preparing, and prepared_by_id not set, 
        # we can assume the person updating it is preparing it? 
        # Actually, let's check if prepared_by_id is explicitly passed.
        if update_data.prepared_by_id is not None:
            order.prepared_by_id = update_data.prepared_by_id
        
        # Process inventory usage if completed
        if old_status != "completed" and order.status == "completed":
            try:
                from app.curd.inventory import process_food_order_usage
                process_food_order_usage(db, order.id)
            except Exception as e:
                print(f"Failed to process inventory usage: {e}")

        # Sync to linked ServiceRequests
        sync_food_order_to_requests(db, order.id, status=order.status, branch_id=branch_id)

        # Notify status change
        try:
            from app.models.employee import Employee
            
            room_number = "Unknown"
            if order.room_id:
                from app.models.room import Room
                room = db.query(Room).filter(Room.id == order.room_id, Room.branch_id == branch_id).first()
                room_number = room.number if room else "Unknown"
            elif order.table_id:
                from app.models.restaurant_table import RestaurantTable
                table = db.query(RestaurantTable).filter(RestaurantTable.id == order.table_id, RestaurantTable.branch_id == branch_id).first()
                room_number = table.table_number if table else "Unknown"
            
            recipient_id = None
            if order.assigned_employee_id:
                emp = db.query(Employee).filter(Employee.id == order.assigned_employee_id, Employee.branch_id == branch_id).first()

                if emp:
                    recipient_id = emp.user_id

            notify_food_order_status_changed(db, room_number, order.status, order.id, branch_id=branch_id, recipient_id=recipient_id)
        except Exception as e:
            print(f"Notification error: {e}")

    # Update other fields
    if update_data.billing_status is not None:
        was_paid = order.billing_status == "paid"
        order.billing_status = update_data.billing_status
        
        if order.billing_status == "paid" and order.payment_time is None:
            from datetime import timezone, datetime
            order.payment_time = datetime.now(timezone.utc)
        
        # If order is now paid but wasn't before, record accounting entry
        if order.billing_status == "paid" and not was_paid:
            try:
                from app.utils.accounting_helpers import create_food_order_journal_entry
                from app.models.room import Room
                room = db.query(Room).get(order.room_id)
                
                create_food_order_journal_entry(
                    db=db,
                    food_order_id=order.id,
                    amount=order.total_with_gst or order.amount,
                    room_number=room.number if room else "Unknown",
                    branch_id=branch_id,
                    gst_rate=5.0, # Default
                    payment_method=update_data.payment_method or order.payment_method
                )
                print(f"[INFO] Created journal entry for food order {order.id} marked as paid via update")
            except Exception as e:
                print(f"[ERROR] Failed to create journal entry for food order {order.id}: {e}")
        
        # Sync billing to linked ServiceRequests
        sync_food_order_to_requests(db, order.id, billing_status=update_data.billing_status, branch_id=branch_id)

    if update_data.payment_method is not None:
        order.payment_method = update_data.payment_method
    if update_data.delivery_request is not None:
        order.delivery_request = update_data.delivery_request

    # Force room_service for complimentary orders in update too
    if order.amount == 0:
        order.order_type = "room_service"
    elif update_data.order_type is not None:
        order.order_type = update_data.order_type

    # Ensure ServiceRequest is created for room service orders
    if order.order_type == "room_service" and order.status not in ["cancelled", "deleted"]:
        existing_delivery_task = db.query(ServiceRequest).filter(
            ServiceRequest.food_order_id == order.id,
            ServiceRequest.request_type == "room_service"
        ).first()
        if not existing_delivery_task:
            delivery_task = ServiceRequest(
                food_order_id=order.id,
                room_id=order.room_id,
                table_id=order.table_id,
                employee_id=order.assigned_employee_id,
                request_type="room_service",
                description=order.delivery_request or f"Room Service Delivery for food order #{order.id}",
                status="pending" if order.status != "scheduled" else "scheduled",
                branch_id=branch_id
            )
            db.add(delivery_task)
            db.commit()

    if update_data.items is not None:
        db.query(FoodOrderItem).filter(FoodOrderItem.order_id == order.id).delete()
        for item_data in update_data.items:
            item = FoodOrderItem(
                order_id=order.id,
                food_item_id=item_data.food_item_id,
                quantity=item_data.quantity,
                branch_id=branch_id
            )
            db.add(item)

    db.commit()
    db.refresh(order)
    
    # Release table if no more active orders (not completed, not cancelled, not paid)
    if order.table_id:
        try:
            active_count = db.query(FoodOrder).filter(
                FoodOrder.table_id == order.table_id,
                FoodOrder.status != "completed",
                FoodOrder.status != "cancelled",
                FoodOrder.billing_status != "paid"
            ).count()
            
            if active_count == 0:
                from app.models.restaurant_table import RestaurantTable
                table = db.query(RestaurantTable).filter(RestaurantTable.id == order.table_id).first()
                if table:
                    table.status = "Available"
                    db.commit()
                    print(f"[INFO] Table {table.table_number} released (marked Available) via update.")
        except Exception as te:
            print(f"[ERROR] Failed to update table status in curd: {te}")

    # Populate for response
    _populate_order_item_prices(order)
    
    return order

def trigger_scheduled_orders(db: Session, branch_id: int):
    """
    Check for scheduled orders and trigger them if within 30 minutes of scheduled time.
    Parses 'delivery_request' to find 'SCHEDULED_FOR: YYYY-MM-DD HH:MM:SS'.
    """
    try:
        from app.models.foodorder import FoodOrder
        from app.models.service_request import ServiceRequest
        
        # Use IST for comparison as scheduled times are usually in IST
        now = get_ist_now()
        
        # Find orders with status 'scheduled'
        query = db.query(FoodOrder).filter(FoodOrder.status == 'scheduled')
        if branch_id is not None:
             query = query.filter(FoodOrder.branch_id == branch_id)
        
        scheduled_orders = query.all()

        
        if scheduled_orders:
            print(f"[DEBUG-TRIGGER] Checking {len(scheduled_orders)} scheduled orders at {now.strftime('%H:%M:%S')}")
        
        triggered_count = 0
        for order in scheduled_orders:
            if not order.delivery_request:
                continue
                
            # Parse scheduled time safely
            # Format: "SCHEDULED_FOR: 2025-12-27 20:00:00 -- ..."
            match = re.search(r"SCHEDULED_FOR: (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})", order.delivery_request)
            if match:
                time_str = match.group(1)
                try:
                    scheduled_time = datetime.strptime(time_str, "%Y-%m-%d %H:%M:%S")
                    # Use 60 minutes lead time instead of 30 to ensure staff have time to prepare
                    trigger_time = scheduled_time - timedelta(minutes=60)
                    
                    # Debug log for the specific order in the screenshot window
                    if "18:01:00" in time_str or "20:27:00" in time_str:
                         print(f"[DEBUG-TRIGGER] Order {order.id} scheduled for {time_str}. Trigger window starts at {trigger_time.strftime('%H:%M:%S')}. Current IST: {now.strftime('%H:%M:%S')}")

                    if now >= trigger_time:
                        print(f"[DEBUG-TRIGGER] TRIGGERING order {order.id} (status: scheduled -> pending)")
                        order.status = "pending"
                        triggered_count += 1
                        
                        # Also trigger linked ServiceRequest if it exists and is scheduled
                        sreqs = db.query(ServiceRequest).filter(
                            ServiceRequest.food_order_id == order.id,
                            ServiceRequest.status == "scheduled",
                            ServiceRequest.branch_id == branch_id
                        ).all()

                        for sreq in sreqs:
                            print(f"[DEBUG-TRIGGER] TRIGGERING linked service request {sreq.id} (status: scheduled -> pending)")
                            sreq.status = "pending"
                except ValueError as ve:
                    print(f"[DEBUG-TRIGGER] Error parsing time for order {order.id}: {ve}")
        
        if triggered_count > 0:
            db.commit()
            print(f"[DEBUG-TRIGGER] Successfully triggered {triggered_count} orders/tasks.")
            
    except Exception as e:
        print(f"Error checking scheduled orders: {e}")
        import traceback
        traceback.print_exc()

    return True
