"""Domain 2: Nutrition Catalog, Pure 3NF Bridge & Historical Intake Records."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class Nutrient(Base):
    """Canonical nutrient reference definition (INFOODS / USDA standards)."""

    __tablename__ = "nutrients"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    code: Mapped[str] = mapped_column(String(30), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default=text("0"))

    __table_args__ = (
        UniqueConstraint("code", name="uq_nutrients_code"),
    )

    # Relationships
    food_nutrients: Mapped[List[FoodNutrient]] = relationship(
        "FoodNutrient",
        back_populates="nutrient",
        cascade="all, delete-orphan",
    )


class FoodItem(Base):
    """Normalized food catalog item without denormalized macronutrient columns (Pure 3NF)."""

    __tablename__ = "food_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    alternate_names: Mapped[List[str]] = mapped_column(
        ARRAY(Text),
        nullable=False,
        default=list,
        server_default=text("'{}'"),
    )
    brand_or_source: Mapped[str] = mapped_column(String(150), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    cuisine_region: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    preparation_state: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="cooked",
        server_default=text("'cooked'"),
    )
    reference_quantity: Mapped[Decimal] = mapped_column(
        Numeric(6, 2),
        nullable=False,
        default=Decimal("100.0"),
        server_default=text("100.0"),
    )
    reference_unit: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="g",
        server_default=text("'g'"),
    )
    reference_label: Mapped[str] = mapped_column(String(100), nullable=False)
    grams_per_serving: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    edible_portion_pct: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        default=Decimal("100.0"),
        server_default=text("100.0"),
    )
    is_micronutrient_complete: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )
    is_custom_user_food: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )
    created_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    data_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        CheckConstraint(
            "preparation_state IN ('raw', 'cooked', 'packaged', 'composite_dish')",
            name="ck_food_preparation_state",
        ),
        Index(
            "idx_food_items_custom_user",
            "created_by_user_id",
            postgresql_where=text("is_custom_user_food = true"),
        ),
    )

    # Relationships
    created_by_user: Mapped[Optional[User]] = relationship("User", back_populates="custom_foods")
    nutrients: Mapped[List[FoodNutrient]] = relationship(
        "FoodNutrient",
        back_populates="food",
        cascade="all, delete-orphan",
    )
    intake_records: Mapped[List[IntakeRecord]] = relationship(
        "IntakeRecord",
        back_populates="food",
    )


class FoodNutrient(Base):
    """Associative entity linking food items to nutrients with quantitative amounts (Pure 3NF)."""

    __tablename__ = "food_nutrients"

    food_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("food_items.id", ondelete="CASCADE"),
        primary_key=True,
    )
    nutrient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("nutrients.id", ondelete="CASCADE"),
        primary_key=True,
    )
    amount_per_reference_qty: Mapped[Decimal] = mapped_column(Numeric(8, 3), nullable=False)
    derivation_code: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)

    __table_args__ = (
        CheckConstraint("amount_per_reference_qty >= 0", name="ck_food_nutrient_amount"),
    )

    # Relationships
    food: Mapped[FoodItem] = relationship("FoodItem", back_populates="nutrients")
    nutrient: Mapped[Nutrient] = relationship("Nutrient", back_populates="food_nutrients")


class IntakeRecord(Base):
    """Immutable consumption log with frozen calculated nutrient snapshots."""

    __tablename__ = "intake_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    food_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("food_items.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    food_name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    meal: Mapped[str] = mapped_column(String(30), nullable=False)
    date_logged: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    time_logged: Mapped[str] = mapped_column(String(10), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)
    computed_calories: Mapped[int] = mapped_column(Integer, nullable=False)
    computed_protein_g: Mapped[Decimal] = mapped_column(Numeric(5, 1), nullable=False)
    computed_carbs_g: Mapped[Decimal] = mapped_column(Numeric(5, 1), nullable=False)
    computed_fat_g: Mapped[Decimal] = mapped_column(Numeric(5, 1), nullable=False)
    computed_fiber_g: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 1), nullable=True)
    computed_sodium_mg: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 1), nullable=True)
    is_user_logged: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        CheckConstraint("meal IN ('Breakfast', 'Lunch', 'Snacks', 'Dinner')", name="ck_intake_meal"),
        CheckConstraint("unit IN ('g', 'oz', 'serving', 'ml', 'cup')", name="ck_intake_unit"),
        CheckConstraint("quantity > 0", name="ck_intake_quantity"),
        Index("idx_intake_user_date", "user_id", text("date_logged DESC")),
    )

    # Relationships
    user: Mapped[User] = relationship("User", back_populates="intake_records")
    food: Mapped[Optional[FoodItem]] = relationship("FoodItem", back_populates="intake_records")
