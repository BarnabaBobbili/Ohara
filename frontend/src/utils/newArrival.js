const NEW_ARRIVAL_WINDOW_DAYS = 120;
const RECENT_PUBLICATION_WINDOW_YEARS = 1;

const parseDate = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export function isBookNewArrival(book, referenceDate = new Date()) {
    if (!book) return false;

    const addedDate = parseDate(book.created_at || book.added_at || book.date_added);
    if (addedDate) {
        const diffMs = referenceDate.getTime() - addedDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= NEW_ARRIVAL_WINDOW_DAYS;
    }

    const publicationYear = Number.parseInt(String(book.publication_year ?? ''), 10);
    if (Number.isInteger(publicationYear) && publicationYear > 0) {
        return publicationYear >= referenceDate.getFullYear() - RECENT_PUBLICATION_WINDOW_YEARS;
    }

    return false;
}
