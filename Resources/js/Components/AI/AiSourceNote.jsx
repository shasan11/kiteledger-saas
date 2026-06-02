import { Tag, Typography } from 'antd';
import { AuditOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function AiSourceNote({ note }) {
    if (!note) return null;

    return (
        <Tag icon={<AuditOutlined />} color="blue" bordered={false} style={{ whiteSpace: 'normal', padding: '4px 8px' }}>
            <Text style={{ fontSize: 12 }}>{note}</Text>
        </Tag>
    );
}
