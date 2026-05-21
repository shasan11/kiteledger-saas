import { RobotOutlined } from '@ant-design/icons';
import { Card, Col, Row, Statistic } from 'antd';

export default function AiUsageStats({ stats = {} }) {
    return (
        <Row gutter={[12, 12]}>
            <Col xs={24} sm={8}>
                <Card size="small">
                    <Statistic
                        title="Total AI Requests"
                        value={stats.total_requests ?? 0}
                        prefix={<RobotOutlined />}
                    />
                </Card>
            </Col>
            <Col xs={24} sm={8}>
                <Card size="small">
                    <Statistic
                        title="Tokens Used"
                        value={stats.total_tokens ?? 0}
                    />
                </Card>
            </Col>
            <Col xs={24} sm={8}>
                <Card size="small">
                    <Statistic
                        title="Today's Requests"
                        value={stats.today_requests ?? 0}
                    />
                </Card>
            </Col>
        </Row>
    );
}
