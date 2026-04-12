import { ObjectId } from 'mongodb';

export const REVIEW_STATUSES = new Set(['pending', 'approved', 'flagged', 'removed']);

export const createHttpError = (statusCode, detail) => {
    const error = new Error(detail);
    error.statusCode = statusCode;
    return error;
};

export const parseInteger = (value) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) ? parsed : null;
};

export const parseBoolean = (value, fallback = false) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;
    }
    return fallback;
};

export const parsePagination = (query, defaults = {}) => {
    const defaultLimit = defaults.defaultLimit || 10;
    const maxLimit = defaults.maxLimit || 50;
    const requestedLimit = parseInteger(query.limit);
    const limit = Math.min(Math.max(requestedLimit || defaultLimit, 1), maxLimit);

    const requestedPage = parseInteger(query.page);
    const requestedSkip = parseInteger(query.skip);
    const skip = requestedSkip !== null ? Math.max(requestedSkip, 0) : Math.max(((requestedPage || 1) - 1) * limit, 0);
    const page = Math.floor(skip / limit) + 1;

    return { limit, skip, page };
};

export const buildAvatarInitials = (name) => {
    const parts = String(name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2);

    if (parts.length === 0) return '??';
    return parts.map((part) => part[0]?.toUpperCase() || '').join('');
};

export const sanitizeReviewText = (value) => (typeof value === 'string' ? value.trim() : '');
export const sanitizeCommentText = (value) => (typeof value === 'string' ? value.trim() : '');

export const normalizeGiphyAttachment = (attachment) => {
    if (!attachment || typeof attachment !== 'object') return null;

    const gifId = typeof attachment.gif_id === 'string' ? attachment.gif_id.trim() : '';
    const url = typeof attachment.url === 'string' ? attachment.url.trim() : '';
    if (!gifId || !url) return null;

    return {
        gif_id: gifId,
        url,
        width: Math.max(parseInteger(attachment.width) || 0, 0),
        height: Math.max(parseInteger(attachment.height) || 0, 0),
        title: typeof attachment.title === 'string' ? attachment.title.trim() : '',
    };
};

export const normalizeGiphyAttachments = (attachments) => {
    if (!Array.isArray(attachments)) return [];
    return attachments
        .map((attachment) => normalizeGiphyAttachment(attachment))
        .filter(Boolean)
        .slice(0, 6);
};

export const ensureReviewId = (reviewId) => {
    if (!ObjectId.isValid(reviewId)) {
        throw createHttpError(400, 'Invalid review id');
    }
    return new ObjectId(reviewId);
};

export const reviewRatingKey = (bookId, memberId) => `${bookId}:${memberId}`;

export const cloneComments = (comments = []) => comments.map((comment) => ({
    ...comment,
    replies: Array.isArray(comment.replies) ? comment.replies.map((reply) => ({ ...reply })) : [],
}));

export const serializeReview = ({
    review,
    ratingsMap,
    bookMap,
    viewerReactionIds = new Set(),
    viewerId = null,
}) => {
    const id = review._id?.toString();
    const book = bookMap.get(review.book_id) || null;

    return {
        id,
        book_id: review.book_id,
        member_id: review.member_id,
        member_name: review.member_name,
        member_avatar_initials: review.member_avatar_initials,
        review_text: review.review_text,
        spoiler: Boolean(review.spoiler),
        giphy_attachments: Array.isArray(review.giphy_attachments) ? review.giphy_attachments : [],
        comments: Array.isArray(review.comments) ? review.comments : [],
        likes_count: Number(review.likes_count || 0),
        comments_count: Number(review.comments_count || 0),
        status: review.status || 'approved',
        flagged_reason: review.flagged_reason || null,
        admin_notes: review.admin_notes || null,
        created_at: review.created_at,
        updated_at: review.updated_at,
        rating: ratingsMap.get(reviewRatingKey(review.book_id, review.member_id)) || 0,
        viewer_has_liked: id ? viewerReactionIds.has(id) : false,
        is_owner: viewerId ? review.member_id === viewerId : false,
        book_title: book?.title || null,
        book_author: book?.author || null,
        book_cover_image_url: book?.cover_image_url || null,
        book_category: book?.category || null,
    };
};

export const validateReviewPayload = (body) => {
    const bookId = parseInteger(body.book_id);
    const rating = parseInteger(body.rating);
    const reviewText = sanitizeReviewText(body.review_text);

    if (!Number.isInteger(bookId)) {
        throw createHttpError(400, 'Valid book_id is required');
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw createHttpError(400, 'Rating must be between 1 and 5');
    }
    if (reviewText.length < 10) {
        throw createHttpError(400, 'Review text must be at least 10 characters long');
    }

    return {
        book_id: bookId,
        rating,
        review_text: reviewText,
        spoiler: parseBoolean(body.spoiler, false),
        giphy_attachments: normalizeGiphyAttachments(body.giphy_attachments),
    };
};

export const validateCommentPayload = (body) => {
    const text = sanitizeCommentText(body.text);
    const giphyAttachment = normalizeGiphyAttachment(body.giphy_attachment);

    if (!text && !giphyAttachment) {
        throw createHttpError(400, 'Comment text or a GIF attachment is required');
    }

    return {
        text,
        giphy_attachment: giphyAttachment,
    };
};

export const findCommentOrReply = (review, commentId) => {
    const comments = Array.isArray(review.comments) ? review.comments : [];
    for (let commentIndex = 0; commentIndex < comments.length; commentIndex += 1) {
        const comment = comments[commentIndex];
        if (comment.comment_id === commentId) {
            return { type: 'comment', comment, commentIndex };
        }

        const replies = Array.isArray(comment.replies) ? comment.replies : [];
        for (let replyIndex = 0; replyIndex < replies.length; replyIndex += 1) {
            if (replies[replyIndex].comment_id === commentId) {
                return { type: 'reply', comment, commentIndex, replyIndex };
            }
        }
    }

    return null;
};

export const removeCommentFromReview = (review, commentId, actor, allowAdminOverride = false) => {
    const comments = cloneComments(review.comments);

    for (let commentIndex = 0; commentIndex < comments.length; commentIndex += 1) {
        const comment = comments[commentIndex];
        if (comment.comment_id === commentId) {
            if (!allowAdminOverride && comment.member_id !== actor.id) {
                throw createHttpError(403, 'You can only delete your own comments');
            }

            const removedCount = 1 + (Array.isArray(comment.replies) ? comment.replies.length : 0);
            comments.splice(commentIndex, 1);
            return { comments, removedCount };
        }

        const replies = Array.isArray(comment.replies) ? comment.replies : [];
        const replyIndex = replies.findIndex((reply) => reply.comment_id === commentId);
        if (replyIndex !== -1) {
            if (!allowAdminOverride && replies[replyIndex].member_id !== actor.id) {
                throw createHttpError(403, 'You can only delete your own comments');
            }

            replies.splice(replyIndex, 1);
            comment.replies = replies;
            comments[commentIndex] = comment;
            return { comments, removedCount: 1 };
        }
    }

    throw createHttpError(404, 'Comment not found');
};
