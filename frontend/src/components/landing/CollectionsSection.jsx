// Collections Section - Exact copy from Stitch landing_page_-_collections_section
export default function CollectionsSection() {
    return (
        <>
            <style>
                {`
          /* Subtle wood grain simulation using CSS gradients */
          .wood-texture {
            background-color: #e3dcd3;
            background-image: 
              repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(160, 140, 120, 0.05) 2px, rgba(160, 140, 120, 0.05) 4px),
              linear-gradient(to right, rgba(0,0,0,0.05), transparent 30%);
          }
          .dark .wood-texture {
            background-color: #2c1a18;
            background-image: 
              repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0, 0, 0, 0.2) 2px, rgba(0, 0, 0, 0.2) 4px),
              linear-gradient(to right, rgba(0,0,0,0.3), transparent 30%);
          }
          
          /* Custom shadows for realistic book depth */
          .book-shadow {
            box-shadow: 
              2px 2px 5px rgba(0,0,0,0.1),
              5px 5px 15px rgba(0,0,0,0.15);
          }
        `}
            </style>

            <div className="relative flex min-h-screen w-full flex-col bg-[#f8f6f6] dark:bg-[#221210] overflow-hidden font-display text-[#181211] dark:text-white"
                style={{ fontFamily: "'Newsreader', serif" }}>
                <div className="layout-container flex h-full grow flex-col relative z-10">
                    {/* Header Section */}
                    <div className="px-6 md:px-20 lg:px-40 flex flex-col items-center pt-16 pb-10">
                        <div className="layout-content-container flex flex-col max-w-[960px] w-full text-center">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-[#d42511] text-2xl">auto_stories</span>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight text-[#181211] dark:text-white">
                                Curated Shelves
                            </h2>
                            <p className="mt-3 text-lg text-gray-600 dark:text-gray-300 italic">
                                Hand-picked selections for the discerning reader
                            </p>
                        </div>
                    </div>
                    {/* Collections Area */}
                    <div className="px-6 md:px-20 lg:px-40 flex flex-1 justify-center pb-20">
                        <div className="layout-content-container flex flex-col lg:flex-row gap-16 lg:gap-8 max-w-[1200px] w-full items-center lg:items-start justify-between">
                            {/* Collection 1: The Classics */}
                            <div className="group flex flex-col items-center w-full max-w-[320px] cursor-pointer">
                                <div className="relative w-56 h-72 flex justify-center items-center mb-8 perspective-[1000px]">
                                    {/* Bottom Book */}
                                    <div className="absolute w-44 h-60 bg-[#4a3b32] rounded-sm book-shadow transform -rotate-6 translate-x-4 translate-y-2 group-hover:-rotate-12 group-hover:translate-x-6 transition-all duration-500 ease-out border-l-4 border-[#3a2e26]"></div>
                                    {/* Middle Book */}
                                    <div className="absolute w-44 h-60 bg-[#8b5a2b] rounded-sm book-shadow transform rotate-3 translate-x-2 -translate-y-1 group-hover:rotate-6 group-hover:translate-x-3 transition-all duration-500 ease-out border-l-4 border-[#6d4621]"></div>
                                    {/* Top Book (Cover) */}
                                    <div className="absolute w-48 h-64 rounded-sm book-shadow transform -rotate-2 group-hover:rotate-0 group-hover:-translate-y-4 transition-all duration-500 ease-out z-10 overflow-hidden bg-white dark:bg-gray-800">
                                        <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: 'url(https://lh3.googleusercontent.com/aida-public/AB6AXuBTQSP3iZqChN7h49366_qaTL6YAGjm_ZCjpJNcmj3n1mJXEapBND8uFYvlk02ju5QrCra4gyiP8dWJE19rfPir-7Qa5LHJD3OTM38P9ps1EXCWof_RLFS9Z-t8vPY7FjJuh4VHKCJRqtbvxGNjVoFH9x33yi-Xfe-j47z1HukNmXNogTP2ADepxcH9XB4cGRpCxBKdptdBc20l35pYQcfWPyPzfZlUHbeaZiXhRJmsQKclbQtKihEen-z5dPdgWPsl85sWmuK7kO05)' }}>
                                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300"></div>
                                            <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-black/80 to-transparent">
                                                <p className="text-white text-sm font-serif italic opacity-90">Jane Austen</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-center mt-2 space-y-2">
                                    <h3 className="text-2xl font-bold text-[#181211] dark:text-white border-b-2 border-transparent group-hover:border-[#d42511]/30 transition-colors pb-1 inline-block">The Classics</h3>
                                    <p className="font-display italic text-lg text-gray-500 dark:text-gray-400">Timeless tales that shaped the world.</p>
                                    <div className="pt-2">
                                        <span className="text-[#d42511] text-sm font-bold tracking-widest uppercase opacity-0 transform translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 inline-flex items-center gap-1">
                                            Explore <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Collection 2: Modern Wonders */}
                            <div className="group flex flex-col items-center w-full max-w-[320px] cursor-pointer">
                                <div className="relative w-56 h-72 flex justify-center items-center mb-8 perspective-[1000px]">
                                    {/* Bottom Book */}
                                    <div className="absolute w-48 h-60 bg-[#2c3e50] rounded-sm book-shadow transform rotate-6 translate-x-2 translate-y-4 group-hover:rotate-12 group-hover:translate-x-4 transition-all duration-500 ease-out border-l-4 border-[#1a252f]"></div>
                                    {/* Middle Book */}
                                    <div className="absolute w-46 h-62 bg-[#e74c3c] rounded-sm book-shadow transform -rotate-3 -translate-x-2 translate-y-2 group-hover:-rotate-6 group-hover:-translate-x-4 transition-all duration-500 ease-out border-l-4 border-[#c0392b]"></div>
                                    {/* Top Book (Cover) */}
                                    <div className="absolute w-48 h-64 rounded-sm book-shadow transform rotate-2 group-hover:rotate-0 group-hover:-translate-y-4 transition-all duration-500 ease-out z-10 overflow-hidden bg-white dark:bg-gray-800">
                                        <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: 'url(https://lh3.googleusercontent.com/aida-public/AB6AXuBcR1uA6rN8ddFOmfz6qjjqiPPItK18PyMLsq5h8oo_uvT3LW6n1-gDj2Mw3b0oFg8V5n3vbueSJuwPUS_Tf02GM6NxHZd_X5pN6A0E9kzpq2qU4w4O_n_iHF1PnVjj8OaCvbcsKRbKQcYjf_F_VTyAhyu2OlDzxd_h3id4bwTbQI99uF8-4oWjVk88aSuh8eQ5qoLqjBvC2JCMezplcPUD11RbA6wikX-kxbeFFjwFLTcAR00f9-QU7ZGeTz-a25eUIxs7807JWBoh)' }}>
                                            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-300"></div>
                                            <div className="absolute top-4 left-4 right-4 text-center">
                                                <div className="bg-white/90 dark:bg-black/80 backdrop-blur-sm px-2 py-1 rounded-sm shadow-sm">
                                                    <span className="text-xs font-bold uppercase tracking-widest text-[#d42511]">New Arrival</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-center mt-2 space-y-2">
                                    <h3 className="text-2xl font-bold text-[#181211] dark:text-white border-b-2 border-transparent group-hover:border-[#d42511]/30 transition-colors pb-1 inline-block">Modern Wonders</h3>
                                    <p className="font-display italic text-lg text-gray-500 dark:text-gray-400">New voices defining our generation.</p>
                                    <div className="pt-2">
                                        <span className="text-[#d42511] text-sm font-bold tracking-widest uppercase opacity-0 transform translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 inline-flex items-center gap-1">
                                            Explore <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Collection 3: Librarian's Choice */}
                            <div className="group flex flex-col items-center w-full max-w-[320px] cursor-pointer">
                                <div className="relative w-56 h-72 flex justify-center items-center mb-8 perspective-[1000px]">
                                    {/* Bottom Book */}
                                    <div className="absolute w-52 h-56 bg-[#5d4037] rounded-sm book-shadow transform -rotate-3 translate-y-6 translate-x-[-10px] group-hover:-rotate-6 group-hover:translate-y-8 transition-all duration-500 ease-out border-l-4 border-[#3e2723]"></div>
                                    {/* Middle Book */}
                                    <div className="absolute w-44 h-60 bg-[#607d8b] rounded-sm book-shadow transform rotate-12 translate-x-4 translate-y-2 group-hover:rotate-[15deg] group-hover:translate-x-6 transition-all duration-500 ease-out border-l-4 border-[#455a64]"></div>
                                    {/* Top Book (Cover) */}
                                    <div className="absolute w-48 h-64 rounded-sm book-shadow transform -rotate-2 group-hover:rotate-0 group-hover:-translate-y-4 transition-all duration-500 ease-out z-10 overflow-hidden bg-white dark:bg-gray-800">
                                        <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: 'url(https://lh3.googleusercontent.com/aida-public/AB6AXuBGQ4fG_8m_OM-YX3OOafD38mRSKhCN8wEwWGyg9iAOZGjG-fO-PWuAWgF3BL4BGV4cBLtmE1w4gVV62EgkFsJhzHpY_qolRSKns8J_j4ZRkrsX7sGtkQnFu8FQ-OYGtaJmSXWE4DQloKmsAilBYU5y8HmbsROqJ4W2Js75cDjxIX68hymOV7wCGj42ceDzhOfqw0Vm9K6QWqXKOk7ifHSpRDbZT5ajQ82rWcy230xctVEPpwiCHa79zjvY9Bx8v9P0oxczR7UP7p5D)' }}>
                                            <div className="absolute inset-0 bg-[#d42511]/20 mix-blend-multiply"></div>
                                            <div className="absolute inset-0 flex items-center justify-center p-6">
                                                <div className="border-2 border-white/40 h-full w-full flex items-center justify-center">
                                                    <span className="text-white font-serif text-3xl drop-shadow-md">Staff Pick</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-center mt-2 space-y-2">
                                    <h3 className="text-2xl font-bold text-[#181211] dark:text-white border-b-2 border-transparent group-hover:border-[#d42511]/30 transition-colors pb-1 inline-block">The Librarian's Choice</h3>
                                    <p className="font-display italic text-lg text-gray-500 dark:text-gray-400">Hidden gems found in the stacks.</p>
                                    <div className="pt-2">
                                        <span className="text-[#d42511] text-sm font-bold tracking-widest uppercase opacity-0 transform translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 inline-flex items-center gap-1">
                                            Explore <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
