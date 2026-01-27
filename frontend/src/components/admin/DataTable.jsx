import { ADMIN_COLORS, ADMIN_TYPOGRAPHY } from '../../styles/adminTheme';

export default function DataTable({ columns, data, actions }) {
    return (
        <div style={{ border: `1px solid ${ADMIN_COLORS.border}`, backgroundColor: 'white' }}>
            <table className="w-full text-left">
                <thead style={{ backgroundColor: '#F9F8F6', borderBottom: `1px solid ${ADMIN_COLORS.border}` }}>
                    <tr>
                        {columns.map((col, index) => (
                            <th
                                key={index}
                                className="px-5 py-3 font-medium text-[#6B6157] text-sm uppercase tracking-wider"
                                style={{
                                    fontFamily: ADMIN_TYPOGRAPHY.bodyFont,
                                    width: col.width
                                }}
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E4DB]">
                    {data.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-[#FAF9F6] transition-colors group">
                            {columns.map((col, colIndex) => (
                                <td
                                    key={colIndex}
                                    className="px-5 py-3 text-sm"
                                    style={{ color: ADMIN_COLORS.textPrimary }}
                                >
                                    {col.render ? col.render(row) : row[col.accessor]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
