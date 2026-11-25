import React, { useEffect, useRef, useState } from 'react';
import { AscendLogo } from './AscendLogo';

interface StartupIntroProps {
  onComplete: () => void;
}

/**
 * StartupIntro — Premium ~2.95s product opening sequence.
 *
 * Stage 1 (0–420ms):    Large ASCEND symbol fades in at center with cobalt halo.
 * Stage 2 (420–1150ms): "ASCEND" wordmark and tagline reveal below.
 * Stage 3 (1150–2480ms): Pathway identity badges appear.
 * Stage 4 (2480–2950ms): Dark backdrop fades out while the logo symbol smoothly
 *   translates & scales from center directly into the navbar logo position
 *   (`[data-ascend-navbar-logo]`), creating a seamless handoff.
 *
 * Supports [ESC]/click/Enter/Space skip and prefers-reduced-motion.
 */
export const StartupIntro: React.FC<StartupIntroProps> = ({ onComplete }) => {
  const [stage, setStage] = useState<1 | 2 | 3 | 4>(1);
  const [fadingOut, setFadingOut] = useState(false);
  const [logoFlying, setLogoFlying] = useState(false);
  const [flyTransform, setFlyTransform] = useState<string>('none');
  const logoWrapperRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const finishOnce = () => {
      if (completedRef.current) return;
      completedRef.current = true;
      onCompleteRef.current();
    };

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      finishOnce();
      return;
    }

    // 2.95s staged choreography on Deep Navy + Cobalt/Violet light field
    const t2 = window.setTimeout(() => setStage(2), 420);
    const t3 = window.setTimeout(() => setStage(3), 1150);
    const tFly = window.setTimeout(() => {
      // Measure navbar logo target if mounted & visible
      let transformStr = `translate3d(${-Math.max(110, window.innerWidth / 2 - 72)}px, ${-(
        window.innerHeight / 2 - 40
      )}px, 0) scale(0.36)`;

      const logoEl = logoWrapperRef.current;
      const navbarTarget = document.querySelector('[data-ascend-navbar-logo]');
      if (logoEl && navbarTarget) {
        const srcRect = logoEl.getBoundingClientRect();
        const dstRect = navbarTarget.getBoundingClientRect();
        if (dstRect.width > 0 && dstRect.height > 0 && srcRect.width > 0) {
          // Navbar symbol sits on the left edge of the navbar logo container (~36px wide)
          const targetCenterX = dstRect.left + 18;
          const targetCenterY = dstRect.top + dstRect.height / 2;
          const srcCenterX = srcRect.left + srcRect.width / 2;
          const srcCenterY = srcRect.top + srcRect.height / 2;
          const dx = targetCenterX - srcCenterX;
          const dy = targetCenterY - srcCenterY;
          const scale = Math.max(0.28, Math.min(0.6, 36 / srcRect.width));
          transformStr = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
        }
      }

      setFlyTransform(transformStr);
      setStage(4);
      setLogoFlying(true);
      setFadingOut(true);
    }, 2480);
    const tEnd = window.setTimeout(finishOnce, 2950);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        finishOnce();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(tFly);
      window.clearTimeout(tEnd);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleManualSkip = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onCompleteRef.current();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ASCEND Startup Intro"
      onClick={handleManualSkip}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center text-white select-none cursor-pointer pointer-events-auto"
    >
      {/* Fading Deep Navy Backdrop (separate layer so the flying logo stays crisp during handoff) */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-[#0A1628] transition-opacity duration-[470ms] ease-out ${
          fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {/* Layered Deep Navy + Electric Cobalt & Violet Ambient Field */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_42%,rgba(37,99,235,0.24),transparent_52%),radial-gradient(circle_at_64%_60%,rgba(124,58,237,0.16),transparent_48%)]" />
      </div>

      {/* Precision Geometric Pulse Halo */}
      <div
        aria-hidden="true"
        className={`absolute h-80 w-80 rounded-full border border-blue-400/15 transition-all duration-1000 ease-out pointer-events-none ${
          fadingOut
            ? 'scale-150 opacity-0'
            : stage >= 2
            ? 'scale-125 opacity-60'
            : 'scale-75 opacity-0'
        }`}
      />
      <div
        aria-hidden="true"
        className={`absolute h-52 w-52 rounded-full border border-indigo-400/20 transition-all duration-700 ease-out pointer-events-none ${
          fadingOut
            ? 'scale-125 opacity-0'
            : stage >= 1
            ? 'scale-100 opacity-80'
            : 'scale-75 opacity-0'
        }`}
      />

      {/* Skip Control */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleManualSkip();
        }}
        className={`absolute top-6 right-6 z-10 px-3.5 py-1.5 rounded-full text-[11px] font-mono tracking-wider text-blue-100/80 hover:text-white bg-white/10 hover:bg-white/15 border border-white/15 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
          fadingOut ? 'opacity-0' : 'opacity-100'
        }`}
        aria-label="Skip startup animation"
      >
        SKIP [ESC]
      </button>

      {/* Core Staged Reveal */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-md w-full">
        {/* Logo Symbol — large commanding presence; glides seamlessly to navbar position on exit */}
        <div
          ref={logoWrapperRef}
          style={
            logoFlying
              ? {
                  transform: flyTransform,
                  transition: 'transform 470ms cubic-bezier(0.16, 1, 0.3, 1), opacity 140ms ease-out 330ms',
                  opacity: 0,
                }
              : undefined
          }
          className={`relative flex items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            !logoFlying && stage >= 1
              ? 'opacity-100 translate-y-0 scale-100'
              : !logoFlying
              ? 'opacity-0 translate-y-4 scale-90'
              : ''
          }`}
        >
          <div
            aria-hidden="true"
            className={`absolute -inset-6 rounded-full bg-blue-500/20 blur-2xl pointer-events-none transition-opacity duration-300 ${
              logoFlying ? 'opacity-0' : 'opacity-100'
            }`}
          />
          <AscendLogo
            variant="symbol"
            size="xl"
            colorScheme="light"
            className="relative !w-24 !h-24 sm:!w-28 sm:!h-28 drop-shadow-[0_0_24px_rgba(37,99,235,0.35)]"
          />
        </div>

        {/* Wordmark + Tagline */}
        <div
          className={`mt-5 space-y-2 transition-all ease-[cubic-bezier(0.16,1,0.3,1)] ${
            logoFlying
              ? 'duration-200 opacity-0 -translate-y-3 scale-95'
              : 'duration-700'
          } ${
            stage >= 2 && !logoFlying
              ? 'opacity-100 translate-y-0'
              : stage < 2
              ? 'opacity-0 translate-y-3'
              : ''
          }`}
        >
          <p className="font-display text-3xl sm:text-4xl font-extrabold uppercase tracking-[0.28em] text-white leading-none">
            ASCEND
          </p>
          <p className="text-sm sm:text-base font-semibold tracking-wide text-blue-300">
            Getting Better Every Day.
          </p>
        </div>

        {/* Pathway Identity Labels */}
        <div
          className={`mt-5 flex flex-wrap items-center justify-center gap-2.5 transition-all ease-out ${
            logoFlying
              ? 'duration-150 opacity-0 translate-y-2'
              : 'duration-500'
          } ${
            stage >= 3 && !logoFlying
              ? 'opacity-100 translate-y-0'
              : stage < 3
              ? 'opacity-0 translate-y-2'
              : ''
          }`}
        >
          <span className="px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide bg-emerald-500/20 text-emerald-200 border border-emerald-400/25">
            Balanced Nutrition
          </span>
          <span className="px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide bg-blue-500/25 text-blue-200 border border-blue-400/30">
            Athlete Output
          </span>
          <span className="px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide bg-orange-500/25 text-orange-200 border border-orange-400/30">
            Muscle Gain
          </span>
        </div>

        {/* Sleek 2.5s Progress Track */}
        <div
          className={`mt-7 w-44 h-0.5 rounded-full bg-white/15 overflow-hidden transition-opacity duration-200 ${
            logoFlying ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div className="h-full bg-gradient-to-r from-blue-400 via-indigo-400 to-orange-400 animate-startup-progress" />
        </div>
      </div>
    </div>
  );
};
