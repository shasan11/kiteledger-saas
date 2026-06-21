import { Card, Col, Row, Statistic } from 'antd';

function formatValue(value, format) {
    if (format === 'money') {
        return `NPR ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return Number.isFinite(Number(value)) ? Number(value).toLocaleString() : value;
}

export default function AiSummaryCards({ cards = [] }) {
    if (!Array.isArray(cards) || cards.length === 0) return null;

    return (
        <Row gutter={[8, 8]} style={{ marginTop: 10 }}>
            {cards.map((card) => (
                <Col xs={24} sm={12} md={8} key={card.label}>
                    <Card size="small" style={{ borderRadius: 8 }} styles={{ body: { padding: 12 } }}>
                        <Statistic
                            title={card.label}
                            value={formatValue(card.value, card.format)}
                            valueStyle={{ fontSize: 18, lineHeight: 1.2 }}
                        />
                    </Card>
                </Col>
            ))}
        </Row>
    );
}
