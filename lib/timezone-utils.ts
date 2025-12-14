export function getParisDate(): string {
  const parisDate = new Date().toLocaleString('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  return parisDate.split(',')[0];
}

export function getTimeUntilMidnightParis(): { hours: number; minutes: number; seconds: number } {
  const now = new Date();

  const parisTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));

  const nextMidnight = new Date(parisTime);
  nextMidnight.setHours(24, 0, 0, 0);

  const diff = nextMidnight.getTime() - parisTime.getTime();

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { hours, minutes, seconds };
}
