import React from 'react';

export interface ProgressBarProps {
  value: number; // 0 to 100
  color?: string; // Tailwind color class e.g. 'bg-sky-500'
  height?: 'xs' | 'sm' | 'md';
  className?: string;
  showLabel?: boolean;
  label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  color = 'bg-sky-600',
  height = 'sm',
  className = '',
  showLabel = false,
  label,
}) => {
  const clamped = Math.min(100, Math.max(0, value));

  const heightClasses = {
    xs: 'h-1.5',
    sm: 'h-2',
    md: 'h-3',
  }[height];

  return (
    <div className={`space-y-1 w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between text-xs font-semibold text-slate-600">
          {label && <span>{label}</span>}
          <span className="font-mono tabular-nums">{Math.round(clamped)}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progress percentage'}
        className={`w-full bg-slate-100 rounded-full overflow-hidden ${heightClasses}`}
      >
        <div
          className={`${heightClasses} rounded-full transition-all duration-300 ease-out ${color}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
