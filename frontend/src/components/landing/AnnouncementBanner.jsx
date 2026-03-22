// Announcement Banner - Slim top bar above navbar
import { useEffect, useState } from 'react';
import { announcementsAPI } from '../../services/api';

export default function AnnouncementBanner() {
    const [announcements, setAnnouncements] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isDismissed, setIsDismissed] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if user already dismissed announcements this session
        const dismissed = sessionStorage.getItem('announcements_dismissed');
        if (dismissed) {
            setIsDismissed(true);
            return;
        }

        announcementsAPI.getAll()
            .then((data) => {
                if (Array.isArray(data) && data.length > 0) {
                    const sorted = data.sort((a, b) => {
                        const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
                        const aPriority = priorityOrder[a.priority] ?? 2;
                        const bPriority = priorityOrder[b.priority] ?? 2;
                        if (aPriority !== bPriority) return aPriority - bPriority;
                        return new Date(b.created_at) - new Date(a.created_at);
                    });
                    setAnnouncements(sorted);
                    setTimeout(() => setIsVisible(true), 100);
                }
            })
            .catch(() => {});
    }, []);

    // Auto-rotate announcements every 5 seconds
    useEffect(() => {
        if (announcements.length <= 1) return;
        
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % announcements.length);
        }, 5000);
        
        return () => clearInterval(interval);
    }, [announcements.length]);

    const handleDismiss = () => {
        setIsDismissed(true);
        sessionStorage.setItem('announcements_dismissed', 'true');
    };

    if (isDismissed || announcements.length === 0 || !isVisible) return null;

    const current = announcements[currentIndex];

    return (
        <div 
            className="w-full bg-[#1E1815] text-[#FAF7F2] relative z-[60]"
            style={{ fontFamily: "'Noto Sans', sans-serif" }}
        >
            <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-2 flex items-center justify-center gap-3 text-sm">
                {/* Announcement text */}
                <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
                    {current.priority === 'urgent' && (
                        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-[#c16549] text-white text-[10px] font-bold uppercase tracking-wider rounded">
                            Urgent
                        </span>
                    )}
                    <p className="truncate text-center">
                        <span className="font-medium">{current.title}</span>
                        {current.message && (
                            <span className="hidden md:inline text-[#FAF7F2]/70"> — {current.message}</span>
                        )}
                    </p>
                </div>

                {/* Navigation dots for multiple announcements */}
                {announcements.length > 1 && (
                    <div className="hidden sm:flex items-center gap-1.5">
                        {announcements.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentIndex(idx)}
                                className={`w-1.5 h-1.5 rounded-full transition-all ${
                                    idx === currentIndex 
                                        ? 'bg-[#c16549]' 
                                        : 'bg-[#FAF7F2]/30 hover:bg-[#FAF7F2]/50'
                                }`}
                                aria-label={`Announcement ${idx + 1}`}
                            />
                        ))}
                    </div>
                )}

                {/* Dismiss button */}
                <button
                    onClick={handleDismiss}
                    className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
                    aria-label="Dismiss announcements"
                >
                    <span className="material-symbols-outlined text-base">close</span>
                </button>
            </div>
        </div>
    );
}
