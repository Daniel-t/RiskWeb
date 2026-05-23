export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrencyAxis(value: number): string {
  const abs = Math.abs(value);
  if (abs === 0) return '$0';
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  if (abs >= 1) return `$${value.toFixed(0)}`;
  return `$${value.toFixed(2)}`;
}

export function formatReduction(baseline: number, controlled: number): string {
  if (baseline === 0) return '-';
  const pct = ((baseline - controlled) / baseline) * 100;
  return `${pct >= 0 ? '-' : '+'}${Math.abs(pct).toFixed(0)}%`;
}
