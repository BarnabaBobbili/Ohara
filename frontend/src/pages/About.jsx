// About Page - Placeholder
export default function About() {
    return (
        <div className="min-h-screen bg-[#FAF7F2] dark:bg-[#1e1614] pt-32 px-6 md:px-12">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl md:text-5xl font-bold mb-6 text-[#1E1815] dark:text-white"
                    style={{ fontFamily: "'Newsreader', serif" }}>
                    About Ohara
                </h1>
                <p className="text-lg text-[#4A4540] dark:text-gray-300 leading-relaxed"
                    style={{ fontFamily: "'Noto Sans', sans-serif" }}>
                    Welcome to Ohara - your sanctuary for discovering and managing literary treasures.
                </p>
                <p className="text-lg text-[#4A4540] dark:text-gray-300 leading-relaxed mt-4">
                    This is a placeholder page. Content coming soon...
                </p>
            </div>
        </div>
    );
}
