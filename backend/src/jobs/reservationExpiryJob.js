/**
 * Reservation Expiry Job
 * 
 * Runs daily to expire unclaimed reservations after hold period
 * Updates reservation status and notifies next in queue
 * 
 * Schedule: Daily at 4:00 AM IST
 */

import prisma from '../db/prisma.js';
import { logActivity } from '../db/activityLogger.js';
import { formatDateTimeIndian, formatDateIndian, formatNumberIndian } from '../utils/indianLocale.js';

/**
 * Execute the reservation expiry job
 * Expires reservations that are 'ready' but not picked up within hold period (default: 2 days)
 * 
 * @returns {Promise<Object>} Job execution result
 */
export const executeReservationExpiryJob = async () => {
    const startTime = Date.now();
    const executedAt = new Date();
    console.log(`[CRON] Starting reservation expiry job at ${formatDateTimeIndian(executedAt)}...`);
    
    try {
        // Find reservations that should be expired
        // Status = 'ready' and notified_at is more than 2 days ago
        const holdPeriodDays = parseInt(process.env.RESERVATION_HOLD_DAYS || '2', 10);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() - holdPeriodDays);
        
        const expiredReservations = await prisma.reservations.findMany({
            where: {
                status: 'ready',
                notified_at: {
                    lt: expiryDate
                }
            },
            include: {
                books: {
                    select: {
                        id: true,
                        title: true,
                        isbn: true
                    }
                },
                members: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        card_id: true
                    }
                }
            }
        });
        
        let expiredCount = 0;
        
        // Expire each reservation
        for (const reservation of expiredReservations) {
            try {
                await prisma.reservations.update({
                    where: { id: reservation.id },
                    data: {
                        status: 'expired',
                        updated_at: new Date()
                    }
                });
                
                // Log activity
                logActivity({
                    action: 'reservation_expired',
                    entity_type: 'reservation',
                    entity_id: reservation.id,
                    entity_details: {
                        title: reservation.books.title,
                        name: reservation.members.name,
                        card_id: reservation.members.card_id
                    },
                    performed_by: 'system',
                    metadata: {
                        book_id: reservation.book_id,
                        member_id: reservation.member_id,
                        reserved_date: reservation.created_at,
                        reserved_date_formatted: formatDateIndian(reservation.created_at),
                        notified_at: reservation.notified_at,
                        notified_at_formatted: formatDateTimeIndian(reservation.notified_at),
                        hold_period_days: holdPeriodDays
                    }
                });
                
                expiredCount++;
                
                console.log(`[CRON]   - Expired reservation ${reservation.id} for "${reservation.books.title}" (Member: ${reservation.members.name})`);
            } catch (error) {
                console.error(`[CRON]   - Failed to expire reservation ${reservation.id}:`, error.message);
            }
        }
        
        const duration = Date.now() - startTime;
        
        console.log(`[CRON] ✓ Reservation expiry completed in ${duration}ms`);
        console.log(`[CRON]   - Reservations expired: ${formatNumberIndian(expiredCount)}`);
        
        return {
            success: true,
            jobName: 'reservationExpiry',
            executedAt,
            executedAt_formatted: formatDateTimeIndian(executedAt),
            duration,
            result: {
                reservationsExpired: expiredCount,
                reservationsExpired_formatted: formatNumberIndian(expiredCount),
                holdPeriodDays,
                message: `Expired ${formatNumberIndian(expiredCount)} unclaimed reservations`
            }
        };
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[CRON] ✗ Reservation expiry job error:`, error.message);
        
        return {
            success: false,
            jobName: 'reservationExpiry',
            executedAt,
            executedAt_formatted: formatDateTimeIndian(executedAt),
            duration,
            error: error.message
        };
    }
};

export default {
    executeReservationExpiryJob
};
