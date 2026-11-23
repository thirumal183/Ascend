---
name: ascend-nutrition-data-quality
description: Nutrition data quality, scientific reference standards, food composition provenance, and calculation rules for ASCEND. Governs nutrient schemas, ICMR-NIN/USDA attribution, raw/cooked distinctions, and missing value representation.
license: Proprietary
metadata:
  author: ASCEND Nutrition Team
  version: "1.0.0"
---

# ASCEND Nutrition Data Quality & Reference Standards

This skill defines mandatory nutrition engineering standards, calculation methodologies, legal licensing compliance, and data provenance rules for the ASCEND platform.

## 1. Authoritative Data Sources & Licensing Boundaries

### USDA FoodData Central (FDC)
- **License**: U.S. Government Work / Public Domain (CC0 equivalent). Free for commercial and research use.
- **Usage**: Primary baseline for single-ingredient reference foods, micronutrient profiles, and sports nutrition supplements.
- **Attribution**: Recommended citation format: `U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, [Year]. fdc.nal.usda.gov`.

### ICMR - National Institute of Nutrition (NIN) IFCT 2017 & DGI 2024
- **License / Terms**: Published by National Institute of Nutrition (ICMR), Hyderabad. The electronic reproduction or packaging of the raw IFCT dataset into commercial products requires prior written authorization from DG ICMR / Director NIN.
- **Compliance Policy**:
  - Do NOT scrape or redistribute bulk IFCT tables without explicit authorization.
  - Formulate Indian culinary reference foods using standard USDA public-domain equivalents or clearly labeled demonstration baseline profiles citing published culinary standards.
  - Dietary Guidelines for Indians (DGI 2024) are cited strictly for daily allowance reference standards (e.g., Recommended Dietary Allowances / EAR guidelines).

### Open Food Facts (OFF)
- **License**: Open Database License (ODbL 1.0).
- **Compliance Policy**:
  - Content from individual packaged food labels is licensed under the Database Contents License (DbCL).
  - Derivative databases created by modifying or adding to OFF must be released under ODbL with source attribution.
  - For ASCEND's proprietary user logs, keep internal user records separate from ODbL-derived tables.

## 2. Nutrient Schema & Representation Rules

### Mandatory Distinction of Missing Data
- **CRITICAL**: Missing or unmeasured nutrients MUST be represented as `null` or `undefined`.
- **NEVER** substitute `0` for an unmeasured micronutrient (e.g. if potassium is unmeasured in a reference food, showing `0 mg` is medically false and dangerous for kidney patients).

### Raw vs. Cooked Preparation States
- Food records must explicitly define `preparationState`:
  - `'raw'`: Uncooked whole ingredient (e.g., Raw Chicken Breast, Uncooked Basmati Rice).
  - `'cooked'`: Boiled, roasted, or pan-cooked without added heavy fats unless specified.
  - `'composite_dish'`: Traditional recipe with multiple ingredients (e.g., Dal Tadka, Paneer Butter Masala).
- NEVER compare raw grain to cooked grain directly without adjusting for water hydration factors (~2.5x to 3.0x for rice; ~2.2x for cooked dal).

## 3. Protein & Energy Target Calculations
- **Basal Metabolic Rate (BMR)**: Calculated using the Mifflin-St Jeor equation:
  - Male: $BMR = 10 \times \text{weight (kg)} + 6.25 \times \text{height (cm)} - 5 \times \text{age} + 5$
  - Female: $BMR = 10 \times \text{weight (kg)} + 6.25 \times \text{height (cm)} - 5 \times \text{age} - 161$
- **Total Daily Energy Expenditure (TDEE)**:
  - Sedentary: $1.2 \times BMR$
  - Lightly Active: $1.375 \times BMR$
  - Moderately Active: $1.55 \times BMR$
  - Very Active: $1.725 \times BMR$
  - Competitive Athlete: $1.9 \times BMR$
- **Target Adjustments by Pathway**:
  - General Fitness: Deficit of $-300$ to $-500$ kcal for weight loss; Protein at $1.2 - 1.6 \text{ g/kg}$.
  - Athlete Performance: Isocaloric maintenance or tailored training-day surplus; Protein at $1.6 - 2.2 \text{ g/kg}$.
  - Muscle Gain: Hypertrophic surplus of $+300$ to $+450$ kcal; Protein at $1.8 - 2.4 \text{ g/kg}$.
