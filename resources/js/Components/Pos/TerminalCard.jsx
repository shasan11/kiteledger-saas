import { Badge, Button, Card, Descriptions, Space, theme, Tooltip, Typography } from 'antd';
import { EditOutlined, LockOutlined, ShopOutlined, UnorderedListOutlined } from '@ant-design/icons';
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

export default function TerminalCard({ terminal, locked = false, onClick, onOpenPos, onViewShifts, onEdit }) {
    const { token } = theme.useToken();
    const shift = terminal.current_shift;
    const disabled = locked && !shift;

    const softBackground = (() => {
        if (disabled || terminal.active === false) return token.colorFillQuaternary;
        if (terminal.status === 'open') return token.green1 || '#f6ffed';
        if (terminal.status === 'attention' || terminal.status === 'risk') return token.gold1 || '#fffbe6';
        return token.blue1 || '#e6f4ff';
    })();

    const stop = (handler) => (event) => {
        event.stopPropagation();
        handler?.();
    };

    const body = (
        <Card
            hoverable={!disabled}
            onClick={disabled ? undefined : onClick}
            style={{
                height: '100%',
                borderRadius: token.borderRadius,
                border: `1px solid ${token.colorBorderSecondary}`,
                background: softBackground,
                cursor: disabled ? 'not-allowed' : 'pointer',
            }}
            bodyStyle={{
                minHeight: 310,
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
                labelStyle={{ color: token.colorTextSecondary, width: 118 }}
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
                        key: 'cash',
                        label: 'Cash Account',
                        children: terminal.cash_account?.name || terminal.cashAccount?.name || '-',
                    },
                    {
                        key: 'last_shift',
                        label: 'Last Shift',
                        children: shift?.shift_no || terminal.last_shift?.shift_no || terminal.lastShift?.shift_no || '-',
                    },
                    {
                        key: 'opened_by',
                        label: 'Last Opened By',
                        children: shift?.cashier?.name || '-',
                    },
                    {
                        key: 'opened',
                        label: 'Last Opened',
                        children: shift?.opened_at ? dayjs(shift.opened_at).format('DD MMM, HH:mm') : '-',
                    },
                    {
                        key: 'opening',
                        label: 'Current Cash',
                        children: shift ? `Rs. ${money(shift.expected_cash ?? shift.opening_cash)}` : '-',
                    },
                    {
                        key: 'sales',
                        label: "Today's Sales",
                        children: `Rs. ${money(terminal.today_sales)}`,
                    },
                ]}
            />

            <Space wrap style={{ marginTop: 'auto' }}>
                <Button size="small" type="primary" disabled={disabled} onClick={stop(onOpenPos || onClick)}>
                    Open POS
                </Button>
                <Button size="small" icon={<UnorderedListOutlined />} onClick={stop(onViewShifts)}>
                    View Shifts
                </Button>
                <Button size="small" icon={<EditOutlined />} onClick={stop(onEdit)}>
                    Edit
                </Button>
            </Space>
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
