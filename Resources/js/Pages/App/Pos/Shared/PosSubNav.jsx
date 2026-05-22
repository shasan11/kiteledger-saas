import { router, usePage } from '@inertiajs/react';
import { Tabs, theme } from 'antd';

const items = [
    ['terminal', 'Terminals', '/pos'],
    ['screen', 'POS Screen', '/pos/screen'],
    ['sales', 'Sales', '/pos/sales'],
    ['shifts', 'Shifts', '/pos/shifts'],
    ['terminals', 'Terminal Settings', '/pos/terminals'],
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

export default function PosSubNav() {
    const { token } = theme.useToken();
    const { url } = usePage();

    return (
        <div
            style={{
                background: token.colorBgContainer,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadius,
                padding: `0 ${token.padding}px`,
            }}
        >
            <Tabs
                size="small"
                activeKey={activeKeyFromUrl(url)}
                items={items.map(([key, label]) => ({ key, label }))}
                onChange={(key) => {
                    const item = items.find(([itemKey]) => itemKey === key);
                    if (item) router.visit(item[2]);
                }}
                style={{ marginBottom: -1 }}
            />
        </div>
    );
}
