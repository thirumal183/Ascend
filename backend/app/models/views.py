"""Database View Definitions for Pure 3NF Aggregation."""

CREATE_V_FOOD_ITEMS_WITH_NUTRIENTS = """
CREATE OR REPLACE VIEW v_food_items_with_nutrients AS
SELECT 
    f.id,
    f.code,
    f.name,
    f.alternate_names,
    f.brand_or_source,
    f.category,
    f.cuisine_region,
    f.preparation_state,
    f.reference_quantity,
    f.reference_unit,
    f.reference_label,
    f.grams_per_serving,
    f.edible_portion_pct,
    f.is_micronutrient_complete,
    f.is_custom_user_food,
    f.created_by_user_id,
    f.data_note,
    f.created_at,
    COALESCE(MAX(CASE WHEN n.code = 'ENERC_KCAL' THEN fn.amount_per_reference_qty * (100.0 / f.reference_quantity) END), 0)::NUMERIC(6,1) AS calories_per_100g,
    COALESCE(MAX(CASE WHEN n.code = 'PROCNT'     THEN fn.amount_per_reference_qty * (100.0 / f.reference_quantity) END), 0)::NUMERIC(5,1) AS protein_per_100g,
    COALESCE(MAX(CASE WHEN n.code = 'CHOCDF'     THEN fn.amount_per_reference_qty * (100.0 / f.reference_quantity) END), 0)::NUMERIC(5,1) AS carbs_per_100g,
    COALESCE(MAX(CASE WHEN n.code = 'FAT'        THEN fn.amount_per_reference_qty * (100.0 / f.reference_quantity) END), 0)::NUMERIC(5,1) AS fat_per_100g
FROM food_items f
LEFT JOIN food_nutrients fn ON f.id = fn.food_id
LEFT JOIN nutrients n ON fn.nutrient_id = n.id
GROUP BY f.id;
"""

DROP_V_FOOD_ITEMS_WITH_NUTRIENTS = "DROP VIEW IF EXISTS v_food_items_with_nutrients CASCADE;"
