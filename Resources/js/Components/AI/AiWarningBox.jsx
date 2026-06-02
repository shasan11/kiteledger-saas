import { Alert, Space } from 'antd';

export default function AiWarningBox({ warnings = [] }) {
    if (!Array.isArray(warnings) || warnings.length === 0) return null;

    return (
        <Space direction="vertical" size={6} style={{ width: '100%', marginTop: 10 }}>
            {warnings.map((warning) => (
                <Alert key={warning} type="warning" showIcon message={warning} />
            ))}
        </Space>
    );
}
