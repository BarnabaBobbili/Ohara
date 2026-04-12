import { useEffect, useState } from 'react';
import { reviewsAPI } from '../../services/reviewsApi';
import GiphyPicker from './GiphyPicker';
import StarRating from './StarRating';

export default function ReviewComposer({
    bookId,
    bookTitle,
    existingReview = null,
    isAuthenticated = false,
    onSaved,
    onDeleted,
    onRequireLogin,
}) {
    const [rating, setRating] = useState(existingReview?.rating || 0);
    const [reviewText, setReviewText] = useState(existingReview?.review_text || '');
    const [spoiler, setSpoiler] = useState(Boolean(existingReview?.spoiler));
    const [selectedGif, setSelectedGif] = useState(existingReview?.giphy_attachments?.[0] || null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setRating(existingReview?.rating || 0);
        setReviewText(existingReview?.review_text || '');
        setSpoiler(Boolean(existingReview?.spoiler));
        setSelectedGif(existingReview?.giphy_attachments?.[0] || null);
        setError('');
    }, [existingReview]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!isAuthenticated) {
            onRequireLogin?.();
            return;
        }
        if (!rating) {
            setError('Select a star rating before submitting.');
            return;
        }
        if (reviewText.trim().length < 10) {
            setError('Review text must be at least 10 characters long.');
            return;
        }

        setSaving(true);
        setError('');
        const payload = {
            book_id: bookId,
            rating,
            review_text: reviewText.trim(),
            spoiler,
            giphy_attachments: selectedGif ? [selectedGif] : [],
        };

        try {
            const response = existingReview
                ? await reviewsAPI.update(existingReview.id, payload)
                : await reviewsAPI.create(payload);
            onSaved?.(response);
        } catch (err) {
            setError(err.message || 'Failed to save review');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!existingReview || !window.confirm('Delete this review?')) return;

        setSaving(true);
        setError('');
        try {
            await reviewsAPI.delete(existingReview.id);
            onDeleted?.();
        } catch (err) {
            setError(err.message || 'Failed to delete review');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="rounded-sm border border-[#E8E4DF] bg-white p-6 editorial-shadow dark:border-[#3d3935] dark:bg-[#2a2622]"
        >
            <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#c16549]" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                        {existingReview ? 'Edit Your Review' : 'Write Your Review'}
                    </p>
                    <h4 className="mt-2 text-2xl font-bold text-[#1E1815] dark:text-white">{bookTitle}</h4>
                </div>
                <StarRating interactive value={rating} onChange={setRating} size="lg" />
            </div>

            <textarea
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
                rows={5}
                placeholder="Share your thoughts about this book..."
                className="w-full rounded-sm border border-[#E8E4DF] bg-[#FAF7F2] px-4 py-3 text-sm text-[#1E1815] outline-none transition-colors placeholder:text-[#6B6560]/70 focus:border-[#c16549] dark:border-[#3d3935] dark:bg-[#1e1614] dark:text-white"
                style={{ fontFamily: "'Noto Sans', sans-serif" }}
            />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-[#6B6560] dark:text-gray-300" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                    <input type="checkbox" checked={spoiler} onChange={(event) => setSpoiler(event.target.checked)} className="accent-[#c16549]" />
                    This review contains spoilers
                </label>

                <GiphyPicker disabled={!isAuthenticated} selectedGif={selectedGif} onSelect={setSelectedGif} onRemove={() => setSelectedGif(null)} />
            </div>

            {error ? (
                <p className="mt-4 text-sm text-[#c16549]" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                    {error}
                </p>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                    type="submit"
                    disabled={saving}
                    className="rounded-sm bg-[#c16549] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#89332a] disabled:opacity-60"
                    style={{ fontFamily: "'Noto Sans', sans-serif" }}
                >
                    {saving ? 'Saving...' : existingReview ? 'Update Review' : 'Publish Review'}
                </button>

                {existingReview ? (
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={saving}
                        className="rounded-sm border border-[#E8E4DF] px-4 py-3 text-sm text-[#6B6560] transition-colors hover:border-[#c16549] hover:text-[#c16549] disabled:opacity-60 dark:border-[#3d3935] dark:text-gray-300"
                        style={{ fontFamily: "'Noto Sans', sans-serif" }}
                    >
                        Delete Review
                    </button>
                ) : null}

                {!isAuthenticated ? (
                    <button
                        type="button"
                        onClick={onRequireLogin}
                        className="text-sm text-[#c16549] underline decoration-dotted underline-offset-4"
                        style={{ fontFamily: "'Noto Sans', sans-serif" }}
                    >
                        Log in to review
                    </button>
                ) : null}
            </div>
        </form>
    );
}
