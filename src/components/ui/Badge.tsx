import React from 'react';
import { OnboardingPathway } from '../../types/ascend';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'slate'
    | 'emerald'
    | 'sky'
    | 'amber'
    | 'rose'
    | 'purple'
    | 'pathway';
  size?: 'sm' | 'md';
  pathway?: OnboardingPathway;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'slate',
  size = 'md',
  pathway,
  icon,
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-0.5 text-xs gap-1.5',
  }[size];

  const getPathwayClasses = () => {
    switch (pathway) {
      case OnboardingPathway.AthletePerformance:
        return 'bg-sky-50 text-sky-800 border-sky-200/80';
      case OnboardingPathway.MuscleGain:
        return 'bg-amber-50 text-amber-800 border-amber-200/80';
      case OnboardingPathway.GeneralFitness:
      default:
        return 'bg-emerald-50 text-emerald-800 border-emerald-200/80';
    }
  };

  const variantClasses = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200/80',
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    sky: 'bg-sky-50 text-sky-800 border-sky-200/80',
    amber: 'bg-amber-50 text-amber-800 border-amber-200/80',
    rose: 'bg-rose-50 text-rose-800 border-rose-200/80',
    purple: 'bg-purple-50 text-purple-800 border-purple-200/80',
    pathway: getPathwayClasses(),
  }[variant];

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border transition-colors select-none ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
