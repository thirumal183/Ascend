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
          return 'border-blue-200/90 bg-gradient-to-b from-blue-50/45 via-white to-white';
        case OnboardingPathway.MuscleGain:
          return 'border-orange-200/90 bg-gradient-to-b from-orange-50/45 via-white to-white';
        case OnboardingPathway.GeneralFitness:
        default:
          return 'border-emerald-200/90 bg-gradient-to-b from-emerald-50/45 via-white to-white';
      }
    };

    const variantClasses = {
      default:
        'bg-white border border-slate-200/90 rounded-2xl shadow-[0_2px_10px_-2px_rgba(10,22,40,0.04)] text-slate-900 transition-all duration-200',
      elevated:
        'bg-gradient-to-b from-white via-white to-slate-50/60 border border-slate-200/90 rounded-2xl shadow-[0_10px_30px_-8px_rgba(10,22,40,0.07)] text-slate-900',
      interactive:
        'bg-white border border-slate-200/90 rounded-2xl shadow-[0_2px_10px_-2px_rgba(10,22,40,0.04)] hover:border-blue-300/80 hover:shadow-[0_12px_28px_-6px_rgba(37,99,235,0.12)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer text-slate-900',
      dark:
        'bg-[#0A1628] border border-slate-800 rounded-2xl text-white shadow-[0_14px_38px_-10px_rgba(10,22,40,0.4)]',
      pathway: `border rounded-2xl shadow-[0_6px_22px_-6px_rgba(10,22,40,0.05)] ${getPathwayBorder()} text-slate-900`,
      subtle:
        'bg-slate-100/85 border border-slate-200/80 rounded-2xl text-slate-900',
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
