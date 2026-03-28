/**
 * Indian Locale Utilities
 * 
 * Provides formatting functions for Indian standards:
 * - Currency: ₹ with lakhs/crores notation (1,00,000 = 1 lakh)
 * - Dates: DD/MM/YYYY or DD-MMM-YYYY format
 * - Numbers: Indian numbering system (lakhs, crores)
 * - Time: 12-hour format with IST timezone
 */

// Indian Standard Time offset (UTC+5:30)
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Convert a date to IST (Indian Standard Time)
 * @param {Date|string} date - Date to convert
 * @returns {Date} Date in IST
 */
export const toIST = (date) => {
    const d = new Date(date);
    // Get UTC time and add IST offset
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    return new Date(utc + IST_OFFSET_MS);
};

/**
 * Format date to Indian standard (DD/MM/YYYY)
 * @param {Date|string} date - Date to format
 * @param {Object} options - Formatting options
 * @param {string} options.separator - Separator character (default: '/')
 * @param {boolean} options.includeTime - Include time (default: false)
 * @param {boolean} options.useIST - Convert to IST first (default: true)
 * @returns {string} Formatted date string
 */
export const formatDateIndian = (date, options = {}) => {
    if (!date) return '-';
    
    const { separator = '/', includeTime = false, useIST = true } = options;
    
    let d = new Date(date);
    if (useIST) {
        d = toIST(d);
    }
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    let formatted = `${day}${separator}${month}${separator}${year}`;
    
    if (includeTime) {
        const hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const hour12 = hours % 12 || 12;
        formatted += ` ${hour12}:${minutes} ${ampm} IST`;
    }
    
    return formatted;
};

/**
 * Format date to Indian standard with month name (DD-MMM-YYYY)
 * @param {Date|string} date - Date to format
 * @param {boolean} useIST - Convert to IST first (default: true)
 * @returns {string} Formatted date string (e.g., "25-Mar-2026")
 */
export const formatDateIndianLong = (date, useIST = true) => {
    if (!date) return '-';
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    let d = new Date(date);
    if (useIST) {
        d = toIST(d);
    }
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    
    return `${day}-${month}-${year}`;
};

/**
 * Format date to Indian full format (DD Month YYYY)
 * @param {Date|string} date - Date to format
 * @param {boolean} useIST - Convert to IST first (default: true)
 * @returns {string} Formatted date string (e.g., "25 March 2026")
 */
export const formatDateIndianFull = (date, useIST = true) => {
    if (!date) return '-';
    
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    
    let d = new Date(date);
    if (useIST) {
        d = toIST(d);
    }
    
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    
    return `${day} ${month} ${year}`;
};

/**
 * Format number to Indian numbering system (lakhs, crores)
 * Indian system: 1,00,00,000 (1 crore) vs Western: 10,000,000
 * 
 * @param {number} num - Number to format
 * @param {number} decimals - Decimal places (default: 0)
 * @returns {string} Formatted number string
 */
export const formatNumberIndian = (num, decimals = 0) => {
    if (num === null || num === undefined || isNaN(num)) return '-';
    
    const number = parseFloat(num);
    
    // Handle negative numbers
    const isNegative = number < 0;
    const absNum = Math.abs(number);
    
    // Split into integer and decimal parts
    const [intPart, decPart] = absNum.toFixed(decimals).split('.');
    
    // Format integer part with Indian grouping
    // First group of 3, then groups of 2
    let formatted = '';
    const digits = intPart.split('').reverse();
    
    for (let i = 0; i < digits.length; i++) {
        if (i === 3) {
            formatted = ',' + formatted;
        } else if (i > 3 && (i - 3) % 2 === 0) {
            formatted = ',' + formatted;
        }
        formatted = digits[i] + formatted;
    }
    
    // Add decimal part if exists
    if (decPart) {
        formatted += '.' + decPart;
    }
    
    return isNegative ? '-' + formatted : formatted;
};

/**
 * Format currency to Indian Rupee (₹)
 * @param {number} amount - Amount to format
 * @param {Object} options - Formatting options
 * @param {boolean} options.showSymbol - Show ₹ symbol (default: true)
 * @param {number} options.decimals - Decimal places (default: 2)
 * @param {boolean} options.showPaisa - Show paisa for small amounts (default: false)
 * @returns {string} Formatted currency string
 */
export const formatCurrencyINR = (amount, options = {}) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '-';
    
    const { showSymbol = true, decimals = 2, showPaisa = false } = options;
    
    const num = parseFloat(amount);
    const symbol = showSymbol ? '₹' : '';
    
    // For very small amounts, show paisa
    if (showPaisa && Math.abs(num) < 1 && num !== 0) {
        const paisa = Math.round(num * 100);
        return `${paisa} paisa`;
    }
    
    const formatted = formatNumberIndian(num, decimals);
    return `${symbol}${formatted}`;
};

/**
 * Format large amounts with lakhs/crores suffix
 * @param {number} amount - Amount to format
 * @param {Object} options - Formatting options
 * @param {boolean} options.showSymbol - Show ₹ symbol (default: true)
 * @param {number} options.decimals - Decimal places (default: 2)
 * @returns {string} Formatted string (e.g., "₹1.5 Cr" or "₹50 L")
 */
export const formatCurrencyINRCompact = (amount, options = {}) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '-';
    
    const { showSymbol = true, decimals = 2 } = options;
    const num = parseFloat(amount);
    const symbol = showSymbol ? '₹' : '';
    
    const absNum = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    
    if (absNum >= 10000000) {
        // Crores (1 crore = 10,000,000)
        return `${sign}${symbol}${(absNum / 10000000).toFixed(decimals)} Cr`;
    } else if (absNum >= 100000) {
        // Lakhs (1 lakh = 100,000)
        return `${sign}${symbol}${(absNum / 100000).toFixed(decimals)} L`;
    } else if (absNum >= 1000) {
        // Thousands
        return `${sign}${symbol}${(absNum / 1000).toFixed(decimals)} K`;
    } else {
        return `${sign}${symbol}${absNum.toFixed(decimals)}`;
    }
};

/**
 * Format number to words (Indian system)
 * @param {number} num - Number to convert
 * @returns {string} Number in words
 */
export const numberToWordsIndian = (num) => {
    if (num === 0) return 'Zero';
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
                  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
                  'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const convertLessThanHundred = (n) => {
        if (n < 20) return ones[n];
        return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    };
    
    const convertLessThanThousand = (n) => {
        if (n < 100) return convertLessThanHundred(n);
        return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanHundred(n % 100) : '');
    };
    
    let n = Math.abs(Math.floor(num));
    let result = '';
    
    if (n >= 10000000) {
        result += convertLessThanThousand(Math.floor(n / 10000000)) + ' Crore ';
        n %= 10000000;
    }
    
    if (n >= 100000) {
        result += convertLessThanHundred(Math.floor(n / 100000)) + ' Lakh ';
        n %= 100000;
    }
    
    if (n >= 1000) {
        result += convertLessThanHundred(Math.floor(n / 1000)) + ' Thousand ';
        n %= 1000;
    }
    
    if (n > 0) {
        result += convertLessThanThousand(n);
    }
    
    return (num < 0 ? 'Minus ' : '') + result.trim();
};

/**
 * Format time to 12-hour Indian format
 * @param {Date|string} date - Date/time to format
 * @param {boolean} useIST - Convert to IST first (default: true)
 * @returns {string} Formatted time (e.g., "2:30 PM IST")
 */
export const formatTimeIndian = (date, useIST = true) => {
    if (!date) return '-';
    
    let d = new Date(date);
    if (useIST) {
        d = toIST(d);
    }
    
    const hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    
    return `${hour12}:${minutes} ${ampm} IST`;
};

/**
 * Format datetime to full Indian format
 * @param {Date|string} date - Date/time to format
 * @returns {string} Formatted datetime (e.g., "25/03/2026, 2:30 PM IST")
 */
export const formatDateTimeIndian = (date) => {
    if (!date) return '-';
    return formatDateIndian(date, { includeTime: true });
};

/**
 * Get relative time in Indian English
 * @param {Date|string} date - Date to compare
 * @returns {string} Relative time string
 */
export const getRelativeTimeIndian = (date) => {
    if (!date) return '-';
    
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    
    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffWeeks === 1) return 'Last week';
    if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
    if (diffMonths === 1) return 'Last month';
    if (diffMonths < 12) return `${diffMonths} months ago`;
    if (diffYears === 1) return 'Last year';
    return `${diffYears} years ago`;
};

/**
 * Parse Indian date string to Date object
 * Supports: DD/MM/YYYY, DD-MM-YYYY, DD-MMM-YYYY
 * @param {string} dateStr - Indian formatted date string
 * @returns {Date|null} Parsed date or null if invalid
 */
export const parseIndianDate = (dateStr) => {
    if (!dateStr) return null;
    
    const months = {
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
    };
    
    // Try DD/MM/YYYY or DD-MM-YYYY
    let match = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (match) {
        const [, day, month, year] = match;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // Try DD-MMM-YYYY
    match = dateStr.match(/^(\d{1,2})[\/\-]([A-Za-z]{3})[\/\-](\d{4})$/);
    if (match) {
        const [, day, monthStr, year] = match;
        const month = months[monthStr.toLowerCase()];
        if (month !== undefined) {
            return new Date(parseInt(year), month, parseInt(day));
        }
    }
    
    return null;
};

/**
 * Format fiscal year (Indian: April to March)
 * @param {Date|string} date - Date to get fiscal year for
 * @returns {string} Fiscal year string (e.g., "FY 2025-26")
 */
export const getFiscalYearIndian = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth();
    
    // Indian fiscal year starts in April (month 3)
    if (month >= 3) {
        return `FY ${year}-${String(year + 1).slice(-2)}`;
    } else {
        return `FY ${year - 1}-${String(year).slice(-2)}`;
    }
};

/**
 * Format percentage with Indian conventions
 * @param {number} value - Percentage value
 * @param {number} decimals - Decimal places (default: 2)
 * @returns {string} Formatted percentage
 */
export const formatPercentageIndian = (value, decimals = 2) => {
    if (value === null || value === undefined || isNaN(value)) return '-';
    return `${parseFloat(value).toFixed(decimals)}%`;
};

/**
 * Format phone number to Indian format
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone (e.g., "+91 98765 43210")
 */
export const formatPhoneIndian = (phone) => {
    if (!phone) return '-';
    
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // If starts with 91 and has 12 digits
    if (digits.length === 12 && digits.startsWith('91')) {
        return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
    }
    
    // If 10 digits (Indian mobile)
    if (digits.length === 10) {
        return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    
    return phone;
};

/**
 * Format object values with Indian locale
 * Useful for API responses
 * @param {Object} obj - Object to format
 * @param {Object} fieldConfig - Configuration for each field
 * @returns {Object} Object with formatted values
 */
export const formatObjectIndian = (obj, fieldConfig = {}) => {
    if (!obj) return obj;
    
    const result = { ...obj };
    
    for (const [field, config] of Object.entries(fieldConfig)) {
        if (result[field] !== undefined) {
            switch (config.type) {
                case 'currency':
                    result[`${field}_formatted`] = formatCurrencyINR(result[field], config.options);
                    break;
                case 'date':
                    result[`${field}_formatted`] = formatDateIndian(result[field], config.options);
                    break;
                case 'dateLong':
                    result[`${field}_formatted`] = formatDateIndianLong(result[field]);
                    break;
                case 'datetime':
                    result[`${field}_formatted`] = formatDateTimeIndian(result[field]);
                    break;
                case 'number':
                    result[`${field}_formatted`] = formatNumberIndian(result[field], config.decimals);
                    break;
                case 'percentage':
                    result[`${field}_formatted`] = formatPercentageIndian(result[field], config.decimals);
                    break;
                case 'phone':
                    result[`${field}_formatted`] = formatPhoneIndian(result[field]);
                    break;
            }
        }
    }
    
    return result;
};

export default {
    toIST,
    formatDateIndian,
    formatDateIndianLong,
    formatDateIndianFull,
    formatNumberIndian,
    formatCurrencyINR,
    formatCurrencyINRCompact,
    numberToWordsIndian,
    formatTimeIndian,
    formatDateTimeIndian,
    getRelativeTimeIndian,
    parseIndianDate,
    getFiscalYearIndian,
    formatPercentageIndian,
    formatPhoneIndian,
    formatObjectIndian
};
