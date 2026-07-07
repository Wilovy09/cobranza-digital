export type Divisa = 'MXN' | 'USD' | 'EUR' | 'GBP' | 'COP'

export const DIVISAS: { value: Divisa; label: string }[] = [
  { value: 'MXN', label: 'MXN — Peso mexicano' },
  { value: 'USD', label: 'USD — Dólar estadounidense' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — Libra esterlina' },
  { value: 'COP', label: 'COP — Peso colombiano' },
]

export function formatMoney(amount: number, divisa: Divisa): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: divisa }).format(amount)
}
