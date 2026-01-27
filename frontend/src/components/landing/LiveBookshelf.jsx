// Live Bookshelf Section - Exact copy from Stitch landing_page_-_live_bookshelf_section
export default function LiveBookshelf() {
    return (
        <>
            <style>
                {`
          /* Custom scrollbar hiding for clean UI */
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}
            </style>

            <div className="bg-[#f8f6f6] dark:bg-[#1e1514] text-[#171312] dark:text-gray-100 transition-colors duration-300"
                style={{ fontFamily: "'Newsreader', serif" }}>

                {/* Section Content */}
                <div className="layout-container flex h-full grow flex-col px-6 lg:px-40 py-12 lg:py-20 relative">
                    {/* Header Section */}
                    <section className="flex flex-col items-center justify-center px-4 py-16 md:py-24 text-center max-w-4xl mx-auto">
                        <h1 className="text-[#171312] dark:text-white tracking-tight text-4xl md:text-6xl font-black leading-[1.1] mb-6">
                            The Living Library
                        </h1>
                        <p className="text-[#826b68] dark:text-gray-400 text-lg md:text-xl font-normal leading-relaxed max-w-2xl"
                            style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                            Real-time updates from shelves around the world. Join a community that leaves notes in the margins and see what others are discovering right now.
                        </p>
                    </section>

                    {/* The Bookshelf (Live Feed) */}
                    <section className="w-full relative py-10 overflow-hidden group/shelf">
                        {/* Section Title (Absolute positioned or floating) */}
                        <div className="absolute top-4 left-6 md:left-20 z-10">
                            <div className="flex items-center gap-2 bg-white/80 dark:bg-[#1e1514]/80 backdrop-blur px-3 py-1 rounded-full border border-[#e5e0df] dark:border-[#332524]">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7d2f26] opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7d2f26]"></span>
                                </span>
                                <span className="text-xs font-bold uppercase tracking-wider text-[#7d2f26]">Live Feed</span>
                            </div>
                        </div>

                        {/* Scroll Container */}
                        <div className="overflow-x-auto no-scrollbar pb-4 pt-16 px-6 md:px-20 w-full flex items-end min-h-[420px]">
                            {/* The Shelf Surface (Visual line) */}
                            <div className="absolute bottom-4 left-0 w-full h-4 bg-gradient-to-r from-[#e3dcd2] via-[#f0ebe5] to-[#e3dcd2] dark:from-[#3e2b29] dark:via-[#4a3634] dark:to-[#3e2b29] shadow-sm z-0"></div>

                            {/* Books Flex Container */}
                            <div className="flex items-end gap-1 px-4 pb-4 z-10 w-max mx-auto md:mx-0">
                                {/* Book 1: Tall Red */}
                                <div className="group relative w-12 h-80 bg-[#7d2f26] rounded-sm transition-transform duration-300 hover:-translate-y-4 cursor-pointer"
                                    style={{ boxShadow: 'inset 3px 0 10px rgba(0,0,0,0.1), inset -2px 0 5px rgba(255,255,255,0.1), 5px 5px 15px rgba(0,0,0,0.15)' }}>
                                    <div className="absolute -top-3 right-2 text-yellow-600 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                    </div>
                                    <span className="absolute inset-0 flex items-center justify-center -rotate-90 font-bold text-white/90 text-lg tracking-widest whitespace-nowrap overflow-hidden px-2"
                                        style={{ fontFamily: "'Newsreader', serif" }}>
                                        THE GOLDFINCH
                                    </span>
                                </div>

                                {/* Book 2: Medium Dark */}
                                <div className="group relative w-14 h-64 bg-[#2a2a2a] rounded-sm ml-1 transition-transform duration-300 hover:-translate-y-4 cursor-pointer"
                                    style={{ boxShadow: 'inset 3px 0 10px rgba(0,0,0,0.1), inset -2px 0 5px rgba(255,255,255,0.1), 5px 5px 15px rgba(0,0,0,0.15)' }}>
                                    {/* Margin Note Tab */}
                                    <div className="absolute -top-2 left-2 w-6 h-4 bg-yellow-100 shadow-sm rounded-t-sm flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[10px] text-gray-800">sticky_note_2</span>
                                    </div>
                                    <span className="absolute inset-0 flex items-center justify-center -rotate-90 font-medium text-gray-300 text-base tracking-wider whitespace-nowrap overflow-hidden px-2"
                                        style={{ fontFamily: "'Newsreader', serif" }}>
                                        DUNE
                                    </span>
                                </div>

                                {/* Book 3: Leaning Beige */}
                                <div className="group relative w-10 h-60 bg-[#d6cfc7] rounded-sm origin-bottom-left -ml-1 transform -rotate-3 hover:rotate-0 hover:-translate-y-2 transition-all duration-500 cursor-pointer z-0 hover:z-20"
                                    style={{ boxShadow: 'inset 3px 0 10px rgba(0,0,0,0.1), inset -2px 0 5px rgba(255,255,255,0.1), 5px 5px 15px rgba(0,0,0,0.15)' }}>
                                    <span className="absolute inset-0 flex items-center justify-center -rotate-90 font-bold text-[#4a4a4a] text-sm tracking-widest whitespace-nowrap overflow-hidden px-2"
                                        style={{ fontFamily: "'Newsreader', serif" }}>
                                        NORWEGIAN WOOD
                                    </span>
                                </div>

                                {/* Book 4: Tall Olive */}
                                <div className="group relative w-16 h-72 bg-[#5c5c4f] rounded-sm ml-3 transition-transform duration-300 hover:-translate-y-4 cursor-pointer"
                                    style={{ boxShadow: 'inset 3px 0 10px rgba(0,0,0,0.1), inset -2px 0 5px rgba(255,255,255,0.1), 5px 5px 15px rgba(0,0,0,0.15)' }}>
                                    <span className="absolute inset-0 flex items-center justify-center -rotate-90 font-semibold text-[#f0ebe5] text-xl tracking-wide whitespace-nowrap overflow-hidden px-2"
                                        style={{ fontFamily: "'Newsreader', serif" }}>
                                        BABEL
                                    </span>
                                </div>

                                {/* Book 5: Short Navy */}
                                <div className="group relative w-11 h-56 bg-[#2c3e50] rounded-sm ml-0.5 transition-transform duration-300 hover:-translate-y-4 cursor-pointer"
                                    style={{ boxShadow: 'inset 3px 0 10px rgba(0,0,0,0.1), inset -2px 0 5px rgba(255,255,255,0.1), 5px 5px 15px rgba(0,0,0,0.15)' }}>
                                    <span className="absolute inset-0 flex items-center justify-center -rotate-90 font-medium text-blue-100 text-sm tracking-widest whitespace-nowrap overflow-hidden px-2"
                                        style={{ fontFamily: "'Newsreader', serif" }}>
                                        CIRCE
                                    </span>
                                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                                        <span className="material-symbols-outlined text-white/50 text-[14px]">headphones</span>
                                    </div>
                                </div>

                                {/* Book 6: Thick Brown */}
                                <div className="group relative w-20 h-[340px] bg-[#5D4037] rounded-sm ml-1 transition-transform duration-300 hover:-translate-y-4 cursor-pointer"
                                    style={{ boxShadow: 'inset 3px 0 10px rgba(0,0,0,0.1), inset -2px 0 5px rgba(255,255,255,0.1), 5px 5px 15px rgba(0,0,0,0.15)' }}>
                                    <div className="absolute top-8 left-0 right-0 h-16 border-y border-[#4e342e] bg-[#553a32]"></div>
                                    <span className="absolute inset-0 flex items-center justify-center -rotate-90 font-black text-[#d7ccc8] text-2xl tracking-tight whitespace-nowrap overflow-hidden px-2 uppercase"
                                        style={{ fontFamily: "'Newsreader', serif" }}>
                                        Infinite Jest
                                    </span>
                                    {/* Bookmark */}
                                    <div className="absolute -top-4 right-4 w-4 h-8 bg-[#7d2f26] shadow-sm rounded-b-sm"></div>
                                </div>

                                {/* Book 7: Thin Red */}
                                <div className="group relative w-8 h-64 bg-[#9c3e34] rounded-sm ml-0.5 transition-transform duration-300 hover:-translate-y-4 cursor-pointer"
                                    style={{ boxShadow: 'inset 3px 0 10px rgba(0,0,0,0.1), inset -2px 0 5px rgba(255,255,255,0.1), 5px 5px 15px rgba(0,0,0,0.15)' }}>
                                    <span className="absolute inset-0 flex items-center justify-center -rotate-90 font-bold text-red-100 text-xs tracking-widest whitespace-nowrap overflow-hidden px-2"
                                        style={{ fontFamily: "'Newsreader', serif" }}>
                                        EDUCATED
                                    </span>
                                </div>

                                {/* Book 8: Leaning Right Grey */}
                                <div className="group relative w-12 h-60 bg-[#78909c] rounded-sm origin-bottom-right ml-4 transform rotate-6 hover:rotate-0 hover:-translate-y-2 transition-all duration-500 cursor-pointer z-0 hover:z-20"
                                    style={{ boxShadow: 'inset 3px 0 10px rgba(0,0,0,0.1), inset -2px 0 5px rgba(255,255,255,0.1), 5px 5px 15px rgba(0,0,0,0.15)' }}>
                                    <span className="absolute inset-0 flex items-center justify-center -rotate-90 font-bold text-white text-sm tracking-widest whitespace-nowrap overflow-hidden px-2"
                                        style={{ fontFamily: "'Newsreader', serif" }}>
                                        TOMORROW
                                    </span>
                                </div>

                                {/* Book 9: Standard Black */}
                                <div className="group relative w-14 h-72 bg-[#1a1a1a] rounded-sm ml-2 transition-transform duration-300 hover:-translate-y-4 cursor-pointer"
                                    style={{ boxShadow: 'inset 3px 0 10px rgba(0,0,0,0.1), inset -2px 0 5px rgba(255,255,255,0.1), 5px 5px 15px rgba(0,0,0,0.15)' }}>
                                    <span className="absolute inset-0 flex items-center justify-center -rotate-90 font-bold text-white text-lg tracking-widest whitespace-nowrap overflow-hidden px-2"
                                        style={{ fontFamily: "'Newsreader', serif" }}>
                                        1984
                                    </span>
                                </div>

                                {/* Add Your Book CTA */}
                                <div className="ml-8 flex flex-col items-center justify-center h-48 w-32 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-[#7d2f26] hover:bg-[#7d2f26]/5 cursor-pointer transition-colors group/add">
                                    <div className="size-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover/add:bg-[#7d2f26] group-hover/add:text-white transition-colors">
                                        <span className="material-symbols-outlined">add</span>
                                    </div>
                                    <p className="mt-3 text-sm font-medium text-gray-500 text-center">Add your<br />read</p>
                                </div>
                            </div>
                        </div>

                        {/* Left/Right Fade Gradient for Scroll hint */}
                        <div className="absolute top-0 bottom-0 left-0 w-8 md:w-20 bg-gradient-to-r from-[#f8f6f6] dark:from-[#1e1514] to-transparent pointer-events-none z-20"></div>
                        <div className="absolute top-0 bottom-0 right-0 w-8 md:w-20 bg-gradient-to-l from-[#f8f6f6] dark:from-[#1e1514] to-transparent pointer-events-none z-20"></div>
                    </section>
                </div>
            </div>
        </>
    );
}
