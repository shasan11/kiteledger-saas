import { RobotOutlined } from '@ant-design/icons';
import { Alert, Card, Collapse, List, Space, Tag, Typography, theme } from 'antd';
import AiRiskBadge from './AiRiskBadge';

const { Text, Paragraph, Title } = Typography;

export default function AiResultCard({ result, title = 'AI Analysis', onClose }) {
    const { token } = theme.useToken();

    if (!result) return null;

    const issues = result.issues || [];
    const checks = result.checks || [];
    const findings = result.key_findings || [];
    const risks = result.risks || [];
    const opportunities = result.opportunities || [];
    const actions = result.recommended_actions || [];

    return (
        <Card
            size="small"
            title={
                <Space>
                    <RobotOutlined style={{ color: token.colorPrimary }} />
                    <span>{title}</span>
                    {result.risk_level && <AiRiskBadge level={result.risk_level} />}
                </Space>
            }
            style={{ marginTop: 12 }}
            extra={onClose && <a onClick={onClose}>Close</a>}
        >
            {result.summary && (
                <Paragraph style={{ marginBottom: 8 }}>{result.summary}</Paragraph>
            )}

            {result.plain_english_explanation && (
                <Alert
                    type="info"
                    message={result.plain_english_explanation}
                    style={{ marginBottom: 8 }}
                    showIcon
                />
            )}

            {result.can_proceed === false && (
                <Alert
                    type="warning"
                    message="This transaction has issues that should be resolved before proceeding."
                    showIcon
                    style={{ marginBottom: 8 }}
                />
            )}

            {checks.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Checks</Text>
                    <List
                        size="small"
                        dataSource={checks}
                        renderItem={(c) => (
                            <List.Item style={{ padding: '2px 0' }}>
                                <Space size={4}>
                                    <Tag color={c.status === 'passed' ? 'success' : c.status === 'warning' ? 'warning' : 'error'}>
                                        {c.status}
                                    </Tag>
                                    <Text style={{ fontSize: 12 }}>{c.name}: {c.message}</Text>
                                </Space>
                            </List.Item>
                        )}
                    />
                </div>
            )}

            {issues.length > 0 && (
                <Collapse
                    size="small"
                    ghost
                    items={[{
                        key: 'issues',
                        label: <Text type="danger">Issues ({issues.length})</Text>,
                        children: (
                            <List
                                size="small"
                                dataSource={issues}
                                renderItem={(issue) => (
                                    <List.Item style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '4px 0' }}>
                                        <Space>
                                            <Tag color={issue.severity === 'high' || issue.severity === 'critical' ? 'error' : 'warning'}>
                                                {issue.severity}
                                            </Tag>
                                            <Text strong style={{ fontSize: 12 }}>{issue.title}</Text>
                                        </Space>
                                        <Text style={{ fontSize: 12 }}>{issue.description}</Text>
                                        {issue.suggested_fix && (
                                            <Text type="secondary" style={{ fontSize: 11 }}>Fix: {issue.suggested_fix}</Text>
                                        )}
                                    </List.Item>
                                )}
                            />
                        ),
                    }]}
                />
            )}

            {findings.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Key Findings</Text>
                    <List size="small" dataSource={findings} renderItem={(f) => (
                        <List.Item style={{ padding: '2px 0' }}>
                            <Text style={{ fontSize: 12 }}>• {f}</Text>
                        </List.Item>
                    )} />
                </div>
            )}

            {risks.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                    <Text type="danger" style={{ fontSize: 12 }}>Risks</Text>
                    <List size="small" dataSource={risks} renderItem={(r) => (
                        <List.Item style={{ padding: '2px 0' }}>
                            <Text style={{ fontSize: 12 }}>• {r}</Text>
                        </List.Item>
                    )} />
                </div>
            )}

            {opportunities.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                    <Text type="success" style={{ fontSize: 12 }}>Opportunities</Text>
                    <List size="small" dataSource={opportunities} renderItem={(o) => (
                        <List.Item style={{ padding: '2px 0' }}>
                            <Text style={{ fontSize: 12 }}>• {o}</Text>
                        </List.Item>
                    )} />
                </div>
            )}

            {actions.length > 0 && (
                <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Recommended Actions</Text>
                    <List size="small" dataSource={actions} renderItem={(a) => (
                        <List.Item style={{ padding: '2px 0' }}>
                            <Text style={{ fontSize: 12 }}>→ {a}</Text>
                        </List.Item>
                    )} />
                </div>
            )}

            {result.recommended_next_action && (
                <Alert
                    type="info"
                    message={<Text style={{ fontSize: 12 }}><strong>Next Action:</strong> {result.recommended_next_action}</Text>}
                    style={{ marginTop: 8 }}
                />
            )}
        </Card>
    );
}
