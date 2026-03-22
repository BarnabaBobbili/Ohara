// Philosophy Section - Exact copy from Stitch landing_page_-_philosophy_section
import { useEffect, useState } from 'react';
import { cmsAPI } from '../../services/api';

const DEFAULT_CONTENT = {
    label: '04 — Philosophy',
    headline: 'Ohara Philosophy',
    body_paragraphs: [
        'In an era defined by algorithmic noise and infinite scrolling, we built a sanctuary. Ohara is not just a feature; it is a commitment to the preservation of attention. We eschew the dopamine loops of modern software in favor of a slower, more deliberate pace.',
        "We believe that the act of cataloging one's library is a form of meditation. It connects us to the physical reality of the books we love—the weight of the paper, the smell of the binding, the memories attached to each spine. Our software is designed to recede, allowing these tactile experiences to take center stage.",
        'There are no notifications here. No social feeds clamoring for your engagement. Just your collection, your thoughts, and the quiet space to organize them. This is software that respects your solitude.',
    ],
};

export default function PhilosophySection() {
    const [content, setContent] = useState(DEFAULT_CONTENT);

    useEffect(() => {
        cmsAPI.getSection('home', 'philosophy')
            .then((data) => {
                if (data) {
                    setContent({ ...DEFAULT_CONTENT, ...data });
                }
            })
            .catch(() => {});
    }, []);

    const paragraphs = content.body_paragraphs?.length ? content.body_paragraphs : DEFAULT_CONTENT.body_paragraphs;

    return (
        <>
            <style>
                {`
          .fade-in-up {
            opacity: 0;
            transform: translateY(20px);
            animation: fadeInUp 0.8s ease-out forwards;
          }

          @keyframes fadeInUp {
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
            </style>

            <div className="relative flex min-h-screen w-full flex-col bg-[#f8f6f6] dark:bg-[#1e1514] overflow-x-hidden transition-colors duration-300"
                style={{ fontFamily: "'Newsreader', serif" }}>

                {/* Main Content Area */}
                <main className="flex-grow flex flex-col relative">

                    {/* Section Content */}
                    <div className="layout-container flex h-full grow flex-col px-6 lg:px-40 py-12 lg:py-20 relative">
                        {/* Background Grain/Texture Hint */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                            style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAD6J0WQo0CWO2EZPprKZszWwJlylDplAJTNddHeKeRG9kzhwvoVb6SrNxLxEApIrPjM_o9V2cDw-NrC865idQbRQ8o3zVj1QfkUKyMPDStO5lPHf52cNSsK0D12GCD2AfxxKVRc6XJEf60F7DCsKYVOhB4TIZ15UVot1aa4ADVQ7Q4Dtl3ndIcL4d1UyfUvYYYLN7kxsQyHS4fujJ_Wpe_6TfiZSA1YT4fhA5N-8coLGJTOULcJ1nCDeuoGdi-agxOG15Pw7gHqUAH')" }}></div>

                        <div className="flex flex-col lg:flex-row w-full max-w-[1280px] mx-auto z-10">
                            {/* Text Column (Left Side) */}
                            <div className="w-full lg:w-[55%] flex flex-col pr-0 lg:pr-20">
                                {/* Meta Label */}
                                <div className="fade-in-up" style={{ animationDelay: '0.1s' }}>
                                    <p className="text-[#c16549] text-sm font-medium tracking-widest uppercase mb-6">
                                        {content.label}
                                    </p>
                                </div>

                                {/* Headline */}
                                <div className="fade-in-up" style={{ animationDelay: '0.2s' }}>
                                    <h3 className="text-[#1E1815] dark:text-white text-4xl lg:text-[48px] font-serif font-bold leading-tight mb-8 tracking-tight">
                                        {content.headline}
                                    </h3>
                                </div>

                                {/* Body Copy - Wide margin, double spacing, justified */}
                                <div className="mb-8">
                                    <p className="text-[#1E1815] dark:text-gray-300 text-base md:text-lg leading-loose text-justify"
                                        style={{ fontFamily: "'Noto Serif', serif" }}>
                                        <span className="text-[#89332a] text-5xl float-left mr-3 mt-[-6px] font-bold">I</span>{paragraphs[0]}
                                    </p>
                                </div><p className="text-[#171312] dark:text-gray-300 text-lg leading-relaxed mb-6 font-normal">
                                    {paragraphs[1]}
                                </p>
                                <p className="text-[#171312] dark:text-gray-300 text-lg leading-relaxed mb-10 font-normal">
                                    {paragraphs[2]}
                                </p>

                                {/* Inkwell Illustration (SVG) */}
                                <div className="mt-8 mb-20 lg:mb-0 opacity-80 fade-in-up" style={{ animationDelay: '0.6s' }}>
                                    <svg className="text-[#89332a]" fill="none" height="64" viewBox="0 0 64 64" width="64" xmlns="http://www.w3.org/2000/svg">
                                        {/* Ink Bottle Shape */}
                                        <path d="M22 18H42V12C42 10.8954 41.1046 10 40 10H24C22.8954 10 22 10.8954 22 12V18Z" stroke="currentColor" strokeLinecap="round" strokeWidth="2"></path>
                                        <path d="M42 18H22L16 26V50C16 52.2091 17.7909 54 20 54H44C46.2091 54 48 52.2091 48 50V26L42 18Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2"></path>
                                        {/* Ink Level */}
                                        <path d="M19 44C19 44 24 48 32 48C40 48 45 44 45 44" stroke="currentColor" strokeDasharray="2 4" strokeLinecap="round" strokeWidth="1.5"></path>
                                        {/* Quill/Pen Tip Hint */}
                                        <path d="M46 4L38 20" stroke="currentColor" strokeLinecap="round" strokeWidth="2"></path>
                                    </svg>
                                </div>
                            </div>

                            {/* The "Void" (Right Side) */}
                            {/* This empty div represents the whitespace requested */}
                            <div className="hidden lg:block lg:w-[45%] h-full min-h-[600px]"></div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}
