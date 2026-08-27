const nairaFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatNaira(priceKobo) {
  if (!Number.isInteger(priceKobo)) return nairaFormatter.format(0);
  return nairaFormatter.format(priceKobo / 100);
}
