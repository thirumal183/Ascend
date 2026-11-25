import React, { useEffect, useRef } from 'react';

interface TrailNode {
  x: number;
  y: number;
  alpha: number;
}

interface PulseWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

/**
 * AscendCursorField
 * Lightweight GPU-friendly pointer interaction layer for the public Homepage.
 * - Uses Canvas 2D + requestAnimationFrame without per-move React state updates.
 * - Renders a restrained cobalt-to-violet atmospheric glow + kinetic velocity wake
 *   and expands a subtle concentric pulse when hovering interactive controls.
 * - Automatically disabled on coarse/touch pointers and when reduced motion is preferred.
 */
export const AscendCursorField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarseMq = window.matchMedia('(pointer: coarse)');
    if (reducedMq.matches || coarseMq.matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    let targetX = -999;
    let targetY = -999;
    let currentX = -999;
    let currentY = -999;
    let isPointerInside = false;
    let isOverInteractive = false;
    let hoverIntensity = 0;
    let lastInteractiveEl: Element | null = null;
    let rafId: number | null = null;

    const trail: TrailNode[] = [];
    const pulses: PulseWave[] = [];

    const resolveInteractiveAccent = (el: Element | null): string => {
      const card = el?.closest('[data-pathway-glow]');
      const pw = card?.getAttribute('data-pathway-glow');
      if (pw === 'general') return 'rgba(22, 163, 74, ';
      if (pw === 'muscle') return 'rgba(234, 88, 12, ';
      return 'rgba(37, 99, 235, ';
    };

    const spawnPulse = (x: number, y: number, color: string, maxRadius = 46) => {
      if (pulses.length > 6) pulses.shift();
      pulses.push({
        x,
        y,
        radius: 10,
        maxRadius,
        alpha: 0.36,
        color,
      });
    };

    const tick = () => {
      ctx.clearRect(0, 0, width, height);

      const dx = targetX - currentX;
      const dy = targetY - currentY;
      currentX += dx * 0.22;
      currentY += dy * 0.22;

      const targetHover = isOverInteractive ? 1 : 0;
      hoverIntensity += (targetHover - hoverIntensity) * 0.14;

      if (isPointerInside && currentX > -100 && currentY > -100) {
        // Outer cobalt + violet soft gradient field (restrained so reading remains effortless)
        const baseRadius = 190 + hoverIntensity * 55;
        const glow = ctx.createRadialGradient(
          currentX,
          currentY,
          0,
          currentX,
          currentY,
          baseRadius
        );
        glow.addColorStop(0, `rgba(37, 99, 235, ${0.095 + hoverIntensity * 0.045})`);
        glow.addColorStop(0.45, `rgba(124, 58, 237, ${0.045 + hoverIntensity * 0.025})`);
        glow.addColorStop(1, 'rgba(37, 99, 235, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(currentX, currentY, baseRadius, 0, Math.PI * 2);
        ctx.fill();

        // Crisp kinetic wake ribbon
        const speed = Math.hypot(dx, dy);
        if (speed > 1.2) {
          trail.push({ x: currentX, y: currentY, alpha: Math.min(0.45, 0.16 + speed * 0.012) });
          if (trail.length > 14) trail.shift();
        }
      }

      if (trail.length > 1) {
        for (let i = 1; i < trail.length; i++) {
          const p0 = trail[i - 1];
          const p1 = trail[i];
          const ratio = i / trail.length;
          ctx.strokeStyle = `rgba(37, 99, 235, ${p1.alpha * ratio * 0.55})`;
          ctx.lineWidth = 1.25 + ratio * 1.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
          p0.alpha *= 0.88;
        }
        while (trail.length > 0 && trail[0].alpha < 0.02) {
          trail.shift();
        }
      }

      // Interactive hairline reticle around interactive targets
      if (isPointerInside && hoverIntensity > 0.06) {
        ctx.strokeStyle = `rgba(37, 99, 235, ${0.26 * hoverIntensity})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(currentX, currentY, 15 + hoverIntensity * 7, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Subtle expanding click / hover ripples
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.radius += (p.maxRadius - p.radius) * 0.12;
        p.alpha *= 0.91;
        ctx.strokeStyle = `${p.color}${p.alpha.toFixed(3)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.stroke();
        if (p.alpha < 0.02) {
          pulses.splice(i, 1);
        }
      }

      const settled =
        Math.abs(dx) < 0.25 &&
        Math.abs(dy) < 0.25 &&
        Math.abs(targetHover - hoverIntensity) < 0.01 &&
        trail.length === 0 &&
        pulses.length === 0;

      if (!settled && (isPointerInside || trail.length > 0 || pulses.length > 0)) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    };

    const scheduleFrame = () => {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') {
        return;
      }
      targetX = e.clientX;
      targetY = e.clientY;
      if (!isPointerInside) {
        currentX = targetX;
        currentY = targetY;
        isPointerInside = true;
      }

      const target = document.elementFromPoint(e.clientX, e.clientY);
      const interactiveEl = target?.closest(
        'button, a, [role="tab"], [data-cursor-interactive]'
      ) ?? null;
      isOverInteractive = Boolean(interactiveEl);

      if (interactiveEl && interactiveEl !== lastInteractiveEl) {
        spawnPulse(e.clientX, e.clientY, resolveInteractiveAccent(interactiveEl), 34);
      }
      lastInteractiveEl = interactiveEl;
      scheduleFrame();
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') {
        return;
      }
      const target = document.elementFromPoint(e.clientX, e.clientY);
      spawnPulse(e.clientX, e.clientY, resolveInteractiveAccent(target), 52);
      scheduleFrame();
    };

    const handlePointerLeave = () => {
      isPointerInside = false;
      isOverInteractive = false;
      lastInteractiveEl = null;
      scheduleFrame();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    document.addEventListener('mouseleave', handlePointerLeave);
    window.addEventListener('resize', resize, { passive: true });

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('mouseleave', handlePointerLeave);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 z-30 pointer-events-none hidden md:block"
    />
  );
};
