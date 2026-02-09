import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import ePub from 'epubjs';
import { FaArrowLeft, FaExpand, FaCompress, FaDownload } from 'react-icons/fa';

const BACKEND_URL = 'http://localhost:8000';

// Set worker path for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function BookReader() {
    const { fileIndex } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { fileName } = location.state || {};

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fileUrl, setFileUrl] = useState(null);
    const [fileType, setFileType] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // PDF specific
    const [pdfDoc, setPdfDoc] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [scale, setScale] = useState(1.5);
    const canvasRef = useRef(null);

    // EPUB specific
    const [epubBook, setEpubBook] = useState(null);
    const epubContainerRef = useRef(null);

    useEffect(() => {
        loadFile();
    }, [fileIndex]);

    const loadFile = async () => {
        try {
            setLoading(true);

            // Stream file from backend
            const response = await fetch(`${BACKEND_URL}/api/torrent/stream/${fileIndex}`);

            if (response.status === 202) {
                // File is still downloading
                const data = await response.json();
                setError(data.detail || 'File is downloading...');
                setLoading(false);
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to load file');
            }

            // Get file as blob
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            // Determine file type
            const ext = fileName?.split('.').pop().toLowerCase() || 'pdf';
            setFileType(ext);
            setFileUrl(url);
            setLoading(false);
        } catch (err) {
            console.error('Error loading file:', err);
            setError(err.message);
            setLoading(false);
        }
    };

    // Load PDF
    useEffect(() => {
        if (!fileUrl || fileType !== 'pdf') return;

        const loadPDF = async () => {
            try {
                const pdf = await pdfjsLib.getDocument(fileUrl).promise;
                setPdfDoc(pdf);
                setTotalPages(pdf.numPages);
                setCurrentPage(1);
            } catch (err) {
                console.error('Error loading PDF:', err);
                setError('Failed to load PDF');
            }
        };

        loadPDF();
    }, [fileUrl, fileType]);

    // Render PDF page
    useEffect(() => {
        if (!pdfDoc || !canvasRef.current) return;

        const renderPage = async () => {
            try {
                const page = await pdfDoc.getPage(currentPage);
                const viewport = page.getViewport({ scale });

                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({
                    canvasContext: context,
                    viewport: viewport,
                }).promise;
            } catch (err) {
                console.error('Error rendering page:', err);
            }
        };

        renderPage();
    }, [pdfDoc, currentPage, scale]);

    // Load EPUB
    useEffect(() => {
        if (!fileUrl || !['epub', 'mobi', 'azw3'].includes(fileType)) return;

        const loadEPUB = async () => {
            try {
                const book = ePub(fileUrl);
                setEpubBook(book);

                if (epubContainerRef.current) {
                    const rendition = book.renderTo(epubContainerRef.current, {
                        width: '100%',
                        height: '100%',
                        spread: 'none',
                    });

                    rendition.display();
                }
            } catch (err) {
                console.error('Error loading EPUB:', err);
                setError('Failed to load EPUB');
            }
        };

        loadEPUB();
    }, [fileUrl, fileType]);

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center text-white">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
                    <p className="text-xl">Loading book...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center text-white p-8">
                    <h2 className="text-2xl font-bold mb-4">Error</h2>
                    <p className="mb-6">{error}</p>
                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={() => navigate('/catalog')}
                            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg"
                        >
                            Back to Catalog
                        </button>
                        <button
                            onClick={loadFile}
                            className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-lg"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'min-h-screen'} bg-gray-900 text-white`}>
            {/* Header */}
            <div className="bg-gray-800 border-b border-gray-700 p-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/catalog')}
                            className="flex items-center gap-2 hover:text-blue-400 transition-colors"
                        >
                            <FaArrowLeft />
                            Back to Catalog
                        </button>
                        <h1 className="text-lg font-semibold truncate max-w-md">
                            {fileName || 'Book Reader'}
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        {fileType === 'pdf' && (
                            <>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50"
                                    >
                                        Previous
                                    </button>
                                    <span className="text-sm">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setScale(Math.max(0.5, scale - 0.25))}
                                        className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600"
                                    >
                                        -
                                    </button>
                                    <span className="text-sm">{Math.round(scale * 100)}%</span>
                                    <button
                                        onClick={() => setScale(Math.min(3, scale + 0.25))}
                                        className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600"
                                    >
                                        +
                                    </button>
                                </div>
                            </>
                        )}

                        <button
                            onClick={toggleFullscreen}
                            className="p-2 hover:bg-gray-700 rounded transition-colors"
                        >
                            {isFullscreen ? <FaCompress /> : <FaExpand />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Reader Content */}
            <div className="overflow-auto" style={{ height: isFullscreen ? 'calc(100vh - 64px)' : 'calc(100vh - 128px)' }}>
                {fileType === 'pdf' && (
                    <div className="flex justify-center p-8">
                        <canvas ref={canvasRef} className="shadow-2xl" />
                    </div>
                )}

                {['epub', 'mobi', 'azw3'].includes(fileType) && (
                    <div
                        ref={epubContainerRef}
                        className="max-w-4xl mx-auto p-8"
                        style={{ height: '100%' }}
                    />
                )}

                {!['pdf', 'epub', 'mobi', 'azw3'].includes(fileType) && (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <p className="text-xl mb-4">Unsupported file format: {fileType}</p>
                            <a
                                href={fileUrl}
                                download={fileName}
                                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg"
                            >
                                <FaDownload />
                                Download File
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
