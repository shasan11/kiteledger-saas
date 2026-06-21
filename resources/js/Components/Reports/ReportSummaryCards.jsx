import { Card, Col, Row, Typography } from 'antd';

const { Text } = Typography;

export default function ReportSummaryCards({ items = [] }) {
  if (!items.length) return null;

  return (
    <Row gutter={[12, 12]}>
      {items.slice(0, 8).map((item, index) => (
        <Col xs={24} sm={12} key={`${item.label || 'number'}-${index}`}>
          <Card size="small" bordered>
            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
              {item.label || 'Number'}
            </Text>
            <Text strong style={{ fontSize: 16 }}>
              {String(item.value ?? '-')}
            </Text>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
