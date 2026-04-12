import { useEffect, useState } from 'react';
import { giphyAPI } from '../../services/reviewsApi';

export default function GiphyPicker({ disabled = false, selectedGif = null, onSelect, onRemove }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [gifs, setGifs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return undefined;

        let cancelled = false;
        const timeout = setTimeout(async () => {
            setLoading(true);
            setError('');

            try {
                const response = query.trim()
                    ? await giphyAPI.search(query.trim(), 12)
                    : await giphyAPI.trending(12);
                if (!cancelled) setGifs(Array.isArray(response?.gifs) ? response.gifs : []);
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || 'Failed to load GIFs');
                    setGifs([]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, query.trim() ? 300 : 0);

        return () => {
            cancelled = true;
            clearTimeout(timeout);
        };
    }, [open, query]);

    return (
        <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setOpen((current) => !current)}
                    className="inline-flex items-center gap-1 rounded-sm border border-[#E8E4DF] dark:border-[#3d3935] px-3 py-2 text-xs text-[#6B6560] dark:text-gray-300 transition-colors hover:border-[#c16549] hover:text-[#c16549] disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ fontFamily: "'Noto Sans', sans-serif" }}
                >
                    <span className="material-symbols-outlined text-[16px]">gif_box</span>
                    GIF
                </button>

                {selectedGif ? (
                    <div className="relative overflow-hidden rounded-sm border border-[#E8E4DF] dark:border-[#3d3935]">
                        <img src={selectedGif.preview_url || selectedGif.url} alt={selectedGif.title || 'Selected GIF'} className="h-16 w-24 object-cover" />
                        <button
                            type="button"
                            onClick={onRemove}
                            className="absolute right-1 top-1 rounded-full bg-white/90 px-1 text-[10px] text-[#1E1815]"
                        >
                            x
                        </button>
                    </div>
                ) : null}
            </div>

            {open ? (
                <div className="absolute left-0 top-full z-20 mt-2 w-[min(22rem,80vw)] rounded-sm border border-[#E8E4DF] bg-white p-3 shadow-[0_14px_30px_rgba(30,24,21,0.12)] dark:border-[#3d3935] dark:bg-[#2a2622]">
                    <input
                        type="text"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search GIFs..."
                        className="mb-3 w-full border-b border-[#E8E4DF] bg-transparent px-1 py-2 text-sm text-[#1E1815] outline-none placeholder:text-[#6B6560]/60 focus:border-[#c16549] dark:border-[#3d3935] dark:text-white"
                        style={{ fontFamily: "'Noto Sans', sans-serif" }}
                    />

                    {loading ? (
                        <div className="py-8 text-center text-xs text-[#6B6560]" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                            Loading GIFs...
                        </div>
                    ) : error ? (
                        <div className="py-8 text-center text-xs text-[#c16549]" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                            {error}
                        </div>
                    ) : (
                        <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto">
                            {gifs.map((gif) => (
                                <button
                                    key={gif.gif_id}
                                    type="button"
                                    onClick={() => {
                                        onSelect?.(gif);
                                        setOpen(false);
                                    }}
                                    className="overflow-hidden rounded-sm border border-transparent transition-colors hover:border-[#c16549]"
                                >
                                    <img src={gif.preview_url || gif.url} alt={gif.title || 'GIF'} className="h-20 w-full object-cover" loading="lazy" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    );
}
