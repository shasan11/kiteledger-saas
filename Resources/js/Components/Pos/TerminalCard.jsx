import { Badge, Card, Descriptions, Space, theme, Tooltip, Typography } from 'antd';
import { LockOutlined, ShopOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import ShiftStatusTag from './ShiftStatusTag';
import { money } from '@/Pages/App/Pos/Shared/posHelpers';

const { Text } = Typography;

const indicatorMap = {
    open: 'success',
    closed: 'default',
    attention: 'warning',
    risk: 'error',
};

export default function TerminalCard({ terminal, locked = false, onClick }) {
    const { token } = theme.useToken();
    const shift = terminal.current_shift;
    const disabled = locked && !shift;

    const body = (
        <Card
            hoverable={!disabled}
            onClick={disabled ? undefined : onClick}
            style={{
                height: '100%',
                borderRadius: token.borderRadius,
                border: `1px solid ${token.colorBorderSecondary}`,
                background: disabled ? token.colorFillQuaternary : token.colorBgContainer,
                cursor: disabled ? 'not-allowed' : 'pointer',
            }}
            bodyStyle={{
                minHeight: 252,
                display: 'flex',
                flexDirection: 'column',
                gap: token.marginSM,
                padding: token.padding,
            }}
        >
            <Space align="start" style={{ justifyContent: 'space-between', width: '100%' }}>
                <Space align="start">
                    <div
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: token.borderRadius,
                            border: `1px solid ${token.colorBorderSecondary}`,
                            background: token.colorFillAlter,
                            display: 'grid',
                            placeItems: 'center',
                            color: token.colorTextSecondary,
                            flexShrink: 0,
                        }}
                    >
                        {disabled ? <LockOutlined /> : <ShopOutlined />}
                    </div>

                    <Space direction="vertical" size={0}>
                        <Text strong style={{ fontSize: token.fontSizeLG }}>
                            {terminal.name}
                        </Text>
                        <Text type="secondary">{terminal.code || '-'}</Text>
                    </Space>
                </Space>

                <Badge status={indicatorMap[terminal.status] || 'default'} />
            </Space>

            <ShiftStatusTag
                status={terminal.status}
                label={disabled ? 'No Access' : terminal.status_label}
                color={disabled ? 'default' : terminal.status_color}
            />

            <Descriptions
                size="small"
                column={1}
                colon={false}
                labelStyle={{ color: token.colorTextSecondary, width: 104 }}
                contentStyle={{ justifyContent: 'flex-end', textAlign: 'right' }}
                items={[
                    {
                        key: 'branch',
                        label: 'Branch',
                        children: terminal.branch?.name || '-',
                    },
                    {
                        key: 'warehouse',
                        label: 'Warehouse',
                        children: terminal.warehouse?.name || '-',
                    },
                    {
                        key: 'cashier',
                        label: 'Cashier',
                        children: shift?.cashier?.name || '-',
                    },
                    {
                        key: 'opened',
                        label: 'Opened',
                        children: shift?.opened_at ? dayjs(shift.opened_at).format('DD MMM, HH:mm') : '-',
                    },
                    {
                        key: 'opening',
                        label: 'Opening Cash',
                        children: shift ? `Rs. ${money(shift.opening_cash)}` : '-',
                    },
                    {
                        key: 'sales',
                        label: "Today's Sales",
                        children: `Rs. ${money(terminal.today_sales)}`,
                    },
                ]}
            />
        </Card>
    );

    if (!disabled) {
        return body;
    }

    return (
        <Tooltip title="You can view this terminal, but you do not have permission to open a shift.">
            {body}
        </Tooltip>
    );
}
