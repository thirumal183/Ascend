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
          return 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-blue-900/15';
        case OnboardingPathway.MuscleGain:
          return 'bg-[#EA580C] hover:bg-[#C2410C] text-white shadow-orange-900/15';
        case OnboardingPathway.GeneralFitness:
        default:
          return 'bg-[#15803D] hover:bg-[#166534] text-white shadow-emerald-950/15';
      }
    };

    // Variant tokens
    const variantClasses = {
      primary:
        'bg-[#0A1628] hover:bg-[#142744] text-white shadow-xs active:scale-[0.98]',
      secondary:
        'bg-slate-100 hover:bg-slate-200/80 text-slate-900 active:scale-[0.98]',
      outline:
        'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 hover:border-slate-300 shadow-2xs active:scale-[0.98]',
      ghost:
        'bg-transparent hover:bg-slate-100 text-slate-700 hover:text-slate-950',
      destructive:
        'bg-rose-600 hover:bg-rose-700 text-white shadow-xs active:scale-[0.98]',
      pathway: `${getPathwayClasses()} shadow-xs active:scale-[0.98]`,
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center font-sans transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 ${sizeClasses} ${variantClasses} ${className}`}
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
