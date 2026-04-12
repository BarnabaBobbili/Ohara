import express from 'express';
import prisma from '../db/prisma.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import {
    parseBoolean,
    parseInteger,
    parsePagination,
    ensureReviewId,
    removeCommentFromReview,
    REVIEW_STATUSES,
    serializeReview,
    sanitizeCommentText,
} from './common.js';
import {
    fetchBooksByIds,
    fetchRatingsMap,
    fetchViewerReactionIds,
    getReviewCollections,
} from './data.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireAdmin);

router.get('/admin/all', async (req, res) => {
    try {
        const pagination = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
        const { reviews, reactions } = getReviewCollections();

        const mongoQuery = {};
        if (typeof req.query.status === 'string' && REVIEW_STATUSES.has(req.query.status)) mongoQuery.status = req.query.status;

        const bookId = parseInteger(req.query.book_id);
        const memberId = parseInteger(req.query.member_id);
        if (Number.isInteger(bookId)) mongoQuery.book_id = bookId;
        if (Number.isInteger(memberId)) mongoQuery.member_id = memberId;
        if (parseBoolean(req.query.flagged, false)) mongoQuery.status = 'flagged';

        const createdAtFilter = {};
        if (typeof req.query.startDate === 'string') {
            const startDate = new Date(req.query.startDate);
            if (!Number.isNaN(startDate.getTime())) createdAtFilter.$gte = startDate;
        }
        if (typeof req.query.endDate === 'string') {
            const endDate = new Date(req.query.endDate);
            if (!Number.isNaN(endDate.getTime())) createdAtFilter.$lte = endDate;
        }
        if (Object.keys(createdAtFilter).length > 0) mongoQuery.created_at = createdAtFilter;

        const reviewDocs = await reviews.find(mongoQuery).sort({ created_at: -1 }).toArray();
        const [ratingsMap, bookMap] = await Promise.all([
            fetchRatingsMap(reviewDocs),
            fetchBooksByIds(reviewDocs.map((review) => review.book_id)),
        ]);

        const search = sanitizeCommentText(req.query.search).toLowerCase();
        const bookFilter = sanitizeCommentText(req.query.book).toLowerCase();
        const memberFilter = sanitizeCommentText(req.query.member).toLowerCase();

        let filteredReviews = reviewDocs.filter((review) => {
            const book = bookMap.get(review.book_id);
            const matchesBook = !bookFilter || book?.title?.toLowerCase().includes(bookFilter);
            const matchesMember = !memberFilter || review.member_name?.toLowerCase().includes(memberFilter);
            if (!matchesBook || !matchesMember) return false;

            if (!search) return true;
            return [
                review.review_text,
                review.member_name,
                book?.title,
                book?.author,
                review.flagged_reason,
                review.admin_notes,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(search);
        });

        const total = filteredReviews.length;
        filteredReviews = filteredReviews.slice(pagination.skip, pagination.skip + pagination.limit);
        const viewerReactionIds = await fetchViewerReactionIds(
            reactions,
            filteredReviews.map((review) => review._id.toString()),
            req.actor.id
        );

        return res.json({
            reviews: filteredReviews.map((review) => serializeReview({
                review,
                ratingsMap,
                bookMap,
                viewerReactionIds,
                viewerId: req.actor.id,
            })),
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total,
                has_more: pagination.skip + pagination.limit < total,
            },
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ detail: error.message });
    }
});

router.get('/admin/stats', async (req, res) => {
    try {
        const { reviews } = getReviewCollections();
        const [totalReviews, pendingReviews, flaggedReviews, removedReviews, aggregate] = await Promise.all([
            reviews.countDocuments({}),
            reviews.countDocuments({ status: 'pending' }),
            reviews.countDocuments({ status: 'flagged' }),
            reviews.countDocuments({ status: 'removed' }),
            prisma.book_ratings.aggregate({ _avg: { rating: true }, _count: { rating: true } }),
        ]);

        return res.json({
            total_reviews: totalReviews,
            pending_reviews: pendingReviews,
            flagged_reviews: flaggedReviews,
            removed_reviews: removedReviews,
            average_rating_overall: Number(aggregate._avg.rating || 0),
            rating_count: aggregate._count.rating || 0,
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ detail: error.message });
    }
});

router.patch('/admin/:reviewId/status', async (req, res) => {
    try {
        const reviewObjectId = ensureReviewId(req.params.reviewId);
        const status = typeof req.body?.status === 'string' ? req.body.status : '';
        const adminNotes = typeof req.body?.admin_notes === 'string' ? req.body.admin_notes.trim() : null;
        if (!REVIEW_STATUSES.has(status)) return res.status(400).json({ detail: 'Invalid review status' });

        const { reviews } = getReviewCollections();
        const review = await reviews.findOne({ _id: reviewObjectId });
        if (!review) return res.status(404).json({ detail: 'Review not found' });

        await reviews.updateOne(
            { _id: reviewObjectId },
            { $set: { status, admin_notes: adminNotes, flagged_reason: status === 'approved' ? null : review.flagged_reason || null, updated_at: new Date() } }
        );

        const updatedReview = await reviews.findOne({ _id: reviewObjectId });
        const [ratingsMap, bookMap] = await Promise.all([fetchRatingsMap([updatedReview]), fetchBooksByIds([updatedReview.book_id])]);
        return res.json(serializeReview({ review: updatedReview, ratingsMap, bookMap, viewerId: req.actor.id }));
    } catch (error) {
        return res.status(error.statusCode || 500).json({ detail: error.message });
    }
});

router.delete('/admin/:reviewId', async (req, res) => {
    try {
        const reviewObjectId = ensureReviewId(req.params.reviewId);
        const { reviews, reactions } = getReviewCollections();
        const review = await reviews.findOne({ _id: reviewObjectId });
        if (!review) return res.status(404).json({ detail: 'Review not found' });

        await Promise.all([
            reviews.deleteOne({ _id: reviewObjectId }),
            reactions.deleteMany({ review_id: reviewObjectId.toString() }),
            prisma.book_ratings.deleteMany({ where: { book_id: review.book_id, member_id: review.member_id } }),
        ]);

        return res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ detail: error.message });
    }
});

router.delete('/admin/:reviewId/comments/:commentId', async (req, res) => {
    try {
        const reviewObjectId = ensureReviewId(req.params.reviewId);
        const { reviews } = getReviewCollections();
        const review = await reviews.findOne({ _id: reviewObjectId });
        if (!review) return res.status(404).json({ detail: 'Review not found' });

        const { comments, removedCount } = removeCommentFromReview(review, req.params.commentId, req.actor, true);
        await reviews.updateOne(
            { _id: reviewObjectId },
            { $set: { comments, comments_count: Math.max(Number(review.comments_count || 0) - removedCount, 0), updated_at: new Date() } }
        );

        return res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ detail: error.message });
    }
});

export default router;
