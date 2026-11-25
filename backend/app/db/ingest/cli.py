"""Safe, explicit-target CLI for ASCEND food ingestion and workout template seeding.

Usage examples (from backend/ directory):
  python -m app.db.ingest.cli inspect --source usda --file data/raw/foundation.json
  python -m app.db.ingest.cli import-usda --file data/raw/foundation.json --target-db local --dry-run
  python -m app.db.ingest.cli import-recipes --target-db local
  python -m app.db.ingest.cli seed-workouts --target-db local
  python -m app.db.ingest.cli verify-counts --target-db local

Safety rules:
- Requires explicit --target-db (never silently runs against a random env var).
- Non-localhost database targets require --confirm-production.
- Never prints database URLs, passwords, or API keys.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Ensure backend root is on sys.path when executed as module
BACKEND_ROOT = Path(__file__).resolve().parents[3]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import Settings
from app.db.ingest.off_adapter import parse_off_archive
from app.db.ingest.recipe_adapter import DEFAULT_RECIPES_PATH, parse_recipe_file
from app.db.ingest.types import ImportSummary
from app.db.ingest.upsert import upsert_food_records
from app.db.ingest.usda_adapter import parse_usda_archive
from app.db.ingest.workout_seeder import seed_system_workout_templates
from app.models.nutrition import FoodItem, FoodNutrient, Nutrient
from app.models.workout import ExerciseItem, WorkoutPlan


def _resolve_target_settings(target_db: str, database_url: Optional[str], confirm_production: bool) -> Settings:
    if database_url:
        raw_url = database_url.strip()
    elif target_db == "local":
        raw_url = os.environ.get(
            "ASCEND_LOCAL_DATABASE_URL",
            "postgresql+asyncpg://postgres:postgres@127.0.0.1:5434/ascend_test",
        )
    elif target_db == "env":
        raw_url = Settings().DATABASE_URL or ""
        if not raw_url:
            raise SystemExit("ERROR: --target-db env requires DATABASE_URL to be explicitly set.")
    else:
        raise SystemExit(f"ERROR: Unsupported --target-db '{target_db}'. Use 'local' or 'env'.")

    parsed = urlparse(raw_url.replace("postgresql+asyncpg://", "postgresql://"))
    host = (parsed.hostname or "").lower()
    is_local = host in ("127.0.0.1", "localhost", "::1")

    if not is_local and not confirm_production:
        raise SystemExit(
            "REFUSED: Target database host is non-local. Re-run with --confirm-production to proceed safely."
        )

    return Settings(DATABASE_URL=raw_url)


def _print_summary(summary: ImportSummary) -> None:
    mode = "DRY-RUN" if summary.dry_run else "COMMITTED"
    print(f"\n[{mode}] {summary.dataset_name} ({summary.source_provider}) | batch={summary.import_batch_id}")
    print(
        f"  examined={summary.examined} imported={summary.imported} updated={summary.updated} "
        f"skipped={summary.skipped} rejected={summary.rejected} warnings={summary.warnings_count}"
    )
    if summary.rejection_samples:
        print("  Sample rejections:")
        for r in summary.rejection_samples[:5]:
            print(f"    - {r}")
    if summary.warning_samples:
        print("  Sample warnings:")
        for w in summary.warning_samples[:5]:
            print(f"    - {w}")


async def _run_cli(args: argparse.Namespace) -> int:
    batch_id = getattr(args, "batch_id", None) or datetime.now(timezone.utc).strftime("batch_%Y%m%dT%H%M%SZ")

    if args.command == "inspect":
        path = Path(args.file)
        if not path.exists():
            print(f"ERROR: File not found: {path}")
            return 1
        if args.source == "usda":
            records = list(parse_usda_archive(path, limit=args.limit))
        elif args.source == "off":
            records = list(parse_off_archive(path, country_filter=args.country, limit=args.limit))
        elif args.source == "recipes":
            records = list(parse_recipe_file(path))
        else:
            print(f"ERROR: Unknown source '{args.source}'")
            return 1
        print(f"Inspected {len(records)} parsed records from {path.name} (source={args.source})")
        for rec in records[:5]:
            print(f"  - [{rec.source_external_id}] {rec.name} ({rec.preparation_state}, kcal={rec.nutrients.get('ENERC_KCAL')})")
        return 0

    cfg = _resolve_target_settings(args.target_db, args.database_url, args.confirm_production)
    engine = create_async_engine(cfg.async_database_uri, connect_args=cfg.async_connect_args)
    session_maker = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    try:
        async with session_maker() as db:
            if args.command == "verify-counts":
                n_cnt = await db.scalar(select(func.count(Nutrient.id)))
                pub_foods = await db.scalar(select(func.count(FoodItem.id)).where(FoodItem.is_custom_user_food == False))  # noqa: E712
                cust_foods = await db.scalar(select(func.count(FoodItem.id)).where(FoodItem.is_custom_user_food == True))  # noqa: E712
                fn_cnt = await db.scalar(select(func.count(FoodNutrient.food_id)))
                sys_plans = await db.scalar(select(func.count(WorkoutPlan.id)).where(WorkoutPlan.is_system_template == True))  # noqa: E712
                sys_ex = await db.scalar(select(func.count(ExerciseItem.id)).where(ExerciseItem.created_by_user_id.is_(None)))

                by_provider = (
                    await db.execute(
                        select(FoodItem.source_provider, func.count(FoodItem.id))
                        .group_by(FoodItem.source_provider)
                    )
                ).all()

                print("=== Catalogue Verification Counts ===")
                print(f"  nutrients: {n_cnt}")
                print(f"  public food_items: {pub_foods}")
                print(f"  custom user food_items: {cust_foods}")
                print(f"  food_nutrients rows: {fn_cnt}")
                print(f"  system workout_plans: {sys_plans}")
                print(f"  system exercise_items: {sys_ex}")
                print("  food_items by source_provider:")
                for prov, cnt in by_provider:
                    print(f"    - {prov}: {cnt}")
                return 0

            if args.command in ("import-usda", "import-all") and getattr(args, "usda_file", None):
                usda_path = Path(args.usda_file)
                summary = await upsert_food_records(
                    db,
                    parse_usda_archive(usda_path, limit=getattr(args, "limit", None)),
                    source_provider="usda_fdc",
                    dataset_name=usda_path.name,
                    import_batch_id=batch_id,
                    dry_run=args.dry_run,
                )
                _print_summary(summary)

            if args.command in ("import-off", "import-all") and getattr(args, "off_file", None):
                off_path = Path(args.off_file)
                summary = await upsert_food_records(
                    db,
                    parse_off_archive(
                        off_path,
                        country_filter=getattr(args, "country", None),
                        limit=getattr(args, "limit", None),
                    ),
                    source_provider="open_food_facts",
                    dataset_name=off_path.name,
                    import_batch_id=batch_id,
                    dry_run=args.dry_run,
                )
                _print_summary(summary)

            if args.command in ("import-recipes", "import-all"):
                recipe_path = Path(getattr(args, "recipe_file", None) or DEFAULT_RECIPES_PATH)
                summary = await upsert_food_records(
                    db,
                    parse_recipe_file(recipe_path),
                    source_provider="ascend_recipe_estimate",
                    dataset_name=recipe_path.name,
                    import_batch_id=batch_id,
                    dry_run=args.dry_run,
                )
                _print_summary(summary)

            if args.command in ("seed-workouts", "import-all"):
                w_summary = await seed_system_workout_templates(db, dry_run=args.dry_run)
                mode = "DRY-RUN" if w_summary.dry_run else "COMMITTED"
                print(
                    f"\n[{mode}] Workout Templates | created={w_summary.plans_created} "
                    f"existing={w_summary.plans_existing} exercises_created={w_summary.exercises_created}"
                )

        return 0
    finally:
        await engine.dispose()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="ASCEND Food Ingestion & Workout Seeding CLI")
    sub = parser.add_subparsers(dest="command", required=True)

    def add_target_flags(p: argparse.ArgumentParser) -> None:
        p.add_argument("--target-db", choices=["local", "env"], required=True, help="Explicit target DB profile")
        p.add_argument("--database-url", default=None, help="Optional explicit database URL override")
        p.add_argument("--confirm-production", action="store_true", help="Required for non-localhost database targets")
        p.add_argument("--dry-run", action="store_true", help="Validate without committing database writes")
        p.add_argument("--batch-id", default=None, help="Optional import batch identifier")

    p_ins = sub.add_parser("inspect", help="Inspect parsed records from a local archive without DB access")
    p_ins.add_argument("--source", choices=["usda", "off", "recipes"], required=True)
    p_ins.add_argument("--file", required=True)
    p_ins.add_argument("--country", default=None)
    p_ins.add_argument("--limit", type=int, default=50)

    p_usda = sub.add_parser("import-usda", help="Import USDA FoodData Central JSON/ZIP archive")
    p_usda.add_argument("--file", dest="usda_file", required=True)
    p_usda.add_argument("--limit", type=int, default=None)
    add_target_flags(p_usda)

    p_off = sub.add_parser("import-off", help="Import Open Food Facts JSON/JSONL/GZIP export")
    p_off.add_argument("--file", dest="off_file", required=True)
    p_off.add_argument("--country", default=None)
    p_off.add_argument("--limit", type=int, default=None)
    add_target_flags(p_off)

    p_rec = sub.add_parser("import-recipes", help="Import documented ASCEND Indian recipe estimates")
    p_rec.add_argument("--file", dest="recipe_file", default=None)
    add_target_flags(p_rec)

    p_wrk = sub.add_parser("seed-workouts", help="Idempotently seed system workout templates")
    add_target_flags(p_wrk)

    p_all = sub.add_parser("import-all", help="Run all provided food imports and workout template seeding")
    p_all.add_argument("--usda-file", default=None)
    p_all.add_argument("--off-file", default=None)
    p_all.add_argument("--recipe-file", default=None)
    p_all.add_argument("--country", default=None)
    p_all.add_argument("--limit", type=int, default=None)
    add_target_flags(p_all)

    p_cnt = sub.add_parser("verify-counts", help="Print catalogue row counts by source_provider")
    add_target_flags(p_cnt)

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    raise SystemExit(asyncio.run(_run_cli(args)))


if __name__ == "__main__":
    main()
