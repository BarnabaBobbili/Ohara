// Book Detail Page - Exact copy from Stitch curated_book_detail_view
import Header from '../components/Header';

export default function BookDetail() {
    return (
        <>
            <Header />
            <div className="bg-[#f6f8f7] dark:bg-[#11211c] text-slate-900 dark:text-slate-100 antialiased min-h-screen flex flex-col pt-24"
                style={{ fontFamily: "'Newsreader', serif" }}>

                {/* Main Content */}
                <main className="flex-grow w-full max-w-[1200px] mx-auto px-6 md:px-12 py-10 md:py-16">
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-2 mb-12 text-sm text-slate-500 dark:text-slate-400">
                        <a className="hover:text-[#17cf91] transition-colors" href="/">Library</a>
                        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                        <a className="hover:text-[#17cf91] transition-colors" href="#">Fiction</a>
                        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                        <span className="text-slate-900 dark:text-white font-medium">Mystery</span>
                    </div>

                    {/* Hero Section */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-24 mb-20">
                        {/* Book Cover */}
                        <div className="md:col-span-5 lg:col-span-4 relative group perspective-1000">
                            <div className="w-full aspect-[2/3] bg-slate-200 rounded-r-md rounded-l-sm transform transition-transform duration-500 hover:scale-[1.02] overflow-hidden relative"
                                style={{ boxShadow: '10px 10px 30px -5px rgba(0, 0, 0, 0.3)' }}>
                                {/* Texture Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent w-4 z-10 pointer-events-none"></div>
                                <div className="w-full h-full bg-cover bg-center"
                                    style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCV4V0q755g0wfXeksM-h_fQJgaaTkq89fdq6syOasd65HcfGCai-h9YpUgSAcEokwiWsieUZxNBgF4OzPl3ll5C3jPKKZa2F-eShItSb95ZT2IzQvqZhyZI9O-MDxJz5iYE7LrIIdpLp2UepsWZkLPTUQj8dKUda0oWLMa4-k6O5DRfNJUnqLk3TtMDVhLCvf_bMd0L9EacMWxcD0Q2cxS7Vd9_ysvSE9MBwWSLLTGEyzFnsX24cPBzX021Cfbe3tUdFe8vLpSOwHf')" }}>
                                </div>
                            </div>
                        </div>

                        {/* Book Details */}
                        <div className="md:col-span-7 lg:col-span-8 flex flex-col justify-center">
                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 dark:text-white leading-[0.95] tracking-tight mb-4">
                                The Shadow <br /> of the Wind
                            </h1>
                            <h2 className="text-2xl md:text-3xl font-normal italic text-slate-500 dark:text-slate-400 mb-8">
                                by Carlos Ruiz Zafón
                            </h2>
                            <div className="flex items-center gap-2 mb-10 text-[#17cf91]">
                                <span className="material-symbols-outlined text-[20px] animate-pulse">location_on</span>
                                <p className="text-lg font-medium">Waiting for you on Shelf 4B</p>
                            </div>
                            <div className="flex flex-wrap gap-4">
                                <button className="bg-[#17cf91] hover:bg-[#17cf91]/90 text-white px-8 py-3 rounded-full font-semibold tracking-wide transition-all flex items-center gap-2"
                                    style={{ boxShadow: '0 10px 25px rgba(23, 207, 145, 0.3)' }}>
                                    <span>Reserve Copy</span>
                                </button>
                                <button className="bg-white dark:bg-transparent border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white px-8 py-3 rounded-full font-semibold tracking-wide hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">map</span>
                                    <span>Locate in Library</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Grid Layout for Content + Marginalia */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 border-t border-slate-200 dark:border-slate-800 pt-16">
                        {/* Main Column: Synopsis */}
                        <div className="lg:col-span-8">
                            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-6">Synopsis</h3>
                            <div className="prose prose-xl prose-slate dark:prose-invert max-w-none"
                                style={{ fontFamily: "'Newsreader', serif" }}>
                                <p className="first-letter:text-6xl first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:mt-[-10px] first-letter:text-slate-900 dark:first-letter:text-white text-lg md:text-xl leading-relaxed text-slate-700 dark:text-slate-300">
                                    Barcelona, 1945: A city slowly heals in the aftermath of the Spanish Civil War, and Daniel, an antiquarian book dealer's son who mourns the loss of his mother, finds solace in a mysterious book entitled <i>The Shadow of the Wind</i>, by one Julián Carax.
                                </p>
                                <p className="text-lg md:text-xl leading-relaxed text-slate-700 dark:text-slate-300 mt-6">
                                    But when he sets out to find the author's other works, he makes a shocking discovery: someone has been systematically destroying every copy of every book Carax has written. In fact, Daniel may have the last of Carax's books in existence. Soon Daniel's seemingly innocent quest opens a door into one of Barcelona's darkest secrets—an epic story of murder, madness, and doomed love.
                                </p>
                            </div>
                        </div>

                        {/* Sidebar: Marginalia Reviews */}
                        <div className="lg:col-span-4 space-y-8 lg:mt-12">
                            <div className="relative pl-6 border-l-2 border-[#17cf91]/30">
                                <span className="absolute -left-2 top-0 text-[#17cf91] text-2xl font-serif">"</span>
                                <p className="text-slate-600 dark:text-slate-400 italic text-base leading-relaxed mb-2">
                                    A gothic masterpiece. It feels like this book was written in ink and fog.
                                </p>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">— Reviewer #482</span>
                            </div>
                            <div className="relative pl-6 border-l-2 border-[#17cf91]/30">
                                <span className="absolute -left-2 top-0 text-[#17cf91] text-2xl font-serif">"</span>
                                <p className="text-slate-600 dark:text-slate-400 italic text-base leading-relaxed mb-2">
                                    I found myself wandering the streets of Barcelona in my dreams for weeks after.
                                </p>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">— Reviewer #911</span>
                            </div>
                            <div className="relative pl-6 border-l-2 border-[#17cf91]/30">
                                <span className="absolute -left-2 top-0 text-[#17cf91] text-2xl font-serif">"</span>
                                <p className="text-slate-600 dark:text-slate-400 italic text-base leading-relaxed mb-2">
                                    The Cemetery of Forgotten Books is a place I wish existed.
                                </p>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">— Reviewer #103</span>
                            </div>
                        </div>
                    </div>

                    {/* Curated Pairing Section */}
                    <div className="mt-24 pt-16 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex items-baseline justify-between mb-12">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">A Curated Pairing</h3>
                            <span className="text-sm italic text-slate-500">Selected by Chief Librarian Vance</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Book 1 */}
                            <div className="group cursor-pointer">
                                <div className="bg-[#fbfcfb] dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 transition-shadow hover:shadow-lg h-full flex flex-col">
                                    <div className="flex gap-4 mb-4">
                                        <div className="w-16 h-24 bg-slate-300 rounded shadow-md flex-shrink-0"></div>
                                        <div>
                                            <h4 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">The Thirteenth Tale</h4>
                                            <p className="text-sm text-slate-500">Diane Setterfield</p>
                                        </div>
                                    </div>
                                    <div className="mt-auto">
                                        <p className="text-[#17cf91] italic text-lg leading-snug"
                                            style={{ fontStyle: 'italic', fontWeight: 500 }}>
                                            "If you loved the gothic atmosphere and family secrets, this is your next stop."
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Book 2 */}
                            <div className="group cursor-pointer">
                                <div className="bg-[#fbfcfb] dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 transition-shadow hover:shadow-lg h-full flex flex-col">
                                    <div className="flex gap-4 mb-4">
                                        <div className="w-16 h-24 bg-slate-300 rounded shadow-md flex-shrink-0"></div>
                                        <div>
                                            <h4 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">Foucault's Pendulum</h4>
                                            <p className="text-sm text-slate-500">Umberto Eco</p>
                                        </div>
                                    </div>
                                    <div className="mt-auto">
                                        <p className="text-[#17cf91] italic text-lg leading-snug"
                                            style={{ fontStyle: 'italic', fontWeight: 500 }}>
                                            "For those who enjoy the deep mystery of texts and history intertwining."
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Book 3 */}
                            <div className="group cursor-pointer">
                                <div className="bg-[#fbfcfb] dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 transition-shadow hover:shadow-lg h-full flex flex-col">
                                    <div className="flex gap-4 mb-4">
                                        <div className="w-16 h-24 bg-slate-300 rounded shadow-md flex-shrink-0"></div>
                                        <div>
                                            <h4 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">The Name of the Rose</h4>
                                            <p className="text-sm text-slate-500">Umberto Eco</p>
                                        </div>
                                    </div>
                                    <div className="mt-auto">
                                        <p className="text-[#17cf91] italic text-lg leading-snug"
                                            style={{ fontStyle: 'italic', fontWeight: 500 }}>
                                            "Another library full of deadly secrets waiting to be uncovered."
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer / Ex Libris */}
                <footer className="mt-auto py-12 flex flex-col items-center justify-center border-t border-slate-200 dark:border-slate-800 bg-[#f0f4f3] dark:bg-[#0c1814]">
                    <div className="opacity-60 hover:opacity-100 transition-opacity duration-500 group cursor-default">
                        {/* Ex Libris SVG Stamp */}
                        <div className="size-32 rounded-full border-4 border-slate-800 dark:border-slate-400 flex items-center justify-center relative rotate-12 group-hover:rotate-0 transition-transform duration-700">
                            <div className="absolute inset-1 border border-slate-800 dark:border-slate-400 rounded-full"></div>
                            <div className="flex flex-col items-center text-slate-800 dark:text-slate-400">
                                <span className="text-[10px] tracking-[0.3em] font-bold uppercase mb-1">Bibliotheca</span>
                                <span className="material-symbols-outlined text-4xl mb-1 text-[#17cf91]">auto_stories</span>
                                <span className="text-[10px] tracking-[0.3em] font-bold uppercase">Ex Libris</span>
                            </div>
                        </div>
                    </div>
                    <div className="mt-8 flex gap-6 text-sm font-medium text-slate-500">
                        <a className="hover:text-[#17cf91] transition-colors" href="#">About</a>
                        <a className="hover:text-[#17cf91] transition-colors" href="#">Locations</a>
                        <a className="hover:text-[#17cf91] transition-colors" href="#">Policies</a>
                        <a className="hover:text-[#17cf91] transition-colors" href="#">Contact</a>
                    </div>
                    <p className="text-xs text-slate-400 mt-6">© 2024 Bibliotheca Intelligent Systems. All rights reserved.</p>
                </footer>
            </div>
        </>
    );
}
