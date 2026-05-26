import { Tag } from 'antd';

const RISK = {
    low:      { color: 'green',  label: 'Low Risk' },
    medium:   { color: 'gold',   label: 'Medium Risk' },
    high:     { color: 'orange', label: 'High Risk' },
    critical: { color: 'red',    label: 'Critical Risk' },
};

export default function KiteAiRiskBadge({ level = 'low', style }) {
    const cfg = RISK[level] ?? RISK.low;
    return <Tag color={cfg.color} style={{ marginInlineEnd: 0, ...style }}>{cfg.label}</Tag>;
}
