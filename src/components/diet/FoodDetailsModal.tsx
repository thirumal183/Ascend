import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  BookOpen,
  ChefHat,
  Flame,
  Info,
  Scale,
  ShieldCheck,
  X,
} from 'lucide-react';
import { FoodItem, NutrientValues } from '../../types/ascend';

interface FoodDetailsModalProps {
  food: FoodItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectForLog?: (food: FoodItem) => void;
}

export const FoodDetailsModal: React.FC<FoodDetailsModalProps> = ({
  food,
  isOpen,
  onClose,
  onSelectForLog,
}) => {
  const [basis, setBasis] = useState<'serving' | '100g'>('100g');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !food) return null;

  // Active nutrients depending on 100g vs serving toggle
  const activeNutrients: NutrientValues =
    basis === '100g' && food.nutrientsPer100g
      ? food.nutrientsPer100g
      : food.nutrients;

  const currentBasisLabel =
    basis === '100g'
      ? 'Standard 100g'
      : `Reference Serving (${food.referenceLabel})`;

  // Calculate protein per 100 kcal ratio: (proteinG / calories) * 100
  const proteinEfficiency =
    activeNutrients.calories > 0
      ? (
          (activeNutrients.proteinG / activeNutrients.calories) *
          100
        ).toFixed(1)
      : '0.0';

  const formatNutrient = (
    val: number | null | undefined,
    unit: string,
    decimals = 1
  ) => {
    if (val === null || val === undefined) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
          <AlertCircle className="h-3 w-3 shrink-0" />
          — (Unmeasured)
        </span>
      );
    }
    return (
      <span className="font-mono font-semibold text-slate-900">
        {decimals > 0 ? val.toFixed(decimals) : Math.round(val)} {unit}
      </span>
    );
  };

  const getPrepStateBadge = (prep?: string) => {
    switch (prep) {
      case 'raw':
        return {
          label: 'Raw / Uncooked',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        };
      case 'cooked':
        return {
          label: 'Cooked / Prepared',
          bg: 'bg-sky-50 text-sky-800 border-sky-200',
        };
      case 'composite_dish':
        return {
          label: 'Composite Recipe',
          bg: 'bg-purple-50 text-purple-800 border-purple-200',
        };
      case 'packaged':
        return {
          label: 'Commercial Packaged',
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
        };
      default:
        return {
          label: 'Standard',
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
        };
    }
  };

  const prepBadge = getPrepStateBadge(food.preparationState);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="food-details-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in overscroll-contain"
    >
      <div
        className="w-full max-w-2xl bg-white border border-slate-200/90 rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-4 bg-gradient-to-r from-slate-50 via-white to-sky-50/30">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full border bg-slate-100 text-slate-700 border-slate-200">
                {food.category}
              </span>
              <span
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${prepBadge.bg}`}
              >
                {prepBadge.label}
              </span>
              {food.cuisineRegion && (
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200">
                  {food.cuisineRegion}
                </span>
              )}
              {food.ediblePortionPct != null && (
                <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                  {food.ediblePortionPct}% Edible Yield
                </span>
              )}
            </div>

            <h2
              id="food-details-title"
              className="text-xl font-bold font-display text-slate-900 tracking-tight"
            >
              {food.name}
            </h2>

            {food.alternateNames && food.alternateNames.length > 0 && (
              <p className="text-xs text-slate-500 font-medium">
                Also known as: {food.alternateNames.join(' · ')}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors shrink-0"
            aria-label="Close food details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto overscroll-contain">
          {/* Basis Toggle: Per 100g vs Per Serving */}
          <div role="group" aria-label="Nutrient reference basis" className="flex items-center justify-between p-1.5 bg-slate-100 rounded-2xl">
            <button
              type="button"
              aria-pressed={basis === '100g'}
              onClick={() => setBasis('100g')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                basis === '100g'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scale className="h-3.5 w-3.5 text-sky-600" />
              <span>Standard Per 100g (Scientific Baseline)</span>
            </button>
            <button
              type="button"
              aria-pressed={basis === 'serving'}
              onClick={() => setBasis('serving')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                basis === 'serving'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ChefHat className="h-3.5 w-3.5 text-amber-600" />
              <span>Per Serving ({food.gramsPerServing}g)</span>
            </button>
          </div>

          {/* Prominent Macro Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Macronutrient Profile · {currentBasisLabel}
              </span>
              <div className="flex items-center gap-1 text-xs font-mono font-bold text-slate-900 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100">
                <Flame className="h-3.5 w-3.5 text-sky-600" />
                <span>{activeNutrients.calories} kcal</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-100 text-center">
                <span className="text-xs font-medium text-sky-800 block">
                  Protein
                </span>
                <strong className="text-xl font-bold font-mono text-sky-900 block mt-1">
                  {activeNutrients.proteinG.toFixed(1)}g
                </strong>
                <span className="text-[10px] text-sky-700/80">
                  {Math.round(
                    ((activeNutrients.proteinG * 4) /
                      Math.max(1, activeNutrients.calories)) *
                      100
                  )}
                  % of cals
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-center">
                <span className="text-xs font-medium text-emerald-800 block">
                  Carbohydrates
                </span>
                <strong className="text-xl font-bold font-mono text-emerald-900 block mt-1">
                  {activeNutrients.carbsG.toFixed(1)}g
                </strong>
                <span className="text-[10px] text-emerald-700/80">
                  {Math.round(
                    ((activeNutrients.carbsG * 4) /
                      Math.max(1, activeNutrients.calories)) *
                      100
                  )}
                  % of cals
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100 text-center">
                <span className="text-xs font-medium text-amber-800 block">
                  Total Fat
                </span>
                <strong className="text-xl font-bold font-mono text-amber-900 block mt-1">
                  {activeNutrients.fatG.toFixed(1)}g
                </strong>
                <span className="text-[10px] text-amber-700/80">
                  {Math.round(
                    ((activeNutrients.fatG * 9) /
                      Math.max(1, activeNutrients.calories)) *
                      100
                  )}
                  % of cals
                </span>
              </div>
            </div>
          </div>

          {/* Protein Efficiency Ratio Card */}
          <div className="p-4 rounded-2xl bg-linear-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between gap-4 shadow-sm">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-300">
                <Scale className="h-3.5 w-3.5" />
                <span>Protein Efficiency Index</span>
              </div>
              <p className="text-xs text-slate-300">
                Grams of complete protein delivered per 100 kcal consumed.
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-2xl font-black font-mono text-sky-400 block leading-none">
                {proteinEfficiency}g
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                per 100 kcal
              </span>
            </div>
          </div>

          {/* Secondary Nutrients & Electrolytes Table */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Micronutrients & Electrolytes ({currentBasisLabel})
            </span>

            <div className="border border-slate-200/80 rounded-2xl overflow-hidden divide-y divide-slate-100 text-xs">
              <div className="p-3 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
                <span className="text-slate-600 font-medium">
                  Dietary Fibre
                </span>
                {formatNutrient(activeNutrients.fiberG, 'g')}
              </div>
              <div className="p-3 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
                <span className="text-slate-600 font-medium">Total Sugars</span>
                {formatNutrient(activeNutrients.sugarG, 'g')}
              </div>
              <div className="p-3 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
                <span className="text-slate-600 font-medium">Sodium (Na)</span>
                {formatNutrient(activeNutrients.sodiumMg, 'mg', 0)}
              </div>
              <div className="p-3 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
                <span className="text-slate-600 font-medium">
                  Potassium (K)
                </span>
                {formatNutrient(activeNutrients.potassiumMg, 'mg', 0)}
              </div>
              <div className="p-3 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
                <span className="text-slate-600 font-medium">Calcium (Ca)</span>
                {formatNutrient(activeNutrients.calciumMg, 'mg', 0)}
              </div>
              <div className="p-3 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
                <span className="text-slate-600 font-medium">Iron (Fe)</span>
                {formatNutrient(activeNutrients.ironMg, 'mg', 1)}
              </div>
            </div>
          </div>

          {/* Provenance & Licensing Information Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Data Provenance & Source Attribution
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Primary Source</span>
                <span className="font-semibold text-slate-800 block mt-0.5">
                  {food.sourceProvenance?.sourceName || food.brandOrSource}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Reference / Code</span>
                <span className="font-mono text-slate-800 block mt-0.5">
                  {food.sourceProvenance?.sourceId || 'ASCEND-REF-01'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">
                  Verification Status
                </span>
                <span className="font-medium text-emerald-700 block mt-0.5">
                  {food.sourceProvenance?.verificationStatus ===
                  'verified_reference'
                    ? 'Verified Laboratory Reference'
                    : food.sourceProvenance?.verificationStatus ===
                        'packaged_label'
                      ? 'Commercial Packaged Declaration'
                      : 'Curated Demonstration Model'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">License Model</span>
                <span className="font-medium text-slate-800 block mt-0.5">
                  {food.sourceProvenance?.licenseType ||
                    'Curated Prototype / Demo'}
                </span>
              </div>
            </div>

            {food.dataNote && (
              <div className="pt-2 border-t border-slate-200/60 flex items-start gap-2 text-xs text-slate-600">
                <Info className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                <span>{food.dataNote}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <BookOpen className="h-3.5 w-3.5 text-slate-400" />
            <span>ASCEND Food Composition Engine</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 rounded-xl transition-colors"
            >
              Close
            </button>
            {onSelectForLog && (
              <button
                type="button"
                onClick={() => {
                  onSelectForLog(food);
                  onClose();
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-xs"
              >
                Select & Configure Portion
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
