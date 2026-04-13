/**
 * EbookReader — Full-featured in-app reader for PDF and EPUB files.
 *
 * Route: /reader/:source/:id
 *   source = 'public'  → public library ebook  (GET /ebooks/public/:id/read-url)
 *   source = 'my'      → member's own upload   (GET /user-library/my/:id/read-url)
 *
 * EPUB powered by epub.js  (already installed: epubjs)
 * PDF  powered by PDF.js   (already installed: pdfjs-dist)
 *
 * EPUB Features:
 *   • Light / Sepia / Dark themes
 *   • Font-size & font-family controls
 *   • Single-page & Two-column (spread) layout
 *   • Collapsible Table-of-Contents sidebar
 *   • Keyboard left/right arrow navigation
 *   • Progress bar & chapter label
 *   • Auto-saves + restores CFI location
 *   • Full-screen mode
 *
 * PDF Features:
 *   • Page navigation (prev / next / jump)
 *   • Zoom in / out / reset
 *   • Full-screen
 *   • Dark overlay mode
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { publicEbooksAPI, userLibraryAPI } from '../services/api';
import { getAuthToken, getSupabaseSessionToken } from '../services/authStore';
import { API_BASE_URL } from '../config/api';

// ─── Themes ───────────────────────────────────────────────────────────────────

const EPUB_THEMES = {
    light: {
        label: 'Light',
        icon: 'light_mode',
        body: { background: '#faf7f2', color: '#1e1815', fontFamily: 'Georgia, serif', lineHeight: '1.8' },
        bg: '#faf7f2',
        toolbar: 'bg-[#faf7f2] border-[#e8e4df] text-[#1e1815]',
        sidebar: 'bg-[#f3efe9] border-[#e8e4df] text-[#1e1815]',
    },
    sepia: {
        label: 'Sepia',
        icon: 'coffee',
        body: { background: '#f4ead5', color: '#3b2f1e', fontFamily: 'Georgia, serif', lineHeight: '1.8' },
        bg: '#f4ead5',
        toolbar: 'bg-[#f4ead5] border-[#d4c4a0] text-[#3b2f1e]',
        sidebar: 'bg-[#eee0c4] border-[#d4c4a0] text-[#3b2f1e]',
    },
    dark: {
        label: 'Dark',
        icon: 'dark_mode',
        body: { background: '#1e1814', color: '#e8e2da', fontFamily: 'Georgia, serif', lineHeight: '1.8' },
        bg: '#1e1814',
        toolbar: 'bg-[#1e1814] border-[#3d3935] text-[#e8e2da]',
        sidebar: 'bg-[#2a2622] border-[#3d3935] text-[#e8e2da]',
    },
    night: {
        label: 'Night',
        icon: 'bedtime',
        body: { background: '#0d0d0d', color: '#c5bba0', fontFamily: 'Georgia, serif', lineHeight: '1.8' },
        bg: '#0d0d0d',
        toolbar: 'bg-[#0d0d0d] border-[#262626] text-[#c5bba0]',
        sidebar: 'bg-[#111111] border-[#262626] text-[#c5bba0]',
    },
};

const FONTS = [
    { label: 'Georgia',   value: 'Georgia, serif' },
    { label: 'Newsreader', value: "'Newsreader', Georgia, serif" },
    { label: 'Palatino',  value: 'Palatino, Palatino Linotype, serif' },
    { label: 'Sans',      value: 'Inter, system-ui, sans-serif' },
    { label: 'Mono',      value: 'ui-monospace, monospace' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
const normalizeProgressPercent = (value) => {
    const parsed = Number.parseFloat(String(value ?? 0));
    if (!Number.isFinite(parsed)) return 0;
    return clamp(Math.round(parsed), 0, 100);
};
const parsePdfPageLocation = (value) => {
    if (!value) return 1;
    const text = String(value).trim();
    const pageMatch = text.match(/^page:(\d+)$/i);
    if (pageMatch) return clamp(Number.parseInt(pageMatch[1], 10), 1, 100000);
    const parsed = Number.parseInt(text, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
};

// ─── Auth-aware URL resolver ─────────────────────────────────────────────────
// Supabase signed URLs (https://) work directly.
// Relative /api/... URLs require an Authorization header — fetch with auth
// headers and return a Blob URL so epubjs / pdfjs can load the file.
async function resolveUrl(url) {
    if (!url) throw new Error('No URL provided');
    if (url.startsWith('https://') || url.startsWith('blob:')) return url;

    const token = getAuthToken() || getSupabaseSessionToken();
    const fullUrl = url.startsWith('/')
        ? `${API_BASE_URL.replace('/api', '')}${url}`  // e.g. http://localhost:8000/api/ebooks/...
        : url;

    const response = await fetch(fullUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error(`Failed to fetch ebook (${response.status})`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
}


// ─── Main Component ───────────────────────────────────────────────────────────

export default function EbookReader() {
    const { source, id } = useParams();  // source = 'public' | 'my'
    const navigate = useNavigate();

    const [info, setInfo]           = useState(null);   // {url, format, title, author}
    const [resolvedUrl, setResolvedUrl] = useState(null); // blob URL or https URL
    const [savedProgress, setSavedProgress] = useState(null);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState(null);
    const blobUrlRef                = useRef(null);     // track blob URL for cleanup
    const progressTimerRef          = useRef(null);
    const pendingProgressRef        = useRef(null);

    const flushProgress = useCallback(async () => {
        if (!pendingProgressRef.current) return;
        const payload = pendingProgressRef.current;
        pendingProgressRef.current = null;
        try {
            await userLibraryAPI.updateProgress(source, id, payload);
        } catch {
            // Keep reader UX smooth even when progress sync fails.
        }
    }, [source, id]);

    const queueProgressSave = useCallback((nextProgress) => {
        if (!nextProgress) return;
        pendingProgressRef.current = {
            current_location: typeof nextProgress.current_location === 'string'
                ? nextProgress.current_location
                : null,
            progress_percent: normalizeProgressPercent(nextProgress.progress_percent),
        };

        if (progressTimerRef.current) {
            clearTimeout(progressTimerRef.current);
        }
        progressTimerRef.current = setTimeout(() => {
            flushProgress();
        }, 800);
    }, [flushProgress]);

    useEffect(() => {
        return () => {
            if (progressTimerRef.current) {
                clearTimeout(progressTimerRef.current);
                progressTimerRef.current = null;
            }
            flushProgress();
        };
    }, [flushProgress]);

    // Fetch signed URL + metadata, then resolve to a safe loadable URL
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        setResolvedUrl(null);
        setSavedProgress(null);
        if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }

        const fetcher = source === 'my'
            ? userLibraryAPI.getReaderInfo(id)
            : publicEbooksAPI.getReaderInfo(id);

        Promise.all([
            fetcher,
            userLibraryAPI.getProgress(source, id).catch(() => null),
        ])
            .then(async ([data, progress]) => {
                if (cancelled) return;
                setInfo(data);
                setSavedProgress(progress && typeof progress === 'object' ? progress : null);
                const url = await resolveUrl(data.url);
                if (cancelled) {
                    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
                    return;
                }
                if (url.startsWith('blob:')) blobUrlRef.current = url;
                setResolvedUrl(url);
            })
            .catch(err => {
                if (cancelled) return;
                setError(err.message || 'Failed to load ebook');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
            if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
        };
    }, [source, id]);

    if (loading) return <ReaderSplash message="Loading your ebook…" />;
    if (error)   return <ReaderSplash message={error} isError onBack={() => navigate(-1)} />;

    return resolvedUrl
        ? (info?.format === 'pdf'
            ? <PDFReader info={info} url={resolvedUrl} savedProgress={savedProgress} onProgress={queueProgressSave} onClose={() => navigate(-1)} />
            : <EPUBReader info={info} url={resolvedUrl} bookKey={`${source}-${id}`} savedProgress={savedProgress} onProgress={queueProgressSave} onClose={() => navigate(-1)} />)
        : <ReaderSplash message="Preparing reader…" />;
}

// ─── Splash / Error screen ────────────────────────────────────────────────────

function ReaderSplash({ message, isError, onBack }) {
    return (
        <div className="min-h-screen bg-[#1e1814] flex flex-col items-center justify-center gap-4">
            {!isError && (
                <div className="w-12 h-12 rounded-full border-2 border-[#3d3935] border-t-[#c16549] animate-spin" />
            )}
            {isError && <span className="material-symbols-outlined text-5xl text-[#c16549]">error</span>}
            <p className="text-[#e8e2da] text-sm" style={{ fontFamily: "'Noto Sans', sans-serif" }}>{message}</p>
            {onBack && (
                <button onClick={onBack}
                    className="mt-2 px-5 py-2 bg-[#c16549] text-white text-sm font-medium hover:bg-[#89332a] transition-colors"
                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                    ← Go Back
                </button>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EPUB READER
// ═══════════════════════════════════════════════════════════════════════════════

function EPUBReader({ info, url, bookKey, savedProgress, onProgress, onClose }) {
    const viewerRef   = useRef(null);
    const bookRef     = useRef(null);
    const renditionRef = useRef(null);

    // UI state
    const [theme, setTheme]       = useState('light');
    const [fontSize, setFontSize] = useState(18);
    const [fontIdx, setFontIdx]   = useState(0);
    const [spread, setSpread]     = useState(false);   // two-column layout
    const [toc, setToc]           = useState([]);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [chapter, setChapter]   = useState('');
    const [progress, setProgress] = useState(normalizeProgressPercent(savedProgress?.progress_percent));
    const [fullscreen, setFullscreen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const T = EPUB_THEMES[theme];

    // ── Bootstrap epub.js ────────────────────────────────────────────────────
    useEffect(() => {
        if (!viewerRef.current || !url) return;

        let cancelled = false;

        // Pre-set container background immediately so there's no white flash
        // while epubjs parses the epub and before the first chapter loads.
        viewerRef.current.style.background = EPUB_THEMES[theme]?.bg || '#faf7f2';

        import('epubjs').then(({ default: Epub }) => {
            if (cancelled) return;

            const book = Epub(url, {
                openAs: 'epub',
                allowScriptedContent: true, // fixes: "Blocked script execution in 'about:srcdoc'"
            });
            bookRef.current = book;

            // Use pixel dimensions so epubjs can paginate correctly.
            const w = viewerRef.current.offsetWidth  || window.innerWidth;
            const h = viewerRef.current.offsetHeight || window.innerHeight - 50;

            const rendition = book.renderTo(viewerRef.current, {
                width:  w,
                height: h,
                spread: spread ? 'always' : 'none',
                flow:   'paginated',
                allowScriptedContent: true,
            });
            renditionRef.current = rendition;

            // Apply theme BEFORE display() so the overrides are already
            // stored and will be injected into each chapter as it loads.
            // This is the key fix: override() does NOT cause a chapter reload.
            applyEpubTheme(rendition, theme, fontSize, FONTS[fontIdx].value);

            // Restore or start from beginning
            const savedCfi = (typeof savedProgress?.current_location === 'string' && savedProgress.current_location.trim())
                || sessionStorage.getItem(`epub-cfi-${bookKey}`);
            rendition.display(savedCfi || undefined);

            // TOC
            book.loaded.navigation.then(nav => {
                if (!cancelled) setToc(flattenToc(nav.toc));
            });

            // Needed for reliable percentage computation from CFI
            book.ready
                .then(() => book.locations.generate(1024))
                .catch(() => {});

            // Track chapter & progress
            rendition.on('relocated', (location) => {
                if (cancelled) return;
                const currentCfi = location?.start?.cfi;
                if (currentCfi) {
                    sessionStorage.setItem(`epub-cfi-${bookKey}`, currentCfi);
                }

                let nextProgress = normalizeProgressPercent(savedProgress?.progress_percent);
                const pct = currentCfi ? book.locations?.percentageFromCfi?.(currentCfi) : null;
                if (Number.isFinite(pct)) {
                    nextProgress = normalizeProgressPercent(pct * 100);
                }
                setProgress(nextProgress);
                if (currentCfi) {
                    onProgress?.({
                        current_location: currentCfi,
                        progress_percent: nextProgress,
                    });
                }

                const item = location.start;
                setChapter(item.href ? decodeURIComponent(item.href.split('/').pop().replace(/\.xhtml?$|\.html?$/i, '').replace(/-/g, ' ')) : '');
            });

            // Keyboard navigation
            const onKey = (e) => {
                if (e.key === 'ArrowRight') renditionRef.current?.next();
                if (e.key === 'ArrowLeft')  renditionRef.current?.prev();
            };
            window.addEventListener('keydown', onKey);

            // Handle resize so pagination stays correct
            const onResize = () => {
                if (!viewerRef.current || !renditionRef.current) return;
                renditionRef.current.resize(
                    viewerRef.current.offsetWidth,
                    viewerRef.current.offsetHeight,
                );
            };
            window.addEventListener('resize', onResize);

            // Store cleanup
            book._cleanupKeys = () => {
                window.removeEventListener('keydown', onKey);
                window.removeEventListener('resize', onResize);
            };
        });

        return () => {
            cancelled = true;
            bookRef.current?._cleanupKeys?.();
            renditionRef.current?.destroy?.();
            bookRef.current?.destroy?.();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url, bookKey]);

    useEffect(() => {
        setProgress(normalizeProgressPercent(savedProgress?.progress_percent));
    }, [savedProgress?.progress_percent, bookKey]);

    // ── Re-apply when settings change ────────────────────────────────────────
    // override() patches all current chapter iframes in-place without reloading
    useEffect(() => {
        if (!renditionRef.current) return;
        if (viewerRef.current) viewerRef.current.style.background = EPUB_THEMES[theme]?.bg || '#faf7f2';
        applyEpubTheme(renditionRef.current, theme, fontSize, FONTS[fontIdx].value);
    }, [theme, fontSize, fontIdx]);

    useEffect(() => {
        if (!renditionRef.current) return;
        renditionRef.current.spread(spread ? 'always' : 'none');
    }, [spread]);

    // ── Full-screen ───────────────────────────────────────────────────────────
    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.();
            setFullscreen(true);
        } else {
            document.exitFullscreen?.();
            setFullscreen(false);
        }
    }, []);

    // ── Navigate to TOC item ──────────────────────────────────────────────────
    const goToTocItem = useCallback((href) => {
        renditionRef.current?.display(href);
        setSidebarOpen(false);
    }, []);

    const themeKeys = Object.keys(EPUB_THEMES);

    return (
        <div className={`flex flex-col h-screen w-screen overflow-hidden transition-colors duration-300`}
             style={{ background: T.bg }}>

            {/* ── Toolbar ── */}
            <header className={`shrink-0 flex items-center gap-2 px-4 h-12 border-b z-30 ${T.toolbar} transition-colors`}>
                {/* Close */}
                <button onClick={onClose} title="Close"
                    className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors">
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>

                {/* TOC toggle */}
                <button onClick={() => setSidebarOpen(v => !v)} title="Table of Contents"
                    className="p-1.5 hover:bg-black/10 rounded transition-colors">
                    <span className="material-symbols-outlined text-[20px]">menu_book</span>
                </button>

                <div className="w-px h-5 bg-current opacity-20 mx-1" />

                {/* Title */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ fontFamily: "'Newsreader', serif" }}>
                        {info?.title || 'Untitled'}
                    </p>
                    {chapter && (
                        <p className="text-[10px] opacity-60 truncate capitalize"
                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>{chapter}</p>
                    )}
                </div>

                {/* Progress pill */}
                <span className="text-xs opacity-60 shrink-0" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                    {progress}%
                </span>

                <div className="w-px h-5 bg-current opacity-20 mx-1" />

                {/* Theme cycle */}
                {themeKeys.map(k => (
                    <button key={k} onClick={() => setTheme(k)} title={EPUB_THEMES[k].label}
                        className={`p-1.5 rounded transition-colors ${theme === k ? 'bg-black/15' : 'hover:bg-black/10'}`}>
                        <span className="material-symbols-outlined text-[18px]">{EPUB_THEMES[k].icon}</span>
                    </button>
                ))}

                <div className="w-px h-5 bg-current opacity-20 mx-1" />

                {/* Font size */}
                <button onClick={() => setFontSize(s => clamp(s - 2, 12, 36))} title="Smaller text"
                    className="p-1.5 hover:bg-black/10 rounded transition-colors text-xs font-bold">A-</button>
                <span className="text-xs opacity-60 w-7 text-center">{fontSize}</span>
                <button onClick={() => setFontSize(s => clamp(s + 2, 12, 36))} title="Larger text"
                    className="p-1.5 hover:bg-black/10 rounded transition-colors text-sm font-bold">A+</button>

                <div className="w-px h-5 bg-current opacity-20 mx-1" />

                {/* Font family */}
                <button onClick={() => setFontIdx(i => (i + 1) % FONTS.length)} title="Change font"
                    className="p-1.5 hover:bg-black/10 rounded transition-colors text-xs opacity-70">
                    {FONTS[fontIdx].label}
                </button>

                <div className="w-px h-5 bg-current opacity-20 mx-1" />

                {/* Spread / single page */}
                <button onClick={() => setSpread(v => !v)} title={spread ? 'Single page' : 'Two columns'}
                    className={`p-1.5 rounded transition-colors ${spread ? 'bg-black/15' : 'hover:bg-black/10'}`}>
                    <span className="material-symbols-outlined text-[20px]">
                        {spread ? 'auto_stories' : 'book'}
                    </span>
                </button>

                {/* Full-screen */}
                <button onClick={toggleFullscreen} title="Full screen"
                    className="p-1.5 hover:bg-black/10 rounded transition-colors">
                    <span className="material-symbols-outlined text-[20px]">
                        {fullscreen ? 'fullscreen_exit' : 'fullscreen'}
                    </span>
                </button>
            </header>

            {/* Progress bar */}
            <div className="h-0.5 shrink-0 opacity-30" style={{ background: T.bg }}>
                <div className="h-full bg-[#c16549] transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>

            <div className="flex flex-1 min-h-0 overflow-hidden relative">

                {/* ── Sidebar ── */}
                <aside className={`
                    absolute md:relative z-20 h-full flex-col border-r overflow-hidden
                    transition-all duration-300 ease-in-out ${T.sidebar}
                    ${sidebarOpen ? 'flex w-72' : 'hidden w-0'}
                `}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-current border-opacity-10">
                        <span className="text-xs font-bold uppercase tracking-widest opacity-60"
                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>Contents</span>
                        <button onClick={() => setSidebarOpen(false)}
                            className="p-1 hover:bg-black/10 rounded transition-colors">
                            <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    </div>
                    <ul className="flex-1 overflow-y-auto py-2">
                        {toc.length === 0 ? (
                            <li className="px-4 py-3 text-xs opacity-50" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                                No table of contents
                            </li>
                        ) : toc.map((item, idx) => (
                            <li key={idx}>
                                <button
                                    onClick={() => goToTocItem(item.href)}
                                    style={{
                                        fontFamily: "'Noto Sans', sans-serif",
                                        paddingLeft: `${(item.depth || 0) * 12 + 16}px`,
                                    }}
                                    className={`w-full text-left text-xs py-2 pr-4 hover:bg-black/10 transition-colors truncate
                                        ${item.depth === 0 ? 'font-semibold' : 'opacity-75'}`}>
                                    {item.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </aside>

                {/* ── Viewer + nav arrows ── */}
                <div className="flex-1 relative min-w-0 flex items-stretch">
                    {/* Prev */}
                    <button onClick={() => renditionRef.current?.prev()}
                        className="absolute left-0 top-0 bottom-0 w-16 z-10 flex items-center justify-center
                                   opacity-0 hover:opacity-100 transition-opacity group"
                        title="Previous page">
                        <span className="material-symbols-outlined text-[32px] opacity-40 group-hover:opacity-100
                                        transition-opacity drop-shadow-lg"
                              style={{ color: T.body.color }}>
                            chevron_left
                        </span>
                    </button>

                    {/* EPUB viewport */}
                    <div ref={viewerRef} className="flex-1 h-full" />

                    {/* Next */}
                    <button onClick={() => renditionRef.current?.next()}
                        className="absolute right-0 top-0 bottom-0 w-16 z-10 flex items-center justify-center
                                   opacity-0 hover:opacity-100 transition-opacity group"
                        title="Next page">
                        <span className="material-symbols-outlined text-[32px] opacity-40 group-hover:opacity-100
                                        transition-opacity drop-shadow-lg"
                              style={{ color: T.body.color }}>
                            chevron_right
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}

// Override() sets inline styles on each chapter's html element — no chapter
// reload, no flash. Stored in rendition.overrides so every future chapter
// also gets them applied the moment it loads.
function applyEpubTheme(rendition, themeName, fontSize, fontFamily) {
    const T = EPUB_THEMES[themeName];

    // CSS hyphenated property names work fine with element.style['prop-name']
    rendition.themes.override('background',   T.body.background);
    rendition.themes.override('color',        T.body.color);
    rendition.themes.override('font-family',  fontFamily);
    rendition.themes.override('font-size',    `${fontSize}px`);
    rendition.themes.override('line-height',  T.body.lineHeight);
    rendition.themes.override('padding',      '4% 8%');
}

function flattenToc(items, depth = 0) {
    if (!items?.length) return [];
    return items.flatMap(item => [
        { label: item.label?.trim() || item.href, href: item.href, depth },
        ...flattenToc(item.subitems, depth + 1),
    ]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF READER
// ═══════════════════════════════════════════════════════════════════════════════

function PDFReader({ info, url, savedProgress, onProgress, onClose }) {
    const canvasRef   = useRef(null);
    const pdfRef      = useRef(null);
    const renderTask  = useRef(null);

    const initialPageRef = useRef(parsePdfPageLocation(savedProgress?.current_location));
    const [currentPage, setCurrentPage] = useState(initialPageRef.current);
    const [totalPages, setTotalPages]   = useState(0);
    const [scale, setScale]             = useState(1.4);
    const [loading, setPdfLoading]      = useState(true);
    const [darkOverlay, setDarkOverlay] = useState(false);
    const [jumpInput, setJumpInput]     = useState('');
    const [fullscreen, setFullscreen]   = useState(false);

    // ── Load PDF ──────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!url) return;
        let cancelled = false;

        (async () => {
            const pdfjs = await import('pdfjs-dist');
            // Set worker — use the bundled worker via import.meta.url
            pdfjs.GlobalWorkerOptions.workerSrc = new URL(
                'pdfjs-dist/build/pdf.worker.mjs',
                import.meta.url,
            ).href;

            const pdf = await pdfjs.getDocument(url).promise;
            if (cancelled) return;
            pdfRef.current = pdf;
            setTotalPages(pdf.numPages);
            setCurrentPage(clamp(initialPageRef.current, 1, Math.max(pdf.numPages, 1)));
            setPdfLoading(false);
        })();

        return () => { cancelled = true; };
    }, [url]);

    // ── Render page ───────────────────────────────────────────────────────────
    const renderPage = useCallback(async (pageNum, sc) => {
        if (!pdfRef.current || !canvasRef.current) return;

        // Cancel in-flight render
        try { await renderTask.current?.cancel(); } catch { /* ignore */ }

        const page     = await pdfRef.current.getPage(pageNum);
        const viewport = page.getViewport({ scale: sc });
        const canvas   = canvasRef.current;
        const ctx      = canvas.getContext('2d');

        canvas.width  = viewport.width;
        canvas.height = viewport.height;

        const task = page.render({ canvasContext: ctx, viewport });
        renderTask.current = task;
        try { await task.promise; } catch { /* cancelled */ }
    }, []);

    useEffect(() => {
        if (!loading) renderPage(currentPage, scale);
    }, [currentPage, scale, loading, renderPage]);

    useEffect(() => {
        if (loading || totalPages <= 0) return;
        onProgress?.({
            current_location: `page:${currentPage}`,
            progress_percent: normalizeProgressPercent((currentPage / totalPages) * 100),
        });
    }, [currentPage, totalPages, loading, onProgress]);

    const goPrev = () => setCurrentPage(p => Math.max(p - 1, 1));
    const goNext = () => setCurrentPage(p => Math.min(p + 1, totalPages));
    const jumpTo = (e) => {
        e.preventDefault();
        const n = parseInt(jumpInput, 10);
        if (n >= 1 && n <= totalPages) setCurrentPage(n);
        setJumpInput('');
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.();
            setFullscreen(true);
        } else {
            document.exitFullscreen?.();
            setFullscreen(false);
        }
    };

    // Keyboard
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext();
            if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   goPrev();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totalPages]);

    return (
        <div className={`flex flex-col h-screen w-screen overflow-hidden bg-[#1a1a1a]`}>

            {/* Toolbar */}
            <header className="shrink-0 flex items-center gap-2 px-4 h-12 bg-[#111] border-b border-[#2a2a2a] text-[#e0dbd4] z-30">
                <button onClick={onClose} title="Close"
                    className="p-1.5 hover:bg-white/10 rounded transition-colors">
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>

                <div className="w-px h-5 bg-white/10 mx-1" />

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ fontFamily: "'Newsreader', serif" }}>
                        {info?.title || 'Document'}
                    </p>
                    {info?.author && (
                        <p className="text-[10px] text-[#a09a94] truncate" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                            {info.author}
                        </p>
                    )}
                </div>

                {/* Page nav */}
                <div className="flex items-center gap-2" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                    <button onClick={goPrev} disabled={currentPage <= 1}
                        className="p-1.5 hover:bg-white/10 rounded transition-colors disabled:opacity-30">
                        <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                    </button>
                    <form onSubmit={jumpTo} className="flex items-center gap-1">
                        <input
                            type="number"
                            value={jumpInput || currentPage}
                            onChange={e => setJumpInput(e.target.value)}
                            onFocus={() => setJumpInput('')}
                            min={1} max={totalPages}
                            className="w-12 bg-white/10 text-center text-sm rounded px-1 py-0.5 outline-none
                                       border border-transparent focus:border-[#c16549]"
                        />
                        <span className="text-xs text-[#a09a94]">/ {totalPages}</span>
                    </form>
                    <button onClick={goNext} disabled={currentPage >= totalPages}
                        className="p-1.5 hover:bg-white/10 rounded transition-colors disabled:opacity-30">
                        <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                    </button>
                </div>

                <div className="w-px h-5 bg-white/10 mx-1" />

                {/* Zoom */}
                <div className="flex items-center gap-1">
                    <button onClick={() => setScale(s => clamp(s - 0.2, 0.5, 4))} title="Zoom out"
                        className="p-1.5 hover:bg-white/10 rounded transition-colors">
                        <span className="material-symbols-outlined text-[18px]">zoom_out</span>
                    </button>
                    <span className="text-xs w-9 text-center">{Math.round(scale * 100)}%</span>
                    <button onClick={() => setScale(1.4)} title="Reset zoom"
                        className="p-1.5 hover:bg-white/10 rounded transition-colors">
                        <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                    </button>
                    <button onClick={() => setScale(s => clamp(s + 0.2, 0.5, 4))} title="Zoom in"
                        className="p-1.5 hover:bg-white/10 rounded transition-colors">
                        <span className="material-symbols-outlined text-[18px]">zoom_in</span>
                    </button>
                </div>

                <div className="w-px h-5 bg-white/10 mx-1" />

                {/* Dark overlay */}
                <button onClick={() => setDarkOverlay(v => !v)} title="Reading tint"
                    className={`p-1.5 rounded transition-colors ${darkOverlay ? 'bg-white/15' : 'hover:bg-white/10'}`}>
                    <span className="material-symbols-outlined text-[20px]">filter_vintage</span>
                </button>

                {/* Full-screen */}
                <button onClick={toggleFullscreen} title="Full screen"
                    className="p-1.5 hover:bg-white/10 rounded transition-colors">
                    <span className="material-symbols-outlined text-[20px]">
                        {fullscreen ? 'fullscreen_exit' : 'fullscreen'}
                    </span>
                </button>
            </header>

            {/* Progress bar */}
            <div className="h-0.5 shrink-0 bg-[#222]">
                <div className="h-full bg-[#c16549] transition-all duration-300"
                     style={{ width: totalPages ? `${(currentPage / totalPages) * 100}%` : '0%' }} />
            </div>

            {/* PDF canvas */}
            <div className="flex-1 overflow-auto bg-[#1a1a1a] flex items-start justify-center py-6 relative">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full border-2 border-[#3d3935] border-t-[#c16549] animate-spin" />
                    </div>
                )}
                <div className="relative inline-block shadow-2xl">
                    <canvas ref={canvasRef} className="block max-w-none" />
                    {darkOverlay && (
                        <div className="absolute inset-0 pointer-events-none"
                             style={{ background: 'rgba(30,20,10,0.35)', mixBlendMode: 'multiply' }} />
                    )}
                </div>
            </div>

            {/* Bottom nav (mobile-friendly) */}
            <div className="shrink-0 flex items-center justify-between px-6 py-2 bg-[#111] border-t border-[#2a2a2a]"
                 style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                <button onClick={goPrev} disabled={currentPage <= 1}
                    className="px-4 py-1.5 bg-white/5 hover:bg-white/15 rounded text-sm text-[#e0dbd4] disabled:opacity-30 transition-colors">
                    ← Previous
                </button>
                <span className="text-xs text-[#a09a94]">Page {currentPage} of {totalPages}</span>
                <button onClick={goNext} disabled={currentPage >= totalPages}
                    className="px-4 py-1.5 bg-white/5 hover:bg-white/15 rounded text-sm text-[#e0dbd4] disabled:opacity-30 transition-colors">
                    Next →
                </button>
            </div>
        </div>
    );
}
