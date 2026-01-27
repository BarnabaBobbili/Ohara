import HeroSection from '../components/landing/HeroSection';
import CollectionsSection from '../components/landing/CollectionsSection';
import LiveBookshelf from '../components/landing/LiveBookshelf';
import PhilosophySection from '../components/landing/PhilosophySection';
import MembershipCTA from '../components/landing/MembershipCTA';
import Footer from '../components/landing/Footer';
import ScrollIndicator from '../components/ScrollIndicator';
import Header from '../components/Header';

export default function Home() {
    return (
        <div className="min-h-screen bg-white">
            {/* Global Header - Transparent on hero, solid on scroll */}
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
