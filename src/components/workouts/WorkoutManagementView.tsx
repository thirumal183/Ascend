import React, { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  Dumbbell,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  ExerciseItem,
  OnboardingPathway,
  WorkoutPlan,
} from '../../types/ascend';

interface WorkoutManagementViewProps {
  workoutPlans: WorkoutPlan[];
  userPathway: OnboardingPathway;
  onToggleExercise: (workoutId: string, exerciseId: string) => void;
  onAddExercise: (
    workoutId: string,
    exercise: Omit<ExerciseItem, 'id'>
  ) => void;
}

export const WorkoutManagementView: React.FC<WorkoutManagementViewProps> = ({
  workoutPlans,
  userPathway,
  onToggleExercise,
  onAddExercise,
}) => {
  const matchingDefault =
    workoutPlans.find((p) => p.recommendedPathway === userPathway) ||
    workoutPlans[0];

  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    matchingDefault.id
  );
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(
    null
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [addSuccessNotice, setAddSuccessNotice] = useState<string | null>(null);

  // Interactive Rest Timer
  const [restTimerSeconds, setRestTimerSeconds] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);

  // Add exercise form state
  const [exName, setExName] = useState('');
  const [exMuscle, setExMuscle] = useState('Upper Body & Core');
  const [exSets, setExSets] = useState(3);
  const [exReps, setExReps] = useState('10 reps');
  const [exLoadKg, setExLoadKg] = useState(20);
  const [exRest, setExRest] = useState(90);

  useEffect(() => {
    const matched = workoutPlans.find(
      (p) => p.recommendedPathway === userPathway
    );
    if (matched) {
      setSelectedPlanId(matched.id);
    }
  }, [userPathway, workoutPlans]);

  // Countdown effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (timerRunning && restTimerSeconds !== null && restTimerSeconds > 0) {
      interval = setInterval(() => {
        setRestTimerSeconds((prev) => {
          if (prev === null || prev <= 1) {
            setTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, restTimerSeconds]);

  const activePlan =
    workoutPlans.find((p) => p.id === selectedPlanId) || workoutPlans[0];

  const completedCount = activePlan.exercises.filter((e) => e.completed).length;
  const totalCount = activePlan.exercises.length;
  const progressPct = Math.round(
    (completedCount / Math.max(1, totalCount)) * 100
  );

  const nextIncompleteExercise = activePlan.exercises.find((e) => !e.completed);

  const handlePrimarySessionAction = () => {
    if (nextIncompleteExercise) {
      setExpandedExerciseId(nextIncompleteExercise.id);
    }
  };

  const handleToggleWithTimer = (exercise: ExerciseItem) => {
    onToggleExercise(activePlan.id, exercise.id);
    // If completing an exercise that had not been completed, start its recommended rest timer
    if (!exercise.completed && exercise.restSeconds > 0) {
      setRestTimerSeconds(exercise.restSeconds);
      setTimerRunning(true);
    }
  };

  const handleAddExerciseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exName.trim()) return;

    onAddExercise(activePlan.id, {
      name: exName.trim(),
      muscleGroup: exMuscle.trim() || 'General Strength',
      sets: Math.max(1, exSets),
      reps: exReps.trim() || '10 reps',
      loadKg: Math.max(0, exLoadKg),
      restSeconds: Math.max(15, exRest),
      completed: false,
      notes: 'Custom exercise added to your session.',
    });

    setAddSuccessNotice(`Added ${exName.trim()} to ${activePlan.title}`);
    setTimeout(() => setAddSuccessNotice(null), 4000);
    setExName('');
    setShowAddForm(false);
  };

  return (
    <div className="animate-page-enter space-y-6 pb-20 lg:pb-12">
      {/* Top Header & Plan Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Training & Workouts
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Recommended for your <strong className="text-slate-800">{userPathway}</strong> pathway
          </p>
        </div>

        {/* Plan Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200/80 rounded-xl overflow-x-auto">
          {workoutPlans.map((plan) => {
            const isPathwayMatch = plan.recommendedPathway === userPathway;
            const isActive = activePlan.id === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlanId(plan.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span>{plan.dayLabel.replace(' Session', '')}</span>
                {isPathwayMatch && (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isActive ? 'bg-sky-400' : 'bg-sky-600'
                    }`}
                    title="Pathway-aligned session"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {addSuccessNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center gap-2 animate-fade-in">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{addSuccessNotice}</span>
        </div>
      )}

      {/* Interactive Rest Timer Banner (when active) */}
      {restTimerSeconds !== null && (
        <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">
                {restTimerSeconds === 0 ? 'Rest Complete!' : 'Inter-Set Rest Timer'}
              </div>
              <div className="font-mono text-xl font-bold tracking-tight text-white tabular-nums">
                {Math.floor(restTimerSeconds / 60)}:
                {String(restTimerSeconds % 60).padStart(2, '0')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTimerRunning(!timerRunning)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
            >
              {timerRunning ? (
                <>
                  <Pause className="h-3 w-3" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="h-3 w-3" />
                  <span>Resume</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setRestTimerSeconds((prev) => (prev ?? 0) + 30)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
            >
              +30s
            </button>
            <button
              type="button"
              onClick={() => {
                setTimerRunning(false);
                setRestTimerSeconds(null);
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Session Card */}
      <section className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <span className="text-xs font-semibold text-sky-600">
              {activePlan.dayLabel} · ~{activePlan.estimatedMinutes} mins · {activePlan.intensityLabel} Intensity
            </span>
            <h2 className="mt-1 font-display text-xl font-bold text-slate-900">
              {activePlan.title}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Target focus: {activePlan.focusArea} · Burn estimate ~{activePlan.targetCaloriesBurned} kcal
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {nextIncompleteExercise ? (
              <button
                type="button"
                onClick={handlePrimarySessionAction}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:scale-[0.99] rounded-xl transition-all shadow-2xs"
              >
                <Play className="h-3.5 w-3.5" />
                <span>
                  {completedCount === 0 ? 'Start Workout' : 'Continue Workout'}
                </span>
              </button>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Workout Complete</span>
              </div>
            )}
          </div>
        </div>

        {/* Completion Celebration Card */}
        {completedCount === totalCount && totalCount > 0 && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-900">
                  Great job! You completed all {totalCount} exercises.
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Your workout adherence has been updated in your dashboard and progress analytics.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                // Untoggle all exercises to allow re-running
                activePlan.exercises.forEach((ex) => {
                  if (ex.completed) {
                    onToggleExercise(activePlan.id, ex.id);
                  }
                });
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-white border border-emerald-300 hover:bg-emerald-100 rounded-lg transition-colors shrink-0"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Checklist</span>
            </button>
          </div>
        )}

        {/* Session Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-600">
            <span>
              {completedCount} of {totalCount} exercises completed
            </span>
            <span className="font-mono font-bold text-slate-900">
              {progressPct}%
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-emerald-600 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Exercise List with Progressive Disclosure Details */}
        <div className="space-y-3">
          {activePlan.exercises.map((ex, index) => {
            const isExpanded = expandedExerciseId === ex.id;
            return (
              <div
                key={ex.id}
                className={`p-4 rounded-xl border transition-all ${
                  ex.completed
                    ? 'bg-slate-50/60 border-slate-200/60 opacity-80'
                    : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs hover:shadow-xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <button
                      type="button"
                      onClick={() => handleToggleWithTimer(ex)}
                      className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors focus:outline-none"
                      aria-label={`Mark ${ex.name} as ${
                        ex.completed ? 'incomplete' : 'complete'
                      }`}
                    >
                      {ex.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 animate-fade-in" />
                      ) : (
                        <Circle className="h-5 w-5 text-slate-300 hover:text-slate-400" />
                      )}
                    </button>

                    <div>
                      <h3
                        className={`text-sm font-bold ${
                          ex.completed
                            ? 'text-slate-400 line-through'
                            : 'text-slate-900'
                        }`}
                      >
                        {index + 1}. {ex.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200/60">
                          {ex.sets} sets × {ex.reps}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-sky-50 text-sky-800 border border-sky-200/60">
                          {ex.loadKg > 0 ? `${ex.loadKg} kg` : 'Bodyweight'}
                        </span>
                        {ex.restSeconds > 0 && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200/60">
                            {ex.restSeconds}s rest
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 ml-1">
                          {ex.muscleGroup}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-8 sm:pl-0">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedExerciseId(isExpanded ? null : ex.id)
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <span>Details</span>
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleWithTimer(ex)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        ex.completed
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      {ex.completed ? 'Done' : 'Mark Done'}
                    </button>
                  </div>
                </div>

                {/* Expandable Exercise Details Panel */}
                {isExpanded && (
                  <div className="mt-3 ml-8 p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-600 space-y-2 animate-fade-in">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-x-6 gap-y-1">
                        <span>
                          Target area: <strong className="text-slate-900">{ex.muscleGroup}</strong>
                        </span>
                        <span>
                          Suggested rest: <strong className="font-mono text-slate-900">{ex.restSeconds}s</strong> between sets
                        </span>
                      </div>
                      {ex.restSeconds > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setRestTimerSeconds(ex.restSeconds);
                            setTimerRunning(true);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:text-sky-700"
                        >
                          <Clock className="h-3 w-3" />
                          <span>Start {ex.restSeconds}s Rest Timer</span>
                        </button>
                      )}
                    </div>
                    {ex.notes && (
                      <p className="text-slate-600 leading-relaxed pt-1">
                        Coaching cue: {ex.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Expandable Add Custom Exercise */}
        <div className="pt-4 border-t border-slate-100">
          {!showAddForm ? (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700"
            >
              <Plus className="h-4 w-4" />
              <span>Add custom exercise to this session</span>
            </button>
          ) : (
            <form
              onSubmit={handleAddExerciseSubmit}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-4 animate-fade-in"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Add Custom Exercise to {activePlan.title}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Exercise Name
                  </label>
                  <input
                    type="text"
                    required
                    value={exName}
                    onChange={(e) => setExName(e.target.value)}
                    placeholder="e.g., Dumbbell Bulgarian Split Squat"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Muscle Group
                  </label>
                  <input
                    type="text"
                    value={exMuscle}
                    onChange={(e) => setExMuscle(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Sets
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={exSets}
                    onChange={(e) => setExSets(parseInt(e.target.value, 10) || 3)}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Reps
                  </label>
                  <input
                    type="text"
                    value={exReps}
                    onChange={(e) => setExReps(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Load (kg, optional)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    value={exLoadKg}
                    onChange={(e) => setExLoadKg(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Rest (seconds)
                  </label>
                  <input
                    type="number"
                    step={15}
                    min={15}
                    max={300}
                    value={exRest}
                    onChange={(e) => setExRest(parseInt(e.target.value, 10) || 60)}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                <Dumbbell className="h-3.5 w-3.5" />
                <span>Save Exercise</span>
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
};
