"""add_workout_plan_owner

Revision ID: 9c4f8a2b1d7e
Revises: 254b250445d3
Create Date: 2026-11-24 23:45:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9c4f8a2b1d7e"
down_revision: Union[str, None] = "254b250445d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "workout_plans",
        sa.Column("created_by_user_id", sa.UUID(), nullable=True),
    )
    op.create_index(
        "ix_workout_plans_created_by_user_id",
        "workout_plans",
        ["created_by_user_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_workout_plans_created_by_user_id",
        "workout_plans",
        "users",
        ["created_by_user_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint("fk_workout_plans_created_by_user_id", "workout_plans", type_="foreignkey")
    op.drop_index("ix_workout_plans_created_by_user_id", table_name="workout_plans")
    op.drop_column("workout_plans", "created_by_user_id")
