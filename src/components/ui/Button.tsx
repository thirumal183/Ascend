import React from 'react';
import { Loader2 } from 'lucide-react';
import { OnboardingPathway } from '../../types/ascend';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'outline'
    | 'ghost'
    | 'destructive'
    | 'pathway';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  pathway?: OnboardingPathway;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      pathway,
      isLoading = false,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    // Size tokens
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-xs font-semibold rounded-lg gap-1.5',
      md: 'px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl gap-2',
      lg: 'px-5 py-2.5 text-sm sm:text-base font-bold rounded-xl gap-2.5',
      icon: 'p-2 rounded-xl shrink-0',
    }[size];

    // Pathway-specific button colors
    const getPathwayClasses = () => {
      switch (pathway) {
        case OnboardingPathway.AthletePerformance:
          return 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/20';
        case OnboardingPathway.MuscleGain:
          return 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20';
        case OnboardingPathway.GeneralFitness:
        default:
          return 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20';
      }
    };

    // Variant tokens
    const variantClasses = {
      primary:
        'bg-slate-900 hover:bg-slate-800 text-white shadow-xs active:scale-[0.98]',
      secondary:
        'bg-slate-100 hover:bg-slate-200/80 text-slate-800 active:scale-[0.98]',
      outline:
        'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 hover:border-slate-300 shadow-2xs active:scale-[0.98]',
      ghost:
        'bg-transparent hover:bg-slate-100/80 text-slate-600 hover:text-slate-900',
      destructive:
        'bg-rose-600 hover:bg-rose-700 text-white shadow-xs active:scale-[0.98]',
      pathway: `${getPathwayClasses()} shadow-xs active:scale-[0.98]`,
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center font-sans transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${sizeClasses} ${variantClasses} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        ) : (
          leftIcon
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
