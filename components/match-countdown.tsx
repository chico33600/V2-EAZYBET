'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface MatchCountdownProps {
  datetime: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export function MatchCountdown({ datetime }: MatchCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  const parseDateTime = (datetimeStr: string): Date => {
    const [datePart, timePart] = datetimeStr.split(' ');
    const [day, month, year] = datePart.split('/');
    const [hours, minutes] = timePart.split(':');

    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes)
    );
  };

  const calculateTimeRemaining = (): TimeRemaining => {
    const matchDate = parseDateTime(datetime);
    const now = new Date();
    const difference = matchDate.getTime() - now.getTime();

    if (difference <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isExpired: true,
      };
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return {
      days,
      hours,
      minutes,
      seconds,
      isExpired: false,
    };
  };

  useEffect(() => {
    setTimeRemaining(calculateTimeRemaining());

    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [datetime]);

  if (timeRemaining.isExpired) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-white/10">
      <Clock className="w-3.5 h-3.5 text-[#F5C144]" />
      <div className="flex items-center gap-1 text-white font-semibold text-xs">
        {timeRemaining.days > 0 && (
          <>
            <span>{timeRemaining.days}j</span>
            <span className="text-white/40">:</span>
          </>
        )}
        <span>{String(timeRemaining.hours).padStart(2, '0')}h</span>
        <span className="text-white/40">:</span>
        <span>{String(timeRemaining.minutes).padStart(2, '0')}m</span>
        <span className="text-white/40">:</span>
        <span>{String(timeRemaining.seconds).padStart(2, '0')}s</span>
      </div>
    </div>
  );
}
