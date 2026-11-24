import React, { useEffect, useState } from 'react';
import { AscendLogo } from './AscendLogo';

interface StartupIntroProps {
  onComplete: () => void;
}

export const StartupIntro: React.FC<StartupIntroProps> = ({
  onComplete,
}) => {
  const [stage, setStage] = useState<1 | 2 | 3 | 4>(1);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    // Check prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      onComplete();
      return;
    }

    // Sequence timing
    // Stage 1: Symbol ascends (0ms - 750ms)
    // Stage 2: Wordmark & Tagline reveal (750ms - 1500ms)
    const t2 = setTimeout(() => {
      setStage(2);
    }, 750);

    // Stage 3: Ambient luminescence pulse (1500ms - 2300ms)
    const t3 = setTimeout(() => {
      setStage(3);
    }, 1500);

    // Stage 4: Fade out overlay (2300ms - 2850ms)
    const t4 = setTimeout(() => {
      setStage(4);
      setFadingOut(true);
    }, 2350);

    // Complete & dismiss
    const tEnd = setTimeout(() => {
      onComplete();
    }, 2850);

    // Keyboard escape listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        onComplete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(tEnd);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onComplete]);

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ASCEND Startup Intro"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#050811] text-white transition-opacity duration-500 ease-out select-none ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Ambient Luminescence Glow Mesh */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ease-out ${
          stage >= 3 ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-radial from-teal-500/20 via-sky-500/10 to-transparent blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-radial from-emerald-400/15 via-transparent to-transparent blur-[60px]" />
      </div>

      {/* Skip Button */}
      <button
        type="button"
        onClick={handleSkip}
        className="absolute top-6 right-6 z-10 px-3 py-1.5 rounded-full text-[11px] font-mono tracking-wider text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/50"
        aria-label="Skip startup animation"
      >
        SKIP [ESC]
      </button>

      {/* Core Center Sequence Container */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        {/* Stage 1: Official Logo Symbol Ascending */}
        <div
          className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            stage >= 1
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-8 scale-95'
          }`}
        >
          <div className="relative">
            <AscendLogo
              variant="symbol"
              size="xl"
              colorScheme="light"
              className="drop-shadow-[0_8px_24px_rgba(0,196,140,0.35)]"
            />
            {/* Subtle light glint on logo apex */}
            <div
              className={`absolute top-0 right-1 w-3 h-3 rounded-full bg-white transition-opacity duration-500 blur-[2px] ${
                stage >= 2 ? 'opacity-80 scale-125' : 'opacity-0 scale-50'
              }`}
            />
          </div>
        </div>

        {/* Stage 2: Official Wordmark & Tagline Reveal */}
        <div
          className={`mt-6 space-y-2 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            stage >= 2
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
        >
          <h1 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-[0.28em] text-white leading-none">
            ASCEND
          </h1>
          <p
            className={`text-xs sm:text-sm font-semibold tracking-wide text-teal-400 transition-opacity duration-700 delay-150 ${
              stage >= 2 ? 'opacity-100' : 'opacity-0'
            }`}
          >
            Getting Better Every Day.
          </p>
        </div>

        {/* Stage 3: Scientific Platform Tag */}
        <div
          className={`mt-6 transition-all duration-700 delay-100 ${
            stage >= 3
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2'
          }`}
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono tracking-widest uppercase text-slate-400 bg-slate-900/80 border border-slate-800">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
            AI Nutrition & Fitness Platform
          </span>
        </div>
      </div>
    </div>
  );
};
