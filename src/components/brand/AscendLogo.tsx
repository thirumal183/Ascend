import React from 'react';
import { OnboardingPathway } from '../../types/ascend';

export interface AscendLogoProps extends React.SVGProps<SVGSVGElement> {
  variant?: 'full' | 'symbol' | 'wordmark';
  colorScheme?: 'light' | 'dark' | 'pathway' | 'monochrome';
  pathway?: OnboardingPathway;
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * AscendLogo - Official brand logo based on finalized ASCEND geometry:
 * - Left stroke: 45° precision diagonal bar
 * - Right stroke: Upward sweeping kinetic trajectory curve
 * - Top anchor: Ascending triangular arrow centered above curve
 * - Typography: Geometric bold sans "A S C E N D" with tracked subtitle
 */
export const AscendLogo: React.FC<AscendLogoProps> = ({
  variant = 'full',
  colorScheme = 'light',
  pathway,
  showTagline = true,
  size = 'md',
  className = '',
  ...props
}) => {
  // Dimension scales
  const dimensions = {
    sm: { symbolSize: 28, fullWidth: 140, fullHeight: 32 },
    md: { symbolSize: 36, fullWidth: 170, fullHeight: 40 },
    lg: { symbolSize: 48, fullWidth: 210, fullHeight: 50 },
    xl: { symbolSize: 64, fullWidth: 280, fullHeight: 68 },
  }[size];

  // Dynamic pathway or theme color mapping
  const getAccentColor = () => {
    if (colorScheme === 'monochrome') return 'currentColor';
    if (colorScheme === 'pathway') {
      switch (pathway) {
        case OnboardingPathway.AthletePerformance:
          return '#2563EB'; // Vivid Electric Cobalt
        case OnboardingPathway.MuscleGain:
          return '#EA580C'; // Warm Energetic Orange
        case OnboardingPathway.GeneralFitness:
        default:
          return '#15803D'; // Refined Pathway Green
      }
    }
    return colorScheme === 'dark' ? '#2563EB' : '#60A5FA';
  };

  const getPrimaryColor = () => {
    if (colorScheme === 'monochrome') return 'currentColor';
    if (colorScheme === 'dark') return '#0A1628'; // Deep Navy for light cool-white surfaces
    return '#FFFFFF'; // Crisp White for dark navy surfaces
  };

  const primaryColor = getPrimaryColor();
  const accentColor = getAccentColor();

  // 1. SYMBOL ONLY
  if (variant === 'symbol') {
    return (
      <svg
        viewBox="0 0 100 100"
        width={dimensions.symbolSize}
        height={dimensions.symbolSize}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        aria-label="ASCEND Brand Mark"
        {...props}
      >
        {/* Left Diagonal 45-degree Bar */}
        <path
          d="M 14 82 L 30 82 L 72 40 L 56 40 Z"
          fill={primaryColor}
        />

        {/* Right Sweeping Kinetic Trajectory Curve */}
        <path
          d="M 42 82 L 64 82 C 74 76 80 58 80 40 L 72 40 C 72 54 56 68 42 82 Z"
          fill={accentColor}
        />

        {/* Top Ascending Arrowhead */}
        <polygon
          points="76,14 66,34 86,34"
          fill={accentColor}
        />
      </svg>
    );
  }

  // 2. WORDMARK ONLY
  if (variant === 'wordmark') {
    return (
      <div className={`flex flex-col leading-none ${className}`}>
        <span
          className="font-display font-black tracking-[0.25em] text-lg sm:text-xl uppercase"
          style={{ color: primaryColor }}
        >
          ASCEND
        </span>
        {showTagline && (
          <span
            className="text-[10px] font-bold tracking-tight mt-1 font-sans"
            style={{ color: accentColor }}
          >
            Getting Better Every Day.
          </span>
        )}
      </div>
    );
  }

  // 3. FULL LOGO: SYMBOL + WORDMARK (Horizontal or Stacked)
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <svg
        viewBox="0 0 100 100"
        width={dimensions.symbolSize}
        height={dimensions.symbolSize}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-hidden="true"
        {...props}
      >
        {/* Left Diagonal 45-degree Bar */}
        <path
          d="M 14 82 L 30 82 L 72 40 L 56 40 Z"
          fill={primaryColor}
        />

        {/* Right Sweeping Kinetic Trajectory Curve */}
        <path
          d="M 42 82 L 64 82 C 74 76 80 58 80 40 L 72 40 C 72 54 56 68 42 82 Z"
          fill={accentColor}
        />

        {/* Top Ascending Arrowhead */}
        <polygon
          points="76,14 66,34 86,34"
          fill={accentColor}
        />
      </svg>

      <div className="flex flex-col leading-none">
        <span
          className="font-display font-black tracking-[0.24em] text-lg sm:text-xl uppercase transition-colors"
          style={{ color: primaryColor }}
        >
          ASCEND
        </span>
        {showTagline && (
          <span
            className="text-[10px] font-bold tracking-tight mt-1 font-sans"
            style={{ color: accentColor }}
          >
            Getting Better Every Day.
          </span>
        )}
      </div>
    </div>
  );
};
