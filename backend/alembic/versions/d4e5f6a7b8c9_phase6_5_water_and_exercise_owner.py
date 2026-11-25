"""phase6_5_water_and_exercise_owner

Revision ID: d4e5f6a7b8c9
Revises: 9c4f8a2b1d7e
Create Date: 2026-11-25 12:38:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "9c4f8a2b1d7e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create water_intake_records table
    op.create_table(
        "water_intake_records",
        sa.Column(
            "id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("amount_ml", sa.Integer(), nullable=False),
        sa.Column("date_logged", sa.Date(), nullable=False),
        sa.Column("logged_at", sa.String(length=16), nullable=False),
        sa.Column("notes", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("amount_ml > 0 AND amount_ml <= 5000", name="ck_water_amount_range"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_water_intake_user_date",
        "water_intake_records",
        ["user_id", sa.text("date_logged DESC")],
        unique=False,
    )

    # 2. Add created_by_user_id to exercise_items for user-owned ad-hoc exercises
    op.add_column(
        "exercise_items",
        sa.Column("created_by_user_id", sa.UUID(), nullable=True),
    )
    op.create_index(
        "ix_exercise_items_created_by_user_id",
        "exercise_items",
        ["created_by_user_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_exercise_items_created_by_user_id",
        "exercise_items",
        "users",
        ["created_by_user_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint("fk_exercise_items_created_by_user_id", "exercise_items", type_="foreignkey")
    op.drop_index("ix_exercise_items_created_by_user_id", table_name="exercise_items")
    op.drop_column("exercise_items", "created_by_user_id")

    op.drop_index("idx_water_intake_user_date", table_name="water_intake_records")
    op.drop_table("water_intake_records")
