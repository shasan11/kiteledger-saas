import { Tag } from 'antd';

const RISK_CONFIG = {
    low:      { color: 'success',  label: 'Low Risk' },
    medium:   { color: 'warning',  label: 'Medium Risk' },
    high:     { color: 'error',    label: 'High Risk' },
    critical: { color: 'error',    label: 'Critical' },
};

export default function AiRiskBadge({ level = 'low' }) {
    const config = RISK_CONFIG[level] ?? RISK_CONFIG.low;

    return <Tag color={config.color}>{config.label}</Tag>;
}
