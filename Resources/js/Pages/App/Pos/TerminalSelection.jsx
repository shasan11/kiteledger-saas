import { useEffect, useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { App, Badge, Button, Card, Col, Empty, Input, Result, Row, Space, Spin, Statistic, Tag, theme, Typography } from 'antd';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import AddTerminalModal from '@/Components/Pos/AddTerminalModal';
import OpenShiftModal from '@/Components/Pos/OpenShiftModal';
import { api, money, showApiError } from './Shared/posHelpers';
import PosSubNav from './Shared/PosSubNav';

const { Text } = Typography;

const hasPermission = (permissions, permission) => permissions.includes(permission);

const statusIndicator = { open: 'success', closed: 'default', attention: 'warning', risk: 'error' };

function CompactTerminalCard({ terminal, locked, token, onClick, onOpenPos, onViewShifts }) {
    const shift = terminal.current_shift;
    const disabled = locked && !shift;
    const isOpen = terminal.status === 'open';

    const borderColor = isOpen ? token.colorSuccess : token.colorBorderSecondary;

    const stop = (handler) => (e) => { e.stopPropagation(); handler?.(); };

    return (
        <Card
            hoverable={!disabled}
            onClick={disabled ? undefined : onClick}
            size="small"
            style={{
                borderRadius: token.borderRadius,
                border: `1px solid ${borderColor}`,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1,
            }}
            styles={{ body: { padding: '12px 14px' } }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Badge status={statusIndicator[terminal.status] || 'default'} />
                        <Text strong style={{ fontSize: 14 }} ellipsis>{terminal.name}</Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: 11 }}>{terminal.code || '-'}</Text>
                </div>
                {isOpen && shift ? (
                    <Tag color="success" style={{ margin: 0, fontSize: 11 }}>Active</Tag>
                ) : (
                    <Tag style={{ margin: 0, fontSize: 11 }}>{terminal.active === false ? 'Inactive' : 'Idle'}</Tag>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: 12, marginBottom: 8 }}>
                <div><Text type="secondary">Branch</Text></div>
                <div style={{ textAlign: 'right' }}><Text>{terminal.branch?.name || '-'}</Text></div>
                <div><Text type="secondary">Warehouse</Text></div>
                <div style={{ textAlign: 'right' }}><Text>{terminal.warehouse?.name || '-'}</Text></div>
                {shift ? (
                    <>
                        <div><Text type="secondary">Cashier</Text></div>
                        <div style={{ textAlign: 'right' }}><Text>{shift.cashier?.name || '-'}</Text></div>
                        <div><Text type="secondary">Opened</Text></div>
                        <div style={{ textAlign: 'right' }}><Text>{shift.opened_at ? dayjs(shift.opened_at).format('HH:mm') : '-'}</Text></div>
                        <div><Text type="secondary">Cash</Text></div>
                        <div style={{ textAlign: 'right' }}><Text strong>Rs. {money(shift.expected_cash ?? shift.opening_cash)}</Text></div>
                    </>
                ) : (
                    <>
                        <div><Text type="secondary">Last Shift</Text></div>
                        <div style={{ textAlign: 'right' }}><Text>{terminal.last_shift?.shift_no || terminal.lastShift?.shift_no || '-'}</Text></div>
                    </>
                )}
                <div><Text type="secondary">Today</Text></div>
                <div style={{ textAlign: 'right' }}><Text strong>Rs. {money(terminal.today_sales)}</Text></div>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
                <Button size="small" type="primary" disabled={disabled} onClick={stop(onOpenPos || onClick)} block>
                    {shift ? 'Sell' : 'Open Shift'}
                </Button>
                <Button size="small" onClick={stop(onViewShifts)}>
                    Shifts
                </Button>
            </div>
        </Card>
    );
}

export default function TerminalSelection() {
    const { message } = App.useApp();
    const { props } = usePage();
    const { token } = theme.useToken();

    const permissions = props.auth?.permissions || [];
    const branchContext = props.branchContext || {};
    const canViewAllBranches = !!branchContext.canViewAllBranches;
    const defaultBranchId =
        branchContext.selectedBranchId ||
        props.auth?.currentBranchId ||
        props.auth?.user?.current_branch_id ||
        props.auth?.user?.branch_id ||
        null;

    const canViewTerminals = hasPermission(permissions, 'pos.terminal.view');
    const canCreateTerminal = hasPermission(permissions, 'pos.terminal.create');
    const canOpenShift = hasPermission(permissions, 'pos.shift.open');
    const canSell = hasPermission(permissions, 'pos.sale.create');

    const [terminals, setTerminals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [openingTerminal, setOpeningTerminal] = useState(null);
    const [openShiftLoading, setOpenShiftLoading] = useState(false);
    const [addTerminalOpen, setAddTerminalOpen] = useState(false);
    const [addTerminalLoading, setAddTerminalLoading] = useState(false);

    useEffect(() => {
        if (canViewTerminals) {
            void loadOverview();
        } else {
            setLoading(false);
        }
    }, [canViewTerminals]);

    const filteredTerminals = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return terminals;
        return terminals.filter((t) =>
            [t.name, t.code, t.branch?.name, t.warehouse?.name, t.location]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(q)),
        );
    }, [terminals, search]);

    const stats = useMemo(() => {
        const active = terminals.filter((t) => t.status === 'open');
        const todaySales = terminals.reduce((sum, t) => sum + Number(t.today_sales || 0), 0);
        return { total: terminals.length, active: active.length, todaySales };
    }, [terminals]);

    async function loadOverview() {
        setLoading(true);
        try {
            const params = {};
            if (!canViewAllBranches && defaultBranchId) {
                params.branch_id = defaultBranchId;
            }
            const response = await axios.get(api('/api/pos/terminals/overview'), { params });
            setTerminals(response.data?.terminals || []);
        } catch (error) {
            setTerminals([]);
            showApiError(message, error, 'Failed to load POS terminals.');
        } finally {
            setLoading(false);
        }
    }

    function openSellingScreen(terminal, shift) {
        if (!canSell) {
            message.error('You can view terminals, but you do not have permission to sell.');
            return;
        }
        router.visit(
            route('pos.screen', { pos_terminal_id: terminal.id, pos_shift_id: shift.id }),
        );
    }

    function handleTerminalClick(terminal) {
        if (terminal.current_shift?.id) {
            openSellingScreen(terminal, terminal.current_shift);
            return;
        }
        if (!canOpenShift) {
            message.warning('You do not have permission to open a POS shift.');
            return;
        }
        setOpeningTerminal(terminal);
    }

    async function submitOpenShift(values, form) {
        if (!openingTerminal?.id) return;
        setOpenShiftLoading(true);
        try {
            const response = await axios.post(api('/api/pos-shifts/open'), {
                pos_terminal_id: openingTerminal.id,
                branch_id: openingTerminal.branch_id || defaultBranchId,
                opening_cash: values.opening_cash || 0,
                notes: values.notes || null,
            });
            form?.resetFields();
            setOpeningTerminal(null);
            message.success('Shift opened.');
            openSellingScreen(openingTerminal, response.data);
        } catch (error) {
            showApiError(message, error, 'Failed to open shift.');
        } finally {
            setOpenShiftLoading(false);
        }
    }

    async function submitAddTerminal(values, form) {
        setAddTerminalLoading(true);
        try {
            await axios.post(api('/api/pos-terminals'), {
                ...values,
                branch_id: canViewAllBranches ? values.branch_id || defaultBranchId : defaultBranchId,
                code: values.code?.trim() || null,
                warehouse_id: values.warehouse_id || null,
                cash_account_id: values.cash_account_id || null,
                card_account_id: values.card_account_id || null,
                online_account_id: values.online_account_id || null,
                default_customer_id: values.default_customer_id || null,
            });
            form?.resetFields();
            setAddTerminalOpen(false);
            message.success('Terminal created.');
            await loadOverview();
        } catch (error) {
            showApiError(message, error, 'Failed to create terminal.');
        } finally {
            setAddTerminalLoading(false);
        }
    }

    const headerNode = (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <Text strong style={{ fontSize: 16 }}>POS Control Center</Text>
            <Space size={8}>
                <Button size="small" icon={<ReloadOutlined />} onClick={loadOverview} loading={loading}>Refresh</Button>
                {canCreateTerminal && (
                    <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setAddTerminalOpen(true)}>
                        Add Terminal
                    </Button>
                )}
            </Space>
        </div>
    );

    if (!canViewTerminals) {
        return (
            <AuthenticatedLayout header={headerNode}>
                <Head title="POS Control Center" />
                <Result status="403" title="No terminal access" subTitle="You do not have permission to view POS terminals." />
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout header={headerNode}>
            <Head title="POS Control Center" />

            <div style={{ padding: token.paddingSM, background: token.colorBgLayout, minHeight: 'calc(100vh - 120px)' }}>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <PosSubNav />

                    <Row gutter={[12, 12]}>
                        <Col xs={8}>
                            <Card size="small" bordered={false} style={{ border: `1px solid ${token.colorBorderSecondary}` }} styles={{ body: { padding: '10px 14px' } }}>
                                <Statistic title="Terminals" value={stats.total} valueStyle={{ fontSize: 20 }} />
                            </Card>
                        </Col>
                        <Col xs={8}>
                            <Card size="small" bordered={false} style={{ border: `1px solid ${token.colorBorderSecondary}` }} styles={{ body: { padding: '10px 14px' } }}>
                                <Statistic title="Active Shifts" value={stats.active} valueStyle={{ fontSize: 20, color: token.colorSuccess }} />
                            </Card>
                        </Col>
                        <Col xs={8}>
                            <Card size="small" bordered={false} style={{ border: `1px solid ${token.colorBorderSecondary}` }} styles={{ body: { padding: '10px 14px' } }}>
                                <Statistic title="Today's Sales" value={stats.todaySales} prefix="Rs." precision={2} valueStyle={{ fontSize: 20 }} />
                            </Card>
                        </Col>
                    </Row>

                    <Input
                        allowClear
                        prefix={<SearchOutlined />}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search terminal, code, branch, warehouse"
                        style={{ maxWidth: 380 }}
                    />

                    {loading ? (
                        <div style={{ minHeight: 200, display: 'grid', placeItems: 'center' }}>
                            <Spin />
                        </div>
                    ) : filteredTerminals.length < 1 ? (
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={search ? 'No terminals match your search.' : 'No active POS terminals found.'}
                        />
                    ) : (
                        <Row gutter={[12, 12]}>
                            {filteredTerminals.map((terminal) => (
                                <Col xs={24} sm={12} md={8} xl={6} key={terminal.id}>
                                    <CompactTerminalCard
                                        terminal={terminal}
                                        locked={!canOpenShift}
                                        token={token}
                                        onClick={() => handleTerminalClick(terminal)}
                                        onOpenPos={() => handleTerminalClick(terminal)}
                                        onViewShifts={() => router.visit(route('pos.shifts.index', { pos_terminal_id: terminal.id }))}
                                    />
                                </Col>
                            ))}
                        </Row>
                    )}
                </Space>
            </div>

            <OpenShiftModal
                open={!!openingTerminal}
                terminal={openingTerminal}
                loading={openShiftLoading}
                onCancel={() => setOpeningTerminal(null)}
                onSubmit={submitOpenShift}
            />

            <AddTerminalModal
                open={addTerminalOpen}
                loading={addTerminalLoading}
                messageApi={message}
                defaultBranchId={defaultBranchId}
                canViewAllBranches={canViewAllBranches}
                onCancel={() => setAddTerminalOpen(false)}
                onSubmit={submitAddTerminal}
            />
        </AuthenticatedLayout>
    );
}
