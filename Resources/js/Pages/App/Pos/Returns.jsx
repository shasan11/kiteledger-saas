import { useEffect, useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import { App, Button, Card, Form, InputNumber, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout/index.jsx';
import { api, fetchList, money, saleStatusColor } from './Shared/posHelpers';

const { Title } = Typography;

export default function PosReturnsPage() {
    const { message } = App.useApp();
    const [rows, setRows] = useState([]);
    const [sales, setSales] = useState([]);
    const [selectedSale, setSelectedSale] = useState(null);
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => {
        void bootstrap();
    }, []);

    async function bootstrap() {
        try {
            const [returnPayload, salesPayload] = await Promise.all([
                fetchList('/api/pos-returns', { page_size: 100 }),
                fetchList('/api/pos-sales', { page_size: 100, status: 'completed' }),
            ]);
            setRows(returnPayload.results || []);
            setSales(salesPayload.results || []);
        } catch {
            message.error('Failed to load POS returns.');
        }
    }

    async function submit(values) {
        try {
            const sale = sales.find((row) => row.id === values.pos_sale_id);
            const draftResponse = await axios.post(api('/api/pos-returns'), {
                pos_sale_id: values.pos_sale_id,
                refund_method: values.refund_method,
                items: (sale?.pos_sale_lines || []).slice(0, 1).map((line) => ({
                    pos_sale_line_id: line.id,
                    qty: values.qty,
                })),
            });
            await axios.post(api(`/api/pos-returns/${draftResponse.data.id}/complete`), { approved: true });
            setOpen(false);
            form.resetFields();
            await bootstrap();
            message.success('Return completed.');
        } catch (error) {
            message.error(error?.response?.data?.message || 'Failed to create return.');
        }
    }

    const columns = useMemo(() => [
        { title: 'Return No', dataIndex: 'return_no', key: 'return_no' },
        { title: 'Date', dataIndex: 'return_date', key: 'return_date', render: (value) => dayjs(value).format('DD-MM-YYYY HH:mm') },
        { title: 'Sale', key: 'sale', render: (_, record) => record.pos_sale?.sale_no || '-' },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (value) => <Tag color={saleStatusColor(value)}>{value}</Tag> },
        { title: 'Refund Amount', dataIndex: 'refund_amount', key: 'refund_amount', align: 'right', render: (value) => `Rs. ${money(value)}` },
        { title: 'Method', dataIndex: 'refund_method', key: 'refund_method' },
    ], []);

    return (
        <AuthenticatedLayout header={<Title level={4} style={{ margin: 0 }}>POS Returns</Title>}>
            <Head title="POS Returns" />
            <div style={{ padding: 16 }}>
                <Card bordered={false}>
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span />
                            <Button type="primary" onClick={() => setOpen(true)}>Create Return</Button>
                        </div>
                        <Table rowKey="id" columns={columns} dataSource={rows} />
                    </Space>
                </Card>
            </div>

            <Modal title="Create POS Return" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()}>
                <Form form={form} layout="vertical" onFinish={submit}>
                    <Form.Item name="pos_sale_id" label="Sale" rules={[{ required: true }]}>
                        <Select
                            showSearch
                            options={sales.map((sale) => ({ value: sale.id, label: `${sale.sale_no} - ${sale.customer_name || sale.contact?.name || 'Walk-in'}` }))}
                            onChange={(value) => setSelectedSale(sales.find((sale) => sale.id === value) || null)}
                        />
                    </Form.Item>
                    <Form.Item name="qty" label="Return Qty" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} min={1} />
                    </Form.Item>
                    <Form.Item name="refund_method" label="Refund Method" rules={[{ required: true }]}>
                        <Select options={[
                            { value: 'cash', label: 'Cash' },
                            { value: 'card', label: 'Card' },
                            { value: 'online', label: 'Online' },
                            { value: 'wallet', label: 'Wallet' },
                            { value: 'store_credit', label: 'Store Credit' },
                        ]} />
                    </Form.Item>
                    {selectedSale ? <Tag>{selectedSale.sale_no}</Tag> : null}
                </Form>
            </Modal>
        </AuthenticatedLayout>
    );
}
