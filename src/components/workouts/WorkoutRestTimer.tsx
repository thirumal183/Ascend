import React, { useEffect, useState } from 'react';
import { Clock, Pause, Play } from 'lucide-react';

interface WorkoutRestTimerProps {
  initialSeconds: number | null;
  onDismiss: () => void;
}

export const WorkoutRestTimer: React.FC<WorkoutRestTimerProps> = ({
  initialSeconds,
  onDismiss,
}) => {
  const [seconds, setSeconds] = useState<number | null>(initialSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(true);

  useEffect(() => {
    setSeconds(initialSeconds);
    if (initialSeconds !== null && initialSeconds > 0) {
      setIsRunning(true);
    }
  }, [initialSeconds]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRunning && seconds !== null && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          if (prev === null || prev <= 1) {
            setIsRunning(false);
            // Audio chime & haptic feedback on rest completion
            try {
              if (typeof window !== 'undefined' && 'AudioContext' in window) {
                const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
                gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.35);
              }
              if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate(200);
              }
            } catch {}
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, seconds]);

  if (seconds === null) return null;

  return (
    <div
      role="region"
      aria-label="Inter-set rest timer"
      className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-xs"
    >
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
          <Clock className="h-4 w-4" />
        </div>
        <div>
          <div aria-live="polite" className="text-xs text-slate-400 font-medium">
            {seconds === 0 ? 'Rest Complete!' : 'Inter-Set Rest Timer'}
          </div>
          <div className="font-mono text-xl font-bold tracking-tight text-white tabular-nums">
            {Math.floor(seconds / 60)}:
            {String(seconds % 60).padStart(2, '0')}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsRunning(!isRunning)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
        >
          {isRunning ? (
            <>
              <Pause className="h-3 w-3" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="h-3 w-3" />
              <span>Resume</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => setSeconds((prev) => (prev ?? 0) + 30)}
          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
        >
          +30s
        </button>
        <button
          type="button"
          onClick={() => {
            setIsRunning(false);
            setSeconds(null);
            onDismiss();
          }}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};
