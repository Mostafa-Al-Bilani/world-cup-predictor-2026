const DATE_TIME_OPTIONS = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
};

export const getUserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'local time';

export const formatDateTime = (value) => new Intl.DateTimeFormat(undefined, DATE_TIME_OPTIONS).format(new Date(value));

export const formatDateTimeUtc = (value) =>
  new Intl.DateTimeFormat(undefined, {
    ...DATE_TIME_OPTIONS,
    timeZone: 'UTC',
  }).format(new Date(value));

export const formatDate = (value) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(value));

export const getTimeRemaining = (value) => {
  const diff = new Date(value).getTime() - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    expired: false,
  };
};

export const isMatchLocked = (match) => new Date(match.match_date).getTime() <= Date.now();

export const toDateTimeLocalInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
};

export const fromDateTimeLocalInput = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};
