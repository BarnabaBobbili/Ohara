import HeroSection from '../components/landing/HeroSection';
import CollectionsSection from '../components/landing/CollectionsSection';
import LiveBookshelf from '../components/landing/LiveBookshelf';
import PhilosophySection from '../components/landing/PhilosophySection';
import MembershipCTA from '../components/landing/MembershipCTA';
import Footer from '../components/landing/Footer';
import ScrollIndicator from '../components/ScrollIndicator';
import Header from '../components/Header';
import AnnouncementBanner from '../components/landing/AnnouncementBanner';
import LibraryNewsSection from '../components/landing/LibraryNewsSection';

export default function Home() {
    return (
        <div className="min-h-screen bg-white">
            {/* Announcement Banner - Slim bar at very top, above navbar */}
            <AnnouncementBanner />

            {/* Global Header - Below announcement banner */}
            <Header />

            {/* Dynamic scroll indicator */}
            <ScrollIndicator />

            <div id="hero">
                <HeroSection />
            </div>
            <div id="collections">
                <CollectionsSection />
            </div>
            <div id="bookshelf">
                <LiveBookshelf />
            </div>
            <div id="news">
                <LibraryNewsSection />
            </div>
            <div id="philosophy">
                <PhilosophySection />
            </div>
            <div id="membership">
                <MembershipCTA />
            </div>
            <div id="footer">
                <Footer />
            </div>
        </div>
    );
}
