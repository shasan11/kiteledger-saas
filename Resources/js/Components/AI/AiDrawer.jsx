import { RobotOutlined } from '@ant-design/icons';
import { Drawer, Spin } from 'antd';

export default function AiDrawer({ open, onClose, title = 'AI Assistant', loading = false, children, width = 480 }) {
    return (
        <Drawer
            open={open}
            onClose={onClose}
            title={
                <span>
                    <RobotOutlined style={{ marginRight: 8 }} />
                    {title}
                </span>
            }
            width={width}
            destroyOnHidden
        >
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <Spin tip="AI is analysing..." />
                </div>
            ) : children}
        </Drawer>
    );
}
