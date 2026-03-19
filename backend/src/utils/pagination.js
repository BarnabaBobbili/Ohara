const toInteger = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const parseSkipLimitPagination = (
    input,
    {
        defaultLimit = 20,
        maxLimit = 100,
        maxSkip = 5000,
    } = {}
) => {
    const rawLimit = toInteger(input?.limit, defaultLimit);
    const rawSkip = toInteger(input?.skip, 0);

    return {
        limit: clamp(rawLimit, 1, maxLimit),
        skip: clamp(rawSkip, 0, maxSkip),
    };
};

export const parseOffsetLimitPagination = (
    input,
    {
        defaultLimit = 20,
        maxLimit = 100,
        maxOffset = 5000,
    } = {}
) => {
    const rawLimit = toInteger(input?.limit, defaultLimit);
    const rawOffset = toInteger(input?.offset, 0);

    return {
        limit: clamp(rawLimit, 1, maxLimit),
        offset: clamp(rawOffset, 0, maxOffset),
    };
};
