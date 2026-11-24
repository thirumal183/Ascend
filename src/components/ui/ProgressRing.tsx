import React from 'react';
import { OnboardingPathway } from '../../types/ascend';

export interface ProgressRingProps {
  value: number; // 0 to 100
  size?: number; // diameter in px, default 120
  strokeWidth?: number; // stroke width, default 10
  pathway?: OnboardingPathway;
  centerLabel?: string;
  centerValue?: string | number;
  centerSubtext?: string;
  className?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  size = 120,
  strokeWidth = 10,
  pathway,
  centerLabel,
  centerValue,
  centerSubtext,
  className = '',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  const getGradientId = () => {
    switch (pathway) {
      case OnboardingPathway.AthletePerformance:
        return 'ring-gradient-sky';
      case OnboardingPathway.MuscleGain:
        return 'ring-gradient-amber';
      case OnboardingPathway.GeneralFitness:
      default:
        return 'ring-gradient-emerald';
    }
  };

  const getGradientStops = () => {
    switch (pathway) {
      case OnboardingPathway.AthletePerformance:
        return { start: '#0284C7', end: '#38BDF8' };
      case OnboardingPathway.MuscleGain:
        return { start: '#D97706', end: '#FBBF24' };
      case OnboardingPathway.GeneralFitness:
      default:
        return { start: '#059669', end: '#34D399' };
    }
  };

  const grad = getGradientStops();
  const gradId = getGradientId();

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={grad.start} />
            <stop offset="100%" stopColor={grad.end} />
          </linearGradient>
        </defs>

        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-500 ease-out"
        />
      </svg>

      {/* Center text content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
        {centerLabel && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {centerLabel}
          </span>
        )}
        {centerValue !== undefined && (
          <span className="font-mono text-lg font-bold text-slate-900 leading-tight tabular-nums">
            {centerValue}
          </span>
        )}
        {centerSubtext && (
          <span className="text-[10px] text-slate-400 font-medium">
            {centerSubtext}
          </span>
        )}
      </div>
    </div>
  );
};
