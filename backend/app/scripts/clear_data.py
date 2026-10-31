import os
import sys
from sqlalchemy import create_engine, MetaData, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.database import Base, engine as db_engine
from app.models.user import User, Role
from app.models.branch import Branch
# Import all other models to ensure they are registered with Base.metadata
from app.models import *

def clear_all_data():
    load_dotenv()
    
    Session = sessionmaker(bind=db_engine)
    session = Session()
    
    print(">>> Starting Data Cleanup <<<")
    
    try:
        # 1. Truncate most tables using raw SQL for speed and to handle dependencies (CASCADE)
        # We need to be careful with tables we want to keep
        
        tables_to_keep = ['roles', 'branches', 'system_settings']
        
        # Get all table names from metadata
        metadata = MetaData()
        metadata.reflect(bind=db_engine)
        all_tables = metadata.tables.keys()
        
        # Filter out tables to keep
        # Special handling for 'users' table - we'll clear it via ORM to keep superadmins
        tables_to_truncate = [t for t in all_tables if t not in tables_to_keep and t != 'users']
        
        print(f"Truncating {len(tables_to_truncate)} tables...")
        
        for table in tables_to_truncate:
            print(f"  Clearing {table}...")
            session.execute(text(f'TRUNCATE TABLE "{table}" RESTART IDENTITY CASCADE'))
        
        # 2. Clear non-superadmin users
        print("Clearing non-superadmin users...")
        non_admins = session.query(User).filter(User.is_superadmin == False).all()
        print(f"  Removing {len(non_admins)} users...")
        for user in non_admins:
            session.delete(user)
            
        session.commit()
        print(">>> Data Cleanup Completed Successfully <<<")
        
    except Exception as e:
        session.rollback()
        print(f"!!! Error during cleanup: {e}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()

if __name__ == "__main__":
    confirm = input("Are you SURE you want to clear all data on the server? (yes/no): ")
    if confirm.lower() == 'yes':
        clear_all_data()
    else:
        print("Cleanup cancelled.")
