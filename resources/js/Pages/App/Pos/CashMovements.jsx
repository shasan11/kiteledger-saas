import { useEffect, useMemo, useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { App, Button, Card, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import PosLayout from '@/Layouts/PosLayout.jsx';
import { api, fetchList, money, showApiError } from './Shared/posHelpers';

const { Title } = Typography;

export default function PosCashMovementsPage() {
    const { message } = App.useApp();
    const { props } = usePage();
    const permissions = props.auth?.permissions || [];
    const can = (permission) => permissions.includes(permission);
    const [rows, setRows] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [terminals, setTerminals] = useState([]);
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => {
        void bootstrap();
    }, []);

    async function bootstrap() {
        try {
            const [movementPayload, shiftPayload, terminalPayload] = await Promise.all([
                fetchList('/api/pos-cash-movements', { page_size: 100 }),
                fetchList('/api/pos-shifts', { page_size: 100, status: 'open' }),
                fetchList('/api/pos-terminals', { page_size: 100, active: true }),
            ]);
            setRows(movementPayload.results || []);
            setShifts(shiftPayload.results || []);
            setTerminals(terminalPayload.results || []);
        } catch {
            showApiError(message, error, 'Failed to load cash movements.');
        }
    }

    async function submit(values) {
        try {
            await axios.post(api('/api/pos-cash-movements'), { ...values, approved: true });
            setOpen(false);
            form.resetFields();
            await bootstrap();
            message.success('Cash movement saved.');
        } catch (error) {
            showApiError(message, error, 'Failed to save cash movement.');
        }
    }

    const columns = useMemo(() => [
        { title: 'Movement No', dataIndex: 'movement_no', key: 'movement_no' },
        { title: 'Date', dataIndex: 'movement_date', key: 'movement_date', render: (value) => dayjs(value).format('DD-MM-YYYY HH:mm') },
        { title: 'Type', dataIndex: 'type', key: 'type', render: (value) => <Tag>{value}</Tag> },
        { title: 'Terminal', key: 'terminal', render: (_, record) => record.pos_terminal?.name || '-' },
        { title: 'Shift', key: 'shift', render: (_, record) => record.pos_shift?.shift_no || '-' },
        { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right', render: (value) => `Rs. ${money(value)}` },
        { title: 'Reason', dataIndex: 'reason', key: 'reason' },
    ], []);

    return (
        <PosLayout>
            <Head title="POS Cash Movements" />
            <div style={{ padding: '18px 24px' }}>
                <Card bordered={false}>
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span />
                            <Button type="primary" disabled={!can('pos.cash_movement.create')} onClick={() => setOpen(true)}>New Cash Movement</Button>
                        </div>
                        <Table rowKey="id" columns={columns} dataSource={rows} />
                    </Space>
                </Card>
            </div>

            <Modal title="Cash Movement" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()}>
                <Form form={form} layout="vertical" onFinish={submit}>
                    <Form.Item name="pos_terminal_id" label="Terminal" rules={[{ required: true }]}>
                        <Select options={terminals.map((terminal) => ({ value: terminal.id, label: terminal.name }))} />
                    </Form.Item>
                    <Form.Item name="pos_shift_id" label="Shift" rules={[{ required: true }]}>
                        <Select options={shifts.map((shift) => ({ value: shift.id, label: shift.shift_no }))} />
                    </Form.Item>
                    <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                        <Select options={[
                            { value: 'cash_in', label: 'Cash In' },
                            { value: 'cash_out', label: 'Cash Out' },
                            { value: 'expense', label: 'Expense' },
                            { value: 'drop', label: 'Cash Drop' },
                        ]} />
                    </Form.Item>
                    <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} min={0} prefix="Rs." />
                    </Form.Item>
                    <Form.Item name="reason" label="Reason">
                        <Input />
                    </Form.Item>
                    <Form.Item name="notes" label="Notes">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>
        </PosLayout>
    );
}
