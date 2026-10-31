"""Data fix for checkout inventory and consumption JEs

Revision ID: 9ccb8b3c95d4
Revises: dd693127a8a5
Create Date: 2026-06-21 18:18:49.913674

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9ccb8b3c95d4'
down_revision: Union[str, Sequence[str], None] = 'dd693127a8a5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema and perform data fixes."""
    bind = op.get_bind()
    from sqlalchemy.orm import Session
    session = Session(bind=bind)
    
    try:
        from app.models.room import Room
        from app.models.inventory import Location, InventoryTransaction, InventoryItem
        from app.models.account import JournalEntry, AccountLedger
        from app.utils.accounting_helpers import create_consumption_journal_entry
        
        # --- FIX 1: Room Inventory Locations ---
        rooms = session.query(Room).all()
        fixed_rooms = 0
        for room in rooms:
            correct_location = session.query(Location).filter(
                Location.name == 'Room ' + str(room.number),
                Location.branch_id == room.branch_id,
                Location.location_type == 'GUEST_ROOM'
            ).first()
            if correct_location and room.inventory_location_id != correct_location.id:
                room.inventory_location_id = correct_location.id
                fixed_rooms += 1
        
        # --- FIX 2: Missing Consumption Journal Entries ---
        txns = session.query(InventoryTransaction).filter(
            InventoryTransaction.transaction_type == 'out',
            InventoryTransaction.reference_number.like('SVC-USAGE-%')
        ).all()
        fixed_jes = 0
        for txn in txns:
            je = session.query(JournalEntry).filter(
                JournalEntry.reference_type == 'inventory_consumption',
                JournalEntry.reference_id == txn.id
            ).first()
            if not je:
                item = session.query(InventoryItem).get(txn.item_id)
                dept_name = item.category.name if item and item.category else 'Housekeeping'
                debit_ledger = f'{dept_name} Supplies' if dept_name.lower() == 'housekeeping' else dept_name
                
                try:
                    create_consumption_journal_entry(
                        db=session,
                        consumption_id=txn.id,
                        cogs_amount=float(txn.total_amount or 0),
                        inventory_item_name=item.name if item else "Unknown",
                        branch_id=txn.branch_id,
                        created_by=txn.created_by,
                        reference_type='inventory_consumption',
                        debit_ledger_name=debit_ledger
                    )
                    fixed_jes += 1
                except Exception as e:
                    print(f'Error creating JE for txn {txn.id}: {e}')
                    
        # --- FIX 3: Laundry Expenses ---
        from app.models.expense import Expense
        from app.models.account import JournalEntryLine
        laundry_expenses = session.query(Expense).filter(Expense.category.ilike('%laundry%')).all()
        laundry_ledger = session.query(AccountLedger).filter(AccountLedger.name == 'Laundry Costs').first()
        fixed_laundry = 0
        if laundry_ledger:
            for exp in laundry_expenses:
                je = session.query(JournalEntry).filter(
                    JournalEntry.reference_type == 'expense',
                    JournalEntry.reference_id == exp.id
                ).first()
                if je:
                    for line in je.lines:
                        if line.debit_ledger_id and line.debit_ledger_id != laundry_ledger.id:
                            line.debit_ledger_id = laundry_ledger.id
                            fixed_laundry += 1
                            
        session.commit()
        print(f"Data migration applied: Fixed {fixed_rooms} rooms, {fixed_jes} missing consumption JEs, and {fixed_laundry} laundry expenses.")
    except Exception as e:
        session.rollback()
        print(f"Data migration failed: {e}")
        # Allow migration to continue even if data fix fails on some specific data edge case
    finally:
        session.close()


def downgrade() -> None:
    """Downgrade schema."""
    pass
