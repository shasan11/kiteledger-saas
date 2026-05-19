import { Button, Card, Col, Row, Space, theme, Typography } from 'antd';
import { PoweroffOutlined } from '@ant-design/icons';
import ShiftStatusTag from './ShiftStatusTag';
import { money } from '@/Pages/App/Pos/Shared/posHelpers';

const { Text } = Typography;

function Stat({ label, value, strong = false }) {
    return (
        <Space direction="vertical" size={0}>
            <Text type="secondary">{label}</Text>
            <Text strong={strong}>{value}</Text>
        </Space>
    );
}

export default function PosTopBar({ terminal, shift, canCloseShift, onCloseShift }) {
    const { token } = theme.useToken();

    return (
        <Card
            bordered={false}
            style={{
                borderRadius: token.borderRadius,
                border: `1px solid ${token.colorBorderSecondary}`,
                background: token.colorBgContainer,
            }}
            bodyStyle={{ padding: token.paddingSM }}
        >
            <Row gutter={[12, 12]} align="middle">
                <Col xs={24} lg={8}>
                    <Space direction="vertical" size={2}>
                        <Space wrap>
                            <Text strong style={{ fontSize: token.fontSizeLG }}>
                                {terminal?.name || 'No Terminal'}
                            </Text>
                            <Text type="secondary">{terminal?.code || ''}</Text>
                            <ShiftStatusTag status={shift ? 'open' : 'closed'} label={shift ? 'Open Shift' : 'No Shift'} />
                        </Space>
                        <Text type="secondary">{terminal?.branch?.name || '-'} / {terminal?.warehouse?.name || '-'}</Text>
                    </Space>
                </Col>

                <Col xs={12} md={6} lg={3}>
                    <Stat label="Cashier" value={shift?.cashier?.display_name || shift?.cashier?.name || '-'} />
                </Col>
                <Col xs={12} md={6} lg={3}>
                    <Stat label="Opening Cash" value={`Rs. ${money(shift?.opening_cash)}`} />
                </Col>
                <Col xs={12} md={6} lg={3}>
                    <Stat label="Sales Total" value={`Rs. ${money(shift?.total_sales)}`} strong />
                </Col>
                <Col xs={12} md={6} lg={3}>
                    <Stat label="Expected Cash" value={`Rs. ${money(shift?.expected_cash)}`} />
                </Col>

                <Col xs={24} lg={4} style={{ textAlign: 'right' }}>
                    {canCloseShift && shift ? (
                        <Button danger icon={<PoweroffOutlined />} onClick={onCloseShift}>
                            End Shift
                        </Button>
                    ) : null}
                </Col>
            </Row>
        </Card>
    );
}
