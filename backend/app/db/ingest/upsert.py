"""Transactional idempotent upsert engine for ASCEND food catalog ingestion."""

from __future__ import annotations

from decimal import Decimal
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.ingest.types import ImportSummary, NormalizedFoodRecord
from app.db.ingest.validation import validate_food_record
from app.models.nutrition import FoodItem, FoodNutrient
from app.services.nutrition_service import ensure_canonical_nutrients


async def upsert_food_records(
    db: AsyncSession,
    records: Iterable[NormalizedFoodRecord],
    *,
    source_provider: str,
    dataset_name: str,
    import_batch_id: str,
    dry_run: bool = False,
) -> ImportSummary:
    """Validates, deduplicates, and idempotently upserts food records into PostgreSQL.

    - Matches existing public rows strictly by (source_provider, source_external_id).
    - Preserves stable FoodItem.id UUIDs on repeat imports.
    - Never touches user-created custom foods or records from other providers.
    - Preserves unmeasured micronutrients as NULL (no FoodNutrient row inserted).
    - Never mutates historical IntakeRecord snapshots.
    """
    summary = ImportSummary(
        source_provider=source_provider,
        dataset_name=dataset_name,
        import_batch_id=import_batch_id,
        dry_run=dry_run,
    )

    nutrient_map = await ensure_canonical_nutrients(db)
    seen_external_ids: set[str] = set()

    for rec in records:
        summary.examined += 1

        if rec.source_provider != source_provider:
            summary.add_rejection(
                f"Provider mismatch for '{rec.source_external_id}': expected {source_provider}, got {rec.source_provider}"
            )
            continue

        if rec.source_external_id in seen_external_ids:
            summary.skipped += 1
            continue

        validation = validate_food_record(rec)
        for w in validation.warnings:
            summary.add_warning(w)

        if not validation.is_valid:
            summary.add_rejection(f"{rec.source_external_id}: {'; '.join(validation.rejection_reasons)}")
            continue

        seen_external_ids.add(rec.source_external_id)

        if dry_run:
            summary.imported += 1
            continue

        existing_stmt = (
            select(FoodItem)
            .options(selectinload(FoodItem.nutrients))
            .where(
                FoodItem.is_custom_user_food == False,  # noqa: E712
                FoodItem.source_provider == rec.source_provider,
                FoodItem.source_external_id == rec.source_external_id,
            )
        )
        existing = await db.scalar(existing_stmt)

        has_all_micros = all(
            rec.nutrients.get(code) is not None
            for code in ("FIBTG", "SUGAR", "NA", "K", "CA", "FE")
        )

        if existing is None:
            food = FoodItem(
                code=rec.code,
                name=rec.name[:200],
                alternate_names=rec.alternate_names[:20],
                brand_or_source=rec.brand_or_source[:150],
                category=rec.category[:50],
                cuisine_region=rec.cuisine_region[:50] if rec.cuisine_region else None,
                preparation_state=rec.preparation_state,
                reference_quantity=Decimal(str(round(rec.reference_quantity, 2))),
                reference_unit=rec.reference_unit,
                reference_label=rec.reference_label[:100],
                grams_per_serving=Decimal(str(round(rec.grams_per_serving, 2))),
                edible_portion_pct=Decimal(str(round(rec.edible_portion_pct, 2))),
                is_micronutrient_complete=has_all_micros,
                is_custom_user_food=False,
                created_by_user_id=None,
                data_note=rec.data_note,
                source_provider=rec.source_provider,
                source_external_id=rec.source_external_id,
                license_type=rec.license_type,
                verification_status=rec.verification_status,
                source_attribution=rec.source_attribution,
                barcode=rec.barcode[:32] if rec.barcode else None,
                import_batch_id=import_batch_id,
            )
            db.add(food)
            await db.flush()

            for code, val in rec.nutrients.items():
                if val is not None and code in nutrient_map:
                    db.add(
                        FoodNutrient(
                            food_id=food.id,
                            nutrient_id=nutrient_map[code].id,
                            amount_per_reference_qty=Decimal(str(round(float(val), 3))),
                            derivation_code=rec.verification_status,
                        )
                    )
            summary.imported += 1
        else:
            # Update metadata & nutrients in place while preserving FoodItem.id UUID
            existing.code = rec.code
            existing.name = rec.name[:200]
            existing.alternate_names = rec.alternate_names[:20]
            existing.brand_or_source = rec.brand_or_source[:150]
            existing.category = rec.category[:50]
            existing.cuisine_region = rec.cuisine_region[:50] if rec.cuisine_region else None
            existing.preparation_state = rec.preparation_state
            existing.reference_quantity = Decimal(str(round(rec.reference_quantity, 2)))
            existing.reference_unit = rec.reference_unit
            existing.reference_label = rec.reference_label[:100]
            existing.grams_per_serving = Decimal(str(round(rec.grams_per_serving, 2)))
            existing.edible_portion_pct = Decimal(str(round(rec.edible_portion_pct, 2)))
            existing.is_micronutrient_complete = has_all_micros
            existing.data_note = rec.data_note
            existing.license_type = rec.license_type
            existing.verification_status = rec.verification_status
            existing.source_attribution = rec.source_attribution
            existing.barcode = rec.barcode[:32] if rec.barcode else None
            existing.import_batch_id = import_batch_id

            existing_by_nid = {fn.nutrient_id: fn for fn in existing.nutrients}
            desired_nids: set = set()
            for code, val in rec.nutrients.items():
                if val is not None and code in nutrient_map:
                    nid = nutrient_map[code].id
                    desired_nids.add(nid)
                    amt = Decimal(str(round(float(val), 3)))
                    if nid in existing_by_nid:
                        existing_by_nid[nid].amount_per_reference_qty = amt
                        existing_by_nid[nid].derivation_code = rec.verification_status
                    else:
                        db.add(
                            FoodNutrient(
                                food_id=existing.id,
                                nutrient_id=nid,
                                amount_per_reference_qty=amt,
                                derivation_code=rec.verification_status,
                            )
                        )
            # Remove rows for nutrients that became unmeasured (preserve NULL semantics)
            for nid, fn in list(existing_by_nid.items()):
                if nid not in desired_nids:
                    await db.delete(fn)

            summary.updated += 1

    if not dry_run:
        await db.commit()

    return summary
