import os
from sqlalchemy.orm import Session
from app.models.settings import SystemSetting
from app.database import SessionLocal

def is_aiosell_active(db: Session = None) -> bool:
    """
    Checks if Aiosell Channel Manager is active.
    Priority:
    1. Database SystemSetting ('aiosell_active')
    2. Environment Variable (AIOSELL_ACTIVE)
    """
    # 1. Check DB first
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True
        
    try:
        setting = db.query(SystemSetting).filter(SystemSetting.key == 'aiosell_active').first()
        if setting:
            return str(setting.value).lower() == 'true'
            
        # 2. Fallback to Env
        return os.getenv("AIOSELL_ACTIVE", "false").lower() == "true"
    except Exception as e:
        print(f"[AIOSELL-CONFIG] Error checking DB setting: {e}")
        return os.getenv("AIOSELL_ACTIVE", "false").lower() == "true"
    finally:
        if close_db:
            db.close()
