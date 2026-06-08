import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(
  amount: number,
  currency: string = 'DOP',
  locale: string = 'es-DO'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string | Date, locale: string = 'es-DO'): string {
  let d: Date
  if (typeof date === 'string') {
    // Full timestamp already has time component — don't append T00:00:00
    d = date.includes('T') ? new Date(date) : new Date(date + 'T00:00:00')
  } else {
    d = date
  }
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function calcMonthsToGoal(
  current: number,
  target: number,
  monthlyContribution: number,
  annualRate: number = 0
): number {
  if (current >= target) return 0
  if (monthlyContribution <= 0) return Infinity

  if (annualRate === 0) {
    return Math.ceil((target - current) / monthlyContribution)
  }

  // Con interés compuesto mensual
  const r = annualRate / 12
  const needed = target - current
  // FV = PMT * ((1+r)^n - 1) / r + PV*(1+r)^n
  // Aproximación iterativa
  let months = 0
  let balance = current
  while (balance < target && months < 600) {
    balance = balance * (1 + r) + monthlyContribution
    months++
  }
  return months
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
