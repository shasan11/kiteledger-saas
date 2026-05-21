import { router, usePage } from '@inertiajs/react';
import { Card, Tabs, Typography, theme } from 'antd';

const { Text, Title } = Typography;

const items = [
    ['terminal', 'Terminal Selection', '/pos'],
    ['screen', 'POS Screen', '/pos/screen'],
    ['sales', 'Sales', '/pos/sales'],
    ['shifts', 'Shifts', '/pos/shifts'],
    ['terminals', 'Terminals', '/pos/terminals'],
    ['cash', 'Cash Movements', '/pos/cash-movements'],
    ['returns', 'Returns', '/pos/returns'],
];

const activeKeyFromUrl = (url = '') => {
    if (url.startsWith('/pos/screen')) return 'screen';
    if (url.startsWith('/pos/sales')) return 'sales';
    if (url.startsWith('/pos/shifts')) return 'shifts';
    if (url.startsWith('/pos/terminals')) return 'terminals';
    if (url.startsWith('/pos/cash-movements')) return 'cash';
    if (url.startsWith('/pos/returns')) return 'returns';
    return 'terminal';
};

export default function PosSubNav({ title = 'POS Control Center', description }) {
    const { token } = theme.useToken();
    const { url } = usePage();

    return (
        <Card
            bordered={false}
            style={{
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadius,
            }}
            bodyStyle={{ padding: `${token.paddingSM}px ${token.padding}px 0` }}
        >
            <Title level={4} style={{ margin: 0 }}>{title}</Title>
            <Text type="secondary">
                {description || 'Manage terminals, active selling, shifts, cash movements, returns, and sales history from one workspace.'}
            </Text>
            <Tabs
                size="small"
                activeKey={activeKeyFromUrl(url)}
                items={items.map(([key, label]) => ({ key, label }))}
                onChange={(key) => {
                    const item = items.find(([itemKey]) => itemKey === key);
                    if (item) router.visit(item[2]);
                }}
                style={{ marginTop: token.marginSM }}
            />
        </Card>
    );
}
