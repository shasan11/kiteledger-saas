import { useEffect, useMemo, useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import {
    App,
    Button,
    Card,
    DatePicker,
    Descriptions,
    Form,
    Input,
    InputNumber,
    Modal,
    Row,
    Col,
    Select,
    Space,
    Table,
    Tag,
    Typography,
} from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { api, defaultRangeForKey, fetchList, money, rangeParams } from './Shared/posHelpers';

const { Title, Text } = Typography;

export default function PosShiftsPage() {
    const { message } = App.useApp();
    const { props } = usePage();

    const permissions = props.auth?.permissions || [];
    const branchContext = props.branchContext || {};
    const canViewAllBranches = !!branchContext.canViewAllBranches;

    const defaultBranchId =
        branchContext.selectedBranchId ||
        props.auth?.currentBranchId ||
        props.auth?.user?.current_branch_id ||
        props.auth?.user?.branch_id ||
        null;

    const can = (permission) => permissions.includes(permission);

    const [rows, setRows] = useState([]);
    const [terminals, setTerminals] = useState([]);
    const [branches, setBranches] = useState([]);
    const [openShift, setOpenShift] = useState(null);

    const [filters, setFilters] = useState({
        status: undefined,
        pos_terminal_id: undefined,
        branch_id: defaultBranchId,
    });

    const [rangeKey, setRangeKey] = useState('today');
    const [range, setRange] = useState(defaultRangeForKey('today'));

    const [openModal, setOpenModal] = useState(false);
    const [closeModalOpen, setCloseModalOpen] = useState(false);
    const [selectedShift, setSelectedShift] = useState(null);

    const [loading, setLoading] = useState(true);
    const [opening, setOpening] = useState(false);
    const [closing, setClosing] = useState(false);

    const [form] = Form.useForm();
    const [closeForm] = Form.useForm();

    useEffect(() => {
        void bootstrap();
    }, []);

    useEffect(() => {
        void loadRows();
    }, [filters, range]);

    async function bootstrap() {
        setLoading(true);

        try {
            const terminalParams = {
                page_size: 100,
                active: true,
            };

            const currentParams = {};

            if (!canViewAllBranches && defaultBranchId) {
                terminalParams.branch_id = defaultBranchId;
                currentParams.branch_id = defaultBranchId;
            }

            const [shiftPayload, terminalPayload, branchPayload, currentResponse] = await Promise.all([
                fetchList('/api/pos-shifts', {
                    page_size: 100,
                    ...rangeParams(range),
                    ...filters,
                }),
                fetchList('/api/pos-terminals', terminalParams),
                fetchList('/api/branches', {
                    page_size: 100,
                    active: true,
                }),
                axios.get(api('/api/pos-shifts/current'), {
                    params: currentParams,
                }),
            ]);

            const terminalRows = terminalPayload.results || [];
            const branchRows = branchPayload.results || [];

            const scopedTerminals = canViewAllBranches
                ? terminalRows
                : terminalRows.filter((terminal) => String(terminal.branch_id) === String(defaultBranchId));

            const scopedBranches = canViewAllBranches
                ? branchRows
                : branchRows.filter((branch) => String(branch.id) === String(defaultBranchId));

            setRows(shiftPayload.results || []);
            setTerminals(scopedTerminals);
            setBranches(scopedBranches);
            setOpenShift(currentResponse.data || null);
        } catch (error) {
            message.error(error?.response?.data?.message || 'Failed to load POS shifts.');
        } finally {
            setLoading(false);
        }
    }

    async function loadRows() {
        try {
            const payload = await fetchList('/api/pos-shifts', {
                page_size: 100,
                ...rangeParams(range),
                ...filters,
            });

            setRows(payload.results || []);
        } catch (error) {
            message.error(error?.response?.data?.message || 'Failed to refresh POS shifts.');
        }
    }

    async function submitOpen(values) {
        if (!can('pos.shift.view')) {
            message.error('You do not have permission to open POS shift.');
            return;
        }

        setOpening(true);

        try {
            const selectedTerminal = terminals.find((terminal) => terminal.id === values.pos_terminal_id);

            await axios.post(api('/api/pos-shifts/open'), {
                pos_terminal_id: values.pos_terminal_id,
                branch_id: selectedTerminal?.branch_id || values.branch_id || defaultBranchId,
                opening_cash: values.opening_cash || 0,
                notes: values.notes || null,
            });

            setOpenModal(false);
            form.resetFields();

            await bootstrap();

            message.success('Shift opened.');
        } catch (error) {
            message.error(error?.response?.data?.message || 'Failed to open shift.');
        } finally {
            setOpening(false);
        }
    }

    function openCloseShiftModal(shift) {
        if (!can('pos.shift.view')) {
            message.error('You do not have permission to end POS shift.');
            return;
        }

        setSelectedShift(shift);

        closeForm.setFieldsValue({
            counted_cash: Number(shift.expected_cash || 0),
            closing_notes: '',
        });

        setCloseModalOpen(true);
    }

    async function submitCloseShift(values) {
        if (!selectedShift?.id) {
            message.error('No shift selected.');
            return;
        }

        if (!can('pos.shift.view')) {
            message.error('You do not have permission to end POS shift.');
            return;
        }

        setClosing(true);

        try {
            await axios.post(api(`/api/pos-shifts/${selectedShift.id}/close`), {
                counted_cash: values.counted_cash,
                closing_notes: values.closing_notes || null,
            });

            setCloseModalOpen(false);
            setSelectedShift(null);
            closeForm.resetFields();

            await bootstrap();

            message.success('Shift ended successfully.');
        } catch (error) {
            message.error(error?.response?.data?.message || 'Failed to end shift.');
        } finally {
            setClosing(false);
        }
    }

    const terminalOptions = useMemo(() => {
        return terminals.map((terminal) => ({
            value: terminal.id,
            label: `${terminal.name}${terminal.code ? ` (${terminal.code})` : ''}`,
        }));
    }, [terminals]);

    const branchOptions = useMemo(() => {
        return branches.map((branch) => ({
            value: branch.id,
            label: `${branch.name}${branch.code ? ` (${branch.code})` : ''}`,
        }));
    }, [branches]);

    const filteredTerminalOptions = useMemo(() => {
        const branchId = filters.branch_id;

        return terminals
            .filter((terminal) => {
                if (!branchId) return true;

                return String(terminal.branch_id) === String(branchId);
            })
            .map((terminal) => ({
                value: terminal.id,
                label: `${terminal.name}${terminal.code ? ` (${terminal.code})` : ''}`,
            }));
    }, [terminals, filters.branch_id]);

    const columns = useMemo(
        () => [
            {
                title: 'Shift No',
                dataIndex: 'shift_no',
                key: 'shift_no',
                render: (value) => <Text strong>{value}</Text>,
            },
            {
                title: 'Branch',
                key: 'branch',
                render: (_, record) => record.branch?.name || '-',
            },
            {
                title: 'Terminal',
                key: 'terminal',
                render: (_, record) => record.pos_terminal?.name || '-',
            },
            {
                title: 'Cashier',
                key: 'cashier',
                render: (_, record) =>
                    record.cashier?.display_name ||
                    record.cashier?.name ||
                    record.cashier?.username ||
                    '-',
            },
            {
                title: 'Opened',
                dataIndex: 'opened_at',
                key: 'opened_at',
                render: (value) => (value ? dayjs(value).format('DD-MM-YYYY HH:mm') : '-'),
            },
            {
                title: 'Closed',
                dataIndex: 'closed_at',
                key: 'closed_at',
                render: (value) => (value ? dayjs(value).format('DD-MM-YYYY HH:mm') : '-'),
            },
            {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                render: (value) => (
                    <Tag color={value === 'open' ? 'green' : 'default'}>
                        {value}
                    </Tag>
                ),
            },
            {
                title: 'Opening Cash',
                dataIndex: 'opening_cash',
                key: 'opening_cash',
                align: 'right',
                render: (value) => `Rs. ${money(value)}`,
            },
            {
                title: 'Expected Cash',
                dataIndex: 'expected_cash',
                key: 'expected_cash',
                align: 'right',
                render: (value) => `Rs. ${money(value)}`,
            },
            {
                title: 'Counted Cash',
                dataIndex: 'counted_cash',
                key: 'counted_cash',
                align: 'right',
                render: (value) => `Rs. ${money(value)}`,
            },
            {
                title: 'Difference',
                dataIndex: 'cash_difference',
                key: 'cash_difference',
                align: 'right',
                render: (value) => (
                    <Text type={Number(value || 0) !== 0 ? 'danger' : undefined}>
                        Rs. {money(value)}
                    </Text>
                ),
            },
            {
                title: 'Sales',
                dataIndex: 'total_sales',
                key: 'total_sales',
                align: 'right',
                render: (value) => `Rs. ${money(value)}`,
            },
            {
                title: 'Action',
                key: 'action',
                width: 130,
                fixed: 'right',
                render: (_, record) =>
                    record.status === 'open' && can('pos.shift.view') ? (
                        <Button
                            size="small"
                            danger
                            onClick={() => openCloseShiftModal(record)}
                        >
                            End Shift
                        </Button>
                    ) : null,
            },
        ],
        [permissions],
    );

    return (
        <AuthenticatedLayout header={<Title level={4} style={{ margin: 0 }}>POS Shifts</Title>}>
            <Head title="POS Shifts" />

            <div style={{ padding: 16 }}>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {openShift && (
                        <Card
                            bordered={false}
                            title="Current Open Shift"
                            extra={
                                can('pos.shift.view') ? (
                                    <Button
                                        danger
                                        onClick={() => openCloseShiftModal(openShift)}
                                    >
                                        End Shift
                                    </Button>
                                ) : null
                            }
                        >
                            <Descriptions
                                column={3}
                                items={[
                                    {
                                        key: 'shift',
                                        label: 'Shift',
                                        children: openShift.shift_no,
                                    },
                                    {
                                        key: 'branch',
                                        label: 'Branch',
                                        children: openShift.branch?.name || '-',
                                    },
                                    {
                                        key: 'terminal',
                                        label: 'Terminal',
                                        children: openShift.pos_terminal?.name || '-',
                                    },
                                    {
                                        key: 'cashier',
                                        label: 'Cashier',
                                        children:
                                            openShift.cashier?.display_name ||
                                            openShift.cashier?.name ||
                                            '-',
                                    },
                                    {
                                        key: 'sales',
                                        label: 'Sales',
                                        children: `Rs. ${money(openShift.total_sales)}`,
                                    },
                                    {
                                        key: 'cash_sales',
                                        label: 'Cash Sales',
                                        children: `Rs. ${money(openShift.total_cash_sales)}`,
                                    },
                                    {
                                        key: 'refunds',
                                        label: 'Refunds',
                                        children: `Rs. ${money(openShift.total_refunds)}`,
                                    },
                                    {
                                        key: 'expected_cash',
                                        label: 'Expected Cash',
                                        children: `Rs. ${money(openShift.expected_cash)}`,
                                    },
                                    {
                                        key: 'difference',
                                        label: 'Cash Difference',
                                        children: `Rs. ${money(openShift.cash_difference)}`,
                                    },
                                ]}
                            />
                        </Card>
                    )}

                    <Card bordered={false}>
                        <Space direction="vertical" size={12} style={{ width: '100%' }}>
                            <Row gutter={[12, 12]}>
                                <Col xs={24} md={5}>
                                    <Select
                                        style={{ width: '100%' }}
                                        value={rangeKey}
                                        onChange={(value) => {
                                            setRangeKey(value);
                                            setRange(defaultRangeForKey(value));
                                        }}
                                        options={[
                                            { value: 'today', label: 'Today' },
                                            { value: 'week', label: 'This Week' },
                                            { value: 'month', label: 'This Month' },
                                            { value: 'custom', label: 'Custom Range' },
                                        ]}
                                    />
                                </Col>

                                <Col xs={24} md={7}>
                                    <DatePicker.RangePicker
                                        style={{ width: '100%' }}
                                        value={range}
                                        onChange={setRange}
                                        disabled={rangeKey !== 'custom'}
                                    />
                                </Col>

                                {canViewAllBranches && (
                                    <Col xs={24} md={5}>
                                        <Select
                                            allowClear
                                            placeholder="Branch"
                                            style={{ width: '100%' }}
                                            value={filters.branch_id}
                                            onChange={(value) =>
                                                setFilters((current) => ({
                                                    ...current,
                                                    branch_id: value,
                                                    pos_terminal_id: undefined,
                                                }))
                                            }
                                            options={branchOptions}
                                        />
                                    </Col>
                                )}

                                <Col xs={24} md={5}>
                                    <Select
                                        allowClear
                                        placeholder="Terminal"
                                        style={{ width: '100%' }}
                                        value={filters.pos_terminal_id}
                                        onChange={(value) =>
                                            setFilters((current) => ({
                                                ...current,
                                                pos_terminal_id: value,
                                            }))
                                        }
                                        options={filteredTerminalOptions}
                                    />
                                </Col>

                                <Col xs={24} md={canViewAllBranches ? 2 : 7}>
                                    <Button
                                        type="primary"
                                        block
                                        disabled={!can('pos.shift.view')}
                                        onClick={() => {
                                            form.setFieldsValue({
                                                branch_id: filters.branch_id || defaultBranchId,
                                                opening_cash: 0,
                                                notes: '',
                                            });
                                            setOpenModal(true);
                                        }}
                                    >
                                        Open
                                    </Button>
                                </Col>
                            </Row>

                            <Table
                                rowKey="id"
                                loading={loading}
                                columns={columns}
                                dataSource={rows}
                                scroll={{ x: 1300 }}
                            />
                        </Space>
                    </Card>
                </Space>
            </div>

            <Modal
                title="Open Shift"
                open={openModal}
                onCancel={() => {
                    setOpenModal(false);
                    form.resetFields();
                }}
                onOk={() => form.submit()}
                confirmLoading={opening}
                destroyOnClose
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={submitOpen}
                    initialValues={{
                        branch_id: defaultBranchId,
                        opening_cash: 0,
                    }}
                >
                    {canViewAllBranches && (
                        <Form.Item name="branch_id" label="Branch">
                            <Select
                                allowClear
                                placeholder="Select branch"
                                options={branchOptions}
                            />
                        </Form.Item>
                    )}

                    <Form.Item
                        name="pos_terminal_id"
                        label="Terminal"
                        rules={[
                            {
                                required: true,
                                message: 'Terminal is required.',
                            },
                        ]}
                    >
                        <Select
                            placeholder="Select terminal"
                            options={terminalOptions}
                        />
                    </Form.Item>

                    <Form.Item
                        name="opening_cash"
                        label="Opening Cash"
                        rules={[
                            {
                                required: true,
                                message: 'Opening cash is required.',
                            },
                        ]}
                    >
                        <InputNumber
                            style={{ width: '100%' }}
                            min={0}
                            prefix="Rs."
                        />
                    </Form.Item>

                    <Form.Item name="notes" label="Notes">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="End POS Shift"
                open={closeModalOpen}
                onCancel={() => {
                    setCloseModalOpen(false);
                    setSelectedShift(null);
                    closeForm.resetFields();
                }}
                onOk={() => closeForm.submit()}
                confirmLoading={closing}
                okText="End Shift"
                okButtonProps={{
                    danger: true,
                }}
                destroyOnClose
            >
                <Space direction="vertical" size={14} style={{ width: '100%' }}>
                    <Descriptions
                        bordered
                        size="small"
                        column={1}
                        items={[
                            {
                                key: 'shift',
                                label: 'Shift No',
                                children: selectedShift?.shift_no || '-',
                            },
                            {
                                key: 'branch',
                                label: 'Branch',
                                children: selectedShift?.branch?.name || '-',
                            },
                            {
                                key: 'terminal',
                                label: 'Terminal',
                                children: selectedShift?.pos_terminal?.name || '-',
                            },
                            {
                                key: 'cashier',
                                label: 'Cashier',
                                children:
                                    selectedShift?.cashier?.display_name ||
                                    selectedShift?.cashier?.name ||
                                    '-',
                            },
                            {
                                key: 'opening_cash',
                                label: 'Opening Cash',
                                children: `Rs. ${money(selectedShift?.opening_cash)}`,
                            },
                            {
                                key: 'cash_sales',
                                label: 'Cash Sales',
                                children: `Rs. ${money(selectedShift?.total_cash_sales)}`,
                            },
                            {
                                key: 'refunds',
                                label: 'Refunds',
                                children: `Rs. ${money(selectedShift?.total_refunds)}`,
                            },
                            {
                                key: 'expected_cash',
                                label: 'Expected Cash',
                                children: (
                                    <Text strong>
                                        Rs. {money(selectedShift?.expected_cash)}
                                    </Text>
                                ),
                            },
                        ]}
                    />

                    <Form
                        form={closeForm}
                        layout="vertical"
                        onFinish={submitCloseShift}
                    >
                        <Form.Item
                            name="counted_cash"
                            label="Counted Cash"
                            rules={[
                                {
                                    required: true,
                                    message: 'Counted cash is required.',
                                },
                            ]}
                        >
                            <InputNumber
                                style={{ width: '100%' }}
                                min={0}
                                prefix="Rs."
                                placeholder="Enter counted cash"
                            />
                        </Form.Item>

                        <Form.Item name="closing_notes" label="Closing Notes">
                            <Input.TextArea
                                rows={3}
                                placeholder="Optional closing note"
                            />
                        </Form.Item>
                    </Form>
                </Space>
            </Modal>
        </AuthenticatedLayout>
    );
}