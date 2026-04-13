'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Square, RotateCcw } from 'lucide-react';

interface TimerProps {
  initialSeconds: number;
  label: string;
}

export function Timer({ initialSeconds, label }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const toggleTimer = () => setIsRunning(!isRunning);
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(initialSeconds);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center p-4 bg-slate-100 rounded-lg border">
      <div className="text-sm font-medium text-slate-500 mb-1">{label}</div>
      <div className={`text-3xl font-mono font-bold mb-4 ${timeLeft === 0 ? 'text-red-600' : 'text-slate-800'}`}>
        {formatTime(timeLeft)}
      </div>
      <div className="flex space-x-2">
        <Button variant="outline" size="icon" onClick={toggleTimer}>
          {isRunning ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button variant="outline" size="icon" onClick={resetTimer}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
