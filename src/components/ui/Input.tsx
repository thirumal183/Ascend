import React from 'react';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  suffix?: string;
  prefixIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      suffix,
      prefixIcon,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-slate-700 select-none"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefixIcon && (
            <div className="absolute left-3.5 text-slate-400 pointer-events-none shrink-0">
              {prefixIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full py-2.5 text-xs sm:text-sm font-sans bg-slate-50 border rounded-xl text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:bg-white focus-visible:ring-2 focus-visible:ring-offset-1 ${
              prefixIcon ? 'pl-10' : 'pl-3.5'
            } ${suffix ? 'pr-12' : 'pr-3.5'} ${
              error
                ? 'border-rose-400 focus:border-rose-600 focus-visible:ring-rose-500'
                : 'border-slate-200/90 focus:border-sky-500 focus-visible:ring-sky-500'
            } ${className}`}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3.5 text-xs font-semibold text-slate-600 font-mono pointer-events-none">
              {suffix}
            </span>
          )}
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

Input.displayName = 'Input';
