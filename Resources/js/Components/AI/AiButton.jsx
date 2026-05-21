import { RobotOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';

/**
 * Reusable AI trigger button.
 * Renders nothing when aiEnabled is false.
 */
export default function AiButton({
    label = 'AI Assist',
    tooltip,
    onClick,
    loading = false,
    size = 'small',
    type = 'default',
    aiEnabled = true,
    disabled = false,
    style,
}) {
    if (!aiEnabled) return null;

    const btn = (
        <Button
            icon={<RobotOutlined />}
            size={size}
            type={type}
            loading={loading}
            disabled={disabled}
            onClick={onClick}
            style={style}
        >
            {label}
        </Button>
    );

    if (tooltip) {
        return <Tooltip title={tooltip}>{btn}</Tooltip>;
    }

    return btn;
}
