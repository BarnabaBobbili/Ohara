/**
 * Collection Analytics using PostgreSQL + MongoDB Data
 * 
 * This module provides collection performance analytics by combining
 * PostgreSQL (books, transactions, reservations) with MongoDB (activity logs).
 * 
 * Tables used:
 * - books: Book catalog and inventory
 * - transactions: Checkout/return history
 * - reservations: Book reservations
 * - activity_logs (MongoDB): Activity tracking
 * 
 * All responses include Indian locale formatted values (_formatted suffix)
 * - Numbers: Indian numbering system (lakhs, crores)
 * - Dates: DD/MM/YYYY format with IST timezone
 */

import prisma from './prisma.js';
import { getMongoDatabase } from './mongodb.js';
import { DatabaseError } from '../utils/customErrors.js';
import {
    formatDateIndian,
    formatDateTimeIndian,
    formatNumberIndian,
    formatPercentageIndian,
    getRelativeTimeIndian
} from '../utils/indianLocale.js';

/**
 * Get most popular books by circulation count
 * Ranks books by total checkout count
 * 
 * @param {number} days - Number of days to analyze (default: 90)
 * @param {number} limit - Number of top books to return (default: 20)
 * @returns {Promise<Array>} Array of {bookId, title, author, checkoutCount, reservationCount}
 */
export const getMostPopularBooks = async (days = 90, limit = 20) => {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const popularBooks = await prisma.$queryRaw`
            SELECT 
                b.id AS "bookId",
                b.title,
                b.author,
                b.isbn,
                b.category,
                b.total_copies AS "totalCopies",
                b.available_copies AS "availableCopies",
                COUNT(DISTINCT t.id) AS "checkoutCount",
                COUNT(DISTINCT r.id) AS "reservationCount",
                MAX(t.checkout_date) AS "lastCheckout"
            FROM books b
            LEFT JOIN transactions t ON t.book_id = b.id AND t.checkout_date >= ${startDate}
            LEFT JOIN reservations r ON r.book_id = b.id AND r.created_at >= ${startDate}
            WHERE b.is_active = true
            GROUP BY b.id, b.title, b.author, b.isbn, b.category, b.total_copies, b.available_copies
            HAVING COUNT(DISTINCT t.id) > 0
            ORDER BY "checkoutCount" DESC, "reservationCount" DESC
            LIMIT ${limit}
        `;

        return popularBooks.map(book => ({
            bookId: book.bookId,
            title: book.title,
            author: book.author,
            isbn: book.isbn,
            category: book.category,
            totalCopies: book.totalCopies,
            availableCopies: book.availableCopies,
            checkoutCount: Number(book.checkoutCount),
            checkoutCount_formatted: formatNumberIndian(Number(book.checkoutCount)),
            reservationCount: Number(book.reservationCount),
            reservationCount_formatted: formatNumberIndian(Number(book.reservationCount)),
            utilizationRate: book.totalCopies > 0 
                ? ((Number(book.checkoutCount) / book.totalCopies) * 100).toFixed(2)
                : '0.00',
            utilizationRate_formatted: formatPercentageIndian(book.totalCopies > 0 
                ? ((Number(book.checkoutCount) / book.totalCopies) * 100)
                : 0),
            lastCheckout: book.lastCheckout,
            lastCheckout_formatted: formatDateTimeIndian(book.lastCheckout),
            lastCheckout_relative: getRelativeTimeIndian(book.lastCheckout)
        }));
    } catch (error) {
        throw new DatabaseError(`Failed to get most popular books: ${error.message}`);
    }
};

/**
 * Get least circulated books (potential for weeding)
 * Identifies books with low or no circulation
 * 
 * @param {number} days - Number of days to analyze (default: 180)
 * @param {number} limit - Number of books to return (default: 50)
 * @returns {Promise<Array>} Array of {bookId, title, author, checkoutCount, daysSinceLastCheckout}
 */
export const getLeastCirculatedBooks = async (days = 180, limit = 50) => {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const leastCirculated = await prisma.$queryRaw`
            SELECT 
                b.id AS "bookId",
                b.title,
                b.author,
                b.isbn,
                b.category,
                b.publication_year AS "publicationYear",
                b.total_copies AS "totalCopies",
                b.location,
                COUNT(DISTINCT t.id) AS "checkoutCount",
                MAX(t.checkout_date) AS "lastCheckout",
                EXTRACT(EPOCH FROM (NOW() - MAX(t.checkout_date)))/86400 AS "daysSinceLastCheckout"
            FROM books b
            LEFT JOIN transactions t ON t.book_id = b.id
            WHERE b.is_active = true 
                AND b.is_reference_only = false
            GROUP BY b.id, b.title, b.author, b.isbn, b.category, b.publication_year, b.total_copies, b.location
            ORDER BY "checkoutCount" ASC, "lastCheckout" ASC NULLS FIRST
            LIMIT ${limit}
        `;

        return leastCirculated.map(book => ({
            bookId: book.bookId,
            title: book.title,
            author: book.author,
            isbn: book.isbn,
            category: book.category,
            publicationYear: book.publicationYear,
            totalCopies: book.totalCopies,
            location: book.location,
            checkoutCount: Number(book.checkoutCount),
            checkoutCount_formatted: formatNumberIndian(Number(book.checkoutCount)),
            lastCheckout: book.lastCheckout,
            lastCheckout_formatted: formatDateTimeIndian(book.lastCheckout),
            lastCheckout_relative: getRelativeTimeIndian(book.lastCheckout),
            daysSinceLastCheckout: book.daysSinceLastCheckout ? Math.floor(book.daysSinceLastCheckout) : null,
            daysSinceLastCheckout_formatted: book.daysSinceLastCheckout 
                ? `${formatNumberIndian(Math.floor(book.daysSinceLastCheckout))} days` 
                : '-',
            recommendWeeding: book.daysSinceLastCheckout > 365 && Number(book.checkoutCount) < 3
        }));
    } catch (error) {
        throw new DatabaseError(`Failed to get least circulated books: ${error.message}`);
    }
};

/**
 * Get category performance breakdown
 * Analyzes circulation and availability by category
 * 
 * @param {number} days - Number of days to analyze (default: 90)
 * @returns {Promise<Array>} Array of {category, totalBooks, totalCheckouts, avgUtilization}
 */
export const getCategoryPerformance = async (days = 90) => {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const categoryStats = await prisma.$queryRaw`
            SELECT 
                b.category,
                COUNT(DISTINCT b.id) AS "totalBooks",
                SUM(b.total_copies) AS "totalCopies",
                SUM(b.available_copies) AS "availableCopies",
                COUNT(DISTINCT t.id) AS "totalCheckouts",
                COUNT(DISTINCT r.id) AS "totalReservations",
                COUNT(DISTINCT t.member_id) AS "uniqueMembers"
            FROM books b
            LEFT JOIN transactions t ON t.book_id = b.id AND t.checkout_date >= ${startDate}
            LEFT JOIN reservations r ON r.book_id = b.id AND r.created_at >= ${startDate}
            WHERE b.is_active = true AND b.category IS NOT NULL
            GROUP BY b.category
            ORDER BY "totalCheckouts" DESC
        `;

        return categoryStats.map(cat => {
            const totalCopies = Number(cat.totalCopies) || 1;
            const availableCopies = Number(cat.availableCopies) || 0;
            const totalCheckouts = Number(cat.totalCheckouts);
            const totalBooks = Number(cat.totalBooks);
            
            return {
                category: cat.category,
                totalBooks,
                totalBooks_formatted: formatNumberIndian(totalBooks),
                totalCopies,
                totalCopies_formatted: formatNumberIndian(totalCopies),
                availableCopies,
                availableCopies_formatted: formatNumberIndian(availableCopies),
                checkedOutCopies: totalCopies - availableCopies,
                checkedOutCopies_formatted: formatNumberIndian(totalCopies - availableCopies),
                utilizationRate: ((totalCopies - availableCopies) / totalCopies * 100).toFixed(2),
                utilizationRate_formatted: formatPercentageIndian((totalCopies - availableCopies) / totalCopies * 100),
                totalCheckouts,
                totalCheckouts_formatted: formatNumberIndian(totalCheckouts),
                totalReservations: Number(cat.totalReservations),
                totalReservations_formatted: formatNumberIndian(Number(cat.totalReservations)),
                uniqueMembers: Number(cat.uniqueMembers),
                uniqueMembers_formatted: formatNumberIndian(Number(cat.uniqueMembers)),
                checksPerBook: (totalCheckouts / totalBooks).toFixed(2)
            };
        });
    } catch (error) {
        throw new DatabaseError(`Failed to get category performance: ${error.message}`);
    }
};

/**
 * Get collection turnover rate
 * Measures how frequently books circulate
 * 
 * @param {number} months - Number of months to analyze (default: 12)
 * @returns {Promise<Object>} Turnover statistics object
 */
export const getCollectionTurnoverRate = async (months = 12) => {
    try {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);

        const turnoverStats = await prisma.$queryRaw`
            SELECT 
                COUNT(DISTINCT b.id) AS "totalBooks",
                SUM(b.total_copies) AS "totalCopies",
                COUNT(DISTINCT t.id) AS "totalCheckouts",
                COUNT(DISTINCT CASE WHEN t.checkout_date >= ${startDate} THEN b.id END) AS "circulatedBooks"
            FROM books b
            LEFT JOIN transactions t ON t.book_id = b.id
            WHERE b.is_active = true AND b.is_reference_only = false
        `;

        const stats = turnoverStats[0];
        const totalCopies = Number(stats.totalCopies) || 1;
        const totalCheckouts = Number(stats.totalCheckouts);
        const circulatedBooks = Number(stats.circulatedBooks);
        const totalBooks = Number(stats.totalBooks);

        return {
            period: `Last ${months} months`,
            totalBooks,
            totalBooks_formatted: formatNumberIndian(totalBooks),
            totalCopies,
            totalCopies_formatted: formatNumberIndian(totalCopies),
            totalCheckouts,
            totalCheckouts_formatted: formatNumberIndian(totalCheckouts),
            circulatedBooks,
            circulatedBooks_formatted: formatNumberIndian(circulatedBooks),
            nonCirculatedBooks: totalBooks - circulatedBooks,
            nonCirculatedBooks_formatted: formatNumberIndian(totalBooks - circulatedBooks),
            turnoverRate: (totalCheckouts / totalCopies).toFixed(2),
            circulationRate: ((circulatedBooks / totalBooks) * 100).toFixed(2),
            circulationRate_formatted: formatPercentageIndian((circulatedBooks / totalBooks) * 100),
            avgCheckoutsPerBook: (totalCheckouts / totalBooks).toFixed(2)
        };
    } catch (error) {
        throw new DatabaseError(`Failed to get collection turnover rate: ${error.message}`);
    }
};

/**
 * Get author popularity rankings
 * Ranks authors by total circulation
 * 
 * @param {number} days - Number of days to analyze (default: 90)
 * @param {number} limit - Number of top authors to return (default: 20)
 * @returns {Promise<Array>} Array of {author, bookCount, totalCheckouts, uniqueMembers}
 */
export const getAuthorPopularity = async (days = 90, limit = 20) => {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const authorStats = await prisma.$queryRaw`
            SELECT 
                b.author,
                COUNT(DISTINCT b.id) AS "bookCount",
                SUM(b.total_copies) AS "totalCopies",
                COUNT(DISTINCT t.id) AS "totalCheckouts",
                COUNT(DISTINCT t.member_id) AS "uniqueMembers",
                COUNT(DISTINCT r.id) AS "totalReservations"
            FROM books b
            LEFT JOIN transactions t ON t.book_id = b.id AND t.checkout_date >= ${startDate}
            LEFT JOIN reservations r ON r.book_id = b.id AND r.created_at >= ${startDate}
            WHERE b.is_active = true
            GROUP BY b.author
            HAVING COUNT(DISTINCT t.id) > 0
            ORDER BY "totalCheckouts" DESC
            LIMIT ${limit}
        `;

        return authorStats.map(author => ({
            author: author.author,
            bookCount: Number(author.bookCount),
            bookCount_formatted: formatNumberIndian(Number(author.bookCount)),
            totalCopies: Number(author.totalCopies),
            totalCopies_formatted: formatNumberIndian(Number(author.totalCopies)),
            totalCheckouts: Number(author.totalCheckouts),
            totalCheckouts_formatted: formatNumberIndian(Number(author.totalCheckouts)),
            uniqueMembers: Number(author.uniqueMembers),
            uniqueMembers_formatted: formatNumberIndian(Number(author.uniqueMembers)),
            totalReservations: Number(author.totalReservations),
            totalReservations_formatted: formatNumberIndian(Number(author.totalReservations)),
            avgCheckoutsPerBook: (Number(author.totalCheckouts) / Number(author.bookCount)).toFixed(2)
        }));
    } catch (error) {
        throw new DatabaseError(`Failed to get author popularity: ${error.message}`);
    }
};

/**
 * Get new acquisitions performance
 * Analyzes how well newly added books are performing
 * 
 * @param {number} months - Months to look back for "new" books (default: 6)
 * @returns {Promise<Array>} Array of new books with circulation metrics
 */
export const getNewAcquisitionsPerformance = async (months = 6) => {
    try {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);

        const newBooks = await prisma.$queryRaw`
            SELECT 
                b.id AS "bookId",
                b.title,
                b.author,
                b.isbn,
                b.category,
                b.created_at AS "addedDate",
                b.total_copies AS "totalCopies",
                b.available_copies AS "availableCopies",
                COUNT(DISTINCT t.id) AS "checkoutCount",
                COUNT(DISTINCT r.id) AS "reservationCount",
                MIN(t.checkout_date) AS "firstCheckout",
                MAX(t.checkout_date) AS "lastCheckout"
            FROM books b
            LEFT JOIN transactions t ON t.book_id = b.id
            LEFT JOIN reservations r ON r.book_id = b.id AND r.status = 'pending'
            WHERE b.is_active = true 
                AND b.created_at >= ${startDate}
            GROUP BY b.id, b.title, b.author, b.isbn, b.category, b.created_at, b.total_copies, b.available_copies
            ORDER BY b.created_at DESC
        `;

        return newBooks.map(book => {
            const daysSinceAdded = Math.floor((new Date() - new Date(book.addedDate)) / (1000 * 60 * 60 * 24));
            const checkoutCount = Number(book.checkoutCount);
            
            return {
                bookId: book.bookId,
                title: book.title,
                author: book.author,
                isbn: book.isbn,
                category: book.category,
                addedDate: book.addedDate,
                addedDate_formatted: formatDateIndian(book.addedDate),
                daysSinceAdded,
                daysSinceAdded_formatted: `${formatNumberIndian(daysSinceAdded)} days`,
                totalCopies: book.totalCopies,
                availableCopies: book.availableCopies,
                checkoutCount,
                checkoutCount_formatted: formatNumberIndian(checkoutCount),
                reservationCount: Number(book.reservationCount),
                reservationCount_formatted: formatNumberIndian(Number(book.reservationCount)),
                firstCheckout: book.firstCheckout,
                firstCheckout_formatted: formatDateTimeIndian(book.firstCheckout),
                lastCheckout: book.lastCheckout,
                lastCheckout_formatted: formatDateTimeIndian(book.lastCheckout),
                lastCheckout_relative: getRelativeTimeIndian(book.lastCheckout),
                daysUntilFirstCheckout: book.firstCheckout 
                    ? Math.floor((new Date(book.firstCheckout) - new Date(book.addedDate)) / (1000 * 60 * 60 * 24))
                    : null,
                checkoutsPerMonth: daysSinceAdded > 0 
                    ? ((checkoutCount / daysSinceAdded) * 30).toFixed(2)
                    : '0.00',
                performanceRating: checkoutCount >= 5 ? 'excellent' : checkoutCount >= 2 ? 'good' : checkoutCount >= 1 ? 'fair' : 'poor'
            };
        });
    } catch (error) {
        throw new DatabaseError(`Failed to get new acquisitions performance: ${error.message}`);
    }
};

/**
 * Get collection dashboard with comprehensive metrics
 * Combines multiple analytics into a single dashboard view
 * 
 * @param {number} days - Number of days to analyze (default: 30)
 * @returns {Promise<Object>} Dashboard object with collection metrics
 */
export const getCollectionDashboard = async (days = 30) => {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Get overall collection stats
        const collectionStats = await prisma.$queryRaw`
            SELECT 
                COUNT(DISTINCT b.id) AS "totalBooks",
                SUM(b.total_copies) AS "totalCopies",
                SUM(b.available_copies) AS "availableCopies",
                COUNT(DISTINCT CASE WHEN b.created_at >= ${startDate} THEN b.id END) AS "newBooks",
                COUNT(DISTINCT CASE WHEN b.is_reference_only THEN b.id END) AS "referenceBooks"
            FROM books b
            WHERE b.is_active = true
        `;

        // Get circulation stats
        const circulationStats = await prisma.$queryRaw`
            SELECT 
                COUNT(DISTINCT t.id) AS "totalCheckouts",
                COUNT(DISTINCT t.member_id) AS "uniqueMembers",
                COUNT(DISTINCT t.book_id) AS "circulatedBooks",
                COUNT(DISTINCT CASE WHEN t.status = 'checked_out' AND t.return_date IS NULL THEN t.id END) AS "currentlyBorrowed"
            FROM transactions t
            WHERE t.checkout_date >= ${startDate}
        `;

        // Get reservation stats
        const reservationStats = await prisma.$queryRaw`
            SELECT 
                COUNT(*) AS "totalReservations",
                COUNT(CASE WHEN status = 'active' THEN 1 END) AS "activeReservations",
                COUNT(CASE WHEN status = 'fulfilled' THEN 1 END) AS "fulfilledReservations"
            FROM reservations
            WHERE created_at >= ${startDate}
        `;

        const collection = collectionStats[0];
        const circulation = circulationStats[0];
        const reservations = reservationStats[0];

        const totalCopies = Number(collection.totalCopies) || 1;
        const availableCopies = Number(collection.availableCopies) || 0;

        return {
            period: `Last ${days} days`,
            collection: {
                totalBooks: Number(collection.totalBooks),
                totalBooks_formatted: formatNumberIndian(Number(collection.totalBooks)),
                totalCopies,
                totalCopies_formatted: formatNumberIndian(totalCopies),
                availableCopies,
                availableCopies_formatted: formatNumberIndian(availableCopies),
                checkedOutCopies: totalCopies - availableCopies,
                checkedOutCopies_formatted: formatNumberIndian(totalCopies - availableCopies),
                utilizationRate: ((totalCopies - availableCopies) / totalCopies * 100).toFixed(2),
                utilizationRate_formatted: formatPercentageIndian((totalCopies - availableCopies) / totalCopies * 100),
                newBooks: Number(collection.newBooks),
                newBooks_formatted: formatNumberIndian(Number(collection.newBooks)),
                referenceBooks: Number(collection.referenceBooks),
                referenceBooks_formatted: formatNumberIndian(Number(collection.referenceBooks))
            },
            circulation: {
                totalCheckouts: Number(circulation.totalCheckouts),
                totalCheckouts_formatted: formatNumberIndian(Number(circulation.totalCheckouts)),
                uniqueMembers: Number(circulation.uniqueMembers),
                uniqueMembers_formatted: formatNumberIndian(Number(circulation.uniqueMembers)),
                circulatedBooks: Number(circulation.circulatedBooks),
                circulatedBooks_formatted: formatNumberIndian(Number(circulation.circulatedBooks)),
                currentlyBorrowed: Number(circulation.currentlyBorrowed),
                currentlyBorrowed_formatted: formatNumberIndian(Number(circulation.currentlyBorrowed)),
                avgCheckoutsPerMember: (Number(circulation.totalCheckouts) / Number(circulation.uniqueMembers) || 1).toFixed(2)
            },
            reservations: {
                totalReservations: Number(reservations.totalReservations),
                totalReservations_formatted: formatNumberIndian(Number(reservations.totalReservations)),
                activeReservations: Number(reservations.activeReservations),
                activeReservations_formatted: formatNumberIndian(Number(reservations.activeReservations)),
                fulfilledReservations: Number(reservations.fulfilledReservations),
                fulfilledReservations_formatted: formatNumberIndian(Number(reservations.fulfilledReservations)),
                fulfillmentRate: reservations.totalReservations > 0
                    ? ((Number(reservations.fulfilledReservations) / Number(reservations.totalReservations)) * 100).toFixed(2)
                    : '0.00',
                fulfillmentRate_formatted: formatPercentageIndian(reservations.totalReservations > 0
                    ? ((Number(reservations.fulfilledReservations) / Number(reservations.totalReservations)) * 100)
                    : 0)
            }
        };
    } catch (error) {
        throw new DatabaseError(`Failed to get collection dashboard: ${error.message}`);
    }
};

/**
 * Get availability forecast
 * Predicts when popular books might become available
 * 
 * @param {number} limit - Number of books to analyze (default: 20)
 * @returns {Promise<Array>} Array of books with availability predictions
 */
export const getAvailabilityForecast = async (limit = 20) => {
    try {
        const forecast = await prisma.$queryRaw`
            SELECT 
                b.id AS "bookId",
                b.title,
                b.author,
                b.total_copies AS "totalCopies",
                b.available_copies AS "availableCopies",
                COUNT(DISTINCT r.id) AS "waitlistCount",
                COUNT(DISTINCT CASE WHEN t.status = 'checked_out' AND t.return_date IS NULL THEN t.id END) AS "currentlyBorrowed",
                AVG(EXTRACT(EPOCH FROM (t.return_date - t.checkout_date))/86400) AS "avgLoanDays",
                MIN(t.due_date) AS "earliestDueDate"
            FROM books b
            LEFT JOIN reservations r ON r.book_id = b.id AND r.status = 'pending'
            LEFT JOIN transactions t ON t.book_id = b.id AND t.status = 'checked_out' AND t.return_date IS NULL
            WHERE b.is_active = true 
                AND b.available_copies = 0
            GROUP BY b.id, b.title, b.author, b.total_copies, b.available_copies
            HAVING COUNT(DISTINCT r.id) > 0
            ORDER BY "waitlistCount" DESC, "earliestDueDate" ASC
            LIMIT ${limit}
        `;

        return forecast.map(book => ({
            bookId: book.bookId,
            title: book.title,
            author: book.author,
            totalCopies: book.totalCopies,
            availableCopies: book.availableCopies,
            waitlistCount: Number(book.waitlistCount),
            waitlistCount_formatted: formatNumberIndian(Number(book.waitlistCount)),
            currentlyBorrowed: Number(book.currentlyBorrowed),
            currentlyBorrowed_formatted: formatNumberIndian(Number(book.currentlyBorrowed)),
            avgLoanDays: book.avgLoanDays ? Math.floor(book.avgLoanDays) : null,
            avgLoanDays_formatted: book.avgLoanDays ? `${Math.floor(book.avgLoanDays)} days` : '-',
            earliestDueDate: book.earliestDueDate,
            earliestDueDate_formatted: formatDateIndian(book.earliestDueDate),
            daysUntilAvailable: book.earliestDueDate 
                ? Math.max(0, Math.floor((new Date(book.earliestDueDate) - new Date()) / (1000 * 60 * 60 * 24)))
                : null,
            daysUntilAvailable_formatted: book.earliestDueDate 
                ? `${Math.max(0, Math.floor((new Date(book.earliestDueDate) - new Date()) / (1000 * 60 * 60 * 24)))} days`
                : '-',
            demandLevel: Number(book.waitlistCount) > 5 ? 'high' : Number(book.waitlistCount) > 2 ? 'medium' : 'low',
            recommendPurchase: Number(book.waitlistCount) > book.totalCopies * 2
        }));
    } catch (error) {
        throw new DatabaseError(`Failed to get availability forecast: ${error.message}`);
    }
};

export default {
    getMostPopularBooks,
    getLeastCirculatedBooks,
    getCategoryPerformance,
    getCollectionTurnoverRate,
    getAuthorPopularity,
    getNewAcquisitionsPerformance,
    getCollectionDashboard,
    getAvailabilityForecast
};
