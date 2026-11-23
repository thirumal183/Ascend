import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Coffee,
  Edit3,
  Flame,
  Info,
  Loader2,
  Moon,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Sun,
  Sunrise,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import {
  calculateScaledNutrients,
  computeDailyTotals,
  filterFoodCatalog,
} from '../../services/ascendApiService';
import {
  FoodCategory,
  FoodItem,
  IntakeRecord,
  MealType,
  NutritionGoals,
  ServingUnit,
} from '../../types/ascend';

interface DietManagementViewProps {
  foodCatalog: FoodItem[];
  intakeRecords: IntakeRecord[];
  goals: NutritionGoals;
  initialMeal?: MealType;
  onAddIntakeRecord: (record: Omit<IntakeRecord, 'id'>) => string;
  onUpdateIntakeRecord: (
    id: string,
    quantity: number,
    unit: ServingUnit,
    meal: MealType
  ) => void;
  onDeleteIntakeRecord: (id: string) => void;
}

const FOOD_CATEGORIES: FoodCategory[] = [
  'All',
  'Protein Sources',
  'Grains & Oats',
  'Produce',
  'Dairy & Alternatives',
  'Sports Supplements',
  'Prepared Meals',
];

const SERVING_UNITS: { value: ServingUnit; label: string }[] = [
  { value: 'g', label: 'Grams (g)' },
  { value: 'serving', label: 'Standard Serving' },
  { value: 'oz', label: 'Ounces (oz)' },
  { value: 'cup', label: 'Cup (~225g)' },
  { value: 'ml', label: 'Milliliters (ml)' },
];

export const DietManagementView: React.FC<DietManagementViewProps> = ({
  foodCatalog,
  intakeRecords,
  goals,
  initialMeal,
  onAddIntakeRecord,
  onUpdateIntakeRecord,
  onDeleteIntakeRecord,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory>('All');
  const [selectedFood, setSelectedFood] = useState<FoodItem>(foodCatalog[0]);

  const [quantity, setQuantity] = useState<number>(150);
  const [unit, setUnit] = useState<ServingUnit>('g');
  const [selectedMeal, setSelectedMeal] = useState<MealType>(
    initialMeal || MealType.Breakfast
  );
  const [showExtendedDetails, setShowExtendedDetails] = useState(false);

  // Confirmation banner with Undo support
  const [addedFeedback, setAddedFeedback] = useState<{
    message: string;
    recordId: string;
  } | null>(null);

  // Deletion banner with Undo support
  const [deletedFeedback, setDeletedFeedback] = useState<{
    item: Omit<IntakeRecord, 'id'>;
    message: string;
  } | null>(null);

  // State Tester for Loading / Error states
  const [catalogState, setCatalogState] = useState<
    'normal' | 'loading' | 'error'
  >('normal');

  // Inline Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<number>(100);
  const [editUnit, setEditUnit] = useState<ServingUnit>('g');
  const [editMeal, setEditMeal] = useState<MealType>(MealType.Breakfast);

  useEffect(() => {
    if (initialMeal) {
      setSelectedMeal(initialMeal);
    }
  }, [initialMeal]);

  useEffect(() => {
    if (!addedFeedback) return;
    const timer = setTimeout(() => setAddedFeedback(null), 6000);
    return () => clearTimeout(timer);
  }, [addedFeedback]);

  useEffect(() => {
    if (!deletedFeedback) return;
    const timer = setTimeout(() => setDeletedFeedback(null), 6000);
    return () => clearTimeout(timer);
  }, [deletedFeedback]);

  const handleSelectFood = (food: FoodItem) => {
    setSelectedFood(food);
    if (food.referenceUnit === 'serving') {
      setUnit('serving');
      setQuantity(1);
    } else {
      setUnit('g');
      setQuantity(food.gramsPerServing);
    }
  };

  const filteredFoods = filterFoodCatalog(
    foodCatalog,
    searchQuery,
    selectedCategory
  );

  const previewNutrients = calculateScaledNutrients(
    selectedFood,
    quantity,
    unit
  );

  const dailyTotals = computeDailyTotals(intakeRecords);

  const handleConfirmAddFood = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) return;

    const nowTime = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const createdId = onAddIntakeRecord({
      foodId: selectedFood.id,
      foodName: selectedFood.name,
      category: selectedFood.category,
      meal: selectedMeal,
      quantity,
      unit,
      loggedAt: nowTime,
      dateIso: '2026-10-27',
      computedNutrients: previewNutrients,
      isUserLogged: true,
    });

    setDeletedFeedback(null);
    setAddedFeedback({
      message: `Added ${quantity} ${unit} of ${selectedFood.name} (${previewNutrients.calories} kcal) to ${selectedMeal}.`,
      recordId: createdId,
    });
  };

  const handleUndoAdd = () => {
    if (addedFeedback) {
      onDeleteIntakeRecord(addedFeedback.recordId);
      setAddedFeedback(null);
    }
  };

  const handleDeleteWithUndo = (rec: IntakeRecord) => {
    const { id: _unusedId, ...rest } = rec;
    onDeleteIntakeRecord(rec.id);
    setAddedFeedback(null);
    setDeletedFeedback({
      item: rest,
      message: `Removed ${rec.foodName} (${rec.computedNutrients.calories} kcal) from ${rec.meal}.`,
    });
  };

  const handleUndoDelete = () => {
    if (deletedFeedback) {
      onAddIntakeRecord(deletedFeedback.item);
      setDeletedFeedback(null);
    }
  };

  const startEditing = (rec: IntakeRecord) => {
    setEditingId(rec.id);
    setEditQty(rec.quantity);
    setEditUnit(rec.unit);
    setEditMeal(rec.meal);
  };

  const saveEdit = (id: string) => {
    if (editQty > 0) {
      onUpdateIntakeRecord(id, editQty, editUnit, editMeal);
    }
    setEditingId(null);
  };

  const calPct = Math.min(
    100,
    Math.round((dailyTotals.calories / Math.max(1, goals.dailyCalories)) * 100)
  );
  const proteinPct = Math.min(
    100,
    Math.round((dailyTotals.proteinG / Math.max(1, goals.proteinG)) * 100)
  );
  const carbsPct = Math.min(
    100,
    Math.round((dailyTotals.carbsG / Math.max(1, goals.carbsG)) * 100)
  );
  const fatPct = Math.min(
    100,
    Math.round((dailyTotals.fatG / Math.max(1, goals.fatG)) * 100)
  );

  const getMealIcon = (meal: MealType) => {
    switch (meal) {
      case MealType.Breakfast:
        return <Sunrise className="h-4 w-4 text-amber-500" />;
      case MealType.Lunch:
        return <Sun className="h-4 w-4 text-sky-500" />;
      case MealType.Snacks:
        return <Coffee className="h-4 w-4 text-emerald-500" />;
      case MealType.Dinner:
        return <Moon className="h-4 w-4 text-indigo-500" />;
    }
  };

  return (
    <div className="space-y-8 pb-20 lg:pb-12 animate-page-enter">
      {/* Compact Daily Summary Bar */}
      <section className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
                Log Meals & Track Nutrition
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                <Sparkles className="h-3 w-3 text-sky-500" />
                Live Tracker
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Search the verified catalogue, adjust portions with live macros, and log to your daily diary.
            </p>
          </div>

          <div className="flex items-baseline gap-1.5 self-start sm:self-auto bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/60">
            <span className="text-xs text-slate-500 font-medium">Daily Target:</span>
            <span className="font-mono text-base font-bold text-slate-900 tabular-nums">
              {dailyTotals.calories.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              / {goals.dailyCalories.toLocaleString()} kcal ({calPct}%)
            </span>
          </div>
        </div>

        {/* 4 Mini Progress Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-600">Calories</span>
              <span className="font-mono text-slate-900 font-bold">{calPct}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${calPct}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 font-mono">
              {dailyTotals.calories} / {goals.dailyCalories} kcal
            </p>
          </div>

          <div className="p-3 rounded-xl bg-sky-50/50 border border-sky-200/60 space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-sky-800">Protein</span>
              <span className="font-mono text-sky-900 font-bold">{proteinPct}%</span>
            </div>
            <div className="h-1.5 w-full bg-sky-200/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-600 rounded-full transition-all duration-500"
                style={{ width: `${proteinPct}%` }}
              />
            </div>
            <p className="text-[11px] text-sky-700 font-mono">
              {dailyTotals.proteinG}g / {goals.proteinG}g
            </p>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/60 space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-emerald-800">Carbs</span>
              <span className="font-mono text-emerald-900 font-bold">{carbsPct}%</span>
            </div>
            <div className="h-1.5 w-full bg-emerald-200/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                style={{ width: `${carbsPct}%` }}
              />
            </div>
            <p className="text-[11px] text-emerald-700 font-mono">
              {dailyTotals.carbsG}g / {goals.carbsG}g
            </p>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/60 space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-amber-800">Fat</span>
              <span className="font-mono text-amber-900 font-bold">{fatPct}%</span>
            </div>
            <div className="h-1.5 w-full bg-amber-200/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-600 rounded-full transition-all duration-500"
                style={{ width: `${fatPct}%` }}
              />
            </div>
            <p className="text-[11px] text-amber-700 font-mono">
              {dailyTotals.fatG}g / {goals.fatG}g
            </p>
          </div>
        </div>
      </section>

      {/* Confirmation Banner with Undo Action */}
      {addedFeedback && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-medium flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{addedFeedback.message}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleUndoAdd}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-100 rounded-lg transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Undo</span>
            </button>
            <button
              type="button"
              onClick={() => setAddedFeedback(null)}
              className="text-emerald-700 hover:text-emerald-950 p-1"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Deletion Banner with Undo Action */}
      {deletedFeedback && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm font-medium flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-amber-600 shrink-0" />
            <span>{deletedFeedback.message}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleUndoDelete}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-white text-amber-900 border border-amber-300 hover:bg-amber-100 rounded-lg transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Undo Delete</span>
            </button>
            <button
              type="button"
              onClick={() => setDeletedFeedback(null)}
              className="text-amber-700 hover:text-amber-950 p-1"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Split: Step 1 & 2 Food Search (7 cols) + Step 3–6 Portion & Meal Builder (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Step 1 & 2 — Search & Select Food */}
        <section
          aria-label="Search and Select Food"
          className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-6 space-y-5"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                1. Find a Food
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Sample reference catalogue ({filteredFoods.length} items shown)
              </p>
            </div>

            {/* Subtle State Tester for Demo Review */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setCatalogState('normal')}
                className={`px-2 py-1 rounded font-medium transition-colors ${
                  catalogState === 'normal'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => setCatalogState('loading')}
                className={`px-2 py-1 rounded font-medium transition-colors ${
                  catalogState === 'loading'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Loading
              </button>
              <button
                type="button"
                onClick={() => setCatalogState('error')}
                className={`px-2 py-1 rounded font-medium transition-colors ${
                  catalogState === 'error'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Error
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search food by name (e.g., salmon, chicken, oats, yogurt)..."
              className="w-full pl-10 pr-9 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {FOOD_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors whitespace-nowrap shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Results List */}
          <div>
            {catalogState === 'loading' ? (
              <div className="py-12 text-center space-y-3 animate-fade-in">
                <Loader2 className="h-6 w-6 text-sky-600 animate-spin mx-auto" />
                <p className="text-sm font-medium text-slate-700">
                  Searching food catalogue...
                </p>
              </div>
            ) : catalogState === 'error' ? (
              <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-center space-y-3 animate-fade-in">
                <AlertCircle className="h-6 w-6 text-red-600 mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-red-950">
                    Unable to load food search results
                  </p>
                  <p className="text-xs text-red-800 max-w-sm mx-auto">
                    Simulated API connection error. Click below to restore the sample food catalogue.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCatalogState('normal')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors"
                >
                  Retry Search
                </button>
              </div>
            ) : filteredFoods.length === 0 ? (
              <div className="py-10 px-4 text-center rounded-xl border border-dashed border-slate-200 space-y-3">
                <Utensils className="h-6 w-6 text-slate-400 mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">
                    No matching foods found
                  </p>
                  <p className="text-xs text-slate-500">
                    Try another search term or clear the category filter.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-xl transition-colors"
                >
                  Show All Foods
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredFoods.map((food) => {
                  const isSelected = selectedFood.id === food.id;
                  return (
                    <button
                      key={food.id}
                      type="button"
                      onClick={() => handleSelectFood(food)}
                      className={`w-full py-3.5 px-3.5 text-left flex items-center justify-between gap-4 rounded-xl transition-all ${
                        isSelected
                          ? 'bg-sky-50/80 border border-sky-200'
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {food.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {food.category} · Per {food.referenceLabel}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono text-sm font-bold text-slate-900 block">
                          {food.nutrients.calories} kcal
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          P {food.nutrients.proteinG}g · C{' '}
                          {food.nutrients.carbsG}g · F {food.nutrients.fatG}g
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT: Steps 3–6 — Quantity, Meal Selection, Prominent Macros & Expandable Details */}
        <section
          aria-label="Configure Portion and Add Food"
          className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-6 space-y-5"
        >
          <div className="pb-4 border-b border-slate-100">
            <span className="text-xs font-semibold text-sky-600">
              2. Customize Portion & Meal
            </span>
            <h2 className="mt-1 font-display text-lg font-bold text-slate-900">
              {selectedFood.name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Reference serving: {selectedFood.referenceLabel} (
              {selectedFood.brandOrSource})
            </p>
          </div>

          <form onSubmit={handleConfirmAddFood} className="space-y-5">
            {/* Step 3: Quantity & Unit + Quick Shortcuts */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="portion-qty"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Quantity
                  </label>
                  <input
                    id="portion-qty"
                    type="number"
                    min="0.1"
                    step="any"
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label
                    htmlFor="portion-unit"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Unit
                  </label>
                  <select
                    id="portion-unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as ServingUnit)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
                  >
                    {SERVING_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick Quantity Shortcuts */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-slate-500 mr-1">Shortcuts:</span>
                {[
                  { label: '50g', q: 50, u: 'g' as ServingUnit },
                  { label: '100g', q: 100, u: 'g' as ServingUnit },
                  { label: '150g', q: 150, u: 'g' as ServingUnit },
                  { label: '200g', q: 200, u: 'g' as ServingUnit },
                  { label: '1 Serving', q: 1, u: 'serving' as ServingUnit },
                ].map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => {
                      setQuantity(s.q);
                      setUnit(s.u);
                    }}
                    className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-lg transition-all"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 4: Select Meal */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Select Meal
              </label>
              <div className="grid grid-cols-4 gap-2">
                {Object.values(MealType).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMeal(m)}
                    className={`py-2 px-2 text-xs font-semibold rounded-xl border transition-all ${
                      selectedMeal === m
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 5: Prominent Calories & Primary Macros */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">
                  Calculated Nutrition ({quantity} {unit})
                </span>
                <span className="font-mono text-xl font-bold text-slate-900 tabular-nums">
                  {previewNutrients.calories} kcal
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/70 text-center">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/60">
                  <span className="text-[11px] text-slate-500 block">
                    Protein
                  </span>
                  <strong className="font-mono text-sm font-bold text-sky-700 tabular-nums">
                    {previewNutrients.proteinG}g
                  </strong>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/60">
                  <span className="text-[11px] text-slate-500 block">
                    Carbs
                  </span>
                  <strong className="font-mono text-sm font-bold text-emerald-700 tabular-nums">
                    {previewNutrients.carbsG}g
                  </strong>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/60">
                  <span className="text-[11px] text-slate-500 block">Fat</span>
                  <strong className="font-mono text-sm font-bold text-amber-700 tabular-nums">
                    {previewNutrients.fatG}g
                  </strong>
                </div>
              </div>

              {/* Progressive Disclosure: Expandable Nutrition Details */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowExtendedDetails(!showExtendedDetails)}
                  className="w-full flex items-center justify-between text-xs font-medium text-slate-600 hover:text-slate-900 py-1"
                >
                  <span>
                    {showExtendedDetails
                      ? 'Hide fibre, sodium & data source details'
                      : 'Show fibre, sugar, sodium & data source details'}
                  </span>
                  {showExtendedDetails ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {showExtendedDetails && (
                  <div className="mt-2 pt-2.5 border-t border-slate-200/70 space-y-2 text-xs text-slate-600 animate-fade-in">
                    <div className="flex justify-between">
                      <span>Dietary Fibre</span>
                      <span className="font-mono">
                        {previewNutrients.fiberG != null
                          ? `${previewNutrients.fiberG} g`
                          : 'Not reported'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sugars</span>
                      <span className="font-mono">
                        {previewNutrients.sugarG != null
                          ? `${previewNutrients.sugarG} g`
                          : 'Not reported'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sodium</span>
                      <span className="font-mono">
                        {previewNutrients.sodiumMg != null
                          ? `${previewNutrients.sodiumMg} mg`
                          : 'Not reported'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Potassium</span>
                      <span className="font-mono">
                        {previewNutrients.potassiumMg != null
                          ? `${previewNutrients.potassiumMg} mg`
                          : 'Not reported'}
                      </span>
                    </div>
                    <div className="pt-2 flex items-start gap-2 text-[11px] text-slate-500">
                      <Info className="h-3.5 w-3.5 text-sky-600 shrink-0 mt-0.5" />
                      <span>
                        {selectedFood.dataNote ||
                          `Sample reference entry (${selectedFood.brandOrSource}).`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Step 6: Confirm & Add Food */}
            <button
              type="submit"
              disabled={quantity <= 0}
              className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-700 active:scale-[0.99] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Add to {selectedMeal}</span>
            </button>
          </form>
        </section>
      </div>

      {/* Daily Intake List with Edit & Delete */}
      <section
        aria-label="Daily Logged Foods"
        className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Today’s Logged Foods ({intakeRecords.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Categorized by meal · Update portions or remove items at any time
            </p>
          </div>
          <span className="font-mono text-xs text-slate-600">
            Total: <strong>{dailyTotals.calories.toLocaleString()} kcal</strong> ·{' '}
            <span className="text-sky-700 font-semibold">{dailyTotals.proteinG}g Protein</span>
          </span>
        </div>

        {intakeRecords.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            No foods logged yet today. Select a food above to add your first item.
          </div>
        ) : (
          <div className="space-y-6">
            {Object.values(MealType).map((mealType) => {
              const mealRecords = intakeRecords.filter((r) => r.meal === mealType);
              const mealCalories = mealRecords.reduce(
                (sum, item) => sum + item.computedNutrients.calories,
                0
              );
              const mealProtein = Math.round(
                mealRecords.reduce(
                  (sum, item) => sum + item.computedNutrients.proteinG,
                  0
                ) * 10
              ) / 10;

              return (
                <div
                  key={mealType}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 transition-all hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                        {getMealIcon(mealType)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 leading-none">
                          {mealType}
                        </h3>
                        <p className="text-[11px] text-slate-500 font-mono mt-1">
                          {mealCalories} kcal
                          {mealProtein > 0 && ` · ${mealProtein}g protein`}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMeal(mealType);
                        window.scrollTo({ top: 120, behavior: 'smooth' });
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200/80 rounded-lg transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add item</span>
                    </button>
                  </div>

                  {mealRecords.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 italic text-center">
                      No foods logged for {mealType.toLowerCase()} today.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-200/60 pt-1">
                      {mealRecords.map((rec) => {
                        const isEditing = editingId === rec.id;
                        return (
                          <div
                            key={rec.id}
                            className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900">
                                {rec.foodName}
                              </p>
                              {!isEditing && (
                                <p className="text-xs text-slate-500 font-mono mt-0.5">
                                  {rec.quantity} {rec.unit} · P{' '}
                                  {rec.computedNutrients.proteinG}g · C{' '}
                                  {rec.computedNutrients.carbsG}g · F{' '}
                                  {rec.computedNutrients.fatG}g ·{' '}
                                  <span className="font-sans text-[11px] font-medium text-slate-400">
                                    {rec.isUserLogged ? 'Logged' : 'Sample'}
                                  </span>
                                </p>
                              )}
                            </div>

                            {isEditing ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  type="number"
                                  min="0.1"
                                  step="any"
                                  value={editQty}
                                  onChange={(e) =>
                                    setEditQty(parseFloat(e.target.value) || 0)
                                  }
                                  className="w-20 px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                                />
                                <select
                                  value={editUnit}
                                  onChange={(e) =>
                                    setEditUnit(e.target.value as ServingUnit)
                                  }
                                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                                >
                                  <option value="g">g</option>
                                  <option value="serving">serving</option>
                                  <option value="oz">oz</option>
                                  <option value="cup">cup</option>
                                  <option value="ml">ml</option>
                                </select>
                                <select
                                  value={editMeal}
                                  onChange={(e) =>
                                    setEditMeal(e.target.value as MealType)
                                  }
                                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                                >
                                  {Object.values(MealType).map((m) => (
                                    <option key={m} value={m}>
                                      {m}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => saveEdit(rec.id)}
                                  className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between sm:justify-end gap-4">
                                <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                                  {rec.computedNutrients.calories} kcal
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => startEditing(rec)}
                                    className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    aria-label={`Edit ${rec.foodName}`}
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteWithUndo(rec)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    aria-label={`Delete ${rec.foodName}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
