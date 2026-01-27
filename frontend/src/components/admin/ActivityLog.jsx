import { Link } from 'react-router-dom';
import { ADMIN_COLORS, ADMIN_TYPOGRAPHY } from '../../styles/adminTheme';

export default function ActivityLog({ activities }) {
    return (
        <div className="space-y-0">
            <h3
                style={{
                    fontFamily: ADMIN_TYPOGRAPHY.headingFont,
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: ADMIN_COLORS.textPrimary,
                    marginBottom: '16px'
                }}
            >
                Today's Activity
            </h3>

            <div style={{ backgroundColor: ADMIN_COLORS.cardBg, border: `1px solid ${ADMIN_COLORS.border}` }}>
                {activities.map((activity, index) => (
                    <div
                        key={activity.id}
                        style={{
                            padding: '12px 16px',
                            borderBottom: index < activities.length - 1 ? `1px dotted ${ADMIN_COLORS.borderDotted}` : 'none',
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: '12px'
                        }}
                    >
                        <span
                            style={{
                                fontFamily: ADMIN_TYPOGRAPHY.monoFont,
                                fontSize: '11px',
                                color: ADMIN_COLORS.textMuted
                            }}
                        >
                            {activity.time}
                        </span>

                        <div
                            style={{
                                fontFamily: ADMIN_TYPOGRAPHY.bodyFont,
                                fontSize: '13px',
                                color: ADMIN_COLORS.textPrimary,
                                flex: 1
                            }}
                        >
                            {activity.description}
                        </div>

                        <div
                            style={{
                                fontFamily: ADMIN_TYPOGRAPHY.monoFont,
                                fontSize: '11px',
                                color: ADMIN_COLORS.textSecondary
                            }}
                        >
                            Initials: {activity.librarian}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
