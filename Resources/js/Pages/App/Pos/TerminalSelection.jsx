import { useEffect, useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { App, Button, Card, Col, Empty, Input, Result, Row, Space, Spin, theme, Typography } from 'antd';
import { PlusOutlined, ReloadOutlined, SearchOutlined, ShopOutlined } from '@ant-design/icons';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import AddTerminalModal from '@/Components/Pos/AddTerminalModal';
import OpenShiftModal from '@/Components/Pos/OpenShiftModal';
import TerminalCard from '@/Components/Pos/TerminalCard';
import { api, showApiError } from './Shared/posHelpers';

const { Text, Title } = Typography;

const hasPermission = (permissions, permission) => permissions.includes(permission);

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

        return terminals.filter((terminal) => {
            return [
                terminal.name,
                terminal.code,
                terminal.branch?.name,
                terminal.warehouse?.name,
                terminal.location,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(q));
        });
    }, [terminals, search]);

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
            route('pos.screen', {
                pos_terminal_id: terminal.id,
                pos_shift_id: shift.id,
            }),
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
        <Space direction="vertical" size={0}>
            <Title level={4} style={{ margin: 0 }}>
                POS Terminals
            </Title>
            <Text type="secondary">Choose the exact terminal and shift before selling.</Text>
        </Space>
    );

    if (!canViewTerminals) {
        return (
            <AuthenticatedLayout header={headerNode}>
                <Head title="POS Terminals" />
                <Result
                    status="403"
                    title="No terminal access"
                    subTitle="You do not have permission to view POS terminals."
                />
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout header={headerNode}>
            <Head title="POS Terminals" />

            <div style={{ padding: token.padding, background: token.colorBgLayout, minHeight: 'calc(100vh - 120px)' }}>
                <Space direction="vertical" size={token.margin} style={{ width: '100%' }}>
                    <Card
                        bordered={false}
                        style={{
                            borderRadius: token.borderRadius,
                            border: `1px solid ${token.colorBorderSecondary}`,
                        }}
                        bodyStyle={{ padding: token.paddingSM }}
                    >
                        <Row gutter={[12, 12]} align="middle">
                            <Col xs={24} md={12} lg={10}>
                                <Input
                                    allowClear
                                    prefix={<SearchOutlined />}
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Search terminal, code, branch, warehouse"
                                />
                            </Col>
                            <Col xs={24} md={12} lg={14} style={{ textAlign: 'right' }}>
                                <Space wrap>
                                    <Button icon={<ReloadOutlined />} onClick={loadOverview} loading={loading}>
                                        Refresh
                                    </Button>
                                    {canCreateTerminal ? (
                                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddTerminalOpen(true)}>
                                            Add Terminal
                                        </Button>
                                    ) : null}
                                </Space>
                            </Col>
                        </Row>
                    </Card>

                    {loading ? (
                        <div style={{ minHeight: 360, display: 'grid', placeItems: 'center' }}>
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
                                <Col xs={24} sm={24} md={12} xl={8} xxl={6} key={terminal.id}>
                                    <TerminalCard
                                        terminal={terminal}
                                        locked={!canOpenShift}
                                        onClick={() => handleTerminalClick(terminal)}
                                    />
                                </Col>
                            ))}

                            {canCreateTerminal ? (
                                <Col xs={24} sm={24} md={12} xl={8} xxl={6}>
                                    <Card
                                        hoverable
                                        onClick={() => setAddTerminalOpen(true)}
                                        style={{
                                            height: '100%',
                                            minHeight: 252,
                                            borderRadius: token.borderRadius,
                                            border: `1px dashed ${token.colorBorder}`,
                                            background: token.colorBgContainer,
                                            display: 'grid',
                                            placeItems: 'center',
                                        }}
                                    >
                                        <Space direction="vertical" align="center">
                                            <ShopOutlined style={{ fontSize: 24, color: token.colorTextSecondary }} />
                                            <Text strong>Add Terminal</Text>
                                            <Text type="secondary">Create another counter</Text>
                                        </Space>
                                    </Card>
                                </Col>
                            ) : null}
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
