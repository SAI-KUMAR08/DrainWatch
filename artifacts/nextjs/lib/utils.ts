import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Shared utility helpers used across all pages

export function fmt(date?: string | Date | null) {
  if (!date) return 'Unavailable';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function shortId(id: string) {
  return id.length > 12 ? `DW-${id.slice(-6).toUpperCase()}` : id;
}

export function hazardName(value: string) {
  return value.replaceAll('_', ' ');
}

export function initials(name?: string) {
  return (name || 'Officer')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function storedSession() {
  try {
    return JSON.parse(localStorage.getItem('drainwatch-session') || '{}') as {
      token?: string;
      role?: 'citizen' | 'officer';
      name?: string;
      email?: string;
    };
  } catch {
    return {};
  }
}
