from sqlalchemy.orm import Session
from app.models.settings import SystemSetting
from typing import Any, Optional, Dict

def get_system_setting(db: Session, key: str, branch_id: Optional[int] = None, default: Any = None) -> Any:
    """
    Retrieve a system setting value for a specific branch, falling back to global setting (branch_id is None).
    """
    if branch_id is not None:
        setting = db.query(SystemSetting).filter(
            SystemSetting.key == key,
            SystemSetting.branch_id == branch_id
        ).first()
        if setting and setting.value is not None:
            return setting.value
            
    # Fallback to global setting (branch_id is None)
    setting = db.query(SystemSetting).filter(
        SystemSetting.key == key,
        SystemSetting.branch_id == None
    ).first()
    if setting and setting.value is not None:
        return setting.value
        
    return default

def get_gst_settings(db: Session, branch_id: int) -> Dict:
    """
    Retrieve all GST related settings for a branch.
    """
    enabled = get_system_setting(db, "gst_enabled", branch_id, default="true")
    room_type = get_system_setting(db, "gst_room_type", branch_id, default="SLAB")
    inclusive = get_system_setting(db, "gst_inclusive", branch_id, default="false")
    
    return {
        "gst_enabled": enabled.lower() == "true",
        "gst_inclusive": inclusive.lower() == "true",
        "gst_room_type": room_type.upper(),
        "room_gst_rate": get_system_setting(db, "room_gst_rate", branch_id, default="12"),
        "food_gst_rate": get_system_setting(db, "food_gst_rate", branch_id, default="5"),
        "service_gst_rate": get_system_setting(db, "service_gst_rate", branch_id, default="5"),
        "gst_slab_rate_1": get_system_setting(db, "gst_slab_rate_1", branch_id, default="5"),
        "gst_slab_rate_2": get_system_setting(db, "gst_slab_rate_2", branch_id, default="12"),
        "gst_slab_rate_3": get_system_setting(db, "gst_slab_rate_3", branch_id, default="18")
    }
