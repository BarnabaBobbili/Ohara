import express from 'express';
import prisma from '../db/prisma.js';
import { resolveMember, tryAuthenticateToken } from '../middleware/auth.js';
import {
    parseInteger,
    parsePagination,
    reviewRatingKey,
    serializeReview,
} from './common.js';
import {
    fetchBooksByIds,
    fetchRatingsMap,
    fetchViewerReactionIds,
    getReviewCollections,
} from './data.js';

const router = express.Router();

router.get('/book/:bookId/summary', async (req, res) => {
    try {
        const bookId = parseInteger(req.params.bookId);
        if (!Number.isInteger(bookId)) {
            return res.status(400).json({ detail: 'Valid book id is required' });
        }

        const book = await prisma.books.findUnique({ where: { id: bookId }, select: { id: true } });
        if (!book) {
            return res.status(404).json({ detail: 'Book not found' });
        }

        const { reviews } = getReviewCollections();
        const [aggregate, distribution, totalReviews] = await Promise.all([
            prisma.book_ratings.aggregate({
                where: { book_id: bookId },
                _avg: { rating: true },
                _count: { rating: true },
            }),
            prisma.book_ratings.groupBy({
                by: ['rating'],
                where: { book_id: bookId },
                _count: { rating: true },
            }),
            reviews.countDocuments({ book_id: bookId, status: 'approved' }),
        ]);

        const totalRatings = aggregate._count.rating || 0;
        const countsByRating = new Map(distribution.map((entry) => [entry.rating, entry._count.rating || 0]));
        const rating_distribution = [5, 4, 3, 2, 1].map((rating) => {
            const count = countsByRating.get(rating) || 0;
            return {
                rating,
                count,
                percentage: totalRatings > 0 ? Math.round((count / totalRatings) * 100) : 0,
            };
        });

        return res.json({
            book_id: bookId,
            average_rating: Number(aggregate._avg.rating || 0),
            total_ratings: totalRatings,
            total_reviews: totalReviews,
            rating_distribution,
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ detail: error.message });
    }
});

router.get('/book/:bookId', async (req, res) => {
    try {
        const bookId = parseInteger(req.params.bookId);
        if (!Number.isInteger(bookId)) {
            return res.status(400).json({ detail: 'Valid book id is required' });
        }

        const sort = ['newest', 'popular', 'rating'].includes(req.query.sort) ? req.query.sort : 'newest';
        const ratingFilter = parseInteger(req.query.rating);
        const pagination = parsePagination(req.query, { defaultLimit: 10, maxLimit: 30 });

        let viewer = null;
        if (req.headers.authorization && tryAuthenticateToken(req)) {
            viewer = await resolveMember(req);
        }

        const { reviews, reactions } = getReviewCollections();
        const reviewDocs = await reviews
            .find({ book_id: bookId, status: 'approved' })
            .sort(sort === 'popular' ? { likes_count: -1, created_at: -1 } : { created_at: -1 })
            .toArray();

        const [ratingsMap, bookMap] = await Promise.all([
            fetchRatingsMap(reviewDocs),
            fetchBooksByIds([bookId]),
        ]);
        if (!bookMap.has(bookId)) {
            return res.status(404).json({ detail: 'Book not found' });
        }

        let filteredReviews = reviewDocs;
        if (Number.isInteger(ratingFilter) && ratingFilter >= 1 && ratingFilter <= 5) {
            filteredReviews = filteredReviews.filter(
                (review) => (ratingsMap.get(reviewRatingKey(review.book_id, review.member_id)) || 0) === ratingFilter
            );
        }

        if (sort === 'rating') {
            filteredReviews = [...filteredReviews].sort((left, right) => {
                const leftRating = ratingsMap.get(reviewRatingKey(left.book_id, left.member_id)) || 0;
                const rightRating = ratingsMap.get(reviewRatingKey(right.book_id, right.member_id)) || 0;
                if (rightRating !== leftRating) return rightRating - leftRating;
                return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
            });
        }

        const total = filteredReviews.length;
        const pagedReviews = filteredReviews.slice(pagination.skip, pagination.skip + pagination.limit);
        const viewerReactionIds = await fetchViewerReactionIds(
            reactions,
            pagedReviews.map((review) => review._id.toString()),
            viewer?.id || null
        );

        return res.json({
            reviews: pagedReviews.map((review) => serializeReview({
                review,
                ratingsMap,
                bookMap,
                viewerReactionIds,
                viewerId: viewer?.id || null,
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

export default router;
