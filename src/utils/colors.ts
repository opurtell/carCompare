export const CAR_COLORS = [
  { name: 'blue', hex: '#3b82f6', bg: '#eff6ff' },
  { name: 'red', hex: '#ef4444', bg: '#fef2f2' },
  { name: 'green', hex: '#22c55e', bg: '#f0fdf4' },
  { name: 'amber', hex: '#f59e0b', bg: '#fffbeb' },
  { name: 'purple', hex: '#a855f7', bg: '#faf5ff' },
] as const;

export function getCarColor(index: number) {
  return CAR_COLORS[index % CAR_COLORS.length];
}
