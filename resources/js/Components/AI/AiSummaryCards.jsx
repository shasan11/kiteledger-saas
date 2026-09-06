import { Card, Col, Row, Statistic } from 'antd';
import { displayMoney, formatNumber } from '@/utils/money';

/**
 * The server sends each card as a raw value plus, for money, the string it
 * already rendered in the tenant's currency. That string wins: it is the same
 * figure the answer text quotes, and it carries the tenant's own symbol and
 * decimal places rather than one assumed here.
 */
function cardValue(card) {
    if (card?.format === 'money' || card?.formatted) {
        return displayMoney(card.formatted, card.value, card.currency_display);
    }

    const numeric = Number(card?.value);

    return Number.isFinite(numeric) ? formatNumber(numeric, Number.isInteger(numeric) ? 0 : 2) : card?.value;
}

export default function AiSummaryCards({ cards = [], currency = null }) {
    if (!Array.isArray(cards) || cards.length === 0) return null;

    return (
        <Row gutter={[8, 8]} style={{ marginTop: 10 }}>
            {cards.map((card) => (
                <Col xs={24} sm={12} md={8} key={card.label}>
                    <Card size="small" style={{ borderRadius: 8 }} styles={{ body: { padding: 12 } }}>
                        <Statistic
                            title={card.label}
                            value={cardValue({ ...card, currency_display: currency })}
                            /* Tabular numerals keep figures aligned across
                               cards and stop digits shifting as values update. */
                            valueStyle={{
                                fontSize: 18,
                                lineHeight: 1.2,
                                fontVariantNumeric: 'tabular-nums',
                            }}
                        />
                    </Card>
                </Col>
            ))}
        </Row>
    );
}
