"""phase7_food_provenance_and_source_metadata

Revision ID: e7f8a9b0c1d2
Revises: d4e5f6a7b8c9
Create Date: 2026-11-25 17:30:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e7f8a9b0c1d2"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "food_items",
        sa.Column(
            "source_provider",
            sa.String(length=40),
            server_default=sa.text("'legacy_demo'"),
            nullable=False,
        ),
    )
    op.add_column(
        "food_items",
        sa.Column("source_external_id", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "food_items",
        sa.Column(
            "license_type",
            sa.String(length=60),
            server_default=sa.text("'unspecified'"),
            nullable=False,
        ),
    )
    op.add_column(
        "food_items",
        sa.Column(
            "verification_status",
            sa.String(length=30),
            server_default=sa.text("'unverified'"),
            nullable=False,
        ),
    )
    op.add_column(
        "food_items",
        sa.Column("source_attribution", sa.Text(), nullable=True),
    )
    op.add_column(
        "food_items",
        sa.Column("barcode", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "food_items",
        sa.Column("import_batch_id", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "food_items",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    op.create_check_constraint(
        "ck_food_source_provider",
        "food_items",
        "source_provider IN ('usda_fdc', 'open_food_facts', 'ascend_recipe_estimate', 'user_custom', 'legacy_demo')",
    )
    op.create_check_constraint(
        "ck_food_verification_status",
        "food_items",
        "verification_status IN ('lab_verified', 'label_reported', 'recipe_estimated', 'user_entered', 'unverified')",
    )
    op.create_index("ix_food_items_barcode", "food_items", ["barcode"], unique=False)
    op.create_index(
        "uq_food_items_source_identity",
        "food_items",
        ["source_provider", "source_external_id"],
        unique=True,
        postgresql_where=sa.text("is_custom_user_food = false AND source_external_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_food_items_source_identity", table_name="food_items")
    op.drop_index("ix_food_items_barcode", table_name="food_items")
    op.drop_constraint("ck_food_verification_status", "food_items", type_="check")
    op.drop_constraint("ck_food_source_provider", "food_items", type_="check")

    op.drop_column("food_items", "updated_at")
    op.drop_column("food_items", "import_batch_id")
    op.drop_column("food_items", "barcode")
    op.drop_column("food_items", "source_attribution")
    op.drop_column("food_items", "verification_status")
    op.drop_column("food_items", "license_type")
    op.drop_column("food_items", "source_external_id")
    op.drop_column("food_items", "source_provider")
