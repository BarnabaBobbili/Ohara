import { useState } from 'react';
import StarRating from '../../reviews/StarRating';

export default function ModerationRow({ review, onStatusChange, onDelete, onDeleteComment }) {
    const [expanded, setExpanded] = useState(false);
    const [adminNotes, setAdminNotes] = useState(review.admin_notes || '');

    return (
        <div className={`rounded-sm border bg-white p-5 transition-colors dark:bg-[#2a2622] ${review.status === 'flagged' ? 'border-[#c16549]' : 'border-[#E8E4DF] dark:border-[#3d3935]'}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                        <StarRating value={review.rating} size="sm" />
                        <h3 className="text-xl font-bold text-[#1E1815] dark:text-white">{review.book_title || 'Untitled Book'}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${review.status === 'flagged' ? 'bg-[#fef5f3] text-[#c16549]' : 'bg-[#f4ede8] text-[#6B6560]'}`}>
                            {review.status}
                        </span>
                    </div>
                    <p className="mt-1 text-sm italic text-[#6B6560] dark:text-gray-400" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                        by {review.member_name} · {review.book_author || 'Unknown Author'}
                    </p>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#1E1815] dark:text-gray-100" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                        {review.review_text}
                    </p>
                    <p className="mt-3 text-xs text-[#6B6560] dark:text-gray-400" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                        {review.likes_count} likes · {review.comments_count} comments {review.giphy_attachments?.length ? `· ${review.giphy_attachments.length} GIF` : ''}
                    </p>
                    {review.flagged_reason ? (
                        <p className="mt-2 text-xs text-[#c16549]" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                            Flagged reason: {review.flagged_reason}
                        </p>
                    ) : null}
                </div>

                <div className="flex flex-col gap-2">
                    <select value={review.status} onChange={(event) => onStatusChange(review.id, event.target.value, adminNotes)} className="rounded-sm border border-[#E8E4DF] px-3 py-2 text-sm dark:border-[#3d3935] dark:bg-[#1e1614] dark:text-white">
                        <option value="approved">Approved</option>
                        <option value="pending">Pending</option>
                        <option value="flagged">Flagged</option>
                        <option value="removed">Removed</option>
                    </select>
                    <button type="button" onClick={() => setExpanded((value) => !value)} className="rounded-sm border border-[#E8E4DF] px-3 py-2 text-xs text-[#6B6560] hover:border-[#c16549] hover:text-[#c16549] dark:border-[#3d3935] dark:text-gray-300">
                        {expanded ? 'Hide' : 'View'}
                    </button>
                    <button type="button" onClick={() => onDelete(review.id)} className="rounded-sm border border-[#E8E4DF] px-3 py-2 text-xs text-[#6B6560] hover:border-[#c16549] hover:text-[#c16549] dark:border-[#3d3935] dark:text-gray-300">
                        Delete
                    </button>
                </div>
            </div>

            {expanded ? (
                <div className="mt-5 border-t border-[#E8E4DF] pt-5 dark:border-[#3d3935]">
                    <textarea
                        value={adminNotes}
                        onChange={(event) => setAdminNotes(event.target.value)}
                        placeholder="Admin notes..."
                        rows={3}
                        className="w-full rounded-sm border border-[#E8E4DF] px-3 py-2 text-sm dark:border-[#3d3935] dark:bg-[#1e1614] dark:text-white"
                    />
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                        <button type="button" onClick={() => onStatusChange(review.id, review.status, adminNotes)} className="rounded-sm bg-[#c16549] px-4 py-2 text-xs font-semibold text-white hover:bg-[#89332a]">
                            Save Notes
                        </button>
                    </div>

                    {review.giphy_attachments?.length ? (
                        <div className="mt-4 flex flex-wrap gap-3">
                            {review.giphy_attachments.map((gif) => (
                                <img key={gif.gif_id} src={gif.url} alt={gif.title || 'Review GIF'} className="h-28 w-40 rounded-sm object-cover" />
                            ))}
                        </div>
                    ) : null}

                    {review.comments?.length ? (
                        <div className="mt-5 space-y-4">
                            {review.comments.map((comment) => (
                                <div key={comment.comment_id} className="rounded-sm bg-[#FAF7F2] p-3 dark:bg-[#1e1614]">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-[#1E1815] dark:text-white">{comment.member_name}</p>
                                            <p className="mt-1 text-sm text-[#1E1815] dark:text-gray-100" style={{ fontFamily: "'Noto Sans', sans-serif" }}>{comment.text}</p>
                                        </div>
                                        <button type="button" onClick={() => onDeleteComment(review.id, comment.comment_id)} className="text-xs text-[#6B6560] hover:text-[#c16549]">
                                            Delete
                                        </button>
                                    </div>
                                    {comment.replies?.length ? (
                                        <div className="mt-3 space-y-2 border-l border-dotted border-[#E8E4DF] pl-3 dark:border-[#3d3935]">
                                            {comment.replies.map((reply) => (
                                                <div key={reply.comment_id} className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-xs font-semibold text-[#1E1815] dark:text-white">{reply.member_name}</p>
                                                        <p className="mt-1 text-sm text-[#1E1815] dark:text-gray-100" style={{ fontFamily: "'Noto Sans', sans-serif" }}>{reply.text}</p>
                                                    </div>
                                                    <button type="button" onClick={() => onDeleteComment(review.id, reply.comment_id)} className="text-xs text-[#6B6560] hover:text-[#c16549]">
                                                        Delete
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
