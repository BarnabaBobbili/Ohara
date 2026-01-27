// Search Results Page - Exact copy from Stitch the_bookshelf_search_results
import Header from '../components/Header';

export default function SearchResults() {
    return (
        <>
            <Header />
            <style>
                {`
          /* Custom Scrollbar for a cleaner look */
          ::-webkit-scrollbar {
            width: 8px
          }
          ::-webkit-scrollbar-track {
            background: transparent
          }
          ::-webkit-scrollbar-thumb {
            background: #e5e5e5;
            border-radius: 4px
          }
          .shelf-line {
            background: linear-gradient(90deg, rgba(215, 192, 165, 0.2) 0%, rgba(137, 97, 104, 0.4) 50%, rgba(215, 192, 165, 0.2) 100%)
          }
        `}
            </style>

            <div className="bg-[#FDFCF8] text-[#181112] min-h-screen flex flex-col overflow-x-hidden pt-24"
                style={{ fontFamily: "'Newsreader', serif" }}>

                {/* Main Layout */}
                <main className="flex-1 flex flex-col md:flex-row max-w-[1440px] mx-auto w-full pt-8 pb-20 px-6 gap-8">
                    {/* Sidebar (Index Card Style) */}
                    <aside className="w-full md:w-72 flex-shrink-0">
                        <div className="bg-white rounded-lg shadow-sm border border-[#e6dbdd] p-6 sticky top-28 transform rotate-[-1deg] transition-transform hover:rotate-0 duration-500">
                            {/* Index Card Hole */}
                            <div className="w-4 h-4 rounded-full bg-[#f4f0f1] border border-[#e6dbdd] mx-auto mb-6 shadow-inner"></div>
                            <div className="flex flex-col gap-6">
                                <div className="border-b border-dashed border-[#e6dbdd] pb-4">
                                    <h1 className="text-lg font-bold text-[#181112] tracking-wide mb-1"
                                        style={{ fontFamily: "'Courier New', monospace" }}>INDEX_REF: SEARCH</h1>
                                    <p className="text-xs text-[#896168]"
                                        style={{ fontFamily: "'Courier New', monospace" }}>Filter by properties</p>
                                </div>

                                {/* Categories */}
                                <div className="flex flex-col gap-3">
                                    <p className="text-xs uppercase tracking-widest text-[#896168] mb-1"
                                        style={{ fontFamily: "'Courier New', monospace" }}>Genre</p>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input defaultChecked className="w-4 h-4 rounded border-[#e6dbdd] text-[#d41132] focus:ring-[#d41132]/20" type="checkbox" />
                                        <span className="text-sm font-medium group-hover:text-[#d41132] transition-colors">Fiction</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input className="w-4 h-4 rounded border-[#e6dbdd] text-[#d41132] focus:ring-[#d41132]/20" type="checkbox" />
                                        <span className="text-sm font-medium group-hover:text-[#d41132] transition-colors">Non-Fiction</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input className="w-4 h-4 rounded border-[#e6dbdd] text-[#d41132] focus:ring-[#d41132]/20" type="checkbox" />
                                        <span className="text-sm font-medium group-hover:text-[#d41132] transition-colors">Philosophy</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input className="w-4 h-4 rounded border-[#e6dbdd] text-[#d41132] focus:ring-[#d41132]/20" type="checkbox" />
                                        <span className="text-sm font-medium group-hover:text-[#d41132] transition-colors">Art & Design</span>
                                    </label>
                                </div>

                                {/* Radio List (Availability) */}
                                <div className="flex flex-col gap-3 pt-2">
                                    <p className="text-xs uppercase tracking-widest text-[#896168] mb-1"
                                        style={{ fontFamily: "'Courier New', monospace" }}>Status</p>
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input defaultChecked className="mt-0.5 w-4 h-4 border-[#e6dbdd] text-[#d41132] focus:ring-[#d41132]/20" name="status" type="radio" />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium group-hover:text-[#d41132] transition-colors">Available Now</span>
                                            <span className="text-[10px] text-[#896168]">Ready for pickup</span>
                                        </div>
                                    </label>
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input className="mt-0.5 w-4 h-4 border-[#e6dbdd] text-[#d41132] focus:ring-[#d41132]/20" name="status" type="radio" />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium group-hover:text-[#d41132] transition-colors">Includes Checked Out</span>
                                            <span className="text-[10px] text-[#896168]">Show all catalog</span>
                                        </div>
                                    </label>
                                </div>

                                {/* Date Range */}
                                <div className="pt-2">
                                    <p className="text-xs uppercase tracking-widest text-[#896168] mb-3"
                                        style={{ fontFamily: "'Courier New', monospace" }}>Era</p>
                                    <div className="flex items-center gap-2">
                                        <input className="w-full rounded border border-[#e6dbdd] bg-[#fcfbfb] px-2 py-1 text-sm focus:border-[#d41132] focus:ring-0"
                                            placeholder="1900" type="text"
                                            style={{ fontFamily: "'Courier New', monospace" }} />
                                        <span className="text-[#896168]">-</span>
                                        <input className="w-full rounded border border-[#e6dbdd] bg-[#fcfbfb] px-2 py-1 text-sm focus:border-[#d41132] focus:ring-0"
                                            placeholder="2024" type="text"
                                            style={{ fontFamily: "'Courier New', monospace" }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col">
                        {/* Search Header */}
                        <div className="mb-12 relative z-20">
                            <div className="bg-white p-2 rounded-xl shadow-sm border border-[#e6dbdd] flex items-center max-w-2xl mx-auto">
                                <span className="material-symbols-outlined text-[#896168] px-4">search</span>
                                <input
                                    className="flex-1 border-none focus:ring-0 text-lg placeholder:text-[#896168]/60 bg-transparent text-[#181112]"
                                    placeholder="Search by title, author, or ISBN..."
                                    type="text"
                                    defaultValue="Modernist Architecture"
                                />
                                <button className="bg-[#d41132] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#d41132]/90 transition-colors shadow-sm">
                                    Search
                                </button>
                            </div>
                            <div className="flex justify-center gap-4 mt-3">
                                <span className="text-xs text-[#896168]">124 results found in <span className="text-[#181112] font-medium">0.45s</span></span>
                                <span className="text-xs text-[#896168]">•</span>
                                <span className="text-xs text-[#896168]">Sorted by <span className="text-[#181112] font-medium border-b border-dotted border-[#181112] cursor-pointer">Relevance</span></span>
                            </div>
                        </div>

                        {/* Content: The Shelves */}
                        <div className="flex flex-col gap-16 pb-20">
                            {/* Shelf 1: Top Matches */}
                            <div className="relative">
                                <div className="absolute -top-10 left-0">
                                    <h3 className="text-xl font-bold text-[#181112] flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[#d41132] text-xl">star</span>
                                        Top Matches
                                    </h3>
                                </div>
                                {/* Shelf Surface */}
                                <div className="flex items-end gap-2 md:gap-8 px-4 md:px-10 pb-1 border-b-[6px] border-[#e1d5d0] shelf-line min-h-[320px] overflow-x-auto overflow-y-hidden">
                                    {/* Book 1: Vertical */}
                                    <div className="group relative flex-shrink-0 cursor-pointer w-[160px] md:w-[180px] perspective-1000">
                                        {/* Bookmark Tab */}
                                        <div className="absolute -top-3 left-4 right-4 h-12 bg-[#d41132] rounded-t-sm z-0 transition-all duration-300 group-hover:-top-16 group-hover:shadow-md flex flex-col items-center justify-start pt-2">
                                            <div className="w-2 h-2 rounded-full bg-white/30 mb-1"></div>
                                            <span className="text-[10px] text-white font-medium uppercase tracking-wider">Available</span>
                                        </div>
                                        {/* Book Cover */}
                                        <div className="relative z-10 w-full aspect-[2/3] rounded-r-md rounded-l-sm transition-all duration-300 bg-white overflow-hidden group-hover:-translate-y-2"
                                            style={{ boxShadow: '5px 5px 15px rgba(0,0,0,0.15), 2px 2px 5px rgba(0,0,0,0.1)' }}>
                                            <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/20 to-transparent z-20 pointer-events-none"></div>
                                            <div className="w-full h-full bg-slate-200"></div>
                                        </div>
                                        {/* Tooltip Info */}
                                        <div className="absolute top-full mt-4 left-0 w-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 text-center">
                                            <h4 className="text-sm font-bold leading-tight">The Design of Everyday Things</h4>
                                            <p className="text-xs text-[#896168] mt-1">Don Norman</p>
                                        </div>
                                    </div>

                                    {/* Stack of Books */}
                                    <div className="flex flex-col gap-1 items-center justify-end h-full px-6 flex-shrink-0">
                                        {/* Book 3 (Stacked Top) */}
                                        <div className="group relative w-[180px] h-[35px] cursor-pointer hover:-translate-x-2 transition-transform duration-300">
                                            <div className="w-full h-full bg-[#4a5568] rounded-sm shadow-sm flex items-center px-3 border-l-4 border-l-[#2d3748] relative overflow-hidden">
                                                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/20 to-transparent"></div>
                                                <span className="text-white text-xs truncate font-medium tracking-wide">Thinking, Fast and Slow</span>
                                            </div>
                                        </div>
                                        {/* Book 4 (Stacked Mid) */}
                                        <div className="group relative w-[200px] h-[45px] cursor-pointer hover:-translate-x-2 transition-transform duration-300">
                                            <div className="w-full h-full bg-[#c0392b] rounded-sm shadow-sm flex items-center px-3 border-l-4 border-l-[#962d22] relative overflow-hidden">
                                                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/20 to-transparent"></div>
                                                <span className="text-white text-xs truncate font-medium tracking-wide text-lg"
                                                    style={{ fontFamily: "'Newsreader', serif" }}>Bauhaus: 1919-1933</span>
                                            </div>
                                        </div>
                                        {/* Book 5 (Stacked Bottom) */}
                                        <div className="group relative w-[190px] h-[40px] cursor-pointer hover:-translate-x-2 transition-transform duration-300">
                                            <div className="w-full h-full bg-[#27ae60] rounded-sm shadow-sm flex items-center px-3 border-l-4 border-l-[#1e8449] relative overflow-hidden">
                                                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/20 to-transparent"></div>
                                                <span className="text-white text-xs truncate font-medium tracking-wide">Biophilic Design</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Shelf Shadow underneath */}
                                <div className="w-full h-4 bg-gradient-to-b from-[#000000]/5 to-transparent"></div>
                            </div>
                        </div>

                        {/* Pagination / Load More */}
                        <div className="flex justify-center pb-12">
                            <button className="flex items-center gap-2 px-8 py-3 bg-white border border-[#e6dbdd] rounded-full text-[#896168] hover:text-[#181112] hover:border-[#181112] transition-all shadow-sm group">
                                <span className="text-sm font-medium">Load next shelf</span>
                                <span className="material-symbols-outlined text-lg group-hover:translate-y-1 transition-transform">keyboard_arrow_down</span>
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}
