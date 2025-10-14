/**
 * Formats a number as Brazilian Real currency
 * @param value - The number to format
 * @returns Formatted string like "R$ 2.500,00"
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};
