import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import AiCommandModal from '@/Components/AI/AiCommandModal';
import { useAiAvailability } from '@/hooks/useAiAvailability';
import { Head } from '@inertiajs/react';
import { RobotOutlined } from '@ant-design/icons';
import { Alert, Card, Space, Typography, theme } from 'antd';

const { Title, Paragraph } = Typography;

export default function CommandCenter() {
    const { token } = theme.useToken();
    const { aiEnabled, canUseAiModule, hasPermission } = useAiAvailability();

    const canUse = aiEnabled
        && canUseAiModule('global_command')
        && hasPermission('ai.global_command.use');

    return (
        <AuthenticatedLayout
            header={
                <Space>
                    <RobotOutlined style={{ color: token.colorPrimary }} />
                    <Title level={5} style={{ margin: 0 }}>AI Command Center</Title>
                </Space>
            }
        >
            <Head title="AI Command Center" />

            <div style={{ padding: '16px 24px' }}>
                {!aiEnabled && (
                    <Alert
                        type="warning"
                        message="AI is disabled. Enable AI from Settings > AI Settings."
                        showIcon
                        style={{ marginBottom: 16 }}
                    />
                )}

                {aiEnabled && !canUseAiModule('global_command') && (
                    <Alert
                        type="warning"
                        message="AI Command Center is not enabled. Enable it from Settings > AI Settings > AI Feature Modules."
                        showIcon
                        style={{ marginBottom: 16 }}
                    />
                )}

                {canUse && (
                    <Card size="small">
                        <Paragraph type="secondary" style={{ marginBottom: 12 }}>
                            Use the AI Command Center inline. Press <strong>Ctrl + J</strong> anywhere in the app to open it instantly.
                        </Paragraph>
                        <AiCommandModal open={false} onClose={() => {}} />
                        <Paragraph type="secondary" style={{ fontSize: 11, marginTop: 8 }}>
                            AI provides intelligent suggestions only. It cannot approve, void, delete, or post records.
                        </Paragraph>
                    </Card>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
