/**
 * Utility functions for handling quantity inputs based on item units
 * Ensures countable items (pcs, nos, units, etc.) only accept whole numbers
 */

// List of countable units that should only accept whole numbers
const COUNTABLE_UNITS = ['pcs', 'nos', 'unit', 'units', 'piece', 'pieces', 'item', 'items', 'box', 'boxes', 'bottle', 'bottles', 'can', 'cans', 'packet', 'packets', 'pack', 'packs'];

/**
 * Check if a unit is countable (should only accept whole numbers)
 * @param {string} unit - The unit of measurement
 * @returns {boolean} - True if unit is countable
 */
export const isCountableUnit = (unit) => {
    if (!unit) return false;
    const normalizedUnit = String(unit).toLowerCase().trim();
    return COUNTABLE_UNITS.includes(normalizedUnit);
};

/**
 * Get the appropriate step value for a quantity input based on unit
 * @param {string} unit - The unit of measurement
 * @returns {string} - "1" for countable units, "0.01" for measurable units
 */
export const getQuantityStep = (unit) => {
    return isCountableUnit(unit) ? "1" : "0.01";
};

/**
 * Validate and normalize a quantity value based on unit
 * @param {number|string} value - The quantity value to validate
 * @param {string} unit - The unit of measurement
 * @returns {number} - Validated quantity (rounded for countable units)
 */
export const normalizeQuantity = (value, unit) => {
    let numValue = parseFloat(value) || 0;

    // For countable units, round to whole number
    if (isCountableUnit(unit)) {
        numValue = Math.round(numValue);
    }

    return numValue;
};

/**
 * Get minimum quantity based on unit
 * @param {string} unit - The unit of measurement
 * @returns {number} - Minimum allowed quantity
 */
export const getMinQuantity = (unit) => {
    return isCountableUnit(unit) ? 1 : 0.01;
};

/**
 * Format quantity for display based on unit
 * @param {number} quantity - The quantity to format
 * @param {string} unit - The unit of measurement
 * @returns {string} - Formatted quantity string
 */
export const formatQuantity = (quantity, unit) => {
    if (isCountableUnit(unit)) {
        return Math.round(quantity).toString();
    }
    return parseFloat(quantity).toFixed(2);
};

/**
 * Create props object for quantity input field
 * @param {string} unit - The unit of measurement
 * @param {number} value - Current quantity value
 * @param {function} onChange - Change handler function
 * @returns {object} - Props object for input element
 */
export const getQuantityInputProps = (unit, value, onChange) => {
    return {
        type: "number",
        min: getMinQuantity(unit),
        step: getQuantityStep(unit),
        value: value,
        onChange: (e) => {
            const normalizedValue = normalizeQuantity(e.target.value, unit);
            onChange(normalizedValue);
        }
    };
};
