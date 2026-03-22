import { useState, useEffect } from 'react';
import { announcementsAPI, newsAPI } from '../../services/api';

export default function ContentManager() {
    const [tab, setTab] = useState('announcements');
    const [loading, setLoading] = useState(true);
    
    // Announcements state (MongoDB)
    const [announcements, setAnnouncements] = useState([]);
    const [announcementForm, setAnnouncementForm] = useState({
        title: '', message: '', type: 'info', priority: 0, is_active: true
    });
    const [editingAnnouncement, setEditingAnnouncement] = useState(null);
    const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
    
    // News state (MySQL)
    const [news, setNews] = useState([]);
    const [newsForm, setNewsForm] = useState({
        title: '', content: '', summary: '', image_url: '', category: 'general', 
        author: '', is_featured: false, is_active: true
    });
    const [editingNews, setEditingNews] = useState(null);
    const [showNewsModal, setShowNewsModal] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [announcementsData, newsData] = await Promise.all([
                announcementsAPI.getAllAdmin().catch(() => []),
                newsAPI.getAllAdmin().catch(() => [])
            ]);
            setAnnouncements(Array.isArray(announcementsData) ? announcementsData : []);
            setNews(Array.isArray(newsData) ? newsData : []);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    // ─── Announcement CRUD ────────────────────────────────────────
    const handleAnnouncementSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingAnnouncement) {
                await announcementsAPI.update(editingAnnouncement._id, announcementForm);
            } else {
                await announcementsAPI.create(announcementForm);
            }
            loadData();
            closeAnnouncementModal();
        } catch (error) {
            alert('Failed to save: ' + error.message);
        }
    };

    const editAnnouncement = (ann) => {
        setEditingAnnouncement(ann);
        setAnnouncementForm({
            title: ann.title,
            message: ann.message,
            type: ann.type || 'info',
            priority: ann.priority || 0,
            is_active: ann.is_active ?? true
        });
        setShowAnnouncementModal(true);
    };

    const deleteAnnouncement = async (id) => {
        if (!confirm('Delete this announcement?')) return;
        try {
            await announcementsAPI.remove(id);
            loadData();
        } catch (error) {
            alert('Failed to delete: ' + error.message);
        }
    };

    const closeAnnouncementModal = () => {
        setShowAnnouncementModal(false);
        setEditingAnnouncement(null);
        setAnnouncementForm({ title: '', message: '', type: 'info', priority: 0, is_active: true });
    };

    // ─── News CRUD ────────────────────────────────────────────────
    const handleNewsSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingNews) {
                await newsAPI.update(editingNews.id, newsForm);
            } else {
                await newsAPI.create(newsForm);
            }
            loadData();
            closeNewsModal();
        } catch (error) {
            alert('Failed to save: ' + error.message);
        }
    };

    const editNews = (item) => {
        setEditingNews(item);
        setNewsForm({
            title: item.title,
            content: item.content,
            summary: item.summary || '',
            image_url: item.image_url || '',
            category: item.category || 'general',
            author: item.author || '',
            is_featured: item.is_featured ?? false,
            is_active: item.is_active ?? true
        });
        setShowNewsModal(true);
    };

    const deleteNews = async (id) => {
        if (!confirm('Delete this news item?')) return;
        try {
            await newsAPI.remove(id);
            loadData();
        } catch (error) {
            alert('Failed to delete: ' + error.message);
        }
    };

    const closeNewsModal = () => {
        setShowNewsModal(false);
        setEditingNews(null);
        setNewsForm({ title: '', content: '', summary: '', image_url: '', category: 'general', author: '', is_featured: false, is_active: true });
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'warning': return 'bg-amber-100 text-amber-800';
            case 'success': return 'bg-green-100 text-green-800';
            case 'error': return 'bg-red-100 text-red-800';
            default: return 'bg-blue-100 text-blue-800';
        }
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <span className="material-symbols-outlined text-4xl text-[#c16549] animate-spin">refresh</span>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="h-[2px] w-8 bg-[#c16549]"></div>
                        <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#c16549]">Communications</span>
                    </div>
                    <h1 className="text-3xl font-bold text-[#1E1815]">News & Alerts</h1>
                    <p className="text-sm text-[#6B6560] mt-1">Manage announcements and library news articles</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-[#E8E4DF]">
                <button
                    onClick={() => setTab('announcements')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        tab === 'announcements'
                            ? 'border-[#c16549] text-[#c16549]'
                            : 'border-transparent text-[#6B6560] hover:text-[#1E1815]'
                    }`}
                >
                    <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">campaign</span>
                        Announcements
                    </span>
                </button>
                <button
                    onClick={() => setTab('news')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        tab === 'news'
                            ? 'border-[#c16549] text-[#c16549]'
                            : 'border-transparent text-[#6B6560] hover:text-[#1E1815]'
                    }`}
                >
                    <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">newspaper</span>
                        Library News
                    </span>
                </button>
            </div>

            {/* ─── Announcements Tab ─────────────────────────────────── */}
            {tab === 'announcements' && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-sm text-[#6B6560]">{announcements.length} announcement{announcements.length !== 1 ? 's' : ''}</p>
                        <button
                            onClick={() => setShowAnnouncementModal(true)}
                            className="flex items-center gap-1 text-sm text-white bg-[#c16549] hover:bg-[#a85443] px-4 py-2 rounded transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg">add</span>
                            New Announcement
                        </button>
                    </div>

                    <div className="space-y-3">
                        {announcements.length === 0 ? (
                            <div className="text-center py-12 text-[#6B6560]">
                                <span className="material-symbols-outlined text-5xl mb-2 opacity-30">campaign</span>
                                <p>No announcements yet</p>
                            </div>
                        ) : (
                            announcements.map(ann => (
                                <div key={ann._id} className={`bg-white border border-[#E8E4DF] p-4 rounded ${!ann.is_active ? 'opacity-50' : ''}`}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="font-semibold text-[#1E1815]">{ann.title}</h3>
                                                <span className={`px-2 py-0.5 text-[10px] font-medium uppercase rounded ${getTypeColor(ann.type)}`}>
                                                    {ann.type}
                                                </span>
                                                {!ann.is_active && (
                                                    <span className="px-2 py-0.5 text-[10px] font-medium uppercase bg-gray-100 text-gray-600 rounded">Inactive</span>
                                                )}
                                            </div>
                                            <p className="text-sm text-[#6B6560]">{ann.message}</p>
                                            <p className="text-xs text-[#6B6560] mt-2">
                                                Priority: {ann.priority} • Created: {new Date(ann.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => editAnnouncement(ann)} className="p-1.5 text-[#6B6560] hover:text-[#c16549] hover:bg-[#FFF5F0] rounded transition-colors">
                                                <span className="material-symbols-outlined text-lg">edit</span>
                                            </button>
                                            <button onClick={() => deleteAnnouncement(ann._id)} className="p-1.5 text-[#6B6560] hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* ─── News Tab ─────────────────────────────────────────── */}
            {tab === 'news' && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-sm text-[#6B6560]">{news.length} news item{news.length !== 1 ? 's' : ''}</p>
                        <button
                            onClick={() => setShowNewsModal(true)}
                            className="flex items-center gap-1 text-sm text-white bg-[#c16549] hover:bg-[#a85443] px-4 py-2 rounded transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg">add</span>
                            New Article
                        </button>
                    </div>

                    <div className="space-y-3">
                        {news.length === 0 ? (
                            <div className="text-center py-12 text-[#6B6560]">
                                <span className="material-symbols-outlined text-5xl mb-2 opacity-30">newspaper</span>
                                <p>No news articles yet</p>
                            </div>
                        ) : (
                            news.map(item => (
                                <div key={item.id} className={`bg-white border border-[#E8E4DF] p-4 rounded ${!item.is_active ? 'opacity-50' : ''}`}>
                                    <div className="flex items-start gap-4">
                                        {item.image_url && (
                                            <img src={item.image_url} alt={item.title} className="w-20 h-20 object-cover object-center rounded" />
                                        )}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="font-semibold text-[#1E1815]">{item.title}</h3>
                                                {item.is_featured && (
                                                    <span className="px-2 py-0.5 text-[10px] font-medium uppercase bg-[#c16549] text-white rounded">Featured</span>
                                                )}
                                                {!item.is_active && (
                                                    <span className="px-2 py-0.5 text-[10px] font-medium uppercase bg-gray-100 text-gray-600 rounded">Inactive</span>
                                                )}
                                            </div>
                                            <p className="text-sm text-[#6B6560] line-clamp-2">{item.summary || item.content}</p>
                                            <p className="text-xs text-[#6B6560] mt-2">
                                                {item.category} • {item.author || 'Anonymous'} • {new Date(item.published_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => editNews(item)} className="p-1.5 text-[#6B6560] hover:text-[#c16549] hover:bg-[#FFF5F0] rounded transition-colors">
                                                <span className="material-symbols-outlined text-lg">edit</span>
                                            </button>
                                            <button onClick={() => deleteNews(item.id)} className="p-1.5 text-[#6B6560] hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* ─── Announcement Modal ───────────────────────────────── */}
            {showAnnouncementModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-[#1E1815] mb-4">
                                {editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
                            </h2>
                            <form onSubmit={handleAnnouncementSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#1E1815] mb-1">Title</label>
                                <input
                                    type="text"
                                    value={announcementForm.title}
                                    onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                                    className="w-full px-3 py-2 border border-[#E8E4DF] rounded focus:border-[#c16549] focus:outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#1E1815] mb-1">Message</label>
                                <textarea
                                    value={announcementForm.message}
                                    onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                                    className="w-full px-3 py-2 border border-[#E8E4DF] rounded focus:border-[#c16549] focus:outline-none"
                                    rows="3"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#1E1815] mb-1">Type</label>
                                    <select
                                        value={announcementForm.type}
                                        onChange={(e) => setAnnouncementForm({ ...announcementForm, type: e.target.value })}
                                        className="w-full px-3 py-2 border border-[#E8E4DF] rounded focus:border-[#c16549] focus:outline-none"
                                    >
                                        <option value="info">Info</option>
                                        <option value="success">Success</option>
                                        <option value="warning">Warning</option>
                                        <option value="error">Error</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1E1815] mb-1">Priority</label>
                                    <input
                                        type="number"
                                        value={announcementForm.priority}
                                        onChange={(e) => setAnnouncementForm({ ...announcementForm, priority: parseInt(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 border border-[#E8E4DF] rounded focus:border-[#c16549] focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="ann-active"
                                    checked={announcementForm.is_active}
                                    onChange={(e) => setAnnouncementForm({ ...announcementForm, is_active: e.target.checked })}
                                    className="rounded border-[#E8E4DF]"
                                />
                                <label htmlFor="ann-active" className="text-sm text-[#6B6560]">Active</label>
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t border-[#E8E4DF]">
                                <button type="button" onClick={closeAnnouncementModal} className="px-4 py-2 text-sm text-[#6B6560] hover:text-[#1E1815]">
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 text-sm text-white bg-[#c16549] hover:bg-[#a85443] rounded">
                                    {editingAnnouncement ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── News Modal ───────────────────────────────────────── */}
            {showNewsModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-[#1E1815] mb-4">
                                {editingNews ? 'Edit News Article' : 'New News Article'}
                            </h2>
                            <form onSubmit={handleNewsSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#1E1815] mb-1">Title</label>
                                <input
                                    type="text"
                                    value={newsForm.title}
                                    onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                                    className="w-full px-3 py-2 border border-[#E8E4DF] rounded focus:border-[#c16549] focus:outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#1E1815] mb-1">Summary</label>
                                <input
                                    type="text"
                                    value={newsForm.summary}
                                    onChange={(e) => setNewsForm({ ...newsForm, summary: e.target.value })}
                                    placeholder="Brief summary for preview"
                                    className="w-full px-3 py-2 border border-[#E8E4DF] rounded focus:border-[#c16549] focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#1E1815] mb-1">Content</label>
                                <textarea
                                    value={newsForm.content}
                                    onChange={(e) => setNewsForm({ ...newsForm, content: e.target.value })}
                                    className="w-full px-3 py-2 border border-[#E8E4DF] rounded focus:border-[#c16549] focus:outline-none"
                                    rows="5"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#1E1815] mb-1">Image URL</label>
                                <input
                                    type="url"
                                    value={newsForm.image_url}
                                    onChange={(e) => setNewsForm({ ...newsForm, image_url: e.target.value })}
                                    placeholder="https://example.com/image.jpg"
                                    className="w-full px-3 py-2 border border-[#E8E4DF] rounded focus:border-[#c16549] focus:outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#1E1815] mb-1">Category</label>
                                    <select
                                        value={newsForm.category}
                                        onChange={(e) => setNewsForm({ ...newsForm, category: e.target.value })}
                                        className="w-full px-3 py-2 border border-[#E8E4DF] rounded focus:border-[#c16549] focus:outline-none"
                                    >
                                        <option value="general">General</option>
                                        <option value="events">Events</option>
                                        <option value="new-arrivals">New Arrivals</option>
                                        <option value="community">Community</option>
                                        <option value="tips">Reading Tips</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#1E1815] mb-1">Author</label>
                                    <input
                                        type="text"
                                        value={newsForm.author}
                                        onChange={(e) => setNewsForm({ ...newsForm, author: e.target.value })}
                                        placeholder="Author name"
                                        className="w-full px-3 py-2 border border-[#E8E4DF] rounded focus:border-[#c16549] focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="news-featured"
                                        checked={newsForm.is_featured}
                                        onChange={(e) => setNewsForm({ ...newsForm, is_featured: e.target.checked })}
                                        className="rounded border-[#E8E4DF]"
                                    />
                                    <label htmlFor="news-featured" className="text-sm text-[#6B6560]">Featured</label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="news-active"
                                        checked={newsForm.is_active}
                                        onChange={(e) => setNewsForm({ ...newsForm, is_active: e.target.checked })}
                                        className="rounded border-[#E8E4DF]"
                                    />
                                    <label htmlFor="news-active" className="text-sm text-[#6B6560]">Active</label>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t border-[#E8E4DF]">
                                <button type="button" onClick={closeNewsModal} className="px-4 py-2 text-sm text-[#6B6560] hover:text-[#1E1815]">
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 text-sm text-white bg-[#c16549] hover:bg-[#a85443] rounded">
                                    {editingNews ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
