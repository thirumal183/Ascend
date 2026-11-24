import React from 'react';
import { OnboardingPathway } from '../../types/ascend';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive' | 'dark' | 'pathway' | 'subtle';
  pathway?: OnboardingPathway;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = 'default',
      pathway,
      padding = 'md',
      className = '',
      ...props
    },
    ref
  ) => {
    const paddingClasses = {
      none: '',
      sm: 'p-3.5 sm:p-4',
      md: 'p-5 sm:p-6',
      lg: 'p-6 sm:p-8',
    }[padding];

    const getPathwayBorder = () => {
      switch (pathway) {
        case OnboardingPathway.AthletePerformance:
          return 'border-sky-200/80 bg-gradient-to-b from-sky-50/40 via-white to-white';
        case OnboardingPathway.MuscleGain:
          return 'border-amber-200/80 bg-gradient-to-b from-amber-50/40 via-white to-white';
        case OnboardingPathway.GeneralFitness:
        default:
          return 'border-emerald-200/80 bg-gradient-to-b from-emerald-50/40 via-white to-white';
      }
    };

    const variantClasses = {
      default:
        'bg-white border border-slate-200/70 rounded-2xl shadow-[0_2px_10px_-2px_rgba(15,23,42,0.03)] text-slate-900 transition-all duration-200',
      elevated:
        'bg-gradient-to-b from-white via-white to-slate-50/40 border border-slate-200/70 rounded-3xl shadow-[0_8px_30px_-6px_rgba(15,23,42,0.05)] text-slate-900',
      interactive:
        'bg-white border border-slate-200/70 rounded-2xl shadow-[0_2px_10px_-2px_rgba(15,23,42,0.03)] hover:border-slate-300 hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer text-slate-900',
      dark:
        'bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl text-white shadow-[0_12px_36px_-8px_rgba(0,0,0,0.35)]',
      pathway: `border rounded-3xl shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] ${getPathwayBorder()} text-slate-900`,
      subtle:
        'bg-slate-100/60 border border-slate-200/50 rounded-2xl text-slate-900',
    }[variant];

    return (
      <div
        ref={ref}
        className={`${variantClasses} ${paddingClasses} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
