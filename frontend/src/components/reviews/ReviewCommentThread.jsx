import { useState } from 'react';
import GiphyPicker from './GiphyPicker';

const formatRelativeTime = (value) => {
    const date = new Date(value);
    const minutes = Math.max(Math.floor((Date.now() - date.getTime()) / 60000), 0);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
};

export default function ReviewCommentThread({
    comments = [],
    currentMemberId,
    isAuthenticated,
    onReply,
    onDelete,
    onRequireLogin,
}) {
    const [replyTo, setReplyTo] = useState('');
    const [replyText, setReplyText] = useState('');
    const [replyGif, setReplyGif] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const submitReply = async (commentId) => {
        if (!isAuthenticated) {
            onRequireLogin?.();
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            await onReply?.(commentId, { text: replyText.trim(), giphy_attachment: replyGif });
            setReplyTo('');
            setReplyText('');
            setReplyGif(null);
        } catch (err) {
            setError(err.message || 'Failed to send reply');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            {comments.map((comment) => (
                <div key={comment.comment_id} className="border-l-2 border-dotted border-[#E8E4DF] pl-4 dark:border-[#3d3935]">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-[#1E1815] dark:text-white">{comment.member_name}</p>
                            <p className="text-xs text-[#6B6560] dark:text-gray-400" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                {formatRelativeTime(comment.created_at)}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                            <button type="button" onClick={() => {
                                if (!isAuthenticated) {
                                    onRequireLogin?.();
                                    return;
                                }
                                setReplyTo(replyTo === comment.comment_id ? '' : comment.comment_id);
                            }} className="text-[#6B6560] hover:text-[#c16549]">
                                Reply
                            </button>
                            {comment.member_id === currentMemberId ? (
                                <button type="button" onClick={async () => {
                                    try {
                                        setError('');
                                        await onDelete?.(comment.comment_id);
                                    } catch (err) {
                                        setError(err.message || 'Failed to delete comment');
                                    }
                                }} className="text-[#6B6560] hover:text-[#c16549]">
                                    Delete
                                </button>
                            ) : null}
                        </div>
                    </div>

                    {comment.text ? (
                        <p className="mt-2 text-sm leading-relaxed text-[#1E1815] dark:text-gray-100" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                            {comment.text}
                        </p>
                    ) : null}
                    {comment.giphy_attachment?.url ? (
                        <img src={comment.giphy_attachment.url} alt={comment.giphy_attachment.title || 'Comment GIF'} className="mt-3 h-28 w-40 rounded-sm object-cover" />
                    ) : null}

                    {Array.isArray(comment.replies) && comment.replies.length > 0 ? (
                        <div className="mt-4 space-y-3 border-l border-dotted border-[#E8E4DF] pl-4 dark:border-[#3d3935]">
                            {comment.replies.map((reply) => (
                                <div key={reply.comment_id}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-[#1E1815] dark:text-white">{reply.member_name}</p>
                                            <p className="text-xs text-[#6B6560] dark:text-gray-400" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                {formatRelativeTime(reply.created_at)}
                                            </p>
                                        </div>
                                        {reply.member_id === currentMemberId ? (
                                            <button type="button" onClick={async () => {
                                                try {
                                                    setError('');
                                                    await onDelete?.(reply.comment_id);
                                                } catch (err) {
                                                    setError(err.message || 'Failed to delete comment');
                                                }
                                            }} className="text-xs text-[#6B6560] hover:text-[#c16549]" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                                Delete
                                            </button>
                                        ) : null}
                                    </div>
                                    {reply.text ? (
                                        <p className="mt-2 text-sm leading-relaxed text-[#1E1815] dark:text-gray-100" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                            {reply.text}
                                        </p>
                                    ) : null}
                                    {reply.giphy_attachment?.url ? (
                                        <img src={reply.giphy_attachment.url} alt={reply.giphy_attachment.title || 'Reply GIF'} className="mt-3 h-24 w-36 rounded-sm object-cover" />
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    ) : null}

                    {replyTo === comment.comment_id ? (
                        <div className="mt-4 rounded-sm bg-[#FAF7F2] p-3 dark:bg-[#1e1614]">
                            <textarea
                                value={replyText}
                                onChange={(event) => setReplyText(event.target.value)}
                                rows={2}
                                placeholder="Write a reply..."
                                className="w-full border-b border-[#E8E4DF] bg-transparent px-1 py-2 text-sm text-[#1E1815] outline-none focus:border-[#c16549] dark:border-[#3d3935] dark:text-white"
                                style={{ fontFamily: "'Noto Sans', sans-serif" }}
                            />
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                                <GiphyPicker disabled={!isAuthenticated} selectedGif={replyGif} onSelect={setReplyGif} onRemove={() => setReplyGif(null)} />
                                <button type="button" onClick={() => submitReply(comment.comment_id)} disabled={submitting} className="rounded-sm bg-[#c16549] px-3 py-2 text-xs font-semibold text-white hover:bg-[#89332a] disabled:opacity-60" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                    {submitting ? 'Sending...' : 'Send Reply'}
                                </button>
                            </div>
                            {error ? <p className="mt-2 text-xs text-[#c16549]" style={{ fontFamily: "'Noto Sans', sans-serif" }}>{error}</p> : null}
                        </div>
                    ) : null}
                </div>
            ))}
        </div>
    );
}
