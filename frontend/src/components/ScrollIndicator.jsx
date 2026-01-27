// Scroll Progress Indicator - Dynamic section navigation
import { useState, useEffect } from 'react';

export default function ScrollIndicator() {
    const [activeSection, setActiveSection] = useState(0);

    const sections = [
        'hero',
        'collections',
        'bookshelf',
        'philosophy',
        'membership',
        'footer'
    ];

    useEffect(() => {
        const handleScroll = () => {
            const scrollPosition = window.scrollY + window.innerHeight / 2;

            // Find which section is currently in view
            const sectionElements = sections.map(id => document.getElementById(id));

            for (let i = sectionElements.length - 1; i >= 0; i--) {
                const element = sectionElements[i];
                if (element && element.offsetTop <= scrollPosition) {
                    setActiveSection(i);
                    break;
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Initial check

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (index) => {
        const element = document.getElementById(sections[index]);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="fixed right-6 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-4 z-40">
            {sections.map((section, index) => (
                <button
                    key={section}
                    onClick={() => scrollToSection(index)}
                    className="group relative"
                    aria-label={`Go to ${section} section`}
                >
                    <div
                        className={`transition-all duration-300 rounded-full ${activeSection === index
                                ? 'w-1 h-8 bg-[#c16549]'
                                : 'w-1 h-1 bg-[#c16549]/30 hover:bg-[#c16549]/50'
                            }`}
                    />
                    {/* Tooltip on hover */}
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1E1815] text-white text-xs px-3 py-1 rounded whitespace-nowrap pointer-events-none">
                        {section.charAt(0).toUpperCase() + section.slice(1)}
                    </span>
                </button>
            ))}
        </div>
    );
}
