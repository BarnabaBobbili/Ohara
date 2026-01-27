// Member Dashboard - Exact copy from Stitch reader's_personal_sanctuary_dashboard
import Header from '../components/Header';

export default function MemberDashboard() {
    return (
        <>
            <style>
                {`
          /* Custom scrollbar for a cleaner look */
          ::-webkit-scrollbar {
              width: 8px;
          }
          ::-webkit-scrollbar-track {
              background: transparent;
          }
          ::-webkit-scrollbar-thumb {
              background-color: #e2e8f0;
              border-radius: 20px;
          }
          /* Hand-drawn line effect for progress bar */
          .hand-drawn-line {
              border-radius: 2px 255px 25px 25px / 255px 25px 225px 255px;
          }
          .hand-drawn-border {
               border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
          }
        `}
            </style>

            <Header />
            <div className="flex h-screen w-full overflow-hidden bg-[#fdfbf7] dark:bg-[#111621] text-[#1e293b] dark:text-gray-100 transition-colors duration-300 pt-24"
                style={{ fontFamily: "'Epilogue', 'Noto Sans', sans-serif" }}>

                {/* Sidebar Navigation */}
                <aside className="hidden md:flex flex-col w-72 h-full bg-[#f7f5f0] dark:bg-[#1a202c] border-r border-[#eaddcf] dark:border-gray-800 p-6 justify-between">
                    <div className="flex flex-col gap-8">
                        {/* Logo / Brand */}
                        <div className="flex items-center gap-3 px-2">
                            <div className="bg-[#2463eb]/10 p-2 rounded-xl text-[#2463eb]">
                                <span className="material-symbols-outlined text-3xl">local_library</span>
                            </div>
                            <span className="text-xl font-bold tracking-tight text-[#1e293b] dark:text-white">Sanctuary</span>
                        </div>

                        {/* Nav Items */}
                        <nav className="flex flex-col gap-2">
                            <a className="flex items-center gap-4 px-4 py-3 rounded-xl bg-white dark:bg-gray-800 shadow-sm text-[#2463eb] font-medium transition-all group" href="#">
                                <span className="material-symbols-outlined group-hover:scale-110 transition-transform" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
                                <span>Dashboard</span>
                            </a>
                            <a className="flex items-center gap-4 px-4 py-3 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800 hover:text-[#1e293b] dark:hover:text-white transition-all font-medium group" href="#">
                                <span className="material-symbols-outlined group-hover:scale-110 transition-transform">shelves</span>
                                <span>My Shelves</span>
                            </a>
                            <a className="flex items-center gap-4 px-4 py-3 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800 hover:text-[#1e293b] dark:hover:text-white transition-all font-medium group" href="#">
                                <span className="material-symbols-outlined group-hover:scale-110 transition-transform">schedule</span>
                                <span>Reservations</span>
                            </a>
                            <a className="flex items-center gap-4 px-4 py-3 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800 hover:text-[#1e293b] dark:hover:text-white transition-all font-medium group" href="#">
                                <span className="material-symbols-outlined group-hover:scale-110 transition-transform">groups</span>
                                <span>Community</span>
                            </a>
                        </nav>
                    </div>

                    {/* User Mini Profile */}
                    <div className="flex items-center gap-3 px-2 py-3 border-t border-[#eaddcf] dark:border-gray-700 pt-6">
                        <div className="relative">
                            <div className="bg-center bg-no-repeat bg-cover rounded-full h-10 w-10 border-2 border-white dark:border-gray-700 shadow-sm"
                                style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDGqboTs0UYra7OM3Yp_uR5MY7mjFw1jhe1qNR58vwwz3W_R2o0ZIakwhQkzCdNobgnVV6XfaUbe3_DCmbCbty6DbLKRESwt6FKnmQUEWlfbutR3nF4sNh9AV-XWNw4Mfm9rDgVNwqQI1Z61px6S5do0tlEVOJkbM70y8_A-A9jW5OojL3gRo0EmIOnZyMJBDEUskP5spb8GK4K9jfGJmF4HRxablcvpyyQEvZHKylvzREKFzl0sVjowtlPFBC7E_irmQa1XT2J2OIM')" }}>
                            </div>
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-[#1e293b] dark:text-white">Clara M.</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Premium Reader</span>
                        </div>
                        <button className="ml-auto text-gray-400 hover:text-[#2463eb] transition-colors">
                            <span className="material-symbols-outlined text-[20px]">settings</span>
                        </button>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 h-full overflow-y-auto overflow-x-hidden p-6 md:p-12 relative">
                    <div className="max-w-[1200px] mx-auto flex flex-col gap-10">
                        {/* Page Heading & Context */}
                        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                            <div className="flex flex-col gap-2">
                                <h1 className="text-3xl md:text-5xl font-bold text-[#1e293b] dark:text-white leading-tight tracking-tight">
                                    Good evening, Clara.
                                </h1>
                                <p className="text-gray-500 dark:text-gray-400 text-lg font-light flex items-center gap-2">
                                    <span className="material-symbols-outlined text-orange-300">local_cafe</span>
                                    The kettle is on.
                                </p>
                            </div>
                            <div className="hidden md:block">
                                <span className="text-sm font-medium text-gray-400 bg-white dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-100 dark:border-gray-700 shadow-sm">
                                    Last sync: Just now
                                </span>
                            </div>
                        </header>

                        {/* Top Layout: Hero Card + Sidebar Stats */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                            {/* Main Hero: Current Read (Span 8) */}
                            <div className="lg:col-span-8 flex flex-col h-full">
                                <h2 className="text-lg font-semibold text-[#1e293b] dark:text-gray-200 mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#2463eb]">menu_book</span>
                                    Current Read
                                </h2>
                                <div className="relative group bg-white dark:bg-[#1a202c] rounded-2xl p-6 md:p-8 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] flex flex-col md:flex-row gap-8 items-start hover:shadow-lg transition-shadow duration-300 h-full">
                                    {/* Book Cover with Elevation */}
                                    <div className="relative shrink-0 w-32 md:w-48 aspect-[2/3] rounded-lg shadow-lg rotate-1 group-hover:rotate-0 transition-transform duration-500 ease-out origin-bottom-left"
                                        style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuChnd1elz7IVOLZYclIu9UijAFYiZIdbgY7AKQQSfk0x6nFjjf4hhDkADYvm_O47W_s6PN77YlFbASjK4AUGjibxfLg1ffxEWL3t4X3LlGGOWqyLbiwI0IKYXbNccKvSgYek0-c9CIk877EZ8aTvru9sLGoXsWNX437ZpphVPIMjobzvhbgbC3MXgOC_QEiZ_N386RunDYbu9FpggMGpeSBQlYw6j8Wl0qZ6NZ67okZgXIhLkVXdqtuaXXi3eAx3QB6UiKs7_gl87cx')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
                                        <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent rounded-lg"></div>
                                    </div>

                                    {/* Book Details */}
                                    <div className="flex flex-col justify-between h-full w-full py-2">
                                        <div>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="text-2xl md:text-3xl font-bold text-[#1e293b] dark:text-white mb-2 leading-tight">
                                                        The Invisible Life of Addie La Rue
                                                    </h3>
                                                    <p className="text-gray-500 dark:text-gray-400 text-lg italic" style={{ fontFamily: "'Epilogue', serif" }}>
                                                        by V.E. Schwab
                                                    </p>
                                                </div>
                                                <button className="text-gray-300 hover:text-red-400 transition-colors">
                                                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                                                </button>
                                            </div>
                                            <div className="mt-6 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-semibold uppercase tracking-wide">Fantasy</span>
                                                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-semibold uppercase tracking-wide">Historical</span>
                                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">timer</span> 4h 20m left</span>
                                            </div>
                                        </div>

                                        {/* Custom Progress Bar Section */}
                                        <div className="mt-8 md:mt-auto">
                                            <div className="flex justify-between items-end mb-2">
                                                <span className="text-sm font-medium text-[#1e293b] dark:text-gray-300">Page 142 of 300</span>
                                                <span className="text-2xl font-bold text-[#2463eb]">47%</span>
                                            </div>
                                            <div className="relative h-3 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div className="absolute top-0 left-0 h-full bg-[#2463eb] hand-drawn-line" style={{ width: '47%' }}></div>
                                                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/graphy.png')" }}></div>
                                            </div>
                                            <div className="mt-6 flex flex-wrap gap-3">
                                                <button className="bg-[#2463eb] hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium shadow-md shadow-blue-500/20 transition-all flex items-center gap-2">
                                                    <span>Continue Reading</span>
                                                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                                </button>
                                                <button className="bg-transparent border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-[#1e293b] dark:text-gray-300 px-4 py-2.5 rounded-lg text-sm font-medium transition-all">
                                                    View Notes (12)
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Vertical Streak + Due Soon (Span 4) */}
                            <div className="lg:col-span-4 flex flex-col gap-6 h-full">
                                {/* Reading Streak Card */}
                                <div className="bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden group min-h-[200px]">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <span className="material-symbols-outlined text-9xl text-orange-500">local_fire_department</span>
                                    </div>
                                    <div className="relative z-10 flex flex-col items-center gap-2">
                                        <div className="bg-white dark:bg-gray-800 p-3 rounded-full shadow-sm mb-2">
                                            <span className="material-symbols-outlined text-orange-500 text-3xl">local_fire_department</span>
                                        </div>
                                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reading Streak</h3>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-5xl font-bold text-[#1e293b] dark:text-white tracking-tighter">32</span>
                                            <span className="text-lg font-medium text-gray-400">days</span>
                                        </div>
                                        <p className="text-sm text-green-600 font-medium mt-1 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-md border border-green-100 dark:border-green-900/50">
                                            +1 from yesterday
                                        </p>
                                    </div>
                                </div>

                                {/* Due Soon Alert */}
                                <div className="bg-white dark:bg-[#1a202c] border-l-4 border-[#7D3C3C] dark:border-red-900 rounded-r-xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] p-5 flex flex-col justify-between flex-1">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="text-md font-semibold text-[#7D3C3C] dark:text-red-400 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[20px]">event_busy</span>
                                            Due Soon
                                        </h3>
                                        <span className="text-xs text-gray-400">2 days left</span>
                                    </div>
                                    <div className="flex gap-4 items-center">
                                        <div className="w-12 h-16 bg-gray-200 rounded overflow-hidden shrink-0"
                                            style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCkKpJjm4PCwl35Actdx0Gh3VtEgd9DEmP2_W3yk6hmTss1NW6nbhF7T1xtB_J1lQBWZBsznJIFRtofP2qiYehUMvQbLtQslwaZG_bapNo8ALayZ1vUWm9ogWFA1ZuxwdxRBZWGuaFpAG7kbgItlLWanHh5NWrhxQYJ03aP-5QOH4aozrhKznRyeP6nZijJBdBAJLsFeImd7jHdla_SZDuTwDL699xh7r89H_ETrHcIuvQMdLnYPMF0YNJ_aJ8OQwwuGpf99iuuQXh3')", backgroundSize: 'cover' }}>
                                        </div>
                                        <div>
                                            <p className="font-medium text-[#1e293b] dark:text-white leading-tight">Atomic Habits</p>
                                            <p className="text-xs text-gray-500 mt-1">James Clear</p>
                                        </div>
                                    </div>
                                    <button className="mt-4 w-full text-xs font-medium text-[#7D3C3C] dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 py-2 rounded transition-colors text-center border border-red-100 dark:border-red-900/30">
                                        Renew Loan
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Middle Section: Asymmetrical Split */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {/* Librarian's Note (Span 1 - Distinct Style) */}
                            <div className="lg:col-span-1">
                                <div className="bg-[#fcf8e8] dark:bg-[#2c2a20] rounded-tl-sm rounded-br-sm rounded-tr-2xl rounded-bl-2xl shadow-md p-6 h-full border border-yellow-100/50 relative rotate-1 hover:rotate-0 transition-transform duration-300">
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-300 h-8 w-2 rounded-full z-10 opacity-50"></div>
                                    <h3 className="italic text-xl text-gray-800 dark:text-yellow-100 mb-4 flex items-center gap-2 border-b border-gray-800/10 dark:border-yellow-100/10 pb-2"
                                        style={{ fontFamily: "'Epilogue', serif" }}>
                                        <span className="material-symbols-outlined text-[20px]">edit_note</span>
                                        Librarian's Note
                                    </h3>
                                    <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed" style={{ fontFamily: "'Epilogue', serif" }}>
                                        "Hi Clara! Since you've been diving into historical fantasy lately (and loved <span className="underline decoration-dotted decoration-gray-400">Circe</span>), I really think you should try <strong>The Night Circus</strong> next. It has that same magical atmosphere you seem to enjoy."
                                    </p>
                                    <div className="mt-6 flex items-center justify-between">
                                        <span className="text-xs font-mono text-gray-500 uppercase">Curated by Sarah</span>
                                        <button className="text-sm font-bold text-[#2463eb] hover:underline">View Book</button>
                                    </div>
                                </div>
                            </div>

                            {/* Your Collection Stats (Span 2) */}
                            <div className="lg:col-span-2 flex flex-col justify-between bg-white dark:bg-[#1a202c] rounded-2xl p-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-lg font-semibold text-[#1e293b] dark:text-gray-200">Your Collection</h2>
                                    <button className="text-sm text-[#2463eb] hover:text-blue-700 font-medium">View All Shelves</button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex flex-col gap-2 border border-gray-100 dark:border-gray-700">
                                        <div className="text-gray-400 dark:text-gray-500 mb-1">
                                            <span className="material-symbols-outlined text-[24px]">book_2</span>
                                        </div>
                                        <span className="text-2xl font-bold text-[#1e293b] dark:text-white">12</span>
                                        <span className="text-xs text-gray-500">Borrowed</span>
                                    </div>
                                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex flex-col gap-2 border border-gray-100 dark:border-gray-700">
                                        <div className="text-gray-400 dark:text-gray-500 mb-1">
                                            <span className="material-symbols-outlined text-[24px]">pause_circle</span>
                                        </div>
                                        <span className="text-2xl font-bold text-[#1e293b] dark:text-white">3</span>
                                        <span className="text-xs text-gray-500">On Hold</span>
                                    </div>
                                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex flex-col gap-2 border border-gray-100 dark:border-gray-700">
                                        <div className="text-gray-400 dark:text-gray-500 mb-1">
                                            <span className="material-symbols-outlined text-[24px]">done_all</span>
                                        </div>
                                        <span className="text-2xl font-bold text-[#1e293b] dark:text-white">48</span>
                                        <span className="text-xs text-gray-500">Completed</span>
                                    </div>
                                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex flex-col gap-2 border border-gray-100 dark:border-gray-700">
                                        <div className="text-gray-400 dark:text-gray-500 mb-1">
                                            <span className="material-symbols-outlined text-[24px]">bookmark</span>
                                        </div>
                                        <span className="text-2xl font-bold text-[#1e293b] dark:text-white">156</span>
                                        <span className="text-xs text-gray-500">Saved</span>
                                    </div>
                                </div>

                                {/* Mini Recent Shelf Visual */}
                                <div className="mt-8">
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Recently Added</p>
                                    <div className="flex -space-x-3 overflow-hidden py-2 px-1">
                                        <div className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 bg-cover bg-center shadow-sm"
                                            style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAkTjdFs4qMT5Vxoslo043sw0X91Ao79F3VJ6dS9HpnBIur0KBa54XRVlCNtAPeXyYP83x1eSKp-mHyJjnfIw902xrh3ZuKAeMXThrtWH2GRcqr7CiW-pg1dFkoHCtUsmrrgdhNbJ6d1-H0_j0Iez6b99jy3Z0AVs0lqbYthzbqHmir9iuPhn81dAjy0yD4J9eaGAVriSkGOmE0acb2giONb3N6OMFc4q6L6BK8ywSt8sLq2y7ODErz8nbXZNgjihhKGs9XHucnJt4P')" }}>
                                        </div>
                                        <div className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-800 bg-gray-300 bg-cover bg-center shadow-sm"
                                            style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuB768gmhmHcXM7ksNB72wVe_V__xUNRVcLfZWcBbtA3VqZQo9w0FHz8LUmnUf7cOTolX8H7QJJKjOlwZlrtzvhujmeKxuouOd_5fYONuhioDipoYBNsx30CreSD8V18tN20gGB3zfDVD0zwBasbAY8Xrn9dMIWp7t9pLego4o1HibwS-NI6251LzVud5GHZcWvG5hz2q4f46WFx0ppc42KkMY-9kZ8g6ZORo3NbXkcg2hpvezwBMjftnxYuhLfngdGYHREGyHSvsV3w')" }}>
                                        </div>
                                        <div className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-800 bg-gray-400 bg-cover bg-center shadow-sm"
                                            style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDFrEJHvCygAOhpUU4JxTRcdrOPy4G-siVlZTxS3xw2TuRuBa3GyxiQJh-TRERBaHwzgkTainKj3ttLXisHhd7GE6vIdoiHXhbqP4j10fA9fxMw88mm6P6UdXNbL3Wd5ehZXd6nC9KJrVrNJS1qguEludsIYYK72j33hXkmG_900Hy91kDiyjwKWjbAWPxKgtetHKbievuao_JVj8QLPB2sTuGvsJx1noOUM8TpDdNRIEfZVlMKHVQCCQChNPgpgL8-PJQX03VebVbv')" }}>
                                        </div>
                                        <div className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-800 bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shadow-sm">
                                            +2
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer breathing room */}
                        <div className="h-8"></div>
                    </div>
                </main>
            </div>
        </>
    );
}
