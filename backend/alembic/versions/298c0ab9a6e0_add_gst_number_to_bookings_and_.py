"""Add gst_number to bookings and checkouts real

Revision ID: 298c0ab9a6e0
Revises: 33584694f076
Create Date: 2026-06-21 20:28:08.093775

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '298c0ab9a6e0'
down_revision: Union[str, Sequence[str], None] = '33584694f076'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass

def downgrade() -> None:
    """Downgrade schema."""
    pass
