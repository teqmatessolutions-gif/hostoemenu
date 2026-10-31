/**
 * Format amount with Indian Rupee symbol and comma separators
 * @param {number|string} amount - The amount to format
 * @param {boolean} showSymbol - Whether to show ₹ symbol (default: true)
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted amount string like "₹10,000.00" or "1,000.00"
 */
export const formatCurrency = (amount, showSymbol = true, decimals = 2) => {
  // Convert to number if it's a string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) || 0 : amount || 0;

  // Format with Indian numbering system (comma separators)
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numAmount);

  // Add Rupee symbol if requested
  return showSymbol ? `₹${formatted}` : formatted;
};

/**
 * Format amount without currency symbol (just comma separators)
 * @param {number|string} amount - The amount to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted amount string like "10,000.00"
 */
export const formatAmount = (amount, decimals = 2) => {
  return formatCurrency(amount, false, decimals);
};

/**
 * Format amount in compact Indian format (Lakhs/Crores)
 * @param {number|string} amount - The amount to format
 * @returns {string} Formatted string like "₹1.5 L" or "₹2.5 Cr"
 */
export const formatIndianCurrencyCompact = (amount) => {
  const num = Number(amount);
  if (isNaN(num)) return "₹0";

  if (num >= 10000000) { // 1 Crore
    return `₹${(num / 10000000).toFixed(2)} Cr`;
  } else if (num >= 100000) { // 1 Lakh
    return `₹${(num / 100000).toFixed(2)} L`;
  } else {
    return formatCurrency(num);
  }
};

