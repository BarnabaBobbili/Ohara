import crypto from 'crypto';
import express from 'express';
import prisma from '../db/prisma.js';
import { removeReviewLikeFromNeo4j, syncReviewLikeToNeo4j } from '../db/neo4j.js';
import { authenticateToken, requireMember } from '../middleware/auth.js';
import {
    buildAvatarInitials,
    cloneComments,
    ensureReviewId,
    findCommentOrReply,
    removeCommentFromReview,
    reviewRatingKey,
    serializeReview,
    validateCommentPayload,
    validateReviewPayload,
    sanitizeCommentText,
} from './common.js';
import { fetchBooksByIds, getReviewCollections } from './data.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireMember);

router.get('/my', async (req, res) => {
    try {
        const { reviews } = getReviewCollections();
        const reviewDocs = await reviews.find({ member_id: req.actor.id }).sort({ created_at: -1 }).toArray();
        const bookMap = await fetchBooksByIds(reviewDocs.map((review) => review.book_id));
        const ratingsMap = new Map(reviewDocs.map((review) => [reviewRatingKey(review.book_id, review.member_id), 0]));

        const ratings = await prisma.book_ratings.findMany({
            where: { member_id: req.actor.id },
            select: { book_id: true, member_id: true, rating: true },
        });
        ratings.forEach((rating) => ratingsMap.set(reviewRatingKey(rating.book_id, rating.member_id), rating.rating));

        return res.json(reviewDocs.map((review) => serializeReview({
            review,
            ratingsMap,
            bookMap,
            viewerId: req.actor.id,
        })));
    } catch (error) {
        return res.status(error.statusCode || 500).json({ detail: error.message });
    }
});

router.post('/', async (req, res) => {
    let createdRating = null;
    try {
        const payload = validateReviewPayload(req.body || {});
        const book = await prisma.books.findUnique({
            where: { id: payload.book_id },
            select: { id: true, title: true, author: true, cover_image_url: true, category: true },
        });
        if (!book) return res.status(404).json({ detail: 'Book not found' });

        const { reviews } = getReviewCollections();
        const existingReview = await reviews.findOne({ book_id: payload.book_id, member_id: req.actor.id });
        if (existingReview) return res.status(409).json({ detail: 'You have already reviewed this book' });

        createdRating = await prisma.book_ratings.create({
            data: { book_id: payload.book_id, member_id: req.actor.id, rating: payload.rating },
        });

        const now = new Date();
        const reviewDocument = {
            book_id: payload.book_id,
            member_id: req.actor.id,
            member_name: req.actor.name,
            member_avatar_initials: buildAvatarInitials(req.actor.name),
            review_text: payload.review_text,
            spoiler: payload.spoiler,
            giphy_attachments: payload.giphy_attachments,
            comments: [],
            likes_count: 0,
            comments_count: 0,
            status: 'approved',
            flagged_reason: null,
            admin_notes: null,
            created_at: now,
            updated_at: now,
        };

        const insertResult = await reviews.insertOne(reviewDocument);
        const createdReview = await reviews.findOne({ _id: insertResult.insertedId });
        const ratingsMap = new Map([[reviewRatingKey(payload.book_id, req.actor.id), payload.rating]]);

        return res.status(201).json(serializeReview({
            review: createdReview,
            ratingsMap,
            bookMap: new Map([[book.id, book]]),
            viewerId: req.actor.id,
        }));
    } catch (error) {
        if (createdRating) await prisma.book_ratings.delete({ where: { id: createdRating.id } }).catch(() => {});
        return res.status(error.code === 'P2002' || error.code === 11000 ? 409 : error.statusCode || 500)
            .json({ detail: error.code === 'P2002' || error.code === 11000 ? 'You have already reviewed this book' : error.message });
    }
});

router.put('/:reviewId', async (req, res) => {
    try {
        const reviewObjectId = ensureReviewId(req.params.reviewId);
        const { reviews } = getReviewCollections();
        const review = await reviews.findOne({ _id: reviewObjectId });
        if (!review) return res.status(404).json({ detail: 'Review not found' });
        if (review.member_id !== req.actor.id) return res.status(403).json({ detail: 'You can only edit your own review' });

        const payload = validateReviewPayload({ ...req.body, book_id: review.book_id });
        const now = new Date();
        await Promise.all([
            reviews.updateOne(
                { _id: reviewObjectId },
                { $set: { review_text: payload.review_text, spoiler: payload.spoiler, giphy_attachments: payload.giphy_attachments, updated_at: now } }
            ),
            prisma.book_ratings.updateMany({
                where: { book_id: review.book_id, member_id: req.actor.id },
                data: { rating: payload.rating, updated_at: now },
            }),
        ]);

        const updatedReview = await reviews.findOne({ _id: reviewObjectId });
        const bookMap = await fetchBooksByIds([review.book_id]);
        return res.json(serializeReview({
            review: updatedReview,
            ratingsMap: new Map([[reviewRatingKey(review.book_id, req.actor.id), payload.rating]]),
            bookMap,
            viewerId: req.actor.id,
        }));
    } catch (error) {
        return res.status(error.statusCode || 500).json({ detail: error.message });
    }
});

router.delete('/:reviewId', async (req, res) => {
    try {
        const reviewObjectId = ensureReviewId(req.params.reviewId);
        const { reviews, reactions } = getReviewCollections();
        const review = await reviews.findOne({ _id: reviewObjectId });
        if (!review) return res.status(404).json({ detail: 'Review not found' });
        if (review.member_id !== req.actor.id) return res.status(403).json({ detail: 'You can only delete your own review' });

        await Promise.all([
            reviews.deleteOne({ _id: reviewObjectId }),
            reactions.deleteMany({ review_id: reviewObjectId.toString() }),
            prisma.book_ratings.deleteMany({ where: { book_id: review.book_id, member_id: req.actor.id } }),
        ]);

        return res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ detail: error.message });
    }
});

router.post('/:reviewId/comments', async (req, res) => {
    try {
        const reviewObjectId = ensureReviewId(req.params.reviewId);
        const payload = validateCommentPayload(req.body || {});
        const { reviews } = getReviewCollections();
        const review = await reviews.findOne({ _id: reviewObjectId });

        if (!review) return res.status(404).json({ detail: 'Review not found' });
        if (review.status !== 'approved') return res.status(400).json({ detail: 'Comments can only be added to approved reviews' });

        const comment = {
            comment_id: crypto.randomUUID(),
            member_id: req.actor.id,
            member_name: req.actor.name,
            member_avatar_initials: buildAvatarInitials(req.actor.name),
            text: payload.text,
            giphy_attachment: payload.giphy_attachment,
            created_at: new Date(),
            replies: [],
        };

        await reviews.updateOne(
            { _id: reviewObjectId },
            { $push: { comments: comment }, $inc: { comments_count: 1 }, $set: { updated_at: new Date() } }
        );

        return res.status(201).json(comment);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ detail: error.message });
    }
});

router.post('/:reviewId/comments/:commentId/replies', async (req, res) => {
    try {
        const reviewObjectId = ensureReviewId(req.params.reviewId);
        const payload = validateCommentPayload(req.body || {});
        const { reviews } = getReviewCollections();
        const review = await reviews.findOne({ _id: reviewObjectId });
        const commentMatch = review ? findCommentOrReply(review, req.params.commentId) : null;

        if (!review) return res.status(404).json({ detail: 'Review not found' });
        if (review.status !== 'approved') return res.status(400).json({ detail: 'Replies can only be added to approved reviews' });
        if (!commentMatch || commentMatch.type !== 'comment') return res.status(404).json({ detail: 'Parent comment not found' });

        const comments = cloneComments(review.comments);
        const reply = {
            comment_id: crypto.randomUUID(),
            member_id: req.actor.id,
            member_name: req.actor.name,
            member_avatar_initials: buildAvatarInitials(req.actor.name),
            text: payload.text,
            giphy_attachment: payload.giphy_attachment,
            created_at: new Date(),
        };

        comments[commentMatch.commentIndex].replies = [...(comments[commentMatch.commentIndex].replies || []), reply];
        await reviews.updateOne(
            { _id: reviewObjectId },
            { $set: { comments, updated_at: new Date() }, $inc: { comments_count: 1 } }
        );

        return res.status(201).json(reply);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ detail: error.message });
    }
});

router.delete('/:reviewId/comments/:commentId', async (req, res) => {
    try {
        const reviewObjectId = ensureReviewId(req.params.reviewId);
        const { reviews } = getReviewCollections();
        const review = await reviews.findOne({ _id: reviewObjectId });

        if (!review) return res.status(404).json({ detail: 'Review not found' });

        const { comments, removedCount } = removeCommentFromReview(review, req.params.commentId, req.actor, false);
        await reviews.updateOne(
            { _id: reviewObjectId },
            { $set: { comments, comments_count: Math.max(Number(review.comments_count || 0) - removedCount, 0), updated_at: new Date() } }
        );

        return res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ detail: error.message });
    }
});

router.post('/:reviewId/like', async (req, res) => {
    try {
        const reviewObjectId = ensureReviewId(req.params.reviewId);
        const { reviews, reactions } = getReviewCollections();
        const review = await reviews.findOne({ _id: reviewObjectId });

        if (!review) return res.status(404).json({ detail: 'Review not found' });
        if (review.status === 'removed') return res.status(400).json({ detail: 'This review is not available' });

        let liked = true;
        try {
            await reactions.insertOne({ review_id: reviewObjectId.toString(), member_id: req.actor.id, type: 'like', created_at: new Date() });
            await reviews.updateOne({ _id: reviewObjectId }, { $inc: { likes_count: 1 }, $set: { updated_at: new Date() } });
            syncReviewLikeToNeo4j(req.actor.id, review.book_id).catch(() => {});
        } catch (error) {
            if (error.code !== 11000) throw error;
            liked = false;
            await reactions.deleteOne({ review_id: reviewObjectId.toString(), member_id: req.actor.id, type: 'like' });
            await reviews.updateOne({ _id: reviewObjectId }, { $inc: { likes_count: -1 }, $set: { updated_at: new Date() } });
            removeReviewLikeFromNeo4j(req.actor.id, review.book_id).catch(() => {});
        }

        const updatedReview = await reviews.findOne({ _id: reviewObjectId });
        return res.json({ liked, likes_count: Math.max(Number(updatedReview?.likes_count || 0), 0) });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ detail: error.message });
    }
});

router.post('/:reviewId/flag', async (req, res) => {
    try {
        const reviewObjectId = ensureReviewId(req.params.reviewId);
        const reason = sanitizeCommentText(req.body?.reason);
        const { reviews } = getReviewCollections();
        const review = await reviews.findOne({ _id: reviewObjectId });

        if (reason.length < 3) return res.status(400).json({ detail: 'A moderation reason is required' });
        if (!review) return res.status(404).json({ detail: 'Review not found' });
        if (review.member_id === req.actor.id) return res.status(400).json({ detail: 'You cannot flag your own review' });

        await reviews.updateOne(
            { _id: reviewObjectId },
            { $set: { status: 'flagged', flagged_reason: reason, updated_at: new Date() } }
        );

        return res.json({ message: 'Review flagged for moderation' });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ detail: error.message });
    }
});

export default router;
