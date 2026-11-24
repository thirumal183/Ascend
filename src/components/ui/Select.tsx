import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, className = '', id, children, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-slate-700 select-none"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={`w-full appearance-none pl-3.5 pr-10 py-2.5 text-xs sm:text-sm font-sans bg-slate-50 border rounded-xl text-slate-900 transition-colors focus:outline-none focus:bg-white focus-visible:ring-2 focus-visible:ring-offset-1 cursor-pointer ${
              error
                ? 'border-rose-400 focus:border-rose-600 focus-visible:ring-rose-500'
                : 'border-slate-200/90 focus:border-sky-500 focus-visible:ring-sky-500'
            } ${className}`}
            {...props}
          >
            {children}
          </select>
          <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
        {error && (
          <p className="text-xs font-medium text-rose-600 animate-fade-in">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p className="text-[11px] text-slate-500 leading-normal">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
