import { useState } from 'react';
import { reviewsAPI } from '../../services/reviewsApi';
import GiphyPicker from './GiphyPicker';
import ReviewCommentThread from './ReviewCommentThread';
import StarRating from './StarRating';

const formatDate = (value) => new Date(value).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
});

export default function ReviewCard({
    review,
    isAuthenticated,
    currentMemberId,
    onChanged,
    onRequireLogin,
}) {
    const [revealedSpoiler, setRevealedSpoiler] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [commentGif, setCommentGif] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const handleProtectedAction = (action) => {
        if (!isAuthenticated) {
            onRequireLogin?.();
            return false;
        }
        action();
        return true;
    };

    const handleLike = () => handleProtectedAction(async () => {
        setBusy(true);
        setError('');
        try {
            await reviewsAPI.like(review.id);
            await onChanged?.();
        } catch (err) {
            setError(err.message || 'Failed to update like');
        } finally {
            setBusy(false);
        }
    });

    const handleFlag = () => handleProtectedAction(async () => {
        const reason = window.prompt('Why are you flagging this review?');
        if (!reason) return;
        setBusy(true);
        setError('');
        try {
            await reviewsAPI.flag(review.id, reason);
            await onChanged?.();
        } catch (err) {
            setError(err.message || 'Failed to flag review');
        } finally {
            setBusy(false);
        }
    });

    const handleComment = () => handleProtectedAction(async () => {
        setBusy(true);
        setError('');
        try {
            await reviewsAPI.addComment(review.id, {
                text: commentText.trim(),
                giphy_attachment: commentGif,
            });
            setCommentText('');
            setCommentGif(null);
            await onChanged?.();
        } catch (err) {
            setError(err.message || 'Failed to add comment');
        } finally {
            setBusy(false);
        }
    });

    const bodyHidden = review.spoiler && !revealedSpoiler;

    return (
        <article className="rounded-sm border border-[#E8E4DF] bg-white p-6 editorial-shadow dark:border-[#3d3935] dark:bg-[#2a2622]">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#c16549]/20 bg-[#c16549]/10 text-sm font-bold text-[#c16549]">
                        {review.member_avatar_initials}
                    </div>
                    <div>
                        <p className="text-lg font-bold text-[#1E1815] dark:text-white">{review.member_name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-3">
                            <StarRating value={review.rating} size="sm" />
                            <span className="text-xs text-[#6B6560] dark:text-gray-400" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                Reviewed on {formatDate(review.created_at)}
                            </span>
                            {review.spoiler ? (
                                <span className="rounded-full border border-[#c16549]/30 bg-[#fef5f3] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#c16549]" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                    Spoiler
                                </span>
                            ) : null}
                        </div>
                    </div>
                </div>

                {review.is_owner ? (
                    <span className="text-[10px] uppercase tracking-[0.12em] text-[#6B6560] dark:text-gray-400" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                        Your review
                    </span>
                ) : null}
            </div>

            <div className={`mt-5 rounded-sm ${bodyHidden ? 'relative overflow-hidden border border-[#E8E4DF] dark:border-[#3d3935]' : ''}`}>
                <p className={`text-[15px] leading-7 text-[#1E1815] dark:text-gray-100 ${bodyHidden ? 'blur-sm select-none' : ''}`} style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                    {review.review_text}
                </p>
                {bodyHidden ? (
                    <button
                        type="button"
                        onClick={() => setRevealedSpoiler(true)}
                        className="absolute inset-0 flex items-center justify-center bg-[#1E1815]/35 text-sm font-semibold text-white backdrop-blur-[1px]"
                        style={{ fontFamily: "'Noto Sans', sans-serif" }}
                    >
                        Contains spoilers — click to reveal
                    </button>
                ) : null}
            </div>

            {review.giphy_attachments?.length ? (
                <div className="mt-4 flex flex-wrap gap-3">
                    {review.giphy_attachments.map((gif) => (
                        <img key={gif.gif_id} src={gif.url} alt={gif.title || 'Review GIF'} className="h-40 w-56 rounded-sm object-cover" />
                    ))}
                </div>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                <button type="button" disabled={busy} onClick={handleLike} className={`inline-flex items-center gap-1 transition-colors ${review.viewer_has_liked ? 'text-[#c16549]' : 'text-[#6B6560] hover:text-[#c16549]'} disabled:opacity-60`}>
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: review.viewer_has_liked ? "'FILL' 1" : "'FILL' 0" }}>
                        favorite
                    </span>
                    {review.likes_count} likes
                </button>
                <span className="text-[#6B6560] dark:text-gray-400">{review.comments_count} comments</span>
                {!review.is_owner ? (
                    <button type="button" disabled={busy} onClick={handleFlag} className="text-[#6B6560] transition-colors hover:text-[#c16549] disabled:opacity-60">
                        Flag
                    </button>
                ) : null}
            </div>

            {error ? (
                <p className="mt-3 text-sm text-[#c16549]" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                    {error}
                </p>
            ) : null}

            {review.comments?.length ? (
                <div className="mt-6">
                    <ReviewCommentThread
                        comments={review.comments}
                        currentMemberId={currentMemberId}
                        isAuthenticated={isAuthenticated}
                        onRequireLogin={onRequireLogin}
                        onReply={async (commentId, payload) => {
                            try {
                                setError('');
                                await reviewsAPI.addReply(review.id, commentId, payload);
                                await onChanged?.();
                            } catch (err) {
                                setError(err.message || 'Failed to add reply');
                                throw err;
                            }
                        }}
                        onDelete={async (commentId) => {
                            try {
                                setError('');
                                await reviewsAPI.deleteComment(review.id, commentId);
                                await onChanged?.();
                            } catch (err) {
                                setError(err.message || 'Failed to delete comment');
                                throw err;
                            }
                        }}
                    />
                </div>
            ) : null}

            <div className="mt-6 rounded-sm bg-[#FAF7F2] p-4 dark:bg-[#1e1614]">
                <textarea
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                    rows={2}
                    placeholder="Write a comment..."
                    className="w-full border-b border-[#E8E4DF] bg-transparent px-1 py-2 text-sm text-[#1E1815] outline-none transition-colors focus:border-[#c16549] dark:border-[#3d3935] dark:text-white"
                    style={{ fontFamily: "'Noto Sans', sans-serif" }}
                />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                    <GiphyPicker disabled={!isAuthenticated} selectedGif={commentGif} onSelect={setCommentGif} onRemove={() => setCommentGif(null)} />
                    <button
                        type="button"
                        onClick={handleComment}
                        disabled={busy}
                        className="rounded-sm bg-[#c16549] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#89332a] disabled:opacity-60"
                        style={{ fontFamily: "'Noto Sans', sans-serif" }}
                    >
                        {busy ? 'Sending...' : 'Send'}
                    </button>
                </div>
            </div>
        </article>
    );
}
