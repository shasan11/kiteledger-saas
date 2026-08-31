import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { Card, Typography } from 'antd';

export default function MetricCard({ label, value, helper, trend, icon, tone = 'emerald' }) {
    const positive = Number(trend) >= 0;
    return (
        <Card className="central-metric-card">
            <div className={`central-metric-card__icon central-tone--${tone}`}>{icon}</div>
            <Typography.Text type="secondary" className="central-metric-card__label">{label}</Typography.Text>
            <Typography.Title level={3} className="central-metric-card__value">{value}</Typography.Title>
            {(helper || trend !== undefined) && <div className="central-metric-card__footer">
                {trend !== undefined && <span className={positive ? 'central-trend--up' : 'central-trend--down'}>{positive ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {Math.abs(trend)}%</span>}
                {helper && <Typography.Text type="secondary">{helper}</Typography.Text>}
            </div>}
        </Card>
    );
}
