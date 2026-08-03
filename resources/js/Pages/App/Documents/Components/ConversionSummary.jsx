import { Card, Descriptions, Space, Tag, Typography, theme } from 'antd';
import { CheckCircleOutlined, StopOutlined } from '@ant-design/icons';
import { fieldLabel } from './ReviewIssuePanel';

const { Text, Title } = Typography;

/*
 * The last thing a user reads before creating a draft.
 *
 * States plainly what will be created and from which values, and when it cannot
 * proceed it says exactly what to fix rather than greying out a button with no
 * explanation.
 */
export default function ConversionSummary({ review, documentType }) {
    const { token } = theme.useToken();

    const fields = review?.fields || {};
    const value = (key) => fields[key]?.value ?? null;

    const blocking = Object.values(fields).filter(
        (f) => f.state === 'missing' || f.state === 'conflict',
    );

    const convertible = review?.is_convertible;
    const ready = convertible && blocking.length === 0;

    if (!convertible) {
        return (
            <Card size="small">
                <Space align="start">
                    <StopOutlined style={{ color: token.colorTextTertiary, fontSize: 16 }} />
                    <div>
                        <Text strong>No draft can be created from this document type</Text>
                        <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {review?.document_type_label || documentType} documents can be read and
                                stored, but KiteLedger does not create a transaction from them.
                            </Text>
                        </div>
                    </div>
                </Space>
            </Card>
        );
    }

    if (!ready) {
        return (
            <Card size="small" style={{ borderColor: token.colorErrorBorder }}>
                <Text strong>Cannot create a draft yet</Text>
                <ul style={{ margin: '8px 0 0', paddingInlineStart: 18 }}>
                    {blocking.map((f) => (
                        <li key={f.key}>
                            <Text style={{ fontSize: 13 }}>
                                {f.state === 'missing'
                                    ? `Add the ${fieldLabel(f.key).toLowerCase()}`
                                    : `Resolve the ${fieldLabel(f.key).toLowerCase()} mismatch`}
                            </Text>
                        </li>
                    ))}
                </ul>
            </Card>
        );
    }

    const total = value('totals.grand_total');
    const currency = value('currency_code');

    return (
        <Card size="small" style={{ borderColor: token.colorSuccessBorder }}>
            <Space size={8} style={{ marginBottom: 10 }}>
                <CheckCircleOutlined style={{ color: token.colorSuccess }} />
                <Title level={5} style={{ margin: 0 }}>
                    Ready to create {review.document_type_label.toLowerCase()} draft
                </Title>
            </Space>

            <Descriptions size="small" column={1} colon={false}>
                <Descriptions.Item label="Party">
                    {value('party.name') || <Text type="secondary">Not set</Text>}
                </Descriptions.Item>
                <Descriptions.Item label="Number">
                    {value('document_number') || <Text type="secondary">Not set</Text>}
                </Descriptions.Item>
                <Descriptions.Item label="Date">
                    {value('document_date') || <Text type="secondary">Not set</Text>}
                </Descriptions.Item>
                <Descriptions.Item label="Total">
                    <Text strong>
                        {currency ? `${currency} ` : ''}
                        {total ?? '—'}
                    </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Lines">
                    {review.lines?.length ?? 0}
                </Descriptions.Item>
            </Descriptions>

            {/* Set expectations: this creates a draft, nothing is posted. */}
            <Tag color="blue" bordered={false} style={{ marginTop: 8 }}>
                Creates a draft for your normal approval workflow
            </Tag>
        </Card>
    );
}
