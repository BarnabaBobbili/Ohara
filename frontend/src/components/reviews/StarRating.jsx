import { useState } from 'react';

const SIZE_MAP = {
    sm: { icon: 'text-[15px]', text: 'text-[11px]' },
    md: { icon: 'text-[18px]', text: 'text-xs' },
    lg: { icon: 'text-[22px]', text: 'text-sm' },
};

const getIconName = (value, index) => {
    if (value >= index) return 'star';
    if (value >= index - 0.5) return 'star_half';
    return 'star_border';
};

export default function StarRating({
    value = 0,
    count = 0,
    size = 'md',
    compact = false,
    interactive = false,
    onChange,
}) {
    const [hovered, setHovered] = useState(0);
    const displayValue = interactive ? hovered || value : value;
    const styles = SIZE_MAP[size] || SIZE_MAP.md;

    const ratingText = compact
        ? (count ? `(${count})` : '')
        : (!count ? (value ? value.toFixed(1) : 'No ratings yet') : `${value.toFixed(1)} · ${count} rating${count === 1 ? '' : 's'}`);

    const starClass = interactive
        ? 'transition-transform duration-150 hover:scale-110 active:scale-95'
        : '';

    return (
        <div className="inline-flex items-center gap-2">
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((index) => (
                    interactive ? (
                        <button
                            key={index}
                            type="button"
                            onMouseEnter={() => setHovered(index)}
                            onMouseLeave={() => setHovered(0)}
                            onClick={() => onChange?.(index)}
                            className={`leading-none ${starClass}`}
                        >
                            <span
                                className={`material-symbols-outlined ${styles.icon}`}
                                style={{
                                    color: displayValue >= index ? '#c16549' : '#d8d1c8',
                                    fontVariationSettings: "'FILL' 1",
                                }}
                            >
                                star
                            </span>
                        </button>
                    ) : (
                        <span
                            key={index}
                            className={`material-symbols-outlined ${styles.icon}`}
                            style={{
                                color: displayValue >= index - 0.5 ? '#c16549' : '#d8d1c8',
                                fontVariationSettings: "'FILL' 1",
                            }}
                        >
                            {getIconName(displayValue, index)}
                        </span>
                    )
                ))}
            </div>

            {!interactive && ratingText ? (
                <span
                    className={`${styles.text} text-[#6B6560] dark:text-gray-400`}
                    style={{ fontFamily: "'Noto Sans', sans-serif" }}
                >
                    {ratingText}
                </span>
            ) : null}
        </div>
    );
}
