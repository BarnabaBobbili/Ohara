/**
 * Date formatting utilities for Indian Standard Time (IST)
 * Timezone: Asia/Kolkata (UTC+5:30)
 */

const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Format a date to IST string: DD/MM/YYYY, HH:MM:SS
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatIST = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    return d.toLocaleString('en-IN', {
        timeZone: IST_TIMEZONE,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
};

/**
 * Format a date to IST date only: DD/MM/YYYY
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDateIST = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    return d.toLocaleDateString('en-IN', {
        timeZone: IST_TIMEZONE,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

/**
 * Format a date to IST time only: HH:MM:SS
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted time string
 */
export const formatTimeIST = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    return d.toLocaleTimeString('en-IN', {
        timeZone: IST_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
};

/**
 * Format a date to relative time (e.g., "2 hours ago")
 * @param {Date|string|number} date - Date to format
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const now = new Date();
    const diffMs = now - d;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    
    return formatDateIST(date);
};

/**
 * Format a date to ISO string adjusted to IST for database storage
 * @param {Date|string|number} date - Date to format
 * @returns {string} ISO string
 */
export const toISTISOString = (date) => {
    if (!date) return new Date().toISOString();
    const d = new Date(date);
    if (isNaN(d.getTime())) return new Date().toISOString();
    return d.toISOString();
};

/**
 * Get current date in IST
 * @returns {Date} Current date
 */
export const nowIST = () => {
    return new Date();
};

/**
 * Format date for display in activity logs
 * Shows relative time for recent, full date for older
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted string
 */
export const formatActivityTimestamp = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const now = new Date();
    const diffMs = now - d;
    const diffHour = diffMs / (1000 * 60 * 60);
    
    // If less than 24 hours, show relative time
    if (diffHour < 24) {
        return formatRelativeTime(date);
    }
    
    // Otherwise show full IST date
    return formatIST(date);
};

export default {
    formatIST,
    formatDateIST,
    formatTimeIST,
    formatRelativeTime,
    toISTISOString,
    nowIST,
    formatActivityTimestamp,
    IST_TIMEZONE
};
