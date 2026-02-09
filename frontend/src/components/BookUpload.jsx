import { useState } from 'react';
import { FaUpload, FaFile, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const BACKEND_URL = 'http://localhost:8000';

const BookUpload = ({ memberId, onUploadSuccess }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(null); // 'success' | 'error'
    const [message, setMessage] = useState('');

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const validTypes = ['application/epub+zip', 'application/pdf'];
            const validExtensions = ['.epub', '.pdf'];
            const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

            if (!validExtensions.includes(extension)) {
                setMessage('Only EPUB and PDF files are supported');
                setUploadStatus('error');
                return;
            }

            // Validate file size (50MB max)
            const maxSize = 50 * 1024 * 1024; // 50MB in bytes
            if (file.size > maxSize) {
                setMessage('File size must be less than 50MB');
                setUploadStatus('error');
                return;
            }

            setSelectedFile(file);
            setUploadStatus(null);
            setMessage('');
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileChange({ target: { files: [file] } });
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleUpload = async (e) => {
        e.preventDefault();

        if (!selectedFile) {
            setMessage('Please select a file');
            setUploadStatus('error');
            return;
        }

        if (!title.trim()) {
            setMessage('Please enter a title');
            setUploadStatus('error');
            return;
        }

        setUploading(true);
        setUploadStatus(null);

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', title);
        formData.append('author', author || 'Unknown');
        formData.append('member_id', memberId || 1); // TODO: Get from auth context

        try {
            const response = await fetch(`${BACKEND_URL}/api/user-library/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Upload failed');
            }

            const data = await response.json();
            setUploadStatus('success');
            setMessage('Book uploaded successfully!');

            // Reset form
            setSelectedFile(null);
            setTitle('');
            setAuthor('');

            // Notify parent component
            if (onUploadSuccess) {
                onUploadSuccess(data);
            }
        } catch (error) {
            setUploadStatus('error');
            setMessage(error.message || 'Failed to upload book');
            console.error('Upload error:', error);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Upload Your Book</h2>

            <form onSubmit={handleUpload}>
                {/* File Drop Zone */}
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="mb-6 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
                    onClick={() => document.getElementById('file-input').click()}
                >
                    {selectedFile ? (
                        <div className="flex items-center justify-center gap-3">
                            <FaFile className="text-blue-600 text-3xl" />
                            <div className="text-left">
                                <p className="font-semibold text-gray-900">{selectedFile.name}</p>
                                <p className="text-sm text-gray-600">
                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <FaUpload className="mx-auto text-gray-400 text-5xl mb-4" />
                            <p className="text-gray-600 mb-2">
                                Drag and drop your book here, or click to browse
                            </p>
                            <p className="text-sm text-gray-500">
                                Supports EPUB and PDF (Max 50MB)
                            </p>
                        </div>
                    )}
                    <input
                        id="file-input"
                        type="file"
                        accept=".epub,.pdf"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </div>

                {/* Title Input */}
                <div className="mb-4">
                    <label className="block text-gray-700 font-semibold mb-2">
                        Title *
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter book title"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                    />
                </div>

                {/* Author Input */}
                <div className="mb-6">
                    <label className="block text-gray-700 font-semibold mb-2">
                        Author (Optional)
                    </label>
                    <input
                        type="text"
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        placeholder="Enter author name"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Status Message */}
                {message && (
                    <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${uploadStatus === 'success'
                            ? 'bg-green-100 border border-green-400 text-green-700'
                            : 'bg-red-100 border border-red-400 text-red-700'
                        }`}>
                        {uploadStatus === 'success' ? (
                            <FaCheckCircle className="text-xl" />
                        ) : (
                            <FaTimesCircle className="text-xl" />
                        )}
                        <span>{message}</span>
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={uploading || !selectedFile}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
                >
                    {uploading ? 'Uploading...' : 'Upload Book'}
                </button>
            </form>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">📌 Note:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Only upload books you legally own</li>
                    <li>• Maximum file size: 50MB</li>
                    <li>• Supported formats: EPUB, PDF</li>
                    <li>• Your books are stored securely and privately</li>
                </ul>
            </div>
        </div>
    );
};

export default BookUpload;
