import { ADMIN_COLORS, ADMIN_TYPOGRAPHY } from '../../styles/adminTheme';

export default function MemberCard({ name, initials, id, type = 'list' }) {
    // Generate color based on name
    const colors = ['#E57373', '#F06292', '#BA68C8', '#9575CD', '#7986CB', '#64B5F6', '#4FC3F7', '#4DD0E1', '#4DB6AC', '#81C784'];
    const color = colors[name.length % colors.length];

    if (type === 'avatar') {
        return (
            <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
                style={{ backgroundColor: color, fontFamily: ADMIN_TYPOGRAPHY.headingFont }}
            >
                {initials}
            </div>
        );
    }

    // Full Card View (Membership Card Aesthetic)
    return (
        <div
            style={{
                backgroundColor: '#FAF7F2',
                border: `1px solid ${ADMIN_COLORS.border}`,
                padding: '16px',
                borderRadius: '4px',
                position: 'relative',
                boxShadow: '1px 1px 3px rgba(0,0,0,0.05)'
            }}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm"
                    style={{ backgroundColor: color }}>
                    {initials}
                </div>
                <div className="text-xs font-mono text-[#6B6157] tracking-wider">{id}</div>
            </div>
            <div
                className="font-bold text-lg mb-1"
                style={{ fontFamily: ADMIN_TYPOGRAPHY.headingFont, color: ADMIN_COLORS.textPrimary }}
            >
                {name}
            </div>
            <div className="text-xs uppercase tracking-wide text-[#8B4D3F] font-semibold">Active Member</div>

            {/* Stamp Effect */}
            <div
                className="absolute bottom-4 right-4 text-[10px] text-[#2C2416] opacity-30 -rotate-12 border-2 border-[#2C2416] px-1 py-0.5 font-mono"
            >
                VERIFIED
            </div>
        </div>
    );
}
