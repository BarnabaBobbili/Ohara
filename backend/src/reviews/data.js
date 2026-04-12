import prisma from '../db/prisma.js';
import { getMongoDatabase } from '../db/mongodb.js';
import { createHttpError, reviewRatingKey } from './common.js';

export const getReviewCollections = () => {
    const database = getMongoDatabase();
    if (!database) {
        throw createHttpError(503, 'MongoDB is not available');
    }

    return {
        reviews: database.collection('reviews'),
        reactions: database.collection('review_reactions'),
    };
};

export const fetchBooksByIds = async (bookIds) => {
    const uniqueBookIds = [...new Set(bookIds.filter((bookId) => Number.isInteger(bookId)))];
    if (uniqueBookIds.length === 0) return new Map();

    const books = await prisma.books.findMany({
        where: { id: { in: uniqueBookIds } },
        select: {
            id: true,
            title: true,
            author: true,
            cover_image_url: true,
            category: true,
            publication_year: true,
        },
    });

    return new Map(books.map((book) => [book.id, book]));
};

export const fetchRatingsMap = async (reviewDocs) => {
    const bookIds = [...new Set(reviewDocs.map((review) => review.book_id).filter((bookId) => Number.isInteger(bookId)))];
    const memberIds = [...new Set(reviewDocs.map((review) => review.member_id).filter((memberId) => Number.isInteger(memberId)))];

    if (bookIds.length === 0 || memberIds.length === 0) {
        return new Map();
    }

    const ratings = await prisma.book_ratings.findMany({
        where: {
            book_id: { in: bookIds },
            member_id: { in: memberIds },
        },
        select: {
            book_id: true,
            member_id: true,
            rating: true,
        },
    });

    return new Map(
        ratings.map((rating) => [reviewRatingKey(rating.book_id, rating.member_id), rating.rating])
    );
};

export const fetchViewerReactionIds = async (reactionsCollection, reviewIds, viewerId) => {
    if (!viewerId || reviewIds.length === 0) return new Set();

    const reactions = await reactionsCollection
        .find({
            review_id: { $in: reviewIds },
            member_id: viewerId,
            type: 'like',
        })
        .project({ review_id: 1 })
        .toArray();

    return new Set(reactions.map((reaction) => reaction.review_id));
};
