export default function ModerationFilters({ filters, onChange }) {
    return (
        <div className="rounded-sm border border-[#E8E4DF] bg-white p-5 dark:border-[#3d3935] dark:bg-[#2a2622]">
            <div className="mb-4 flex items-center gap-3">
                <div className="h-px w-8 bg-[#c16549]" />
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#c16549]">Filters</p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                <select value={filters.status} onChange={(event) => onChange('status', event.target.value)} className="rounded-sm border border-[#E8E4DF] px-3 py-2 text-sm dark:border-[#3d3935] dark:bg-[#1e1614] dark:text-white">
                    <option value="">All Statuses</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="flagged">Flagged</option>
                    <option value="removed">Removed</option>
                </select>

                <input value={filters.book} onChange={(event) => onChange('book', event.target.value)} placeholder="Book title" className="rounded-sm border border-[#E8E4DF] px-3 py-2 text-sm dark:border-[#3d3935] dark:bg-[#1e1614] dark:text-white" />
                <input value={filters.member} onChange={(event) => onChange('member', event.target.value)} placeholder="Member name" className="rounded-sm border border-[#E8E4DF] px-3 py-2 text-sm dark:border-[#3d3935] dark:bg-[#1e1614] dark:text-white" />
                <input type="date" value={filters.startDate} onChange={(event) => onChange('startDate', event.target.value)} className="rounded-sm border border-[#E8E4DF] px-3 py-2 text-sm dark:border-[#3d3935] dark:bg-[#1e1614] dark:text-white" />
                <input type="date" value={filters.endDate} onChange={(event) => onChange('endDate', event.target.value)} className="rounded-sm border border-[#E8E4DF] px-3 py-2 text-sm dark:border-[#3d3935] dark:bg-[#1e1614] dark:text-white" />
            </div>

            <input value={filters.search} onChange={(event) => onChange('search', event.target.value)} placeholder="Search reviews..." className="mt-3 w-full rounded-sm border border-[#E8E4DF] px-3 py-2 text-sm dark:border-[#3d3935] dark:bg-[#1e1614] dark:text-white" />
        </div>
    );
}
