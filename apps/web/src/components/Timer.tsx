import React, { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";

interface TimerProps {
  endTime: string;
  serverTime?: string;
  onExpire?: () => void;
}

export const Timer: React.FC<TimerProps> = ({ endTime, serverTime, onExpire }) => {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    const end = new Date(endTime).getTime();
    const current = serverTime ? new Date(serverTime).getTime() : Date.now();
    return Math.max(0, Math.floor((end - current) / 1000));
  });

  useEffect(() => {
    if (remainingSeconds <= 0) {
      if (onExpire) onExpire();
      return;
    }

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (onExpire) onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingSeconds, onExpire]);

  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");

  const isLowTime = remainingSeconds > 0 && remainingSeconds <= 300; // < 5 mins
  const isExpired = remainingSeconds <= 0;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono font-bold text-sm shadow-sm transition-all ${
        isExpired
          ? "bg-rose-100 text-rose-800 border-rose-300"
          : isLowTime
          ? "bg-amber-100 text-amber-800 border-amber-300 animate-pulse"
          : "bg-slate-900 text-slate-100 border-slate-700"
      }`}
    >
      {isLowTime ? (
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
      ) : (
        <Clock className="w-4 h-4 shrink-0" />
      )}
      <span>
        {isExpired
          ? "TIME UP"
          : `${hours > 0 ? `${pad(hours)}:` : ""}${pad(minutes)}:${pad(seconds)}`}
      </span>
      {isLowTime && (
        <span className="text-[10px] font-sans font-semibold uppercase tracking-wider px-1 py-0.5 rounded bg-amber-200 text-amber-900">
          Hurry
        </span>
      )}
    </div>
  );
};
