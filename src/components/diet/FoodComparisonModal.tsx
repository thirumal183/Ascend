import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  ChefHat,
  Flame,
  Info,
  Scale,
  Sparkles,
  X,
} from 'lucide-react';
import { FoodItem, NutrientValues } from '../../types/ascend';

interface FoodComparisonModalProps {
  allFoods: FoodItem[];
  selectedFoodIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onRemoveFood: (foodId: string) => void;
  onAddFoodToCompare: (foodId: string) => void;
}

export const FoodComparisonModal: React.FC<FoodComparisonModalProps> = ({
  allFoods,
  selectedFoodIds,
  isOpen,
  onClose,
  onRemoveFood,
  onAddFoodToCompare,
}) => {
  const [basis, setBasis] = useState<'100g' | 'serving'>('100g');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const comparedFoods = selectedFoodIds
    .map((id) => allFoods.find((f) => f.id === id))
    .filter((f): f is FoodItem => Boolean(f));

  // Check if there is a raw vs cooked mismatch
  const hasRaw = comparedFoods.some((f) => f.preparationState === 'raw');
  const hasCooked = comparedFoods.some(
    (f) =>
      f.preparationState === 'cooked' || f.preparationState === 'composite_dish'
  );
  const showHydrationWarning = hasRaw && hasCooked;

  // Active nutrients for a food item given current basis
  const getActiveNutrients = (food: FoodItem): NutrientValues => {
    return basis === '100g' && food.nutrientsPer100g
      ? food.nutrientsPer100g
      : food.nutrients;
  };

  const getProteinRatio = (nutrients: NutrientValues): number => {
    return nutrients.calories > 0
      ? (nutrients.proteinG / nutrients.calories) * 100
      : 0;
  };

  // Find food with highest protein ratio
  const maxProteinRatioItem = comparedFoods.reduce<{
    food: FoodItem | null;
    ratio: number;
  }>(
    (acc, food) => {
      const ratio = getProteinRatio(getActiveNutrients(food));
      return ratio > acc.ratio ? { food, ratio } : acc;
    },
    { food: null, ratio: 0 }
  );

  const formatNutrient = (
    val: number | null | undefined,
    unit: string,
    decimals = 1
  ) => {
    if (val === null || val === undefined) {
      return (
        <span className="text-[11px] text-amber-700 font-medium italic">
          — (Unmeasured)
        </span>
      );
    }
    return (
      <span className="font-mono font-bold text-slate-800">
        {decimals > 0 ? val.toFixed(decimals) : Math.round(val)} {unit}
      </span>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="comparison-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-fade-in overscroll-contain"
    >
      <div
        className="w-full max-w-4xl bg-white border border-slate-200/90 rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-4 bg-gradient-to-r from-slate-50 via-white to-sky-50/40">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
                <ArrowRightLeft className="h-4 w-4" />
              </span>
              <h2
                id="comparison-title"
                className="text-xl font-bold font-display text-slate-900 tracking-tight"
              >
                Food Intelligence & Nutrient Comparison
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Side-by-side macronutrient density, protein efficiency ratio, and
              micronutrient transparency.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors shrink-0"
            aria-label="Close comparison"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Comparison Content */}
        <div className="p-6 space-y-6 overflow-y-auto overscroll-contain">
          {/* Controls: Basis Toggle & Add Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setBasis('100g')}
                className={`py-1.5 px-3.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                  basis === '100g'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Scale className="h-3.5 w-3.5 text-sky-600" />
                <span>Standard Per 100g</span>
              </button>
              <button
                type="button"
                onClick={() => setBasis('serving')}
                className={`py-1.5 px-3.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                  basis === 'serving'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ChefHat className="h-3.5 w-3.5 text-amber-600" />
                <span>Per Custom Serving</span>
              </button>
            </div>

            {/* Selector to add more foods if < 3 */}
            {comparedFoods.length < 3 && (
              <div className="flex items-center gap-2">
                <label
                  htmlFor="add-compare-select"
                  className="text-xs text-slate-500 whitespace-nowrap"
                >
                  Add food:
                </label>
                <select
                  id="add-compare-select"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      onAddFoodToCompare(e.target.value);
                    }
                  }}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-sky-500"
                >
                  <option value="">Select food to add...</option>
                  {allFoods
                    .filter((f) => !selectedFoodIds.includes(f.id))
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.category})
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {/* Hydration / State Warning Banner */}
          {showHydrationWarning && (
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold">
                  Hydration & Preparation State Notice
                </span>
                <p className="text-amber-800/90 leading-relaxed">
                  You are comparing foods in different preparation states (raw/dry
                  vs. cooked/hydrated). Dry grains and pulses absorb 2.5–3× water
                  weight when cooked, diluting caloric and nutrient density per
                  100g. Always consider cooked volume when planning meal portions.
                </p>
              </div>
            </div>
          )}

          {/* Protein Efficiency Callout */}
          {maxProteinRatioItem.food && comparedFoods.length > 1 && (
            <div className="p-3.5 rounded-2xl bg-linear-to-r from-sky-900 to-indigo-900 text-white text-xs flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="h-4 w-4 text-sky-300 shrink-0" />
                <span className="truncate">
                  Highest Protein Efficiency:{' '}
                  <strong>{maxProteinRatioItem.food.name}</strong> delivers{' '}
                  <span className="text-sky-300 font-mono font-bold">
                    {maxProteinRatioItem.ratio.toFixed(1)}g protein
                  </span>{' '}
                  per 100 kcal consumed.
                </span>
              </div>
            </div>
          )}

          {/* Comparison Table */}
          {comparedFoods.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 space-y-2">
              <p>No foods selected for comparison.</p>
              <p className="text-xs text-slate-400">
                Select 2 or 3 foods from the catalogue to compare them
                side-by-side.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
              {/* Food Header Row */}
              <div className="grid grid-cols-12 bg-slate-50/80 p-4 font-semibold text-xs text-slate-700 items-center">
                <div className="col-span-3 text-slate-500 uppercase tracking-wider text-[11px]">
                  Metric / Nutrient
                </div>
                {comparedFoods.map((food) => (
                  <div
                    key={food.id}
                    className={`${
                      comparedFoods.length === 1
                        ? 'col-span-9'
                        : comparedFoods.length === 2
                          ? 'col-span-4 sm:col-span-4'
                          : 'col-span-3'
                    } px-2 space-y-1 relative`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-bold text-slate-900 block leading-tight text-xs line-clamp-2">
                        {food.name}
                      </span>
                      {comparedFoods.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onRemoveFood(food.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded-full transition-colors shrink-0"
                          title="Remove food from comparison"
                          aria-label={`Remove ${food.name} from comparison`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                        {food.preparationState || 'standard'}
                      </span>
                      <span className="text-[10px] text-slate-600">
                        {basis === '100g' ? '100g' : `${food.gramsPerServing}g`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Energy */}
              <div className="grid grid-cols-12 p-3.5 text-xs items-center hover:bg-slate-50/50 transition-colors">
                <div className="col-span-3 font-semibold text-slate-700 flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-sky-600" />
                  <span>Energy (Calories)</span>
                </div>
                {comparedFoods.map((food) => {
                  const nutrients = getActiveNutrients(food);
                  return (
                    <div
                      key={food.id}
                      className={`${
                        comparedFoods.length === 1
                          ? 'col-span-9'
                          : comparedFoods.length === 2
                            ? 'col-span-4'
                            : 'col-span-3'
                      } px-2 font-mono font-bold text-slate-900 text-sm`}
                    >
                      {nutrients.calories} kcal
                    </div>
                  );
                })}
              </div>

              {/* Protein Ratio */}
              <div className="grid grid-cols-12 p-3.5 text-xs items-center bg-sky-50/40 hover:bg-sky-50/70 transition-colors">
                <div className="col-span-3 font-semibold text-sky-900">
                  Protein / 100 kcal
                </div>
                {comparedFoods.map((food) => {
                  const nutrients = getActiveNutrients(food);
                  const ratio = getProteinRatio(nutrients);
                  const isTop =
                    maxProteinRatioItem.food?.id === food.id &&
                    comparedFoods.length > 1;
                  return (
                    <div
                      key={food.id}
                      className={`${
                        comparedFoods.length === 1
                          ? 'col-span-9'
                          : comparedFoods.length === 2
                            ? 'col-span-4'
                            : 'col-span-3'
                      } px-2 font-mono font-bold ${
                        isTop ? 'text-sky-700' : 'text-slate-800'
                      }`}
                    >
                      {ratio.toFixed(1)}g
                      {isTop && (
                        <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-sky-600 text-white font-sans">
                          Top
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Protein */}
              <div className="grid grid-cols-12 p-3.5 text-xs items-center hover:bg-slate-50/50 transition-colors">
                <div className="col-span-3 font-medium text-slate-600">
                  Total Protein
                </div>
                {comparedFoods.map((food) => (
                  <div
                    key={food.id}
                    className={`${
                      comparedFoods.length === 1
                        ? 'col-span-9'
                        : comparedFoods.length === 2
                          ? 'col-span-4'
                          : 'col-span-3'
                    } px-2`}
                  >
                    {formatNutrient(
                      getActiveNutrients(food).proteinG,
                      'g',
                      1
                    )}
                  </div>
                ))}
              </div>

              {/* Carbs */}
              <div className="grid grid-cols-12 p-3.5 text-xs items-center hover:bg-slate-50/50 transition-colors">
                <div className="col-span-3 font-medium text-slate-600">
                  Carbohydrates
                </div>
                {comparedFoods.map((food) => (
                  <div
                    key={food.id}
                    className={`${
                      comparedFoods.length === 1
                        ? 'col-span-9'
                        : comparedFoods.length === 2
                          ? 'col-span-4'
                          : 'col-span-3'
                    } px-2`}
                  >
                    {formatNutrient(
                      getActiveNutrients(food).carbsG,
                      'g',
                      1
                    )}
                  </div>
                ))}
              </div>

              {/* Fat */}
              <div className="grid grid-cols-12 p-3.5 text-xs items-center hover:bg-slate-50/50 transition-colors">
                <div className="col-span-3 font-medium text-slate-600">
                  Total Fat
                </div>
                {comparedFoods.map((food) => (
                  <div
                    key={food.id}
                    className={`${
                      comparedFoods.length === 1
                        ? 'col-span-9'
                        : comparedFoods.length === 2
                          ? 'col-span-4'
                          : 'col-span-3'
                    } px-2`}
                  >
                    {formatNutrient(getActiveNutrients(food).fatG, 'g', 1)}
                  </div>
                ))}
              </div>

              {/* Fiber */}
              <div className="grid grid-cols-12 p-3.5 text-xs items-center hover:bg-slate-50/50 transition-colors">
                <div className="col-span-3 font-medium text-slate-600">
                  Dietary Fibre
                </div>
                {comparedFoods.map((food) => (
                  <div
                    key={food.id}
                    className={`${
                      comparedFoods.length === 1
                        ? 'col-span-9'
                        : comparedFoods.length === 2
                          ? 'col-span-4'
                          : 'col-span-3'
                    } px-2`}
                  >
                    {formatNutrient(
                      getActiveNutrients(food).fiberG,
                      'g',
                      1
                    )}
                  </div>
                ))}
              </div>

              {/* Sugars */}
              <div className="grid grid-cols-12 p-3.5 text-xs items-center hover:bg-slate-50/50 transition-colors">
                <div className="col-span-3 font-medium text-slate-600">
                  Sugars
                </div>
                {comparedFoods.map((food) => (
                  <div
                    key={food.id}
                    className={`${
                      comparedFoods.length === 1
                        ? 'col-span-9'
                        : comparedFoods.length === 2
                          ? 'col-span-4'
                          : 'col-span-3'
                    } px-2`}
                  >
                    {formatNutrient(
                      getActiveNutrients(food).sugarG,
                      'g',
                      1
                    )}
                  </div>
                ))}
              </div>

              {/* Sodium */}
              <div className="grid grid-cols-12 p-3.5 text-xs items-center hover:bg-slate-50/50 transition-colors">
                <div className="col-span-3 font-medium text-slate-600">
                  Sodium (Na)
                </div>
                {comparedFoods.map((food) => (
                  <div
                    key={food.id}
                    className={`${
                      comparedFoods.length === 1
                        ? 'col-span-9'
                        : comparedFoods.length === 2
                          ? 'col-span-4'
                          : 'col-span-3'
                    } px-2`}
                  >
                    {formatNutrient(
                      getActiveNutrients(food).sodiumMg,
                      'mg',
                      0
                    )}
                  </div>
                ))}
              </div>

              {/* Potassium */}
              <div className="grid grid-cols-12 p-3.5 text-xs items-center hover:bg-slate-50/50 transition-colors">
                <div className="col-span-3 font-medium text-slate-600">
                  Potassium (K)
                </div>
                {comparedFoods.map((food) => (
                  <div
                    key={food.id}
                    className={`${
                      comparedFoods.length === 1
                        ? 'col-span-9'
                        : comparedFoods.length === 2
                          ? 'col-span-4'
                          : 'col-span-3'
                    } px-2`}
                  >
                    {formatNutrient(
                      getActiveNutrients(food).potassiumMg,
                      'mg',
                      0
                    )}
                  </div>
                ))}
              </div>

              {/* Calcium */}
              <div className="grid grid-cols-12 p-3.5 text-xs items-center hover:bg-slate-50/50 transition-colors">
                <div className="col-span-3 font-medium text-slate-600">
                  Calcium (Ca)
                </div>
                {comparedFoods.map((food) => (
                  <div
                    key={food.id}
                    className={`${
                      comparedFoods.length === 1
                        ? 'col-span-9'
                        : comparedFoods.length === 2
                          ? 'col-span-4'
                          : 'col-span-3'
                    } px-2`}
                  >
                    {formatNutrient(
                      getActiveNutrients(food).calciumMg,
                      'mg',
                      0
                    )}
                  </div>
                ))}
              </div>

              {/* Iron */}
              <div className="grid grid-cols-12 p-3.5 text-xs items-center hover:bg-slate-50/50 transition-colors">
                <div className="col-span-3 font-medium text-slate-600">
                  Iron (Fe)
                </div>
                {comparedFoods.map((food) => (
                  <div
                    key={food.id}
                    className={`${
                      comparedFoods.length === 1
                        ? 'col-span-9'
                        : comparedFoods.length === 2
                          ? 'col-span-4'
                          : 'col-span-3'
                    } px-2`}
                  >
                    {formatNutrient(
                      getActiveNutrients(food).ironMg,
                      'mg',
                      1
                    )}
                  </div>
                ))}
              </div>

              {/* Provenance Attribution */}
              <div className="grid grid-cols-12 p-3.5 text-[11px] items-center bg-slate-50/50">
                <div className="col-span-3 font-medium text-slate-500">
                  Data Source & License
                </div>
                {comparedFoods.map((food) => (
                  <div
                    key={food.id}
                    className={`${
                      comparedFoods.length === 1
                        ? 'col-span-9'
                        : comparedFoods.length === 2
                          ? 'col-span-4'
                          : 'col-span-3'
                    } px-2 space-y-0.5`}
                  >
                    <span className="font-semibold text-slate-700 block truncate">
                      {food.sourceProvenance?.sourceName || food.brandOrSource}
                    </span>
                    <span className="text-slate-400 block font-mono text-[10px]">
                      {food.sourceProvenance?.licenseType || 'Demo'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Info className="h-3.5 w-3.5 text-slate-400" />
            <span>Comparing {comparedFoods.length} of max 3 foods</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
