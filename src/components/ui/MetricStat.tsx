import React from 'react';
import { LucideIcon } from 'lucide-react';
import { OnboardingPathway } from '../../types/ascend';

export interface MetricStatProps {
  label: string;
  value: string | number;
  unit?: string;
  subValue?: string;
  icon?: LucideIcon;
  pathway?: OnboardingPathway;
  trend?: {
    value: string;
    isPositive: boolean;
    neutral?: boolean;
  };
  className?: string;
}

export const MetricStat: React.FC<MetricStatProps> = ({
  label,
  value,
  unit,
  subValue,
  icon: Icon,
  pathway,
  trend,
  className = '',
}) => {
  const getIconColor = () => {
    switch (pathway) {
      case OnboardingPathway.AthletePerformance:
        return 'text-sky-600 bg-sky-50 border-sky-100';
      case OnboardingPathway.MuscleGain:
        return 'text-amber-600 bg-amber-50 border-amber-100';
      case OnboardingPathway.GeneralFitness:
      default:
        return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    }
  };

  return (
    <div
      className={`p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          {label}
        </span>
        {Icon && (
          <div className={`p-1.5 rounded-lg border shrink-0 ${getIconColor()}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-2xl font-bold text-slate-900 tracking-tight tabular-nums">
          {value}
        </span>
        {unit && (
          <span className="text-xs font-semibold text-slate-500 font-sans">
            {unit}
          </span>
        )}
      </div>

      {(subValue || trend) && (
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
          {subValue && (
            <span className="text-slate-500 truncate">{subValue}</span>
          )}
          {trend && (
            <span
              className={`font-semibold font-mono text-[11px] px-1.5 py-0.5 rounded-md ${
                trend.neutral
                  ? 'bg-slate-100 text-slate-600'
                  : trend.isPositive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-700'
              }`}
            >
              {trend.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
