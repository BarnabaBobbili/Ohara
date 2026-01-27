import { ADMIN_COLORS, ADMIN_TYPOGRAPHY } from '../../styles/adminTheme';

export default function BookSpine({ title, height = '40px', color }) {
    // Generate a muted color if none provided
    const spineColor = color || generateMutedColor(title);

    return (
        <div
            style={{
                width: '100%',
                height: height,
                backgroundColor: spineColor,
                borderRadius: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: 'inset -2px 0 5px rgba(0,0,0,0.1)'
            }}
            title={title}
        >
            {/* Spine Texture Line */}
            <div className="absolute top-0 bottom-0 left-1 w-px bg-white/20"></div>

            <span style={{
                fontFamily: ADMIN_TYPOGRAPHY.headingFont,
                color: 'white',
                fontSize: '10px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                letterSpacing: '0.5px'
            }}>
                {truncate(title, 25)}
            </span>
        </div>
    );
}

// Helper to generate consistent muted colors based on string
function generateMutedColor(str) {
    const colors = [
        '#5D4037', // brown
        '#455A64', // blue grey
        '#37474F', // dark slate
        '#2E7D32', // dark green
        '#AD1457', // dark pink
        '#00695C', // teal
        '#C62828', // red
        '#1565C0', // blue
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

function truncate(str, n) {
    return (str.length > n) ? str.substr(0, n - 1) + '...' : str;
}
