import { ADMIN_COLORS, ADMIN_TYPOGRAPHY } from '../../styles/adminTheme';

export default function StatCard({ title, value, subtitle, rotation = 0 }) {
    return (
        <div
            style={{
                backgroundColor: ADMIN_COLORS.cardBg,
                border: `1px solid ${ADMIN_COLORS.border}`,
                padding: '20px',
                boxShadow: '2px 2px 8px rgba(0,0,0,0.05)',
                transform: `rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease',
                minHeight: '140px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
            }}
            className="hover:-translate-y-1 transition-transform"
        >
            <div
                style={{
                    fontFamily: ADMIN_TYPOGRAPHY.bodyFont,
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    color: ADMIN_COLORS.textMuted,
                    fontWeight: 600
                }}
            >
                {title}
            </div>

            <div
                style={{
                    fontFamily: ADMIN_TYPOGRAPHY.headingFont,
                    fontSize: '42px',
                    fontWeight: 'bold',
                    color: ADMIN_COLORS.textPrimary,
                    lineHeight: 1
                }}
            >
                {value}
            </div>

            <div
                style={{
                    fontFamily: ADMIN_TYPOGRAPHY.bodyFont,
                    fontSize: '13px',
                    color: ADMIN_COLORS.textSecondary
                }}
            >
                {subtitle}
            </div>
        </div>
    );
}
