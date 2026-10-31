from datetime import date, timedelta
from sqlalchemy.orm import Session
from app.models.calendar import PricingCalendar
from app.models.room import RoomType

def calculate_dynamic_booking_price(db: Session, room_type_id: int, check_in: date, check_out: date, room_count: int = 1) -> float:
    """
    Calculate the total price of a booking dynamically based on pricing rules.
    Takes into pricing tiers:
    1. Base Price (Weekday)
    2. Weekend Price
    3. Long Weekend Price (from Calendar)
    4. Holiday Price (from Calendar)
    """
    if not room_type_id:
        return 0.0

    room_type = db.query(RoomType).filter(RoomType.id == room_type_id).first()
    if not room_type:
        return 0.0

    # Ensure dates are valid
    nights = (check_out - check_in).days
    if nights <= 0:
        nights = 1

    # Fetch Calendar Events for the date range
    events = db.query(PricingCalendar).filter(
        PricingCalendar.start_date < check_out,
        PricingCalendar.end_date >= check_in
    ).all()
    
    total_amount = 0.0

    # Iterate through each night of the stay
    for i in range(nights):
        current_date = check_in + timedelta(days=i)
        
        # Check Pricing Calendar overrides first
        override_type = None
        for event in events:
            if event.start_date <= current_date <= event.end_date:
                override_type = event.day_type
                break
        
        if override_type == "HOLIDAY" and room_type.holiday_price:
            daily_rate = room_type.holiday_price
        elif override_type == "LONG_WEEKEND" and room_type.long_weekend_price:
            daily_rate = room_type.long_weekend_price
        elif override_type == "WEEKEND":
            daily_rate = room_type.weekend_price if room_type.weekend_price else (room_type.base_price or 0.0)
        elif override_type == "WEEKDAY":
            daily_rate = room_type.base_price or 0.0
        else:
            # Fallback to Weekend / Weekday logic
            # Python weekday(): 0 = Mon, ..., 4 = Fri, 5 = Sat, 6 = Sun
            is_weekend = current_date.weekday() in [4, 5]  # Friday and Saturday night stays are usually considered 'weekend'. Depending on hotel, maybe Sat/Sun. Let's use Fri/Sat night.
            if is_weekend and room_type.weekend_price:
                daily_rate = room_type.weekend_price
            else:
                daily_rate = room_type.base_price or 0.0

        total_amount += daily_rate * room_count

    return float(total_amount)
